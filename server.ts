import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_USERS, INITIAL_COMPONENTS, INITIAL_CATEGORY_PERMISSIONS, INITIAL_LOGS, INITIAL_MACHINES } from './src/data/initialData';
import { ComponentItem, MachineItem, UserAccount, CategoryAccessRule, AccessLog, UserRole } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ifta_database.json');

const BACKUP_FILE = path.join(DATA_DIR, 'ifta_database.backup.json');
const TMP_BACKUP_FILE = '/tmp/ifta_database.vault.json';
const PROJECT_BACKUP_FILE = path.join(process.cwd(), 'data', 'ifta_database_mirror.json');

// Ensure data directory exists for persistent Docker storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database representation for persistent JSON storage in Docker container
interface IftaDatabase {
  components: ComponentItem[];
  machines: MachineItem[];
  deletedComponentIds?: string[];
  deletedMachineIds?: string[];
  categoryPermissions: CategoryAccessRule[];
  users: UserAccount[];
  logs: AccessLog[];
  version: string;
  lastUpdated: string;
}

function getInitialDatabase(): IftaDatabase {
  return {
    components: INITIAL_COMPONENTS,
    machines: INITIAL_MACHINES,
    deletedComponentIds: [],
    deletedMachineIds: [],
    categoryPermissions: INITIAL_CATEGORY_PERMISSIONS,
    users: INITIAL_USERS,
    logs: INITIAL_LOGS,
    version: '2026.4',
    lastUpdated: new Date().toISOString()
  };
}

let memoryDbCache: IftaDatabase | null = null;

function saveDatabase(db: IftaDatabase): boolean {
  try {
    db.lastUpdated = new Date().toISOString();
    memoryDbCache = db;
    const jsonStr = JSON.stringify(db, null, 2);

    // 1. Gravação atômica no arquivo principal
    const tempFile = `${DATA_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);

    // 2. Gravação redundante de segurança em múltiplos locais para resistir a reciclagem de container
    try {
      fs.writeFileSync(BACKUP_FILE, jsonStr, 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(TMP_BACKUP_FILE, jsonStr, 'utf-8');
    } catch {}
    try {
      fs.writeFileSync(PROJECT_BACKUP_FILE, jsonStr, 'utf-8');
    } catch {}

    return true;
  } catch (err) {
    console.error('[DATABASE] Erro ao salvar arquivo persistente no Docker/disco:', err);
    return false;
  }
}

// Helper to count custom (non-initial) items in a database candidate
function evaluateDatabaseRichness(db: any): number {
  if (!db || !Array.isArray(db.components) || !Array.isArray(db.machines)) return -1;
  const initCompIds = new Set(INITIAL_COMPONENTS.map(c => c.id));
  const initCompTags = new Set(INITIAL_COMPONENTS.map(c => c.tagCode.toUpperCase()));
  const customComps = db.components.filter((c: any) => c && c.id && !initCompIds.has(c.id) && !initCompTags.has((c.tagCode || '').toUpperCase())).length;
  const initMaqIds = new Set(INITIAL_MACHINES.map(m => m.id));
  const customMaqs = db.machines.filter((m: any) => m && m.id && !initMaqIds.has(m.id)).length;
  const tombstoneBonus = (Array.isArray(db.deletedComponentIds) ? db.deletedComponentIds.length : 0) * 10 +
    (Array.isArray(db.deletedMachineIds) ? db.deletedMachineIds.length : 0) * 10;
  return (customComps * 10) + (customMaqs * 10) + tombstoneBonus + db.components.length + db.machines.length;
}

function sanitizeComponent(raw: any): ComponentItem {
  if (!raw) raw = {};
  const tagUpper = (raw.tagCode || '').trim().toUpperCase();
  const initMatch = INITIAL_COMPONENTS.find(ic => ic.id === raw.id || (tagUpper && ic.tagCode.toUpperCase() === tagUpper));

  const safeCategory = raw.category || initMatch?.category || 'Mecânica';
  const catLower = safeCategory.toLowerCase();
  const isElec = ['elétrica', 'eletrica', 'automação', 'automacao', 'instrumentação', 'instrumentacao', 'painéis', 'paineis'].includes(catLower);
  const defaultRoles = isElec ? (['CDI', 'ELETRICA'] as UserRole[]) : (['CDI', 'MECANICA'] as UserRole[]);

  return {
    id: raw.id || initMatch?.id || (tagUpper ? `comp-${tagUpper.toLowerCase()}` : `comp-${Date.now()}`),
    tagCode: tagUpper || initMatch?.tagCode || 'TAG-PENDING',
    name: raw.name || initMatch?.name || 'Componente Técnico',
    category: safeCategory,
    manufacturer: raw.manufacturer !== undefined && raw.manufacturer !== null ? raw.manufacturer : (initMatch?.manufacturer || 'Fabricante Homologado'),
    model: raw.model !== undefined && raw.model !== null ? raw.model : (initMatch?.model || 'Modelo Padrão'),
    application: raw.application !== undefined && raw.application !== null ? raw.application : (initMatch?.application || 'Equipamento Geral de Planta'),
    description: raw.description !== undefined && raw.description !== null ? raw.description : (initMatch?.description || 'Descrição técnica operacional cadastrada no sistema.'),
    imageUrl: raw.imageUrl !== undefined && raw.imageUrl !== null ? raw.imageUrl : (initMatch?.imageUrl || ''),
    technicalDiagramUrl: raw.technicalDiagramUrl !== undefined && raw.technicalDiagramUrl !== null ? raw.technicalDiagramUrl : (initMatch?.technicalDiagramUrl || ''),
    diagramDescription: raw.diagramDescription !== undefined && raw.diagramDescription !== null ? raw.diagramDescription : (initMatch?.diagramDescription || ''),
    specs: Array.isArray(raw.specs) ? raw.specs : (initMatch?.specs || []),
    maintenanceIntervalHours: raw.maintenanceIntervalHours !== undefined && raw.maintenanceIntervalHours !== null ? Number(raw.maintenanceIntervalHours) : (initMatch?.maintenanceIntervalHours || 4000),
    maintenanceGuide: Array.isArray(raw.maintenanceGuide) ? raw.maintenanceGuide : (initMatch?.maintenanceGuide || []),
    commonFailures: Array.isArray(raw.commonFailures) ? raw.commonFailures : (initMatch?.commonFailures || []),
    manualFileName: raw.manualFileName !== undefined && raw.manualFileName !== null ? raw.manualFileName : (initMatch?.manualFileName || 'manual_tecnico.pdf'),
    manualSummary: raw.manualSummary !== undefined && raw.manualSummary !== null ? raw.manualSummary : (initMatch?.manualSummary || 'Manual operacional.'),
    qrCodeData: raw.qrCodeData || `IFTA:${tagUpper || 'COMP'}`,
    visibleToRoles: Array.isArray(raw.visibleToRoles) && raw.visibleToRoles.length > 0 ? raw.visibleToRoles : (initMatch?.visibleToRoles || defaultRoles),
    createdBy: raw.createdBy,
    updatedBy: raw.updatedBy,
    createdAt: raw.createdAt || initMatch?.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function sanitizeMachine(raw: any): MachineItem {
  if (!raw) raw = {};
  const tagUpper = (raw.tagCode || '').trim().toUpperCase();
  const initMatch = INITIAL_MACHINES.find(im => im.id === raw.id || (tagUpper && im.tagCode.toUpperCase() === tagUpper));

  const safeLinked = Array.isArray(raw.linkedComponents)
    ? raw.linkedComponents
        .filter((l: any) => l && (l.componentId || l.tagCode))
        .map((l: any) => ({
          componentId: String(l.componentId || l.tagCode || '').trim(),
          positionOrFunction: l.positionOrFunction || '',
          allowedRoles: Array.isArray(l.allowedRoles) ? l.allowedRoles : ['CDI', 'MECANICA', 'ELETRICA']
        }))
    : (initMatch?.linkedComponents || []);

  return {
    id: raw.id || initMatch?.id || (tagUpper ? `maq-${tagUpper.toLowerCase()}` : `maq-${Date.now()}`),
    tagCode: tagUpper || initMatch?.tagCode || 'MAQ-PENDING',
    name: raw.name || initMatch?.name || 'Máquina Industrial',
    sector: raw.sector || initMatch?.sector || 'Planta Geral',
    description: raw.description || initMatch?.description || 'Linha de produção operacional.',
    dimensions: raw.dimensions || initMatch?.dimensions || '',
    status: raw.status || initMatch?.status || 'OPERACIONAL',
    linkedComponents: safeLinked,
    imageUrl: raw.imageUrl || initMatch?.imageUrl || '',
    diagramPdfUrl: raw.diagramPdfUrl || initMatch?.diagramPdfUrl || '',
    diagramPdfFileName: raw.diagramPdfFileName || initMatch?.diagramPdfFileName || '',
    diagramDescription: raw.diagramDescription || initMatch?.diagramDescription || '',
    qrCodeData: raw.qrCodeData || `IFTA:${tagUpper || 'MAQ'}`,
    createdAt: raw.createdAt || initMatch?.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

// Database loader with multi-location failover and rich data recovery
function loadDatabase(): IftaDatabase {
  const candidates: IftaDatabase[] = [];

  const locations = [DATA_FILE, BACKUP_FILE, TMP_BACKUP_FILE, PROJECT_BACKUP_FILE];
  for (const loc of locations) {
    try {
      if (fs.existsSync(loc)) {
        const raw = fs.readFileSync(loc, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.machines)) {
          candidates.push(parsed);
        }
      }
    } catch {}
  }

  if (memoryDbCache && Array.isArray(memoryDbCache.components)) {
    candidates.push(memoryDbCache);
  }

  let bestDb: IftaDatabase | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = evaluateDatabaseRichness(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestDb = candidate;
    }
  }

  if (bestDb) {
    let needsSave = false;

    if (!Array.isArray(bestDb.deletedComponentIds)) {
      bestDb.deletedComponentIds = [];
      needsSave = true;
    }
    if (!Array.isArray(bestDb.deletedMachineIds)) {
      bestDb.deletedMachineIds = [];
      needsSave = true;
    }

    const deletedCompSet = new Set(bestDb.deletedComponentIds.map(x => String(x).trim().toUpperCase()));
    const deletedMaqSet = new Set(bestDb.deletedMachineIds.map(x => String(x).trim().toUpperCase()));

    // Garantir que máquinas iniciais não excluídas explicitamente estejam presentes sem duplicar
    INITIAL_MACHINES.forEach(im => {
      const idUpper = im.id.toUpperCase();
      const tagUpper = im.tagCode.toUpperCase();
      if (deletedMaqSet.has(idUpper) || deletedMaqSet.has(tagUpper)) return;
      if (!bestDb!.machines.some(m => m.id === im.id || m.tagCode.toUpperCase() === tagUpper)) {
        bestDb!.machines.push(im);
        needsSave = true;
      }
    });

    // Garantir que peças iniciais não excluídas explicitamente estejam presentes sem duplicar
    INITIAL_COMPONENTS.forEach(ic => {
      const idUpper = ic.id.toUpperCase();
      const tagUpper = ic.tagCode.toUpperCase();
      if (deletedCompSet.has(idUpper) || deletedCompSet.has(tagUpper)) return;
      if (!bestDb!.components.some(c => c.id === ic.id || c.tagCode.toUpperCase() === tagUpper)) {
        bestDb!.components.push(ic);
        needsSave = true;
      }
    });

    // Sanitizar e normalizar integralmente todos os componentes (removendo eventuais itens já marcados como excluídos)
    const prevCompsLen = bestDb.components.length;
    bestDb.components = bestDb.components
      .map(sanitizeComponent)
      .filter(c => !deletedCompSet.has(c.id.toUpperCase()) && !deletedCompSet.has(c.tagCode.toUpperCase()));
    if (bestDb.components.length !== prevCompsLen) needsSave = true;

    // Sanitizar e normalizar integralmente todas as máquinas (removendo eventuais máquinas já marcadas como excluídas)
    const prevMaqsLen = bestDb.machines.length;
    bestDb.machines = bestDb.machines
      .map(sanitizeMachine)
      .filter(m => !deletedMaqSet.has(m.id.toUpperCase()) && !deletedMaqSet.has(m.tagCode.toUpperCase()));
    if (bestDb.machines.length !== prevMaqsLen) needsSave = true;

    // Validar contas de usuário e CDI
    if (Array.isArray(bestDb.users)) {
      bestDb.users.forEach(u => {
        if (u.username === 'CDI' || u.role === 'CDI' || u.username === 'DESENVOLVEDOR' || u.role === 'DESENVOLVEDOR') {
          u.username = 'CDI';
          u.role = 'CDI';
          if (u.passwordHash !== 'wlt@1616') {
            u.passwordHash = 'wlt@1616';
            needsSave = true;
          }
        }
      });
    }

    // Segregação estrita de permissões de categoria
    bestDb.categoryPermissions = INITIAL_CATEGORY_PERMISSIONS;

    if (needsSave || !fs.existsSync(DATA_FILE)) {
      saveDatabase(bestDb);
    }
    memoryDbCache = bestDb;
    return bestDb;
  }

  // Fallback se não existir nenhum arquivo salvo
  const initial = getInitialDatabase();
  saveDatabase(initial);
  memoryDbCache = initial;
  return initial;
}

// Initialize database on server startup
const initialDb = loadDatabase();
console.log(`[IFTA DATABASE] Banco de dados persistente ativo em: ${DATA_FILE}`);
console.log(`[IFTA DATABASE] Registros carregados: ${initialDb.machines.length} máquinas, ${initialDb.components.length} peças`);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Anti-cache and CORS middleware for all API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Active real-time multi-user client streams (SSE)
const sseClients = new Set<express.Response>();

function broadcastRealtime(event: { type: string; data?: any; message?: string; timestamp: string }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// REST API Endpoints for persistent storage
app.get('/api/health', (req, res) => {
  const currentDb = loadDatabase();
  res.json({
    status: 'ok',
    storage: 'docker_persistent_volume',
    databaseFile: DATA_FILE,
    machinesCount: currentDb.machines.length,
    componentsCount: currentDb.components.length,
    realtimeClientsConnected: sseClients.size,
    lastUpdated: currentDb.lastUpdated
  });
});

// SSE endpoint for instant automatic real-time synchronization between users
app.get('/api/realtime', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // ESSENCIAL PARA PROXY NGINX E CLOUD RUN NÃO BLOQUEAREM SSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  const currentDb = loadDatabase();

  // Send initial handshake with current state snapshot immediately
  res.write(`data: ${JSON.stringify({ 
    type: 'CONNECTED', 
    timestamp: new Date().toISOString(),
    message: 'Conexão em tempo real estabelecida com sucesso.',
    data: {
      components: currentDb.components,
      machines: currentDb.machines,
      deletedComponentIds: currentDb.deletedComponentIds || [],
      deletedMachineIds: currentDb.deletedMachineIds || [],
      categoryPermissions: currentDb.categoryPermissions
    }
  })}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 15 seconds to prevent timeout on mobile devices
  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

app.get('/api/data', (req, res) => {
  const currentDb = loadDatabase();
  res.json(currentDb);
});

app.post('/api/data', (req, res) => {
  const { components, machines, categoryPermissions, users, logs, replaceAll } = req.body;
  const currentDb = loadDatabase();

  if (Array.isArray(components)) {
    if (replaceAll) {
      currentDb.components = components.map(sanitizeComponent);
      const restoredIds = new Set(
        currentDb.components.flatMap(c => [c.id.toUpperCase(), c.tagCode.toUpperCase()])
      );
      currentDb.deletedComponentIds = (currentDb.deletedComponentIds || []).filter(
        d => !restoredIds.has(String(d).trim().toUpperCase())
      );
    } else {
      const deletedCompSet = new Set(
        (currentDb.deletedComponentIds || []).map(x => String(x).trim().toUpperCase())
      );
      // Non-destructive upsert union: never erase other existing components or resurrect deleted ones
      components.forEach((incoming: ComponentItem) => {
        if (!incoming || !incoming.tagCode) return;
        const itemToSave = sanitizeComponent(incoming);
        const normTag = itemToSave.tagCode.toUpperCase();
        const normId = itemToSave.id.toUpperCase();
        if (deletedCompSet.has(normId) || deletedCompSet.has(normTag)) return;

        const idx = currentDb.components.findIndex(c => c.id === itemToSave.id || c.tagCode.toUpperCase() === normTag);
        if (idx >= 0) {
          currentDb.components[idx] = { ...currentDb.components[idx], ...itemToSave };
        } else {
          currentDb.components.unshift(itemToSave);
        }
      });
    }
  }

  if (Array.isArray(machines)) {
    if (replaceAll) {
      currentDb.machines = machines.map(sanitizeMachine);
      const restoredIds = new Set(
        currentDb.machines.flatMap(m => [m.id.toUpperCase(), m.tagCode.toUpperCase()])
      );
      currentDb.deletedMachineIds = (currentDb.deletedMachineIds || []).filter(
        d => !restoredIds.has(String(d).trim().toUpperCase())
      );
    } else {
      const deletedMaqSet = new Set(
        (currentDb.deletedMachineIds || []).map(x => String(x).trim().toUpperCase())
      );
      // Non-destructive upsert union for machines
      machines.forEach((incoming: MachineItem) => {
        if (!incoming || !incoming.tagCode) return;
        const itemToSave = sanitizeMachine(incoming);
        const normTag = itemToSave.tagCode.toUpperCase();
        const normId = itemToSave.id.toUpperCase();
        if (deletedMaqSet.has(normId) || deletedMaqSet.has(normTag)) return;

        const idx = currentDb.machines.findIndex(m => m.id === itemToSave.id || m.tagCode.toUpperCase() === normTag);
        if (idx >= 0) {
          currentDb.machines[idx] = { ...currentDb.machines[idx], ...itemToSave };
        } else {
          currentDb.machines.unshift(itemToSave);
        }
      });
    }
  }

  if (Array.isArray(categoryPermissions)) currentDb.categoryPermissions = categoryPermissions;
  if (Array.isArray(users)) currentDb.users = users;
  if (Array.isArray(logs)) currentDb.logs = logs;
  saveDatabase(currentDb);

  // Broadcast to all active users
  broadcastRealtime({
    type: 'DATABASE_UPDATED',
    data: {
      components: currentDb.components,
      machines: currentDb.machines,
      deletedComponentIds: currentDb.deletedComponentIds || [],
      deletedMachineIds: currentDb.deletedMachineIds || [],
      categoryPermissions: currentDb.categoryPermissions
    },
    message: 'Banco de dados técnico sincronizado e atualizado.',
    timestamp: currentDb.lastUpdated
  });

  res.json({ success: true, lastUpdated: currentDb.lastUpdated, componentsCount: currentDb.components.length, machinesCount: currentDb.machines.length });
});

// Dedicated batch sync endpoint to re-hydrate server from client vaults
app.post('/api/sync-batch', (req, res) => {
  const { components, machines } = req.body;
  const currentDb = loadDatabase();
  let addedCount = 0;

  const deletedCompSet = new Set((currentDb.deletedComponentIds || []).map(x => String(x).trim().toUpperCase()));
  const deletedMaqSet = new Set((currentDb.deletedMachineIds || []).map(x => String(x).trim().toUpperCase()));

  if (Array.isArray(components)) {
    components.forEach((incoming: ComponentItem) => {
      if (!incoming || !incoming.tagCode) return;
      const itemToSave = sanitizeComponent(incoming);
      const normTag = itemToSave.tagCode.toUpperCase();
      const normId = itemToSave.id.toUpperCase();
      if (deletedCompSet.has(normId) || deletedCompSet.has(normTag)) return;

      const idx = currentDb.components.findIndex(c => c.id === itemToSave.id || c.tagCode.toUpperCase() === normTag);
      if (idx >= 0) {
        currentDb.components[idx] = { ...currentDb.components[idx], ...itemToSave };
      } else {
        currentDb.components.unshift(itemToSave);
        addedCount++;
      }
    });
  }

  if (Array.isArray(machines)) {
    machines.forEach((incoming: MachineItem) => {
      if (!incoming || !incoming.tagCode) return;
      const itemToSave = sanitizeMachine(incoming);
      const normTag = itemToSave.tagCode.toUpperCase();
      const normId = itemToSave.id.toUpperCase();
      if (deletedMaqSet.has(normId) || deletedMaqSet.has(normTag)) return;

      const idx = currentDb.machines.findIndex(m => m.id === itemToSave.id || m.tagCode.toUpperCase() === normTag);
      if (idx >= 0) {
        currentDb.machines[idx] = { ...currentDb.machines[idx], ...itemToSave };
      } else {
        currentDb.machines.unshift(itemToSave);
        addedCount++;
      }
    });
  }

  saveDatabase(currentDb);

  if (addedCount > 0) {
    broadcastRealtime({
      type: 'DATABASE_UPDATED',
      data: {
        components: currentDb.components,
        machines: currentDb.machines,
        deletedComponentIds: currentDb.deletedComponentIds,
        deletedMachineIds: currentDb.deletedMachineIds,
        categoryPermissions: currentDb.categoryPermissions
      },
      message: `${addedCount} registro(s) reidratado(s) e sincronizado(s) no banco central.`,
      timestamp: currentDb.lastUpdated
    });
  }

  res.json({
    success: true,
    addedCount,
    totalComponents: currentDb.components.length,
    totalMachines: currentDb.machines.length,
    lastUpdated: currentDb.lastUpdated
  });
});

// Component item save / update
app.post('/api/components', (req, res) => {
  const comp: ComponentItem = req.body;
  if (!comp || !comp.tagCode) {
    return res.status(400).json({ error: 'Peça inválida ou sem código Tag' });
  }
  const currentDb = loadDatabase();
  const normalizedComp = sanitizeComponent(comp);
  const normId = normalizedComp.id.toUpperCase();
  const normTag = normalizedComp.tagCode.toUpperCase();

  // Caso esteja recriando ou editando um item, remover eventual tombstone anterior
  currentDb.deletedComponentIds = (currentDb.deletedComponentIds || []).filter(
    d => d.toUpperCase() !== normId && d.toUpperCase() !== normTag
  );

  const idx = currentDb.components.findIndex(c => c.id === normalizedComp.id || c.tagCode.toUpperCase() === normTag);

  if (idx >= 0) {
    currentDb.components[idx] = normalizedComp;
  } else {
    currentDb.components.unshift(normalizedComp);
  }

  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'COMPONENT_SAVED',
    data: normalizedComp,
    message: `Peça "${normalizedComp.name}" (${normalizedComp.tagCode}) atualizada no catálogo.`,
    timestamp: normalizedComp.updatedAt || new Date().toISOString()
  });
  res.json({ success: true, component: normalizedComp });
});

// Component item delete (permanently removes including initial catalog items)
app.delete('/api/components/:id', (req, res) => {
  const { id } = req.params;
  const queryTag = typeof req.query.tagCode === 'string' ? req.query.tagCode.trim().toUpperCase() : '';
  const idUpper = id.trim().toUpperCase();
  const currentDb = loadDatabase();
  const initialLen = currentDb.components.length;

  const target = currentDb.components.find(
    c => c.id === id || c.id.toUpperCase() === idUpper || c.tagCode.toUpperCase() === idUpper || (queryTag && c.tagCode.toUpperCase() === queryTag)
  ) || INITIAL_COMPONENTS.find(
    ic => ic.id === id || ic.id.toUpperCase() === idUpper || ic.tagCode.toUpperCase() === idUpper || (queryTag && ic.tagCode.toUpperCase() === queryTag)
  );
  const targetIdUpper = target ? target.id.toUpperCase() : idUpper;
  const targetTagUpper = target ? target.tagCode.toUpperCase() : (queryTag || idUpper);

  // Registra tombstones definitivos no servidor para impedir ressurreição por initialData ou outros aparelhos
  const delSet = new Set((currentDb.deletedComponentIds || []).map(x => String(x).trim().toUpperCase()));
  delSet.add(idUpper);
  delSet.add(targetIdUpper);
  delSet.add(targetTagUpper);
  if (queryTag) delSet.add(queryTag);
  currentDb.deletedComponentIds = Array.from(delSet);

  currentDb.components = currentDb.components.filter(
    c => !delSet.has(c.id.toUpperCase()) && !delSet.has(c.tagCode.toUpperCase())
  );

  // Unlink from machines
  currentDb.machines.forEach(m => {
    if (m.linkedComponents) {
      m.linkedComponents = m.linkedComponents.filter(l => {
        const lid = String(l.componentId || '').trim().toUpperCase();
        return !delSet.has(lid);
      });
    }
  });

  saveDatabase(currentDb);
  console.log(`[IFTA DATABASE] Peça excluída definitivamente: ${targetIdUpper} (${targetTagUpper})`);

  broadcastRealtime({
    type: 'COMPONENT_DELETED',
    data: { id: target ? target.id : id, tagCode: target ? target.tagCode : (queryTag || id) },
    message: `Peça excluída definitivamente do catálogo.`,
    timestamp: new Date().toISOString()
  });
  res.json({
    success: true,
    removedCount: initialLen - currentDb.components.length,
    deletedComponentIds: currentDb.deletedComponentIds
  });
});

// Machine save / update
app.post('/api/machines', (req, res) => {
  const machine: MachineItem = req.body;
  if (!machine || !machine.tagCode) {
    return res.status(400).json({ error: 'Máquina inválida ou sem código Tag' });
  }
  const currentDb = loadDatabase();
  const normalizedMachine = sanitizeMachine(machine);
  const normId = normalizedMachine.id.toUpperCase();
  const normTag = normalizedMachine.tagCode.toUpperCase();

  // Caso esteja recriando ou editando uma máquina, remover eventual tombstone anterior
  currentDb.deletedMachineIds = (currentDb.deletedMachineIds || []).filter(
    d => d.toUpperCase() !== normId && d.toUpperCase() !== normTag
  );

  const idx = currentDb.machines.findIndex(m => m.id === normalizedMachine.id || m.tagCode.toUpperCase() === normTag);

  if (idx >= 0) {
    currentDb.machines[idx] = normalizedMachine;
  } else {
    currentDb.machines.unshift(normalizedMachine);
  }

  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'MACHINE_SAVED',
    data: normalizedMachine,
    message: `Máquina "${normalizedMachine.name}" (${normalizedMachine.tagCode}) atualizada no catálogo.`,
    timestamp: normalizedMachine.updatedAt || new Date().toISOString()
  });
  res.json({ success: true, machine: normalizedMachine });
});

// Machine delete (permanently removes from persistent database including initial machines)
app.delete('/api/machines/:id', (req, res) => {
  const { id } = req.params;
  const queryTag = typeof req.query.tagCode === 'string' ? req.query.tagCode.trim().toUpperCase() : '';
  const idUpper = id.trim().toUpperCase();
  const currentDb = loadDatabase();
  const initialLen = currentDb.machines.length;

  const target = currentDb.machines.find(
    m => m.id === id || m.id.toUpperCase() === idUpper || m.tagCode.toUpperCase() === idUpper || (queryTag && m.tagCode.toUpperCase() === queryTag)
  ) || INITIAL_MACHINES.find(
    im => im.id === id || im.id.toUpperCase() === idUpper || im.tagCode.toUpperCase() === idUpper || (queryTag && im.tagCode.toUpperCase() === queryTag)
  );
  const targetIdUpper = target ? target.id.toUpperCase() : idUpper;
  const targetTagUpper = target ? target.tagCode.toUpperCase() : (queryTag || idUpper);

  const delSet = new Set((currentDb.deletedMachineIds || []).map(x => String(x).trim().toUpperCase()));
  delSet.add(idUpper);
  delSet.add(targetIdUpper);
  delSet.add(targetTagUpper);
  if (queryTag) delSet.add(queryTag);
  currentDb.deletedMachineIds = Array.from(delSet);

  currentDb.machines = currentDb.machines.filter(
    m => !delSet.has(m.id.toUpperCase()) && !delSet.has(m.tagCode.toUpperCase())
  );

  saveDatabase(currentDb);
  console.log(`[IFTA DATABASE] Máquina excluída definitivamente: ${targetIdUpper} (${targetTagUpper})`);

  broadcastRealtime({
    type: 'MACHINE_DELETED',
    data: { id: target ? target.id : id, tagCode: target ? target.tagCode : (queryTag || id) },
    message: `Máquina excluída definitivamente do cadastro de ativos.`,
    timestamp: new Date().toISOString()
  });
  res.json({
    success: true,
    removedCount: initialLen - currentDb.machines.length,
    deletedMachineIds: currentDb.deletedMachineIds
  });
});

// Reset database to initial factory defaults
app.post('/api/reset', (req, res) => {
  const initial = getInitialDatabase();
  saveDatabase(initial);
  broadcastRealtime({
    type: 'DATABASE_UPDATED',
    data: {
      components: initial.components,
      machines: initial.machines,
      deletedComponentIds: [],
      deletedMachineIds: [],
      categoryPermissions: initial.categoryPermissions
    },
    message: 'Banco de dados restaurado para o padrão de fábrica.',
    timestamp: initial.lastUpdated
  });
  res.json({ success: true, database: initial });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: HOST },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[IFTA SERVER] Rodando em http://${HOST}:${PORT} (Modo: ${isProd ? 'Produção' : 'Desenvolvimento'})`);
    console.log(`[IFTA SERVER] Armazenamento Docker persistente em: ${DATA_FILE}`);
  });
}

startServer();

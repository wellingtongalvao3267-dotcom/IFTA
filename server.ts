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

// Ensure data directory exists for persistent Docker storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database representation for persistent JSON storage in Docker container
interface IftaDatabase {
  components: ComponentItem[];
  machines: MachineItem[];
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
    categoryPermissions: INITIAL_CATEGORY_PERMISSIONS,
    users: INITIAL_USERS,
    logs: INITIAL_LOGS,
    version: '2026.3',
    lastUpdated: new Date().toISOString()
  };
}

let memoryDbCache: IftaDatabase | null = null;

function saveDatabase(db: IftaDatabase): boolean {
  try {
    db.lastUpdated = new Date().toISOString();
    memoryDbCache = db;
    const tempFile = `${DATA_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('[DATABASE] Erro ao salvar arquivo persistente no Docker/disco:', err);
    return false;
  }
}

// Database representation for persistent JSON storage in Docker container
function loadDatabase(): IftaDatabase {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.machines)) {
        let needsSave = false;
        if (parsed.machines.length === 0) {
          parsed.machines = INITIAL_MACHINES;
          needsSave = true;
        }
        INITIAL_COMPONENTS.forEach(ic => {
          if (!parsed.components.some((c: any) => c.id === ic.id || c.tagCode === ic.tagCode)) {
            parsed.components.push(ic);
            needsSave = true;
          }
        });
        if (Array.isArray(parsed.users)) {
          parsed.users.forEach((u: any) => {
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
        // Restaurar segregação estrita de perfis: Mecânica apenas itens da mecânica, Elétrica apenas da elétrica, CDI enxerga tudo
        parsed.categoryPermissions = INITIAL_CATEGORY_PERMISSIONS;
        needsSave = true;
        if (needsSave) {
          saveDatabase(parsed);
        }
        memoryDbCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('[DATABASE] Erro ao carregar arquivo de dados:', err);
    if (memoryDbCache) {
      console.log('[DATABASE] Restaurando do cache de memória ativo.');
      return memoryDbCache;
    }
  }
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
  const { components, machines, categoryPermissions, users, logs } = req.body;
  const currentDb = loadDatabase();
  if (Array.isArray(components)) currentDb.components = components;
  if (Array.isArray(machines)) currentDb.machines = machines;
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
      categoryPermissions: currentDb.categoryPermissions
    },
    message: 'Banco de dados técnico sincronizado e atualizado.',
    timestamp: currentDb.lastUpdated
  });

  res.json({ success: true, lastUpdated: currentDb.lastUpdated });
});

// Component item save / update
app.post('/api/components', (req, res) => {
  const comp: ComponentItem = req.body;
  if (!comp || !comp.tagCode) {
    return res.status(400).json({ error: 'Peça inválida ou sem código Tag' });
  }
  const currentDb = loadDatabase();
  const idx = currentDb.components.findIndex(c => c.id === comp.id || c.tagCode.toUpperCase() === comp.tagCode.toUpperCase());
  const now = new Date().toISOString();
  const normalizedComp = {
    ...comp,
    tagCode: comp.tagCode.trim().toUpperCase(),
    qrCodeData: `IFTA:${comp.tagCode.trim().toUpperCase()}`,
    updatedAt: now
  };

  if (idx >= 0) {
    currentDb.components[idx] = normalizedComp;
  } else {
    currentDb.components.unshift({ ...normalizedComp, createdAt: normalizedComp.createdAt || now });
  }

  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'COMPONENT_SAVED',
    data: normalizedComp,
    message: `Peça "${normalizedComp.name}" (${normalizedComp.tagCode}) atualizada no catálogo.`,
    timestamp: now
  });
  res.json({ success: true, component: normalizedComp });
});

// Component item delete (permanently removes until requested)
app.delete('/api/components/:id', (req, res) => {
  const { id } = req.params;
  const currentDb = loadDatabase();
  const initialLen = currentDb.components.length;
  currentDb.components = currentDb.components.filter(c => c.id !== id && c.tagCode !== id);

  // Unlink from machines
  currentDb.machines.forEach(m => {
    if (m.linkedComponents) {
      m.linkedComponents = m.linkedComponents.filter(l => l.componentId !== id);
    }
  });

  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'COMPONENT_DELETED',
    data: { id },
    message: `Peça excluída do catálogo.`,
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, removedCount: initialLen - currentDb.components.length });
});

// Machine save / update
app.post('/api/machines', (req, res) => {
  const machine: MachineItem = req.body;
  if (!machine || !machine.tagCode) {
    return res.status(400).json({ error: 'Máquina inválida ou sem código Tag' });
  }
  const currentDb = loadDatabase();
  const idx = currentDb.machines.findIndex(m => m.id === machine.id || m.tagCode.toUpperCase() === machine.tagCode.toUpperCase());
  const now = new Date().toISOString();
  const normalizedMachine = {
    ...machine,
    tagCode: machine.tagCode.trim().toUpperCase(),
    qrCodeData: `IFTA:${machine.tagCode.trim().toUpperCase()}`,
    linkedComponents: Array.isArray(machine.linkedComponents) ? machine.linkedComponents : [],
    updatedAt: now
  };

  if (idx >= 0) {
    currentDb.machines[idx] = normalizedMachine;
  } else {
    currentDb.machines.unshift({ ...normalizedMachine, createdAt: normalizedMachine.createdAt || now });
  }

  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'MACHINE_SAVED',
    data: normalizedMachine,
    message: `Máquina "${normalizedMachine.name}" (${normalizedMachine.tagCode}) atualizada no catálogo.`,
    timestamp: now
  });
  res.json({ success: true, machine: normalizedMachine });
});

// Machine delete (permanently removes from persistent database)
app.delete('/api/machines/:id', (req, res) => {
  const { id } = req.params;
  const currentDb = loadDatabase();
  const initialLen = currentDb.machines.length;
  currentDb.machines = currentDb.machines.filter(m => m.id !== id && m.tagCode !== id);
  saveDatabase(currentDb);
  broadcastRealtime({
    type: 'MACHINE_DELETED',
    data: { id },
    message: `Máquina excluída do cadastro de ativos.`,
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, removedCount: initialLen - currentDb.machines.length });
});

// Reset database to initial factory defaults
app.post('/api/reset', (req, res) => {
  const initial = getInitialDatabase();
  saveDatabase(initial);
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

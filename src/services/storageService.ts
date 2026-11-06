import { ComponentItem, UserAccount, AccessLog, CategoryAccessRule, UserRole, MachineItem } from '../types';
import { INITIAL_USERS, INITIAL_COMPONENTS, INITIAL_CATEGORY_PERMISSIONS, INITIAL_LOGS, INITIAL_MACHINES } from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'ifta_users_v2',
  COMPONENTS: 'ifta_components_v2',
  MACHINES: 'ifta_machines_v2',
  CATEGORY_PERMISSIONS: 'ifta_cat_perms_v2',
  LOGS: 'ifta_access_logs_v2',
  CURRENT_USER: 'ifta_active_session_v2',
  HAS_SEEN_SPLASH: 'ifta_seen_splash_v2',
  PENDING_COMPONENTS: 'ifta_pending_comps_v3',
  PENDING_MACHINES: 'ifta_pending_maqs_v3',
  // Cofres imutáveis locais (nunca destruídos por reinicialização do servidor ou container)
  VAULT_COMPONENTS: 'ifta_vault_components_v4',
  VAULT_MACHINES: 'ifta_vault_machines_v4',
  // Tombstones (registros de exclusão explícita pelo usuário para evitar ressuscitar itens intencionalmente deletados)
  DELETED_COMPONENTS: 'ifta_deleted_components_v4',
  DELETED_MACHINES: 'ifta_deleted_machines_v4',
  // Espelho de backup automático de emergência
  SNAPSHOT_BACKUP: 'ifta_snapshot_backup_v4'
};

export const storageService = {
  init() {
    // 0. Scanner de Resgate Automático: recupera quaisquer itens cadastrados anteriormente
    // que estejam em qualquer chave do localStorage do navegador antes que qualquer sincronização ocorra
    this.salvageLostData();

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    } else {
      try {
        const users: UserAccount[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        let changed = false;
        users.forEach(u => {
          if (u.username === 'MANUTENCAO' || (u.role as string) === 'MANUTENCAO') {
            u.username = 'MECANICA';
            u.role = 'MECANICA';
            if (u.displayName === 'Equipe de Manutenção Geral') {
              u.displayName = 'Equipe Técnica Mecânica';
            }
            changed = true;
          }
          if (u.username === 'CDI' || (u.role as string) === 'CDI' || u.username === 'DESENVOLVEDOR' || (u.role as string) === 'DESENVOLVEDOR') {
            u.username = 'CDI';
            u.role = 'CDI';
            u.displayName = 'CDI (Centro de Documentação Industrial)';
            u.passwordHash = 'wlt@1616';
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      } catch {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.COMPONENTS)) {
      localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(INITIAL_COMPONENTS));
    } else {
      try {
        const comps: ComponentItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPONENTS) || '[]');
        let changed = false;
        comps.forEach(c => {
          if (c.visibleToRoles && (c.visibleToRoles as string[]).includes('MANUTENCAO')) {
            c.visibleToRoles = c.visibleToRoles.map(r => ((r as string) === 'MANUTENCAO' ? 'MECANICA' : r));
            changed = true;
          }
          if (c.visibleToRoles && (c.visibleToRoles as string[]).includes('DESENVOLVEDOR')) {
            c.visibleToRoles = c.visibleToRoles.map(r => ((r as string) === 'DESENVOLVEDOR' ? 'CDI' : r));
            changed = true;
          }
          // Sanitizar caminhos antigos /src/assets/images/ para /assets/images/
          if (c.imageUrl && c.imageUrl.startsWith('/src/assets/images/')) {
            c.imageUrl = c.imageUrl.replace('/src/assets/images/', '/assets/images/');
            changed = true;
          }
          // Atualizar imagens vazias com as imagens oficiais do INITIAL_COMPONENTS
          const matchInit = INITIAL_COMPONENTS.find(ic => ic.id === c.id || ic.tagCode === c.tagCode);
          if (matchInit && (!c.imageUrl || c.imageUrl === '')) {
            c.imageUrl = matchInit.imageUrl;
            changed = true;
          }
          // Garantir que o payload de QR Code seja sempre válido, único e persistido
          const tagUpper = (c.tagCode || '').trim().toUpperCase();
          if (!c.qrCodeData || !c.qrCodeData.startsWith('IFTA:')) {
            c.qrCodeData = `IFTA:${tagUpper}`;
            changed = true;
          }
        });
        // Garantir que os novos componentes da esteira (comp-008, comp-009, comp-010) estejam presentes
        INITIAL_COMPONENTS.forEach(initComp => {
          if (!comps.some(c => c.id === initComp.id || c.tagCode === initComp.tagCode)) {
            comps.push(initComp);
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(comps));
        }
      } catch {}
    }

    // Inicialização de Máquinas e Equipamentos
    if (!localStorage.getItem(STORAGE_KEYS.MACHINES)) {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(INITIAL_MACHINES));
    } else {
      try {
        const storedMachines: MachineItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MACHINES) || '[]');
        let changed = false;
        INITIAL_MACHINES.forEach(initMaq => {
          if (!storedMachines.some(m => m.id === initMaq.id || m.tagCode === initMaq.tagCode)) {
            storedMachines.push(initMaq);
            changed = true;
          }
        });
        // Garantir payload de QR Code válido e persistente para cada máquina e migrar permissões
        storedMachines.forEach(m => {
          const maqTagUpper = (m.tagCode || '').trim().toUpperCase();
          if (!m.qrCodeData || !m.qrCodeData.startsWith('IFTA:')) {
            m.qrCodeData = `IFTA:${maqTagUpper}`;
            changed = true;
          }
          if (!m.linkedComponents) {
            m.linkedComponents = [];
            changed = true;
          } else {
            m.linkedComponents.forEach(link => {
              if (!link.allowedRoles || link.allowedRoles.length === 0) {
                link.allowedRoles = ['CDI', 'MECANICA', 'ELETRICA'];
                changed = true;
              } else {
                if ((link.allowedRoles as string[]).includes('DESENVOLVEDOR')) {
                  link.allowedRoles = link.allowedRoles.map(r => ((r as string) === 'DESENVOLVEDOR' ? 'CDI' : r));
                  changed = true;
                }
                if ((link.allowedRoles as string[]).includes('MANUTENCAO')) {
                  link.allowedRoles = link.allowedRoles.map(r => ((r as string) === 'MANUTENCAO' ? 'MECANICA' : r));
                  changed = true;
                }
                // Garantir que CDI esteja sempre presente
                if (!link.allowedRoles.includes('CDI')) {
                  link.allowedRoles.push('CDI');
                  changed = true;
                }
              }
            });
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(storedMachines));
        }
      } catch {}
    }

    // Restaurar segregação estrita de categorias: Mecânica apenas itens mecânicos, Elétrica apenas itens elétricos, CDI total
    localStorage.setItem(STORAGE_KEYS.CATEGORY_PERMISSIONS, JSON.stringify(INITIAL_CATEGORY_PERMISSIONS));

    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    }

    const current = this.getCurrentUser();
    if (current && (current.username === 'MANUTENCAO' || (current.role as string) === 'MANUTENCAO')) {
      current.username = 'MECANICA';
      current.role = 'MECANICA';
      if (current.displayName === 'Equipe de Manutenção Geral') {
        current.displayName = 'Equipe Técnica Mecânica';
      }
      this.setCurrentUser(current);
    }
    if (current && (current.username === 'CDI' || (current.role as string) === 'CDI' || current.username === 'DESENVOLVEDOR' || (current.role as string) === 'DESENVOLVEDOR')) {
      current.username = 'CDI';
      current.role = 'CDI';
      current.displayName = 'CDI (Centro de Documentação Industrial)';
      current.passwordHash = 'wlt@1616';
      this.setCurrentUser(current);
    }

    // Sincronizar automaticamente com o servidor backend/Docker persistente
    this.syncWithServer().catch(() => {});
    
    // Iniciar canal em tempo real para sincronização instantânea entre múltiplos usuários
    this.initRealtime();
  },

  // --- Cofre Permanente Local (Nunca destruído por reinício do servidor) ---
  getVaultComponents(): ComponentItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VAULT_COMPONENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveToVaultComponent(comp: ComponentItem) {
    const vault = this.getVaultComponents();
    const cleanTag = comp.tagCode.trim().toUpperCase();
    const idx = vault.findIndex(c => c.id === comp.id || c.tagCode.toUpperCase() === cleanTag);
    if (idx >= 0) {
      vault[idx] = comp;
    } else {
      vault.unshift(comp);
    }
    localStorage.setItem(STORAGE_KEYS.VAULT_COMPONENTS, JSON.stringify(vault));
    this.removeDeletedComponentId(comp.id);
    this.removeDeletedComponentId(cleanTag);
  },

  removeFromVaultComponent(idOrTag: string) {
    const clean = idOrTag.trim().toUpperCase();
    const vault = this.getVaultComponents().filter(
      c => c.id !== idOrTag && c.tagCode.toUpperCase() !== clean
    );
    localStorage.setItem(STORAGE_KEYS.VAULT_COMPONENTS, JSON.stringify(vault));
  },

  getVaultMachines(): MachineItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VAULT_MACHINES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveToVaultMachine(maq: MachineItem) {
    const vault = this.getVaultMachines();
    const cleanTag = maq.tagCode.trim().toUpperCase();
    const idx = vault.findIndex(m => m.id === maq.id || m.tagCode.toUpperCase() === cleanTag);
    if (idx >= 0) {
      vault[idx] = maq;
    } else {
      vault.unshift(maq);
    }
    localStorage.setItem(STORAGE_KEYS.VAULT_MACHINES, JSON.stringify(vault));
    this.removeDeletedMachineId(maq.id);
    this.removeDeletedMachineId(cleanTag);
  },

  removeFromVaultMachine(idOrTag: string) {
    const clean = idOrTag.trim().toUpperCase();
    const vault = this.getVaultMachines().filter(
      m => m.id !== idOrTag && m.tagCode.toUpperCase() !== clean
    );
    localStorage.setItem(STORAGE_KEYS.VAULT_MACHINES, JSON.stringify(vault));
  },

  // --- Tombstones (Registros de Exclusão Explícita pelo Usuário) ---
  getDeletedComponentIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_COMPONENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addDeletedComponentId(idOrTag: string) {
    if (!idOrTag) return;
    const deleted = this.getDeletedComponentIds();
    const upper = idOrTag.trim().toUpperCase();
    if (!deleted.includes(upper)) {
      deleted.push(upper);
      localStorage.setItem(STORAGE_KEYS.DELETED_COMPONENTS, JSON.stringify(deleted));
    }
  },

  removeDeletedComponentId(idOrTag: string) {
    if (!idOrTag) return;
    const upper = idOrTag.trim().toUpperCase();
    const deleted = this.getDeletedComponentIds().filter(d => d !== upper && d !== idOrTag);
    localStorage.setItem(STORAGE_KEYS.DELETED_COMPONENTS, JSON.stringify(deleted));
  },

  getDeletedMachineIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_MACHINES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addDeletedMachineId(idOrTag: string) {
    if (!idOrTag) return;
    const deleted = this.getDeletedMachineIds();
    const upper = idOrTag.trim().toUpperCase();
    if (!deleted.includes(upper)) {
      deleted.push(upper);
      localStorage.setItem(STORAGE_KEYS.DELETED_MACHINES, JSON.stringify(deleted));
    }
  },

  removeDeletedMachineId(idOrTag: string) {
    if (!idOrTag) return;
    const upper = idOrTag.trim().toUpperCase();
    const deleted = this.getDeletedMachineIds().filter(d => d !== upper && d !== idOrTag);
    localStorage.setItem(STORAGE_KEYS.DELETED_MACHINES, JSON.stringify(deleted));
  },

  // --- Scanner de Resgate Automático de Itens Perdidos (Executado apenas 1 vez para migração limpa) ---
  salvageLostData() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      if (localStorage.getItem('ifta_salvaged_v1') === 'true') return;
      localStorage.setItem('ifta_salvaged_v1', 'true');

      const initCompIds = new Set(INITIAL_COMPONENTS.map(c => c.id));
      const initCompTags = new Set(INITIAL_COMPONENTS.map(c => (c.tagCode || '').toUpperCase()));
      const initMaqIds = new Set(INITIAL_MACHINES.map(m => m.id));
      const initMaqTags = new Set(INITIAL_MACHINES.map(m => (m.tagCode || '').toUpperCase()));
      const deletedComps = new Set(this.getDeletedComponentIds());
      const deletedMaqs = new Set(this.getDeletedMachineIds());

      const activeKeys = new Set(Object.values(STORAGE_KEYS));

      // Captura lista de chaves antes de qualquer modificação para evitar erros de iteração
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }

      for (const key of allKeys) {
        if (activeKeys.has(key)) continue;

        try {
          const val = localStorage.getItem(key);
          if (!val || (!val.startsWith('{') && !val.startsWith('['))) continue;
          const parsed = JSON.parse(val);

          const candidateList: any[] = Array.isArray(parsed)
            ? parsed
            : (parsed.components || parsed.machines || parsed.data?.components || parsed.data?.machines || []);

          if (Array.isArray(candidateList)) {
            candidateList.forEach(item => {
              if (!item || typeof item !== 'object' || !item.tagCode || typeof item.tagCode !== 'string') return;
              const tagUpper = item.tagCode.trim().toUpperCase();
              const id = String(item.id || '');

              // É um componente customizado válido?
              if (item.name && (item.category !== undefined || item.specs !== undefined)) {
                if (!initCompIds.has(id) && !initCompTags.has(tagUpper) && !deletedComps.has(id) && !deletedComps.has(tagUpper)) {
                  this.saveToVaultComponent(item as ComponentItem);
                }
              }

              // É uma máquina customizada válida?
              if (item.name && (item.linkedComponents !== undefined || item.criticalityLevel !== undefined || item.sector !== undefined)) {
                if (!initMaqIds.has(id) && !initMaqTags.has(tagUpper) && !deletedMaqs.has(id) && !deletedMaqs.has(tagUpper)) {
                  this.saveToVaultMachine(item as MachineItem);
                }
              }
            });
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[IFTA RESGATE] Scanner de recuperação finalizado com segurança.');
    }
  },

  // --- Algoritmo de União Reconciliatória Puro (Sem efeitos colaterais de rede) ---
  mergeComponentsWithVault(serverComps: ComponentItem[]): ComponentItem[] {
    const deletedIds = new Set(this.getDeletedComponentIds());
    const mergedMap = new Map<string, ComponentItem>();

    // 1. Preencher com dados válidos do servidor
    if (Array.isArray(serverComps)) {
      serverComps.forEach(c => {
        if (!c || !c.tagCode) return;
        const tagUpper = c.tagCode.trim().toUpperCase();
        if (!deletedIds.has(c.id) && !deletedIds.has(tagUpper)) {
          mergedMap.set(tagUpper, { ...c, tagCode: tagUpper });
        }
      });
    }

    // 2. Mesclar com o cofre permanente do dispositivo local
    const vaultComps = this.getVaultComponents();
    vaultComps.forEach(vc => {
      if (!vc || !vc.tagCode) return;
      const tagUpper = vc.tagCode.trim().toUpperCase();
      if (deletedIds.has(vc.id) || deletedIds.has(tagUpper)) return;

      if (!mergedMap.has(tagUpper)) {
        mergedMap.set(tagUpper, { ...vc, tagCode: tagUpper });
      } else {
        const existing = mergedMap.get(tagUpper)!;
        const vDate = new Date(vc.updatedAt || vc.createdAt || 0).getTime();
        const eDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (vDate > eDate) {
          mergedMap.set(tagUpper, { ...vc, tagCode: tagUpper });
        }
      }
    });

    // 3. Garantir itens de fábrica padrão
    INITIAL_COMPONENTS.forEach(ic => {
      const tagUpper = ic.tagCode.trim().toUpperCase();
      if (!deletedIds.has(ic.id) && !deletedIds.has(tagUpper) && !mergedMap.has(tagUpper)) {
        mergedMap.set(tagUpper, ic);
      }
    });

    return Array.from(mergedMap.values());
  },

  mergeMachinesWithVault(serverMaqs: MachineItem[]): MachineItem[] {
    const deletedIds = new Set(this.getDeletedMachineIds());
    const mergedMap = new Map<string, MachineItem>();

    // 1. Preencher com dados válidos do servidor
    if (Array.isArray(serverMaqs)) {
      serverMaqs.forEach(m => {
        if (!m || !m.tagCode) return;
        const tagUpper = m.tagCode.trim().toUpperCase();
        if (!deletedIds.has(m.id) && !deletedIds.has(tagUpper)) {
          mergedMap.set(tagUpper, { ...m, tagCode: tagUpper });
        }
      });
    }

    // 2. Mesclar com cofre permanente do dispositivo local
    const vaultMaqs = this.getVaultMachines();
    vaultMaqs.forEach(vm => {
      if (!vm || !vm.tagCode) return;
      const tagUpper = vm.tagCode.trim().toUpperCase();
      if (deletedIds.has(vm.id) || deletedIds.has(tagUpper)) return;

      if (!mergedMap.has(tagUpper)) {
        mergedMap.set(tagUpper, { ...vm, tagCode: tagUpper });
      } else {
        const existing = mergedMap.get(tagUpper)!;
        const vDate = new Date(vm.updatedAt || vm.createdAt || 0).getTime();
        const eDate = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (vDate > eDate) {
          mergedMap.set(tagUpper, { ...vm, tagCode: tagUpper });
        }
      }
    });

    // 3. Garantir máquinas de fábrica
    INITIAL_MACHINES.forEach(im => {
      const tagUpper = im.tagCode.trim().toUpperCase();
      if (!deletedIds.has(im.id) && !deletedIds.has(tagUpper) && !mergedMap.has(tagUpper)) {
        mergedMap.set(tagUpper, im);
      }
    });

    return Array.from(mergedMap.values());
  },

  async rehydrateServerBatch(components: ComponentItem[], machines: MachineItem[]) {
    if (components.length === 0 && machines.length === 0) return;
    try {
      await fetch('/api/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ components, machines })
      });
    } catch {}
  },

  initRealtime() {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      if (typeof EventSource === 'undefined') return;
      try {
        if (eventSource) {
          try { eventSource.close(); } catch {}
        }

        // withCredentials garante autenticação e tráfego seguro de cookies em proxies e celulares
        eventSource = new EventSource('/api/realtime', { withCredentials: true });

        eventSource.onopen = () => {
          window.dispatchEvent(new CustomEvent('ifta_realtime_status', { detail: { connected: true } }));
        };

        eventSource.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data);
            if (!event || !event.type) return;

            // Snapshot recebido ao conectar imediatamente (não-destrutivo: união com o cofre)
            if (event.type === 'CONNECTED' && event.data) {
              const mergedComps = this.mergeComponentsWithVault(Array.isArray(event.data.components) ? event.data.components : []);
              const mergedMaqs = this.mergeMachinesWithVault(Array.isArray(event.data.machines) ? event.data.machines : []);
              
              localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(mergedComps));
              localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(mergedMaqs));
              localStorage.setItem(STORAGE_KEYS.SNAPSHOT_BACKUP, JSON.stringify({ components: mergedComps, machines: mergedMaqs }));

              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            } else if (event.type === 'COMPONENT_SAVED' && event.data) {
              const comp: ComponentItem = event.data;
              this.saveToVaultComponent(comp);
              this.removePendingSyncComponent(comp.id);
              this.removePendingSyncComponent(comp.tagCode);

              const items = this.getComponents();
              const idx = items.findIndex(c => c.id === comp.id || c.tagCode.toUpperCase() === comp.tagCode.toUpperCase());
              if (idx >= 0) {
                items[idx] = comp;
              } else {
                items.unshift(comp);
              }
              localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(items));
              window.dispatchEvent(new CustomEvent('ifta_realtime_notification', {
                detail: {
                  type: 'component',
                  action: idx >= 0 ? 'edit' : 'create',
                  item: comp,
                  message: `Peça "${comp.name}" (${comp.tagCode}) atualizada no catálogo!`
                }
              }));
              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            } else if (event.type === 'COMPONENT_DELETED' && event.data) {
              const { id } = event.data;
              this.addDeletedComponentId(id);
              this.removeFromVaultComponent(id);
              this.removePendingSyncComponent(id);

              const items = this.getComponents().filter(c => c.id !== id && c.tagCode !== id);
              localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(items));
              window.dispatchEvent(new CustomEvent('ifta_realtime_notification', {
                detail: {
                  type: 'component',
                  action: 'delete',
                  id,
                  message: `Uma peça foi removida do catálogo.`
                }
              }));
              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            } else if (event.type === 'MACHINE_SAVED' && event.data) {
              const machine: MachineItem = event.data;
              this.saveToVaultMachine(machine);
              this.removePendingSyncMachine(machine.id);
              this.removePendingSyncMachine(machine.tagCode);

              const machines = this.getMachines();
              const idx = machines.findIndex(m => m.id === machine.id || m.tagCode.toUpperCase() === machine.tagCode.toUpperCase());
              if (idx >= 0) {
                machines[idx] = machine;
              } else {
                machines.unshift(machine);
              }
              localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
              window.dispatchEvent(new CustomEvent('ifta_realtime_notification', {
                detail: {
                  type: 'machine',
                  action: idx >= 0 ? 'edit' : 'create',
                  item: machine,
                  message: `Máquina "${machine.name}" (${machine.tagCode}) atualizada no catálogo!`
                }
              }));
              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            } else if (event.type === 'MACHINE_DELETED' && event.data) {
              const { id } = event.data;
              this.addDeletedMachineId(id);
              this.removeFromVaultMachine(id);
              this.removePendingSyncMachine(id);

              const machines = this.getMachines().filter(m => m.id !== id && m.tagCode !== id);
              localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
              window.dispatchEvent(new CustomEvent('ifta_realtime_notification', {
                detail: {
                  type: 'machine',
                  action: 'delete',
                  id,
                  message: `Uma máquina foi excluída do sistema.`
                }
              }));
              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            } else if (event.type === 'DATABASE_UPDATED' && event.data) {
              if (Array.isArray(event.data.components)) {
                const mergedComps = this.mergeComponentsWithVault(event.data.components);
                localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(mergedComps));
              }
              if (Array.isArray(event.data.machines)) {
                const mergedMaqs = this.mergeMachinesWithVault(event.data.machines);
                localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(mergedMaqs));
              }
              window.dispatchEvent(new CustomEvent('ifta_data_synced'));
            }
          } catch {}
        };

        eventSource.onerror = () => {
          window.dispatchEvent(new CustomEvent('ifta_realtime_status', { detail: { connected: false } }));
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 4000);
        };
      } catch {}
    };

    connect();

    // Reconnect and sync on network restore
    window.addEventListener('online', () => {
      this.syncWithServer().catch(() => {});
      connect();
    });

    // Sincronização instantânea ao alternar abas ou focar a tela no celular
    window.addEventListener('focus', () => {
      this.syncWithServer().catch(() => {});
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithServer().catch(() => {});
      }
    });

    // Polling suave de segurança a cada 30s apenas quando o usuário está com a aba aberta
    setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.syncWithServer().catch(() => {});
      }
    }, 30000);
  },

  getPendingSyncComponents(): ComponentItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_COMPONENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addPendingSyncComponent(item: ComponentItem) {
    if (!item || !item.tagCode) return;
    const cleanTag = item.tagCode.trim().toUpperCase();
    const list = this.getPendingSyncComponents();
    const idx = list.findIndex(c => c.id === item.id || (c.tagCode && c.tagCode.toUpperCase() === cleanTag));
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem(STORAGE_KEYS.PENDING_COMPONENTS, JSON.stringify(list));
  },

  removePendingSyncComponent(idOrTag: string) {
    if (!idOrTag) return;
    const clean = idOrTag.trim().toUpperCase();
    const list = this.getPendingSyncComponents().filter(
      c => c.id !== idOrTag && (c.tagCode || '').toUpperCase() !== clean
    );
    localStorage.setItem(STORAGE_KEYS.PENDING_COMPONENTS, JSON.stringify(list));
  },

  getPendingSyncMachines(): MachineItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_MACHINES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addPendingSyncMachine(item: MachineItem) {
    if (!item || !item.tagCode) return;
    const cleanTag = item.tagCode.trim().toUpperCase();
    const list = this.getPendingSyncMachines();
    const idx = list.findIndex(m => m.id === item.id || (m.tagCode && m.tagCode.toUpperCase() === cleanTag));
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    localStorage.setItem(STORAGE_KEYS.PENDING_MACHINES, JSON.stringify(list));
  },

  removePendingSyncMachine(idOrTag: string) {
    if (!idOrTag) return;
    const clean = idOrTag.trim().toUpperCase();
    const list = this.getPendingSyncMachines().filter(
      m => m.id !== idOrTag && (m.tagCode || '').toUpperCase() !== clean
    );
    localStorage.setItem(STORAGE_KEYS.PENDING_MACHINES, JSON.stringify(list));
  },

  async syncWithServer(): Promise<{ success: boolean; source: 'server' | 'offline' }> {
    try {
      // 1. Enviar primeiro quaisquer peças pendentes de sincronização
      const pendingComps = this.getPendingSyncComponents();
      for (const comp of pendingComps) {
        try {
          const pushRes = await fetch('/api/components', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(comp)
          });
          if (pushRes.ok) {
            this.removePendingSyncComponent(comp.id);
            this.removePendingSyncComponent(comp.tagCode);
          }
        } catch {}
      }

      // 2. Enviar máquinas pendentes de sincronização
      const pendingMaqs = this.getPendingSyncMachines();
      for (const maq of pendingMaqs) {
        try {
          const pushRes = await fetch('/api/machines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(maq)
          });
          if (pushRes.ok) {
            this.removePendingSyncMachine(maq.id);
            this.removePendingSyncMachine(maq.tagCode);
          }
        } catch {}
      }

      // 3. Buscar snapshot mais recente do servidor
      const res = await fetch(`/api/data?_t=${Date.now()}`, {
        headers: { 
          'Cache-Control': 'no-cache, no-store',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Falha na resposta do servidor');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Resposta do servidor não é JSON');
      }
      const serverDb = await res.json();

      if (serverDb && Array.isArray(serverDb.components) && Array.isArray(serverDb.machines)) {
        let changed = false;

        // 4. Reconciliação não-destrutiva com o cofre permanente
        const mergedComponents = this.mergeComponentsWithVault(serverDb.components);
        const mergedMachines = this.mergeMachinesWithVault(serverDb.machines);

        // Comparação direta com o JSON bruto armazenado (evita disparar se nada mudou)
        const currentCompsStr = localStorage.getItem(STORAGE_KEYS.COMPONENTS) || '[]';
        const mergedCompsStr = JSON.stringify(mergedComponents);
        if (currentCompsStr !== mergedCompsStr) {
          localStorage.setItem(STORAGE_KEYS.COMPONENTS, mergedCompsStr);
          changed = true;
        }

        const currentMaqsStr = localStorage.getItem(STORAGE_KEYS.MACHINES) || '[]';
        const mergedMaqsStr = JSON.stringify(mergedMachines);
        if (currentMaqsStr !== mergedMaqsStr) {
          localStorage.setItem(STORAGE_KEYS.MACHINES, mergedMaqsStr);
          changed = true;
        }

        if (Array.isArray(serverDb.categoryPermissions)) {
          const localPermsStr = localStorage.getItem(STORAGE_KEYS.CATEGORY_PERMISSIONS) || '[]';
          const serverPermsStr = JSON.stringify(serverDb.categoryPermissions);
          if (localPermsStr !== serverPermsStr) {
            localStorage.setItem(STORAGE_KEYS.CATEGORY_PERMISSIONS, serverPermsStr);
            changed = true;
          }
        }

        // 5. Auto-reidratação do servidor se o servidor tiver sido reiniciado sem itens do cofre
        const serverCompTags = new Set(serverDb.components.map((c: any) => (c.tagCode || '').toUpperCase()));
        const missingComps = this.getVaultComponents().filter(vc => vc.tagCode && !serverCompTags.has(vc.tagCode.toUpperCase()));

        const serverMaqTags = new Set(serverDb.machines.map((m: any) => (m.tagCode || '').toUpperCase()));
        const missingMaqs = this.getVaultMachines().filter(vm => vm.tagCode && !serverMaqTags.has(vm.tagCode.toUpperCase()));

        if (missingComps.length > 0 || missingMaqs.length > 0) {
          this.rehydrateServerBatch(missingComps, missingMaqs).catch(() => {});
        }

        if (changed && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ifta_data_synced'));
        }
        return { success: true, source: 'server' };
      }
    } catch {
      // Fallback offline: dados continuam protegidos no cofre e localStorage
    }
    return { success: false, source: 'offline' };
  },

  getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  updateUserPassword(userId: string, newPassword: string): boolean {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].passwordHash = newPassword;
      this.saveUsers(users);
      return true;
    }
    return false;
  },

  updateUserProfile(userId: string, data: { displayName?: string; username?: string }): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      if (data.displayName !== undefined && data.displayName.trim()) {
        users[idx].displayName = data.displayName.trim();
      }
      if (data.username !== undefined && data.username.trim()) {
        users[idx].username = data.username.trim();
      }
      this.saveUsers(users);
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedCurrent = { ...currentUser, ...users[idx] };
        this.setCurrentUser(updatedCurrent);
      }
      return users[idx];
    }
    return null;
  },

  getCategoryPermissions(): CategoryAccessRule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORY_PERMISSIONS);
      return data ? JSON.parse(data) : INITIAL_CATEGORY_PERMISSIONS;
    } catch {
      return INITIAL_CATEGORY_PERMISSIONS;
    }
  },

  saveCategoryPermissions(rules: CategoryAccessRule[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_PERMISSIONS, JSON.stringify(rules));
  },

  getComponents(): ComponentItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPONENTS);
      let items: ComponentItem[] = data ? JSON.parse(data) : INITIAL_COMPONENTS;

      // Salvaguarda: garantir que quaisquer peças customizadas salvas no cofre permanente nunca desapareçam
      const vault = this.getVaultComponents();
      const deletedIds = new Set(this.getDeletedComponentIds());
      let enriched = false;

      vault.forEach(vc => {
        if (!vc || !vc.tagCode) return;
        const tagUpper = vc.tagCode.trim().toUpperCase();
        if (!deletedIds.has(vc.id) && !deletedIds.has(tagUpper)) {
          if (!items.some(i => i.id === vc.id || (i.tagCode && i.tagCode.trim().toUpperCase() === tagUpper))) {
            items.unshift(vc);
            enriched = true;
          }
        }
      });

      if (enriched) {
        localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(items));
      }

      return items.map(c => {
        const safeTag = (c.tagCode || 'TAG-PENDING').trim().toUpperCase();
        const initMatch = INITIAL_COMPONENTS.find(ic => ic.id === c.id || ic.tagCode.toUpperCase() === safeTag);
        const safeCategory = c.category || initMatch?.category || 'Mecânica';
        const catLower = safeCategory.toLowerCase();
        const isElec = ['elétrica', 'eletrica', 'automação', 'automacao', 'instrumentação', 'instrumentacao', 'painéis', 'paineis'].includes(catLower);
        const defaultRoles = isElec ? (['CDI', 'ELETRICA'] as UserRole[]) : (['CDI', 'MECANICA'] as UserRole[]);

        return {
          ...c,
          id: c.id || initMatch?.id || (safeTag ? `comp-${safeTag.toLowerCase()}` : `comp-${Date.now()}`),
          tagCode: safeTag,
          name: c.name || initMatch?.name || 'Componente Técnico',
          category: safeCategory,
          manufacturer: c.manufacturer || initMatch?.manufacturer || 'Fabricante Homologado',
          model: c.model || initMatch?.model || 'Modelo Padrão',
          application: c.application || initMatch?.application || 'Equipamento Geral de Planta',
          description: c.description || initMatch?.description || 'Descrição técnica operacional.',
          imageUrl: c.imageUrl || initMatch?.imageUrl || '',
          technicalDiagramUrl: c.technicalDiagramUrl || initMatch?.technicalDiagramUrl || '',
          diagramDescription: c.diagramDescription || initMatch?.diagramDescription || '',
          specs: Array.isArray(c.specs) && c.specs.length > 0 ? c.specs : (initMatch?.specs || []),
          maintenanceIntervalHours: c.maintenanceIntervalHours || initMatch?.maintenanceIntervalHours || 4000,
          maintenanceGuide: Array.isArray(c.maintenanceGuide) && c.maintenanceGuide.length > 0 ? c.maintenanceGuide : (initMatch?.maintenanceGuide || []),
          commonFailures: Array.isArray(c.commonFailures) && c.commonFailures.length > 0 ? c.commonFailures : (initMatch?.commonFailures || []),
          manualFileName: c.manualFileName || initMatch?.manualFileName || 'manual_tecnico.pdf',
          manualSummary: c.manualSummary || initMatch?.manualSummary || 'Manual operacional.',
          qrCodeData: c.qrCodeData || `IFTA:${safeTag}`,
          visibleToRoles: Array.isArray(c.visibleToRoles) && c.visibleToRoles.length > 0 ? c.visibleToRoles : (initMatch?.visibleToRoles || defaultRoles),
          createdAt: c.createdAt || initMatch?.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString()
        };
      });
    } catch {
      return INITIAL_COMPONENTS;
    }
  },

  saveComponents(items: ComponentItem[]) {
    localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(items));
    items.forEach(c => this.saveToVaultComponent(c));
    fetch('/api/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ components: items })
    }).catch(() => {});
  },

  isComponentTagUnique(tagCode: string, excludeId?: string): boolean {
    const clean = tagCode.trim().toUpperCase();
    if (!clean) return false;
    const comps = this.getComponents();
    return !comps.some(c => c.tagCode.toUpperCase() === clean && c.id !== excludeId);
  },

  generateUniqueComponentTag(prefix = 'COMP'): string {
    const comps = this.getComponents();
    const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'COMP';
    let counter = comps.length + 1;
    let candidate = `${cleanPrefix}-${String(counter).padStart(3, '0')}`;
    while (comps.some(c => c.tagCode.toUpperCase() === candidate)) {
      counter++;
      candidate = `${cleanPrefix}-${String(counter).padStart(3, '0')}`;
    }
    return candidate;
  },

  async saveComponent(item: ComponentItem): Promise<ComponentItem> {
    const items = this.getComponents();
    const cleanTag = item.tagCode.trim().toUpperCase();
    const idx = items.findIndex(i => i.id === item.id || (item.tagCode && i.tagCode.toUpperCase() === cleanTag));
    const now = new Date().toISOString();
    const cleanQr = `IFTA:${cleanTag}`;

    const normalizedItem: ComponentItem = {
      ...item,
      tagCode: cleanTag,
      qrCodeData: cleanQr,
      updatedAt: now
    };
    
    let resultItem: ComponentItem;
    if (idx >= 0) {
      items[idx] = normalizedItem;
      resultItem = items[idx];
    } else {
      const newItem = { 
        ...normalizedItem, 
        id: item.id || `comp-${Date.now()}`,
        createdAt: item.createdAt || now 
      };
      items.unshift(newItem);
      resultItem = newItem;
    }

    // 1. Salva no cofre permanente imutável do dispositivo (não perece com reinício de servidor)
    this.saveToVaultComponent(resultItem);
    this.removeDeletedComponentId(resultItem.id);
    this.removeDeletedComponentId(cleanTag);

    // 2. Salva em LocalStorage e adiciona à fila de sincronização pendente
    localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(items));
    this.addPendingSyncComponent(resultItem);
    window.dispatchEvent(new CustomEvent('ifta_data_synced'));

    // 3. Persistência direta no servidor / Docker com broadcast em tempo real
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(resultItem)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.component) {
          resultItem = json.component;
          this.saveToVaultComponent(resultItem);
          this.removePendingSyncComponent(resultItem.id);
          this.removePendingSyncComponent(resultItem.tagCode);
          (resultItem as any)._synced = true;

          const currentItems = this.getComponents();
          const targetIdx = currentItems.findIndex(c => c.id === resultItem.id || c.tagCode.toUpperCase() === resultItem.tagCode.toUpperCase());
          if (targetIdx >= 0) {
            currentItems[targetIdx] = resultItem;
          } else {
            currentItems.unshift(resultItem);
          }
          localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(currentItems));
          window.dispatchEvent(new CustomEvent('ifta_data_synced'));
        }
      }
    } catch (err) {
      console.warn('[STORAGE] Rede indisponível - peça preservada no cofre local:', err);
    }

    return resultItem;
  },

  async deleteComponent(id: string): Promise<boolean> {
    const items = this.getComponents();
    const itemToDelete = items.find(i => i.id === id || i.tagCode === id);
    const tagToDelete = itemToDelete ? itemToDelete.tagCode : id;

    // Registra tombstone para não ressuscitar por sincronização
    this.addDeletedComponentId(id);
    this.addDeletedComponentId(tagToDelete);
    this.removeFromVaultComponent(id);
    this.removeFromVaultComponent(tagToDelete);
    this.removePendingSyncComponent(id);
    this.removePendingSyncComponent(tagToDelete);

    const filtered = items.filter(i => i.id !== id && i.tagCode !== id && i.tagCode.toUpperCase() !== tagToDelete.toUpperCase());
    if (filtered.length !== items.length) {
      localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(filtered));

      // Atualiza componentes vinculados nas máquinas
      const machines = this.getMachines();
      let machinesChanged = false;
      const updatedMachines = machines.map(m => {
        if (m.linkedComponents && m.linkedComponents.some(l => l.componentId === id)) {
          machinesChanged = true;
          return {
            ...m,
            linkedComponents: m.linkedComponents.filter(l => l.componentId !== id)
          };
        }
        return m;
      });
      if (machinesChanged) {
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updatedMachines));
      }

      window.dispatchEvent(new CustomEvent('ifta_data_synced'));

      // Exclusão definitiva no backend / Docker
      try {
        await fetch(`/api/components/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (err) {
        console.warn('[STORAGE] Erro ao excluir peça no servidor:', err);
      }

      return true;
    }
    return false;
  },

  getVisibleComponentsForRole(role: UserRole): ComponentItem[] {
    const all = this.getComponents();
    // Perfil CDI e Desenvolvedor têm acesso irrestrito a todo o catálogo técnico (colaborativo)
    if (role === 'CDI' || role === 'DESENVOLVEDOR') {
      return all;
    }

    const mechanicalCategories = ['mecânica', 'mecanica', 'pneumática', 'pneumatica', 'hidráulica', 'hidraulica'];
    const electricalCategories = ['elétrica', 'eletrica', 'automação', 'automacao', 'instrumentação', 'instrumentacao', 'painéis', 'paineis'];

    return all.filter(item => {
      const catLower = (item.category || '').trim().toLowerCase();

      // Perfil MECÂNICA: enxerga apenas itens da mecânica
      if (role === 'MECANICA') {
        if (electricalCategories.includes(catLower)) {
          return Array.isArray(item.visibleToRoles) && item.visibleToRoles.includes('MECANICA');
        }
        if (mechanicalCategories.includes(catLower)) {
          if (Array.isArray(item.visibleToRoles) && item.visibleToRoles.length > 0) {
            return item.visibleToRoles.includes('MECANICA');
          }
          return true;
        }
        return Array.isArray(item.visibleToRoles) && item.visibleToRoles.includes('MECANICA');
      }

      // Perfil ELÉTRICA: enxerga apenas itens da elétrica
      if (role === 'ELETRICA') {
        if (mechanicalCategories.includes(catLower)) {
          return Array.isArray(item.visibleToRoles) && item.visibleToRoles.includes('ELETRICA');
        }
        if (electricalCategories.includes(catLower)) {
          if (Array.isArray(item.visibleToRoles) && item.visibleToRoles.length > 0) {
            return item.visibleToRoles.includes('ELETRICA');
          }
          return true;
        }
        return Array.isArray(item.visibleToRoles) && item.visibleToRoles.includes('ELETRICA');
      }

      return false;
    });
  },

  getMachines(): MachineItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MACHINES);
      let list: MachineItem[] = data ? JSON.parse(data) : INITIAL_MACHINES;

      // Salvaguarda: garantir que quaisquer máquinas salvas no cofre permanente nunca desapareçam
      const vault = this.getVaultMachines();
      const deletedIds = new Set(this.getDeletedMachineIds());
      let enriched = false;

      vault.forEach(vm => {
        if (!vm || !vm.tagCode) return;
        const tagUpper = vm.tagCode.trim().toUpperCase();
        if (!deletedIds.has(vm.id) && !deletedIds.has(tagUpper)) {
          if (!list.some(m => m.id === vm.id || (m.tagCode && m.tagCode.trim().toUpperCase() === tagUpper))) {
            list.unshift(vm);
            enriched = true;
          }
        }
      });

      if (enriched) {
        localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(list));
      }

      return list.map(m => {
        const safeTag = (m.tagCode || 'MAQ-PENDING').trim().toUpperCase();
        const initMatch = INITIAL_MACHINES.find(im => im.id === m.id || im.tagCode.toUpperCase() === safeTag);
        const safeLinked = Array.isArray(m.linkedComponents)
          ? m.linkedComponents
              .filter(l => l && (l.componentId || (l as any).tagCode))
              .map(l => ({
                componentId: String(l.componentId || (l as any).tagCode || '').trim(),
                positionOrFunction: l.positionOrFunction || '',
                allowedRoles: (Array.isArray(l.allowedRoles) ? l.allowedRoles : ['CDI', 'MECANICA', 'ELETRICA']) as UserRole[]
              }))
          : (initMatch?.linkedComponents || []);

        return {
          ...m,
          id: m.id || initMatch?.id || (safeTag ? `maq-${safeTag.toLowerCase()}` : `maq-${Date.now()}`),
          tagCode: safeTag,
          name: m.name || initMatch?.name || 'Máquina Industrial',
          sector: m.sector || initMatch?.sector || 'Planta Geral',
          description: m.description || initMatch?.description || 'Linha de produção operacional.',
          dimensions: m.dimensions || initMatch?.dimensions || '',
          status: m.status || initMatch?.status || 'OPERACIONAL',
          linkedComponents: safeLinked,
          imageUrl: m.imageUrl || initMatch?.imageUrl || '',
          diagramPdfUrl: m.diagramPdfUrl || initMatch?.diagramPdfUrl || '',
          diagramPdfFileName: m.diagramPdfFileName || initMatch?.diagramPdfFileName || '',
          diagramDescription: m.diagramDescription || initMatch?.diagramDescription || '',
          qrCodeData: m.qrCodeData || `IFTA:${safeTag}`,
          createdAt: m.createdAt || initMatch?.createdAt || new Date().toISOString(),
          updatedAt: m.updatedAt || new Date().toISOString()
        };
      });
    } catch {
      return INITIAL_MACHINES;
    }
  },

  saveMachines(machines: MachineItem[]) {
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
    machines.forEach(m => this.saveToVaultMachine(m));
    fetch('/api/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ machines })
    }).catch(() => {});
  },

  isMachineTagUnique(tagCode: string, excludeId?: string): boolean {
    const clean = tagCode.trim().toUpperCase();
    if (!clean) return false;
    const machines = this.getMachines();
    return !machines.some(m => m.tagCode.toUpperCase() === clean && m.id !== excludeId);
  },

  generateUniqueMachineTag(prefix = 'MAQ'): string {
    const machines = this.getMachines();
    const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'MAQ';
    let counter = machines.length + 1;
    let candidate = `${cleanPrefix}-${String(counter).padStart(2, '0')}`;
    while (machines.some(m => m.tagCode.toUpperCase() === candidate)) {
      counter++;
      candidate = `${cleanPrefix}-${String(counter).padStart(2, '0')}`;
    }
    return candidate;
  },

  async saveMachine(machine: MachineItem): Promise<MachineItem> {
    const machines = this.getMachines();
    const cleanTag = machine.tagCode.trim().toUpperCase();
    const idx = machines.findIndex(m => m.id === machine.id || (machine.tagCode && m.tagCode.toUpperCase() === cleanTag));
    const now = new Date().toISOString();
    const cleanQr = `IFTA:${cleanTag}`;

    const normalizedMachine: MachineItem = {
      ...machine,
      tagCode: cleanTag,
      qrCodeData: cleanQr,
      updatedAt: now
    };

    let resultMachine: MachineItem;
    if (idx >= 0) {
      machines[idx] = normalizedMachine;
      resultMachine = machines[idx];
    } else {
      const newMachine: MachineItem = {
        ...normalizedMachine,
        id: machine.id || `maq-${Date.now()}`,
        createdAt: now
      };
      machines.unshift(newMachine);
      resultMachine = newMachine;
    }

    // 1. Salva no cofre permanente imutável do dispositivo
    this.saveToVaultMachine(resultMachine);
    this.removeDeletedMachineId(resultMachine.id);
    this.removeDeletedMachineId(cleanTag);

    // 2. Salva localmente e adiciona à fila de sincronização pendente
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machines));
    this.addPendingSyncMachine(resultMachine);
    window.dispatchEvent(new CustomEvent('ifta_data_synced'));

    // 3. Persistência direta no servidor / Docker com broadcast
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(resultMachine)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.machine) {
          resultMachine = json.machine;
          this.saveToVaultMachine(resultMachine);
          this.removePendingSyncMachine(resultMachine.id);
          this.removePendingSyncMachine(resultMachine.tagCode);
          (resultMachine as any)._synced = true;

          const currentMachines = this.getMachines();
          const targetIdx = currentMachines.findIndex(m => m.id === resultMachine.id || m.tagCode.toUpperCase() === resultMachine.tagCode.toUpperCase());
          if (targetIdx >= 0) {
            currentMachines[targetIdx] = resultMachine;
          } else {
            currentMachines.unshift(resultMachine);
          }
          localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(currentMachines));
          window.dispatchEvent(new CustomEvent('ifta_data_synced'));
        }
      }
    } catch (err) {
      console.warn('[STORAGE] Rede indisponível - máquina preservada no cofre local:', err);
    }

    return resultMachine;
  },

  async deleteMachine(id: string): Promise<boolean> {
    const machines = this.getMachines();
    const itemToDelete = machines.find(m => m.id === id || m.tagCode === id);
    const tagToDelete = itemToDelete ? itemToDelete.tagCode : id;

    // Registra tombstone para não ressuscitar por sincronização
    this.addDeletedMachineId(id);
    this.addDeletedMachineId(tagToDelete);
    this.removeFromVaultMachine(id);
    this.removeFromVaultMachine(tagToDelete);
    this.removePendingSyncMachine(id);
    this.removePendingSyncMachine(tagToDelete);

    const filtered = machines.filter(m => m.id !== id && m.tagCode !== id && m.tagCode.toUpperCase() !== tagToDelete.toUpperCase());
    if (filtered.length !== machines.length) {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('ifta_data_synced'));

      // Exclusão definitiva no backend / Docker
      try {
        await fetch(`/api/machines/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (err) {
        console.warn('[STORAGE] Erro ao excluir máquina no servidor:', err);
      }

      return true;
    }
    return false;
  },

  getMachineById(id: string): MachineItem | null {
    const machines = this.getMachines();
    return machines.find(m => m.id === id) || null;
  },

  getLogs(): AccessLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  },

  addLog(username: string, role: UserRole, action: string, details?: string) {
    const logs = this.getLogs();
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const newLog: AccessLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: formattedDate,
      username,
      role,
      action,
      details: details || '',
      clientDevice: navigator.userAgent.includes('Mobile') ? 'Dispositivo Móvel' : 'Estação de Trabalho Desktop'
    };

    logs.unshift(newLog);
    // Keep last 150 logs
    if (logs.length > 150) {
      logs.length = 150;
    }
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  clearLogs() {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  },

  exportLogsCSV(): string {
    const logs = this.getLogs();
    const headers = ['ID', 'Data/Hora', 'Usuario', 'Perfil', 'Acao', 'Detalhes', 'Dispositivo'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.username}"`,
      `"${l.role}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.clientDevice || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.COMPONENTS, JSON.stringify(INITIAL_COMPONENTS));
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(INITIAL_MACHINES));
    localStorage.setItem(STORAGE_KEYS.CATEGORY_PERMISSIONS, JSON.stringify(INITIAL_CATEGORY_PERMISSIONS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
  },

  getCurrentUser(): UserAccount | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: UserAccount | null) {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { initOfflineSyncListener, syncOfflineQueue } from './services/offlineSync';

// ===== FORZAR MODO CLARO AL INICIAR =====
// La app siempre arranca en modo claro. Solo respeta dark si el usuario lo configuró manualmente.
const savedTheme = localStorage.getItem('inven_theme')
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
  document.body?.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
  document.body?.classList.remove('dark')
}

// Confirm this bundle started successfully so Capgo can keep it instead of rolling back to the previous bundle.
CapacitorUpdater.notifyAppReady();

// Iniciar detector de conectividad y sincronización offline automática
initOfflineSyncListener();
syncOfflineQueue();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

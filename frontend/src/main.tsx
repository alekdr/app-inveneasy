import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { initOfflineSyncListener, syncOfflineQueue } from './services/offlineSync';

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

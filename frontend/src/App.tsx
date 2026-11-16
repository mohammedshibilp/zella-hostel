import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PwaProvider, usePwa } from './context/PwaContext';
import { AppRoutes } from './routes/AppRoutes';
import { OfflineIndicator } from './components/Pwa/OfflineIndicator';
import { PwaUpdateToast } from './components/Pwa/PwaUpdateToast';
import { IosInstallModal } from './components/Pwa/IosInstallModal';

const PwaOverlays: React.FC = () => {
  const { isIosModalOpen, setIsIosModalOpen } = usePwa();
  return (
    <>
      <OfflineIndicator />
      <PwaUpdateToast />
      <IosInstallModal isOpen={isIosModalOpen} onClose={() => setIsIosModalOpen(false)} />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PwaProvider>
        <ToastProvider>
          <AuthProvider>
            <PwaOverlays />
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </PwaProvider>
    </BrowserRouter>
  );
};

export default App;

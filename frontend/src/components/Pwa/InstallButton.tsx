import React, { useState } from 'react';
import { usePwa } from '../../context/PwaContext';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '../Button';

interface InstallButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showInstalledBadge?: boolean;
  className?: string;
}

export const InstallButton: React.FC<InstallButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  showInstalledBadge = false,
  className = '',
}) => {
  const { isInstalled, isInstallable, installApp } = usePwa();
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  if (isInstalled) {
    if (!showInstalledBadge) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </span>
    );
  }

  // If not installable and not on iOS manual install, don't show
  if (!isInstallable) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      icon={<Download className="w-3.5 h-3.5" />}
      onClick={handleInstallClick}
      isLoading={isInstalling}
      className={className}
      title="Install Zellahostel Progressive Web App"
    >
      Install App
    </Button>
  );
};

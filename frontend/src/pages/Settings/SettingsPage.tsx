import React, { useEffect, useState } from 'react';
import { packageService } from '../../services/packageService';
import { authService } from '../../services/authService';
import { settingsService } from '../../services/settingsService';
import { Package, User } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { DataTable, Column } from '../../components/DataTable';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  Plus,
  Building,
  UserCheck,
  Tag,
  Shield,
  Smartphone,
  RefreshCw,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { notificationService } from '../../services/notificationService';
import { InstallButton } from '../../components/Pwa/InstallButton';

export const SettingsPage: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hostelSettings, setHostelSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isPackageModalOpen, setIsPackageModalOpen] = useState<boolean>(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);

  // Forms
  const [pkgForm, setPkgForm] = useState({
    name: '',
    monthly_fee: '',
    security_deposit: '',
    amenities: '',
    description: '',
  });

  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'STAFF',
  });

  const { isInstalled, isOnline, checkForUpdates } = usePwa();
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isTogglingPush, setIsTogglingPush] = useState<boolean>(false);

  const { success, error: toastError } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pkgs, usrList, setList] = await Promise.all([
        packageService.getPackages(false),
        authService.listUsers(),
        settingsService.getHostelSettings(),
      ]);
      setPackages(pkgs);
      setUsers(usrList);
      setHostelSettings(setList);

      // Check push notification status
      try {
        const notifStatus = await notificationService.getStatus();
        setIsPushSubscribed(notifStatus.is_subscribed);
      } catch (e) {
        // Ignored if offline
      }
    } catch (err) {
      toastError('Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckPwaUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      await checkForUpdates();
      success('Checked for updates. You are on the latest version.', 'System Up to Date');
    } catch (err) {
      toastError('Unable to check for updates at this time.');
    } finally {
      setTimeout(() => setIsCheckingUpdate(false), 500);
    }
  };

  const handleTogglePush = async () => {
    setIsTogglingPush(true);
    try {
      if (isPushSubscribed) {
        await notificationService.unsubscribe();
        setIsPushSubscribed(false);
        success('Push notifications disabled for this device.', 'Notifications Updated');
      } else {
        const subscribed = await notificationService.subscribe();
        if (subscribed) {
          setIsPushSubscribed(true);
          success('Push notifications successfully enabled!', 'Subscribed');
        } else {
          toastError('Push notification permission was not granted.');
        }
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to update push notifications');
    } finally {
      setIsTogglingPush(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await packageService.createPackage({
        name: pkgForm.name,
        monthly_fee: parseFloat(pkgForm.monthly_fee),
        security_deposit: parseFloat(pkgForm.security_deposit) || 0,
        amenities: pkgForm.amenities || null,
        description: pkgForm.description || null,
      });
      success('Hostel package created');
      setIsPackageModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create package');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.createUser({
        full_name: userForm.full_name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        is_active: true,
      });
      success(`User ${userForm.full_name} created successfully!`);
      setIsUserModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const packageColumns: Column<Package>[] = [
    {
      header: 'Package Name',
      accessor: (item) => <span className="font-bold text-navy-900">{item.name}</span>,
    },
    {
      header: 'Monthly Fee',
      accessor: (item) => <span className="font-bold text-primary">₹{item.monthly_fee}/mo</span>,
    },
    {
      header: 'Deposit',
      accessor: (item) => <span>₹{item.security_deposit}</span>,
    },
    {
      header: 'Amenities',
      accessor: (item) => <span className="text-xs text-slate-500">{item.amenities || 'Standard'}</span>,
    },
  ];

  const userColumns: Column<User>[] = [
    {
      header: 'User Name',
      accessor: (item) => <span className="font-bold text-navy-900">{item.full_name}</span>,
    },
    {
      header: 'Email',
      accessor: (item) => <span className="text-xs text-slate-600">{item.email}</span>,
    },
    {
      header: 'Role',
      accessor: (item) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
            item.role === 'ADMIN'
              ? 'bg-secondary-50 text-secondary-700 border border-secondary-200'
              : 'bg-primary-50 text-primary-700 border border-primary-200'
          }`}
        >
          {item.role}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <PageHeader
        title="Hostel Administration & Settings"
        subtitle="Manage room fee plans, staff portal access, and commercial hostel configurations"
      />

      {/* PROGRESSIVE WEB APP & SYSTEM CAPABILITIES */}
      <Card padding="md" className="border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Progressive Web App (PWA)</h3>
              <p className="text-xs text-slate-500">Device installation, offline caching, and operational alerts</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InstallButton variant="primary" size="sm" showInstalledBadge={true} />
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />}
              onClick={handleCheckPwaUpdates}
              disabled={isCheckingUpdate}
            >
              Check for Updates
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">App Mode</span>
            <span className="font-extrabold text-navy-900 flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isInstalled ? 'Installed Standalone App' : 'Browser Session (Installable)'}</span>
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Network & Cache</span>
            <span className="font-extrabold text-navy-900 flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{isOnline ? 'Online (Real-time DB Sync)' : 'Offline (Cached Shell)'}</span>
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Push Notifications</span>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-navy-900 text-xs">
                {isPushSubscribed ? 'Active on Device' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={isTogglingPush}
                className="text-xs font-bold text-primary hover:text-primary-800 transition-colors"
              >
                {isTogglingPush ? 'Updating...' : isPushSubscribed ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* HOSTEL CONFIGURATION SECTION */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-navy-900">Commercial Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {hostelSettings.map((st) => (
            <div key={st.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                {st.description || st.key}
              </span>
              <span className="text-sm font-bold text-navy-900">{st.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* PACKAGES SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-bold text-navy-900">Hostel Packages & Pricing</h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setPkgForm({
                name: '',
                monthly_fee: '',
                security_deposit: '',
                amenities: '',
                description: '',
              });
              setIsPackageModalOpen(true);
            }}
          >
            Add Package
          </Button>
        </div>
        <DataTable
          columns={packageColumns}
          data={packages}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
        />
      </div>

      {/* USER MANAGEMENT SECTION */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-navy-900">Staff & Operator Accounts</h3>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setUserForm({
                full_name: '',
                email: '',
                password: '',
                role: 'STAFF',
              });
              setIsUserModalOpen(true);
            }}
          >
            Create Staff Account
          </Button>
        </div>
        <DataTable
          columns={userColumns}
          data={users}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
        />
      </div>

      {/* CREATE PACKAGE MODAL */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title="Add Hostel Package"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePackage} className="flex flex-col gap-4">
          <Input
            label="Package Name"
            placeholder="e.g. Deluxe Single AC"
            value={pkgForm.name}
            onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Fee (₹)"
              type="number"
              value={pkgForm.monthly_fee}
              onChange={(e) => setPkgForm({ ...pkgForm, monthly_fee: e.target.value })}
              required
            />
            <Input
              label="Security Deposit (₹)"
              type="number"
              value={pkgForm.security_deposit}
              onChange={(e) => setPkgForm({ ...pkgForm, security_deposit: e.target.value })}
              required
            />
          </div>
          <Input
            label="Amenities Included"
            placeholder="WiFi, 3 Meals, Daily Housekeeping"
            value={pkgForm.amenities}
            onChange={(e) => setPkgForm({ ...pkgForm, amenities: e.target.value })}
          />
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsPackageModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="secondary" type="submit" className="w-full sm:w-auto">
              Save Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Create Operator Account"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={userForm.full_name}
            onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="ramesh@zellahostel.com"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required
          />
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-full sm:w-auto">
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

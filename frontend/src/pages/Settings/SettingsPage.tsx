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
} from 'lucide-react';

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
    } catch (err) {
      toastError('Failed to load system settings');
    } finally {
      setIsLoading(false);
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsPackageModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" type="submit">
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

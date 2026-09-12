import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Building2, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      success('Welcome back! You have successfully signed in.', 'Authentication Successful');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setError(msg);
      toastError(msg, 'Login Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickCredentials = (userType: 'admin' | 'staff') => {
    if (userType === 'admin') {
      setEmail('admin@zellahostel.com');
      setPassword('Admin@12345');
    } else {
      setEmail('staff@zellahostel.com');
      setPassword('Staff@12345');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FB] font-sans antialiased">
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-[22px] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 mb-4 ring-8 ring-primary/10">
            <Building2 className="w-9 h-9 text-secondary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy-900">ZELLA HOSTEL</h1>
          <p className="text-xs uppercase font-semibold text-secondary tracking-widest mt-1">
            Enterprise Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-card p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-navy-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your credentials to access operations & accounts</p>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@zellahostel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-8 text-slate-400 hover:text-navy-900"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="mt-2 w-full font-semibold shadow-md shadow-primary/25"
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick Role Switch
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin')}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('staff')}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Staff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Production-Grade Hostel ERP • Secure JWT Authentication
        </p>
      </div>
    </div>
  );
};

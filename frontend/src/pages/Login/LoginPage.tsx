import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Mail, Eye, EyeOff, Shield, Users, ArrowRight } from 'lucide-react';
import zellaLogo from '../../assets/zella_logo.png';
import loginSideBanner from '../../assets/login_side_banner.png';

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
      await login(email.trim().toLowerCase(), password.trim());
      success('Welcome back! You have successfully signed in.', 'Authentication Successful');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login submission failed:', err);
      let msg = 'Invalid email or password. Please try again.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      } else if (err.message && err.message !== 'Request failed with status code 401') {
        msg = `Connection issue: ${err.message}. Please verify the server is running.`;
      }
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
    <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row bg-[#F8F9FB] font-sans antialiased selection:bg-[#3F2576]/15 selection:text-[#3F2576]">
      {/* LEFT COLUMN: Hero / Brand Showcase (exact model on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen relative bg-[#F8F9FB] border-r border-slate-200/70 items-center justify-center p-8 xl:p-14 overflow-hidden select-none">
        <div className="w-full max-w-[500px] flex flex-col items-center">
          <img
            src={loginSideBanner}
            alt="Zella Ladies Hostel - Safe Spaces. Stronger Futures."
            className="w-full h-auto object-contain rounded-2xl shadow-sm"
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Login Card */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12">
        {/* Mobile Header (visible only on small screens < lg) */}
        <div className="lg:hidden flex flex-col items-center text-center mb-6">
          <img
            src={zellaLogo}
            alt="Zella Ladies Hostel"
            className="h-12 w-auto object-contain mb-2"
          />
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-widest">
            Enterprise Management System
          </span>
        </div>

        {/* Floating Rounded Login Card */}
        <div className="w-full max-w-[450px] bg-white rounded-[28px] border border-slate-100 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.07)] p-7 sm:p-10">
          {/* Card Title & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-normal">
              Sign in to your Zella Ladies Hostel account
            </p>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Address Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3F2576]/15 focus:border-[#3F2576] transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3F2576]/15 focus:border-[#3F2576] transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() =>
                  alert('Default credentials:\nAdmin: admin@zellahostel.com / Admin@12345\nStaff: staff@zellahostel.com / Staff@12345')
                }
                className="text-xs font-semibold text-[#3F2576] hover:text-[#2d1857] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#3F2576] hover:bg-[#341d63] active:bg-[#2b1752] text-white font-semibold text-sm shadow-md shadow-[#3F2576]/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider: Or continue as */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <span className="relative bg-white px-3 text-xs font-medium text-slate-400">
              Or continue as
            </span>
          </div>

          {/* Quick Role Switch Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fillQuickCredentials('admin')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Shield className="w-4 h-4 text-[#3F2576]" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('staff')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-[#3F2576]" />
              <span>Staff</span>
            </button>
          </div>

          {/* Footer Copyright */}
          <p className="text-xs text-slate-400 text-center mt-6">
            © 2025 Zella Ladies Hostel. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

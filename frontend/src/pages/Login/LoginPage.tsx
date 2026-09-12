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

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both email and password.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, cleanPassword);
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
        msg = `Connection issue: ${err.message}. Please verify the backend is running.`;
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
    <main className="min-h-screen min-h-[100dvh] w-full bg-[#F8F9FB] flex flex-col lg:flex-row font-sans text-[#172B55] antialiased selection:bg-[#48258B]/15 selection:text-[#48258B]">
      {/* ==================================================
          LEFT BRANDING SECTION (Desktop / Tablet)
          Large rounded rectangular visual panel
          Approx. 575px width, 830px height, 16px radius
         ================================================== */}
      <section
        aria-label="Branding Showcase"
        className="hidden lg:flex lg:w-1/2 min-h-screen items-center justify-center p-6 xl:p-10 border-r border-[#DCE3EE]/50 select-none"
      >
        <div className="w-full max-w-[575px] h-[830px] max-h-[92vh] rounded-[16px] overflow-hidden bg-[#F4F0ED] border border-[#DCE3EE]/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between relative">
          <img
            src={loginSideBanner}
            alt="Zella Ladies Hostel - Safe Spaces. Stronger Futures."
            className="w-full h-full object-cover object-top"
          />
        </div>
      </section>

      {/* ==================================================
          RIGHT LOGIN SECTION
          Centered white login card
          Approx. 525px width, 660px height, 26px radius
         ================================================== */}
      <section
        aria-label="Login Form"
        className="w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10"
      >
        {/* Mobile Header: Logo centered above login card (hidden on lg screens) */}
        <div className="lg:hidden flex flex-col items-center text-center mb-6">
          <img
            src={zellaLogo}
            alt="Zella Ladies Hostel"
            className="h-12 w-auto max-w-[200px] object-contain mb-2"
          />
          <span className="text-[11px] uppercase font-bold text-[#71809B] tracking-[3px]">
            Enterprise Management System
          </span>
        </div>

        {/* White Login Card: Approx. 525px wide, 26px border radius, 48px padding */}
        <div className="w-full max-w-[525px] bg-[#FFFFFF] rounded-[26px] border border-[#DCE3EE]/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 sm:p-12 transition-all">
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-[32px] sm:text-[36px] font-bold text-[#172B55] tracking-tight leading-tight">
              Welcome Back
            </h1>
            <p className="text-[16px] sm:text-[17px] text-[#71809B] mt-2 font-normal leading-normal">
              Sign in to your Zella Ladies Hostel account
            </p>
          </div>

          {/* Inline Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3.5 mb-6 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-[13px] font-medium animate-shake flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col">
            {/* Email Address Field */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-[14px] font-semibold text-[#172B55] mb-[10px]"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail
                  className="w-[18px] h-[18px] text-[#71809B] absolute left-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-[55px] pl-12 pr-4 bg-white border border-[#DCE3EE] rounded-[12px] text-[15px] text-[#172B55] placeholder:text-[#71809B]/70 focus:outline-none focus:border-[#48258B] focus:ring-2 focus:ring-[#48258B]/15 transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-2.5">
              <label
                htmlFor="password"
                className="block text-[14px] font-semibold text-[#172B55] mb-[10px]"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Lock
                  className="w-[18px] h-[18px] text-[#71809B] absolute left-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-[55px] pl-12 pr-12 bg-white border border-[#DCE3EE] rounded-[12px] text-[15px] text-[#172B55] placeholder:text-[#71809B]/70 focus:outline-none focus:border-[#48258B] focus:ring-2 focus:ring-[#48258B]/15 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#71809B] hover:text-[#172B55] focus:outline-none p-1 rounded-md transition-colors"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={() =>
                  alert('For security reasons, password recovery must be initiated by contacting the Hostel Administrator.')
                }
                className="text-[14px] font-semibold text-[#48258B] hover:underline focus:outline-none transition-all cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button: Height ~56px, Radius ~12px, #48258B background */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[56px] rounded-[12px] bg-[#48258B] hover:bg-[#3D1E79] active:bg-[#341867] text-white text-[17px] font-semibold shadow-sm flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#48258B]/20"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-[18px] h-[18px] stroke-[2.2]" aria-hidden="true" />
            </button>

            {/* Divider: "Or continue as" */}
            <div className="relative my-7 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DCE3EE]" />
              </div>
              <span className="relative bg-[#FFFFFF] px-3.5 text-[14px] font-normal text-[#71809B]">
                Or continue as
              </span>
            </div>

            {/* Quick Role Selection: Two equal-width outlined buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin')}
                className="h-[50px] rounded-[11px] border border-[#DCE3EE] bg-white hover:bg-slate-50/80 hover:border-[#CBD5E1] text-[#172B55] text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#48258B]/15"
              >
                <Shield className="w-4 h-4 text-[#48258B]" aria-hidden="true" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('staff')}
                className="h-[50px] rounded-[11px] border border-[#DCE3EE] bg-white hover:bg-slate-50/80 hover:border-[#CBD5E1] text-[#172B55] text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#48258B]/15"
              >
                <Users className="w-4 h-4 text-[#48258B]" aria-hidden="true" />
                <span>Staff</span>
              </button>
            </div>

            {/* Footer Copyright */}
            <p className="text-[13px] text-[#71809B] text-center mt-8 font-normal">
              © 2025 Zella Ladies Hostel. All rights reserved.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

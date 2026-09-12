import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import zellaLogo from '../../assets/zella_logo.png';

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

  return (
    <main className="h-screen h-[100dvh] w-full bg-[#F7F8FA] font-sans text-[#172B55] antialiased selection:bg-[#48258B]/15 selection:text-[#48258B] overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-2">
      {/* ==================================================
          2. & 3. LEFT SIDE — BRAND PANEL (Desktop 50%)
          Refined editorial brand panel, centered with generous whitespace
         ================================================== */}
      <section
        aria-label="Branding Showcase"
        className="hidden lg:flex flex-col justify-center items-center h-full p-8 xl:p-14 border-r border-[#E8ECF2] select-none"
      >
        <div className="w-full max-w-[520px] xl:max-w-[560px] flex flex-col items-start text-left">
          {/* Logo */}
          <div className="flex flex-col items-start mb-5">
            <img
              src={zellaLogo}
              alt="Zella Ladies Hostel"
              className="h-11 xl:h-12 w-auto object-contain"
            />
            <span className="text-[11px] xl:text-[12px] uppercase font-bold text-[#172B55] tracking-[4px] mt-3">
              ENTERPRISE MANAGEMENT SYSTEM
            </span>
          </div>

          {/* Subtle pink horizontal accent line */}
          <div className="w-14 h-[3px] bg-[#E60073] rounded-full mb-8 xl:mb-10" />

          {/* Headline: Exactly two lines */}
          <h2 className="text-[40px] xl:text-[46px] font-medium text-[#172B55] leading-[1.15] tracking-tight mb-5 xl:mb-6">
            Safe Spaces.<br />
            Stronger Futures.
          </h2>

          {/* Subtitle: Max width 420px */}
          <p className="text-[18px] xl:text-[19px] text-[#71809B] leading-[1.6] max-w-[420px]">
            Simplifying hostel management for a safer, more comfortable living experience.
          </p>
        </div>
      </section>

      {/* ==================================================
          6. RIGHT SIDE LOGIN AREA (Desktop 50%)
          Centered 520px card with 48px padding
         ================================================== */}
      <section
        aria-label="Login Form"
        className="w-full h-full flex flex-col items-center justify-center p-5 sm:p-8 lg:p-8 xl:p-12 overflow-y-auto lg:overflow-hidden"
      >
        {/* Mobile Header: Logo centered above login card (hidden on desktop) */}
        <div className="lg:hidden flex flex-col items-center text-center mb-6 pt-3">
          <img
            src={zellaLogo}
            alt="Zella Ladies Hostel"
            className="h-10 w-auto max-w-[190px] object-contain mb-2"
          />
          <span className="text-[11px] uppercase font-bold text-[#172B55] tracking-[3.5px]">
            Enterprise Management System
          </span>
        </div>

        {/* Login Card: Exact 520px max-width, 48px padding, 20px radius, #E8ECF2 border */}
        <div className="w-full max-w-[520px] bg-[#FFFFFF] rounded-[20px] border border-[#E8ECF2] shadow-[0_20px_50px_rgba(20,35,70,0.07)] p-8 sm:p-12 transition-all">
          {/* Header */}
          <div className="mb-8 sm:mb-9">
            <h1 className="text-[30px] sm:text-[32px] font-bold text-[#172B55] tracking-tight leading-tight">
              Welcome Back
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[#71809B] mt-2 font-normal leading-normal">
              Sign in to your Zella Ladies Hostel account
            </p>
          </div>

          {/* Inline Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3.5 mb-5 rounded-[10px] bg-rose-50 border border-rose-200/80 text-rose-700 text-[13px] font-medium flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col">
            {/* 8. Email Address Field */}
            <div className="mb-5 sm:mb-6">
              <label
                htmlFor="email"
                className="block text-[14px] font-semibold text-[#172B55] mb-2 sm:mb-2.5"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail
                  className="w-[19px] h-[19px] text-[#94A3B8] absolute left-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-[56px] pl-12 pr-4 bg-white border border-[#DCE3EE] rounded-[10px] text-[15px] text-[#172B55] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#48258B] focus:ring-3 focus:ring-[#48258B]/10 transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* 9. Password Field */}
            <div className="mb-2">
              <label
                htmlFor="password"
                className="block text-[14px] font-semibold text-[#172B55] mb-2 sm:mb-2.5"
              >
                Password
              </label>
              <div className="relative flex items-center">
                <Lock
                  className="w-[19px] h-[19px] text-[#94A3B8] absolute left-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-[56px] pl-12 pr-12 bg-white border border-[#DCE3EE] rounded-[10px] text-[15px] text-[#172B55] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#48258B] focus:ring-3 focus:ring-[#48258B]/10 transition-all"
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
                    <EyeOff className="w-[19px] h-[19px]" aria-hidden="true" />
                  ) : (
                    <Eye className="w-[19px] h-[19px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* 10. Forgot Password Link: Aligned to right directly below password */}
            <div className="flex justify-end mt-2 mb-5">
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

            {/* 11. Sign In Button: Height 56px, Radius 10px, Background #48258B */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[56px] rounded-[10px] bg-[#48258B] hover:bg-[#3C1E75] active:bg-[#341867] text-white text-[16px] sm:text-[17px] font-semibold shadow-sm flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-3 focus:ring-[#48258B]/20"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-[18px] h-[18px] stroke-[2.2]" aria-hidden="true" />
            </button>

            {/* 13. Footer Copyright: Centered inside card with generous whitespace */}
            <p className="text-[13px] text-[#8A98AE] text-center mt-8 sm:mt-10 font-normal">
              © 2025 Zella Ladies Hostel. All rights reserved.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

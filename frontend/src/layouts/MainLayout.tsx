import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  HelpCircle,
  UserPlus,
  Users,
  CalendarCheck,
  DoorOpen,
  ClipboardCheck,
  Receipt,
  Landmark,
  Wrench,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Bell,
  Shield,
  Building2,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const MainLayout: React.FC = () => {
  const { user, role, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const navSections: NavSection[] = [
    {
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Enquiry', path: '/enquiries', icon: <HelpCircle className="w-5 h-5" /> },
        { name: 'Admission', path: '/admissions', icon: <UserPlus className="w-5 h-5" /> },
        { name: 'Guests', path: '/guests', icon: <Users className="w-5 h-5" /> },
        { name: 'Booking', path: '/bookings', icon: <CalendarCheck className="w-5 h-5" /> },
        { name: 'Room', path: '/rooms', icon: <DoorOpen className="w-5 h-5" /> },
        { name: 'Attendance', path: '/attendance', icon: <ClipboardCheck className="w-5 h-5" /> },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Fee Receipt', path: '/fee-receipts', icon: <Receipt className="w-5 h-5" /> },
        { name: 'Accounts', path: '/accounts', icon: <Landmark className="w-5 h-5" /> },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { name: 'Others', path: '/others', icon: <Wrench className="w-5 h-5" /> },
        { name: 'Reports', path: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
        { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" />, adminOnly: true },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavItems = (isMobile: boolean = false) => (
    <div className="flex flex-col gap-6 py-4">
      {navSections.map((section, sIdx) => {
        // Filter items by role
        const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (visibleItems.length === 0) return null;

        return (
          <div key={sIdx} className="flex flex-col gap-1.5">
            {section.title && (!isCollapsed || isMobile) && (
              <span className="px-4 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {section.title}
              </span>
            )}
            {visibleItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setIsMobileOpen(false)}
                  title={isCollapsed && !isMobile ? item.name : undefined}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
                  } ${isCollapsed && !isMobile ? 'justify-center px-2' : ''}`}
                >
                  <span className={`shrink-0 ${isActive ? 'text-secondary' : 'text-slate-500'}`}>{item.icon}</span>
                  {(!isCollapsed || isMobile) && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F8F9FB] text-navy-900 font-sans antialiased">
      {/* DESKTOP SIDEBAR - FIXED & PERMANENTLY STATIONARY */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white shadow-soft transition-[width] duration-300 fixed top-0 left-0 bottom-0 h-screen z-30 select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-900 flex items-center justify-center text-white shrink-0 shadow-sm shadow-primary/30">
              <Building2 className="w-5 h-5 text-secondary" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-base leading-tight text-navy-900 tracking-tight">ZELLA HOSTEL</span>
                <span className="text-[10px] uppercase font-semibold text-secondary tracking-widest">Enterprise</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Nav Items (internal to sidebar only) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">{renderNavItems(false)}</div>

        {/* Sidebar Footer / User Status */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-navy-900 truncate">{user?.full_name || 'Staff User'}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Shield className="w-3 h-3 text-secondary shrink-0" />
                  <span className="capitalize">{role || 'Staff'}</span>
                </div>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER BACKDROP */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-navy-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* MOBILE DRAWER */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-secondary font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-base text-navy-900">ZELLA HOSTEL</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-navy-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">{renderNavItems(true)}</div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs">
            <div className="font-bold text-navy-900">{user?.full_name}</div>
            <div className="text-slate-500 text-[11px]">{role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA - Appropriately padded for fixed stationary sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[padding] duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="text-primary font-bold">Hostel Operations</span>
              <span>/</span>
              <span className="text-secondary font-bold">
                {location.pathname.replace('/', '').toUpperCase() || 'DASHBOARD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </div>

            <button
              className="p-2 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-xl relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="text-xs font-bold text-navy-900 leading-tight">{user?.full_name}</div>
                <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider">{role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  Compass,
  CreditCard,
  FileCheck2,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavLinkItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const DashboardLayout: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => {
  const { user, creatorProfile, brandProfile, unreadNotifications, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const creatorNav: NavLinkItem[] = [
    { label: 'Overview', to: '/creator', icon: LayoutDashboard },
    { label: 'Discover Campaigns', to: '/creator/discover', icon: Compass },
    { label: 'Saved Campaigns', to: '/creator/saved', icon: Bookmark },
    { label: 'Applications', to: '/creator/applications', icon: FileCheck2 },
    { label: 'Deals', to: '/creator/deals', icon: Handshake },
    { label: 'Messages', to: '/creator/messages', icon: MessageSquare },
    { label: 'Analytics', to: '/creator/analytics', icon: BarChart3 },
    { label: 'My Profile', to: '/creator/profile', icon: UserCheck },
    {
      label: 'Notifications',
      to: '/creator/notifications',
      icon: Bell,
      badge: unreadNotifications,
    },
    { label: 'Settings', to: '/creator/settings', icon: Settings },
  ];

  const brandNav: NavLinkItem[] = [
    { label: 'Overview', to: '/brand', icon: LayoutDashboard },
    { label: 'Campaigns', to: '/brand/campaigns', icon: Briefcase },
    { label: 'Discover Creators', to: '/brand/discover', icon: Sparkles },
    { label: 'Applications', to: '/brand/applications', icon: FolderKanban },
    { label: 'Shortlisted Creators', to: '/brand/shortlisted', icon: Bookmark },
    { label: 'Deal Management', to: '/brand/deals', icon: Handshake },
    { label: 'Messages', to: '/brand/messages', icon: MessageSquare },
    { label: 'Analytics', to: '/brand/analytics', icon: BarChart3 },
    { label: 'Billing & Plans', to: '/brand/billing', icon: CreditCard },
    { label: 'Team & Settings', to: '/brand/settings', icon: Settings },
  ];

  const adminNav: NavLinkItem[] = [
    { label: 'Control Center', to: '/admin', icon: LayoutDashboard },
    { label: 'Verification Queue', to: '/admin/verifications', icon: ShieldCheck },
    { label: 'Campaign Moderation', to: '/admin/campaigns', icon: Briefcase },
    { label: 'Dispute Resolution', to: '/admin/disputes', icon: Scale },
    { label: 'User Management', to: '/admin/users', icon: Users },
    { label: 'Audit Logs', to: '/admin/audit', icon: FileCheck2 },
  ];

  const navItems =
    user.role === 'admin'
      ? adminNav
      : user.role === 'brand'
      ? brandNav
      : creatorNav;

  const isVerified =
    creatorProfile?.verificationStatus === 'verified' ||
    brandProfile?.verificationStatus === 'verified' ||
    user.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#050509] text-[#F5F5FA]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (260px Desktop) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[264px] shrink-0 bg-[#0B0D18] border-r border-white/8 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/8">
          <Link
            to="/"
            className="font-display text-base font-bold tracking-[0.18em] text-[#F5F5FA]"
          >
            BRIDGE
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-[#9295A9] hover:text-[#F5F5FA]"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Summary */}
        <div className="px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#F5F5FA] shrink-0"
              style={{
                background:
                  creatorProfile?.avatarStyle ||
                  brandProfile?.brandAccent ||
                  'linear-gradient(135deg, #246BFD, #9C65FF)',
              }}
            >
              {(brandProfile?.logoMonogram || user.fullName.slice(0, 2)).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-[#F5F5FA] truncate">
                  {brandProfile?.companyName || user.fullName}
                </p>
                {isVerified && (
                  <ShieldCheck
                    className="w-3.5 h-3.5 text-[#34D399] shrink-0"
                    aria-label="Verified account"
                  />
                )}
              </div>
              <p className="text-xs text-[#9295A9] truncate capitalize">
                {user.role} Workspace {user.isDemo ? '· Demo' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/creator' &&
                item.to !== '/brand' &&
                item.to !== '/admin' &&
                location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                  active
                    ? 'bg-[#171B2C] text-[#F5F5FA] font-medium'
                    : 'text-[#9295A9] hover:text-[#F5F5FA] hover:bg-[#101426]'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#00D5FF]' : 'text-[#9295A9]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span className="font-mono-tabular text-xs font-semibold text-[#00D5FF]">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/8 space-y-2">
          <Link
            to="/explore"
            className="block px-3 py-2 rounded-lg text-xs text-[#9295A9] hover:text-[#F5F5FA] hover:bg-[#101426] transition-colors"
          >
            Public Marketplace →
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#9295A9] hover:text-[#EF4444] hover:bg-[#101426] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Header */}
        <header className="h-16 px-6 lg:px-8 border-b border-white/8 bg-[#050509] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#9295A9] hover:text-[#F5F5FA]"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-[#F5F5FA] truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[#9295A9] truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user.isDemo && (
              <span className="hidden md:inline text-xs text-[#9295A9]">
                Demo Environment · Simulated Data
              </span>
            )}
            {actions}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

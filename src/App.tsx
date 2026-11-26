/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import type { UserRole } from './types/domain';
import { LandingPage } from './pages/public/LandingPage';
import {
  AboutPage,
  ContactPage,
  ExplorePage,
  FaqPage,
  HowItWorksPage,
  LegalPage,
  NotFoundPage,
  PricingPage,
  PublicCreatorProfilePage,
} from './pages/public/PublicPages';
import {
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from './pages/auth/AuthPages';
import {
  BrandOnboardingPage,
  CreatorOnboardingPage,
} from './pages/onboarding/OnboardingPages';
import {
  CreatorAnalyticsPage,
  CreatorApplicationsPage,
  CreatorCampaignDetailPage,
  CreatorDiscoverPage,
  CreatorOverviewPage,
  CreatorProfileManagePage,
} from './pages/creator/CreatorPages';
import {
  BrandAnalyticsPage,
  BrandApplicationsKanbanPage,
  BrandBillingPage,
  BrandCampaignsPage,
  BrandDiscoverCreatorsPage,
  BrandOverviewPage,
} from './pages/brand/BrandPages';
import {
  DealRoomDetailPage,
  DealsListPage,
} from './pages/shared/DealRoomPage';
import {
  AccountSettingsPage,
  MessagesPage,
  NotificationsPage,
} from './pages/shared/MessagesAndNotifications';
import { AdminControlCenterPage } from './pages/admin/AdminPages';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected UI error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050509] text-[#F5F5FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#101426] border border-white/15 p-8 space-y-4 text-center">
            <p className="font-mono-tabular text-xs uppercase tracking-widest text-[#EF4444]">
              Workspace Recovery
            </p>
            <h1 className="font-display text-2xl font-bold">
              Something interrupted this view
            </h1>
            <p className="text-xs text-[#9295A9] leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-lg bg-[#246BFD] hover:bg-[#1d5be0] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
            >
              Reload BRIDGE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProtectedRoute: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050509] text-[#F5F5FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00D5FF] border-t-transparent animate-spin" />
          <p className="font-mono-tabular text-xs text-[#9295A9] tracking-widest uppercase">
            Initializing BRIDGE Workspace
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'brand'
        ? '/brand'
        : '/creator';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <Routes>
            {/* Public Marketing & Discovery Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/creators/:id" element={<PublicCreatorProfilePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/pricing" element={<Navigate to="/how-it-works" replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/team" element={<AboutPage teamFocus />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<LegalPage mode="terms" />} />
            <Route path="/privacy" element={<LegalPage mode="privacy" />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Multi-Step Onboarding Routes */}
            <Route
              path="/onboarding/creator"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding/brand"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandOnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Creator Workspace Routes */}
            <Route
              path="/creator"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/discover"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorDiscoverPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/saved"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorDiscoverPage savedOnly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/campaigns/:id"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorCampaignDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/applications"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/deals"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <DealsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/deals/:id"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <DealRoomDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/messages"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/analytics"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/profile"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorProfileManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/notifications"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/settings"
              element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <AccountSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Brand Workspace Routes */}
            <Route
              path="/brand"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/campaigns"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandCampaignsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/discover"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandDiscoverCreatorsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/shortlisted"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandDiscoverCreatorsPage shortlistedOnly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/applications"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandApplicationsKanbanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/deals"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <DealsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/deals/:id"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <DealRoomDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/messages"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/analytics"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/billing"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <BrandBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/notifications"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/settings"
              element={
                <ProtectedRoute allowedRoles={['brand']}>
                  <AccountSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Control Center Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/campaigns"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminControlCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/deals/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DealRoomDetailPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

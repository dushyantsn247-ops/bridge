import type {
  Application,
  ApplicationStatus,
  AuditLogEntry,
  BrandProfile,
  Campaign,
  Conversation,
  CreatorCollection,
  CreatorProfile,
  Deal,
  DisputeRecord,
  MatchResult,
  MatchWeights,
  Message,
  NotificationItem,
  PaymentStatus,
  ReviewRecord,
  SubscriptionPlan,
  User,
  UserRole,
  VerificationRequest,
} from '../types/domain';

const TOKEN_KEY = 'bridge_auth_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage quota errors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Public
  getPublicStats: () =>
    request<{
      isDemoDatasetIncluded: boolean;
      creatorsCount: number;
      brandsCount: number;
      activeCampaignsCount: number;
      completedDealsCount: number;
      totalOpportunityPoolINR: number;
    }>('/api/public/stats'),

  getPublicCampaigns: () => request<{ campaigns: Campaign[] }>('/api/public/campaigns'),

  getPublicCreator: (id: string) =>
    request<{ profile: CreatorProfile; reviews: ReviewRecord[] }>(`/api/public/creators/${id}`),

  submitContact: (payload: {
    name: string;
    email: string;
    roleOrCompany: string;
    subject: string;
    message: string;
  }) =>
    request<{ ok: boolean }>('/api/public/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth
  signup: (payload: { fullName: string; email: string; password: string; role: UserRole }) =>
    request<{ token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demoLogin: (role: UserRole) =>
    request<{ token: string; user: User }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  googleAdapterLogin: (payload: { email?: string; fullName?: string; role?: UserRole }) =>
    request<{ token: string; user: User }>('/api/auth/google-adapter', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{
      user: User;
      creatorProfile: CreatorProfile | null;
      brandProfile: BrandProfile | null;
      unreadNotifications: number;
    }>('/api/auth/me'),

  verifyEmail: () =>
    request<{ ok: boolean; user: User }>('/api/auth/verify-email', { method: 'POST' }),

  forgotPassword: (payload: { email: string; newPassword?: string }) =>
    request<{ ok: boolean; resetCompleted: boolean; message: string }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  deleteAccount: () => request<{ ok: boolean }>('/api/auth/account', { method: 'DELETE' }),

  // Profiles & Onboarding
  updateCreatorProfile: (
    payload: Partial<CreatorProfile> & { completeOnboarding?: boolean }
  ) =>
    request<{ user: User; profile: CreatorProfile }>('/api/creator/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateBrandProfile: (payload: Partial<BrandProfile> & { completeOnboarding?: boolean }) =>
    request<{ user: User; profile: BrandProfile }>('/api/brand/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Marketplace & Campaigns
  getMarketplaceCampaigns: (weights?: MatchWeights) => {
    const query = weights ? `?weights=${encodeURIComponent(JSON.stringify(weights))}` : '';
    return request<{
      campaigns: Campaign[];
      matches: MatchResult[];
      savedIds: string[];
    }>(`/api/marketplace/campaigns${query}`);
  },

  getCampaignDetail: (id: string) =>
    request<{
      campaign: Campaign;
      match: MatchResult | null;
      existingApplication: Application | null;
      saved: boolean;
    }>(`/api/marketplace/campaigns/${id}`),

  toggleSavedCampaign: (campaignId: string) =>
    request<{ savedIds: string[] }>('/api/creator/saved-campaigns/toggle', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    }),

  // Applications
  getApplications: () => request<{ applications: Application[] }>('/api/applications'),

  submitApplication: (payload: {
    campaignId: string;
    pitch: string;
    proposedRateINR: number;
    attachedPortfolioIds: string[];
    questionAnswers: { question: string; answer: string }[];
    asDraft?: boolean;
  }) =>
    request<{ application: Application }>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateApplicationStatus: (
    id: string,
    payload: {
      status?: ApplicationStatus;
      brandInternalNotes?: string;
      createDealNow?: boolean;
    }
  ) =>
    request<{ application: Application; deal: Deal | null }>(
      `/api/applications/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  // Brand Workspace
  getBrandCampaigns: () => request<{ campaigns: Campaign[] }>('/api/brand/campaigns'),

  createCampaign: (payload: Partial<Campaign>) =>
    request<{ campaign: Campaign }>('/api/brand/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  discoverCreators: (campaignId?: string) =>
    request<{
      ranked: { creator: CreatorProfile; match: MatchResult | null }[];
      referenceCampaign: Campaign | undefined;
      shortlistedIds: string[];
      collections: CreatorCollection[];
    }>(`/api/brand/discover-creators${campaignId ? `?campaignId=${campaignId}` : ''}`),

  toggleShortlistCreator: (creatorId: string) =>
    request<{ shortlistedIds: string[] }>('/api/brand/shortlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ creatorId }),
    }),

  createCreatorCollection: (name: string, creatorId?: string) =>
    request<{ collection: CreatorCollection }>('/api/brand/collections', {
      method: 'POST',
      body: JSON.stringify({ name, creatorId }),
    }),

  inviteCreator: (payload: { creatorId: string; campaignId?: string; note?: string }) =>
    request<{ ok: boolean; conversationId: string }>('/api/brand/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Deals
  getDeals: () => request<{ deals: Deal[] }>('/api/deals'),

  getDealDetail: (id: string) =>
    request<{
      deal: Deal;
      reviews: ReviewRecord[];
      conversation: Conversation | null;
      messages: Message[];
    }>(`/api/deals/${id}`),

  updateDealPayment: (id: string, paymentStatus: PaymentStatus, note?: string) =>
    request<{ deal: Deal }>(`/api/deals/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentStatus, note }),
    }),

  submitDeliverable: (
    dealId: string,
    delivId: string,
    payload: { contentUrl: string; captionOrNotes: string; fileName?: string }
  ) =>
    request<{ deal: Deal }>(`/api/deals/${dealId}/deliverables/${delivId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reviewDeliverable: (
    dealId: string,
    delivId: string,
    payload: { decision: 'Approved' | 'Revision Requested'; feedback: string }
  ) =>
    request<{ deal: Deal }>(`/api/deals/${dealId}/deliverables/${delivId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadSharedFile: (
    dealId: string,
    payload: { fileName: string; fileSizeLabel?: string; fileUrl?: string }
  ) =>
    request<{ deal: Deal }>(`/api/deals/${dealId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitDealReview: (
    dealId: string,
    payload: {
      metrics: {
        communication: number;
        qualityOrClarity: number;
        timelinessOrPayment: number;
        professionalism: number;
      };
      comment: string;
    }
  ) =>
    request<{ review: ReviewRecord; deal: Deal }>(`/api/deals/${dealId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  openDispute: (dealId: string, payload: { reason: string; details: string }) =>
    request<{ dispute: DisputeRecord; deal: Deal }>(`/api/deals/${dealId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Messaging & Notifications
  getConversations: () => request<{ conversations: Conversation[] }>('/api/conversations'),

  getMessages: (conversationId: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(
      `/api/conversations/${conversationId}/messages`
    ),

  sendMessage: (conversationId: string, payload: { text: string; attachmentName?: string }) =>
    request<{ message: Message }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNotifications: () => request<{ notifications: NotificationItem[] }>('/api/notifications'),

  markNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/mark-all-read', { method: 'POST' }),

  // Verification & Plans
  submitVerification: (payload: {
    documentType: string;
    documentReference: string;
    socialOrWebsiteProof: string;
  }) =>
    request<{ verification: VerificationRequest }>('/api/verification/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  selectPlan: (plan: SubscriptionPlan) =>
    request<{
      ok: boolean;
      user: User;
      simulatedReceipt: { id: string; plan: string; mode: string; timestamp: string };
    }>('/api/billing/plan', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),

  // Admin
  getAdminOverview: () =>
    request<{
      metrics: {
        totalCreators: number;
        totalBrands: number;
        activeCampaigns: number;
        activeDeals: number;
        completedDeals: number;
        simulatedTransactionVolumeINR: number;
        openDisputes: number;
        pendingVerifications: number;
        matchToApplicationRatePct: number;
        avgDaysToFirstDeal: number;
      };
      users: User[];
      verifications: VerificationRequest[];
      campaigns: Campaign[];
      disputes: DisputeRecord[];
      reviews: ReviewRecord[];
      auditLogs: AuditLogEntry[];
    }>('/api/admin/overview'),

  decideVerification: (
    id: string,
    payload: { decision: 'verified' | 'rejected'; adminNote: string }
  ) =>
    request<{ verification: VerificationRequest }>(`/api/admin/verifications/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleSuspendUser: (id: string) =>
    request<{ user: User }>(`/api/admin/users/${id}/toggle-suspend`, { method: 'POST' }),

  moderateCampaign: (id: string, status: Campaign['status']) =>
    request<{ campaign: Campaign }>(`/api/admin/campaigns/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  resolveDispute: (
    id: string,
    payload: {
      outcome: 'Resolved - Released to Creator' | 'Resolved - Refunded to Brand';
      resolutionNote: string;
    }
  ) =>
    request<{ dispute: DisputeRecord }>(`/api/admin/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // AI Endpoints
  generatePitch: (campaignId: string, customAngle?: string) =>
    request<{
      source: string;
      pitch: string;
      recommendedRateINR: number;
      openingHook: string;
      contentAngles: string[];
    }>('/api/ai/generate-pitch', {
      method: 'POST',
      body: JSON.stringify({ campaignId, customAngle }),
    }),

  runCampaignAssistant: (prompt: string) =>
    request<{
      source: string;
      title: string;
      industry: string;
      description: string;
      objective: string;
      targetAudience: string;
      targetAgeRange: string;
      niches: string[];
      platforms: string[];
      deliverables: string[];
      budgetMinINR: number;
      budgetMaxINR: number;
      requiredLanguages: string[];
      location: string;
      contentGuidelines: string;
      dos: string[];
      donts: string[];
      creatorsRequired: number;
    }>('/api/ai/campaign-assistant', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  explainMatch: (creatorId: string, campaignId: string, weights?: MatchWeights) =>
    request<{
      source: string;
      match: MatchResult;
      executiveSummary: string;
    }>('/api/ai/match-explain', {
      method: 'POST',
      body: JSON.stringify({ creatorId, campaignId, weights }),
    }),

  analyzeCreatorProfile: (creatorId?: string) =>
    request<{
      source: string;
      strengths: string[];
      improvements: string[];
      recommendedNiches: string[];
      suggestedRateCardINR: {
        instagramReel: number;
        youtubeShorts: number;
        ugcBundle: number;
      };
      heuristicAuthenticity: {
        label: string;
        disclaimer: string;
        signals: string[];
      };
    }>('/api/ai/profile-analysis', {
      method: 'POST',
      body: JSON.stringify({ creatorId }),
    }),

  improveBrief: (payload: {
    title: string;
    description: string;
    contentGuidelines: string;
    deliverables: string[];
  }) =>
    request<{
      source: string;
      improvedDescription: string;
      improvedGuidelines: string;
      suggestedDos: string[];
      suggestedDonts: string[];
    }>('/api/ai/improve-brief', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCampaignInsights: () =>
    request<{
      source: string;
      headline: string;
      insights: string[];
    }>('/api/ai/campaign-insights', { method: 'POST' }),
};

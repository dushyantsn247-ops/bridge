export type UserRole = 'creator' | 'brand' | 'admin';

export type SubscriptionPlan =
  | 'creator_free'
  | 'bridge_plus'
  | 'brand_starter'
  | 'brand_growth'
  | 'brand_enterprise';

export type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Viewed'
  | 'Shortlisted'
  | 'Discussion'
  | 'Accepted'
  | 'Rejected';

export type DeliverableStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Approved';

export type PaymentStatus =
  | 'Unfunded'
  | 'Funded'
  | 'In Review'
  | 'Released'
  | 'Refunded'
  | 'Disputed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  plan: SubscriptionPlan;
  suspended: boolean;
  isDemo: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  platform: string;
  url: string;
  category: string;
  viewsOrReach: string;
  description: string;
  coverTint: string;
}

export interface RateCard {
  instagramReel: number;
  instagramStorySet: number;
  youtubeDedicated: number;
  youtubeShorts: number;
  ugcBundle: number;
  currency: 'INR';
}

export interface CreatorProfile {
  id: string;
  userId: string;
  fullName: string;
  handle: string;
  avatarStyle: string;
  coverStyle: string;
  bio: string;
  city: string;
  state: string;
  languages: string[];
  niches: string[];
  instagramHandle: string;
  instagramFollowers: number;
  youtubeHandle?: string;
  youtubeSubscribers?: number;
  otherPlatforms: string[];
  totalFollowers: number;
  engagementRate: number; // percentage e.g. 5.8
  statsSelfReported: boolean;
  audienceTopCities: string[];
  audienceAgeRange: string;
  portfolio: PortfolioItem[];
  previousCollaborations: string[];
  preferredCollabTypes: string[];
  rateCard: RateCard;
  availability: 'Available' | 'Limited Availability' | 'Booked Until Next Month';
  verificationStatus: VerificationStatus;
  bridgeCreatorScore: number;
  profileViews: number;
  campaignImpressions: number;
  completedDealsCount: number;
  totalEarningsINR: number;
  ratingAvg: number;
  reviewCount: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface BrandTeamMember {
  name: string;
  role: string;
  email: string;
}

export interface BrandProfile {
  id: string;
  userId: string;
  companyName: string;
  logoMonogram: string;
  brandAccent: string;
  website: string;
  industry: string;
  description: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  preferredCategories: string[];
  teamMembers: BrandTeamMember[];
  verificationStatus: VerificationStatus;
  activeCampaignsCount: number;
  completedDealsCount: number;
  totalBudgetAllocatedINR: number;
  ratingAvg: number;
  reviewCount: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  brandId: string;
  brandUserId: string;
  brandName: string;
  brandLogoMonogram: string;
  brandAccent: string;
  brandVerified: boolean;
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
  currency: 'INR';
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  requiredLanguages: string[];
  location: string;
  followerMin: number;
  followerMax: number;
  minEngagementRate: number;
  eligibilityRequirements: string[];
  contentGuidelines: string;
  dos: string[];
  donts: string[];
  creatorsRequired: number;
  applicantCount: number;
  status: 'Active' | 'Paused' | 'Closed' | 'Under Moderation';
  screeningQuestions: string[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWeights {
  niche: number;
  audience: number;
  engagement: number;
  budget: number;
  platform: number;
}

export interface MatchBreakdown {
  nicheScore: number;
  audienceScore: number;
  engagementScore: number;
  budgetScore: number;
  platformScore: number;
}

export interface MatchResult {
  id: string;
  creatorId: string;
  campaignId: string;
  overallScore: number;
  breakdown: MatchBreakdown;
  weightsUsed: MatchWeights;
  reasons: string[];
  potentialMismatches: string[];
  dataNotices: string[];
  recommendedRateINR: number;
  suggestedContentAngle: string;
  aiEnhancedExplanation?: string;
  computedAt: string;
}

export interface ApplicationQuestionAnswer {
  question: string;
  answer: string;
}

export interface Application {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brandId: string;
  brandName: string;
  creatorId: string;
  creatorUserId: string;
  creatorName: string;
  creatorHandle: string;
  pitch: string;
  proposedRateINR: number;
  attachedPortfolioIds: string[];
  questionAnswers: ApplicationQuestionAnswer[];
  matchScore: number;
  status: ApplicationStatus;
  brandInternalNotes: string;
  timeline: { status: ApplicationStatus; timestamp: string; note?: string }[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionRecord {
  id: string;
  deliverableId: string;
  dealId: string;
  creatorId: string;
  version: number;
  contentUrl: string;
  captionOrNotes: string;
  fileName?: string;
  submittedAt: string;
  brandFeedback?: string;
  statusAtSubmission: DeliverableStatus;
}

export interface DeliverableItem {
  id: string;
  dealId: string;
  title: string;
  platform: string;
  dueDate: string;
  milestoneAmountINR: number;
  status: DeliverableStatus;
  latestRevisionNote?: string;
  submissions: SubmissionRecord[];
}

export interface SharedFileItem {
  id: string;
  dealId: string;
  uploadedByRole: UserRole;
  uploaderName: string;
  fileName: string;
  fileSizeLabel: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Deal {
  id: string;
  campaignId: string;
  campaignTitle: string;
  applicationId: string;
  brandId: string;
  brandUserId: string;
  brandName: string;
  creatorId: string;
  creatorUserId: string;
  creatorName: string;
  agreedAmountINR: number;
  currency: 'INR';
  paymentStatus: PaymentStatus;
  status: 'Active' | 'Completed' | 'Disputed' | 'Cancelled';
  startDate: string;
  deadline: string;
  deliverables: DeliverableItem[];
  sharedFiles: SharedFileItem[];
  paymentTimeline: { status: PaymentStatus; timestamp: string; note: string }[];
  brandReviewed: boolean;
  creatorReviewed: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachmentName?: string;
  attachmentUrl?: string;
  readByUserIds: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  contextType: 'application' | 'deal' | 'direct';
  contextId: string;
  contextTitle: string;
  participantUserIds: string[];
  brandUserId: string;
  brandName: string;
  creatorUserId: string;
  creatorName: string;
  lastMessageText: string;
  lastMessageAt: string;
  isDemo: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    | 'campaign_match'
    | 'application_status'
    | 'new_message'
    | 'deliverable_update'
    | 'verification'
    | 'deal_completed'
    | 'payment_update';
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: 'creator' | 'brand';
  documentType: string;
  documentReference: string;
  socialOrWebsiteProof: string;
  status: VerificationStatus;
  adminNote?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
  isDemo: boolean;
}

export interface DisputeRecord {
  id: string;
  dealId: string;
  campaignTitle: string;
  raisedByUserId: string;
  raisedByName: string;
  raisedByRole: 'creator' | 'brand';
  reason: string;
  details: string;
  amountInDisputeINR: number;
  status: 'Open' | 'Under Review' | 'Resolved - Released to Creator' | 'Resolved - Refunded to Brand';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
  isDemo: boolean;
}

export interface ReviewRecord {
  id: string;
  dealId: string;
  campaignTitle: string;
  reviewerUserId: string;
  reviewerName: string;
  reviewerRole: 'creator' | 'brand';
  targetUserId: string;
  targetName: string;
  metrics: {
    communication: number;
    qualityOrClarity: number;
    timelinessOrPayment: number;
    professionalism: number;
  };
  overallRating: number;
  comment: string;
  reported: boolean;
  reportReason?: string;
  createdAt: string;
  isDemo: boolean;
}

export interface CreatorCollection {
  id: string;
  brandUserId: string;
  name: string;
  creatorIds: string[];
  createdAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  roleOrCompany: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

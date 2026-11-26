import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createInitialSeedSnapshot } from './src/shared/seedData.ts';
import type { BridgeDatabaseSnapshot } from './src/shared/seedData.ts';
import { computeCreatorCampaignMatch } from './src/shared/matchingEngine.ts';
import type {
  Application,
  ApplicationStatus,
  BrandProfile,
  Campaign,
  CreatorProfile,
  Deal,
  DeliverableStatus,
  Message,
  NotificationItem,
  PaymentStatus,
  SubscriptionPlan,
  User,
  UserRole,
} from './src/types/domain.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'bridge-db.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'bridge-local-adapter-hmac-secret-2026';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

function signToken(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      uid: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

function loadDatabase(): BridgeDatabaseSnapshot {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw) as BridgeDatabaseSnapshot;
    } catch (err) {
      console.error('Corrupted DB snapshot, re-seeding:', err);
    }
  }
  const initial = createInitialSeedSnapshot(hashPassword);
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  return initial;
}

const db: BridgeDatabaseSnapshot = loadDatabase();

function saveDatabase(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

function pushNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): void {
  db.notifications.unshift({
    ...item,
    id: makeId('notif'),
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function logAudit(
  actor: User,
  action: string,
  targetType: string,
  targetId: string,
  summary: string
): void {
  db.auditLogs.unshift({
    id: makeId('audit'),
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    summary,
    createdAt: new Date().toISOString(),
  });
}

// Gemini client helper — strictly server-side
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withGeminiTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer!);
  });
}

interface AuthedRequest extends Request {
  user?: User;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const uid = verifyToken(header.slice(7));
  if (!uid) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  const user = db.users.find((u) => u.id === uid);
  if (!user) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }
  if (user.suspended) {
    res.status(403).json({ error: 'This account has been suspended by marketplace moderation.' });
    return;
  }
  req.user = user;
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient role permissions for this operation.' });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // ==========================================
  // PUBLIC STATS & MARKETPLACE EXPLORATION
  // ==========================================
  app.get('/api/public/stats', (_req: Request, res: Response) => {
    const activeCampaigns = db.campaigns.filter((c) => c.status === 'Active');
    const totalBudgetINR = activeCampaigns.reduce((acc, c) => acc + c.budgetMaxINR, 0);
    res.json({
      isDemoDatasetIncluded: true,
      creatorsCount: db.creatorProfiles.length,
      brandsCount: db.brandProfiles.length,
      activeCampaignsCount: activeCampaigns.length,
      completedDealsCount: db.deals.filter((d) => d.status === 'Completed').length,
      totalOpportunityPoolINR: totalBudgetINR,
    });
  });

  app.get('/api/public/campaigns', (_req: Request, res: Response) => {
    const active = db.campaigns.filter((c) => c.status === 'Active');
    res.json({ campaigns: active });
  });

  app.get('/api/public/creators/:id', (req: Request, res: Response) => {
    const profile = db.creatorProfiles.find(
      (c) => c.id === req.params.id || c.userId === req.params.id
    );
    if (!profile) {
      res.status(404).json({ error: 'Creator profile not found.' });
      return;
    }
    const creatorReviews = db.reviews.filter((r) => r.targetUserId === profile.userId);
    res.json({ profile, reviews: creatorReviews });
  });

  app.post('/api/public/contact', (req: Request, res: Response) => {
    const { name, email, roleOrCompany, subject, message } = req.body as Record<string, string>;
    if (!name?.trim() || !email?.includes('@') || !message?.trim()) {
      res.status(400).json({ error: 'Please provide a valid name, email address, and message.' });
      return;
    }
    const record = {
      id: makeId('contact'),
      name: name.trim(),
      email: email.trim(),
      roleOrCompany: roleOrCompany?.trim() || 'Visitor',
      subject: subject?.trim() || 'General Inquiry',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    db.contactMessages.unshift(record);
    saveDatabase();
    res.json({ ok: true, submission: record });
  });

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================
  app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { fullName, email, password, role } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    };
    if (!fullName || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail.includes('@') || normalizedEmail.length < 5) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (role !== 'creator' && role !== 'brand') {
      res.status(400).json({ error: 'Please choose either Creator or Brand role.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = makeId('user');
    const now = new Date().toISOString();
    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role,
      emailVerified: false,
      onboardingCompleted: false,
      plan: role === 'creator' ? 'creator_free' : 'brand_starter',
      suspended: false,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    db.passwordHashes[userId] = hashPassword(password);

    if (role === 'creator') {
      const handleSlug = fullName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
      const profile: CreatorProfile = {
        id: makeId('cr'),
        userId,
        fullName: fullName.trim(),
        handle: `@${handleSlug || 'creator'}`,
        avatarStyle: 'linear-gradient(135deg, #246BFD, #00D5FF)',
        coverStyle: 'linear-gradient(120deg, #0B0D18 0%, #171B2C 55%, #246BFD 100%)',
        bio: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        languages: ['English', 'Hindi'],
        niches: ['Lifestyle'],
        instagramHandle: `@${handleSlug || 'creator'}`,
        instagramFollowers: 15000,
        otherPlatforms: [],
        totalFollowers: 15000,
        engagementRate: 5.2,
        statsSelfReported: true,
        audienceTopCities: ['Bengaluru', 'Mumbai'],
        audienceAgeRange: '18–28',
        portfolio: [],
        previousCollaborations: [],
        preferredCollabTypes: ['Sponsored Reels'],
        rateCard: {
          instagramReel: 18000,
          instagramStorySet: 5000,
          youtubeDedicated: 28000,
          youtubeShorts: 16000,
          ugcBundle: 22000,
          currency: 'INR',
        },
        availability: 'Available',
        verificationStatus: 'unsubmitted',
        bridgeCreatorScore: 72,
        profileViews: 1,
        campaignImpressions: 0,
        completedDealsCount: 0,
        totalEarningsINR: 0,
        ratingAvg: 0,
        reviewCount: 0,
        isDemo: false,
        updatedAt: now,
      };
      db.creatorProfiles.push(profile);
    } else {
      const initials = fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() || 'B')
        .slice(0, 2)
        .join('');
      const profile: BrandProfile = {
        id: makeId('br'),
        userId,
        companyName: `${fullName.trim()} Brand`,
        logoMonogram: initials || 'BR',
        brandAccent: '#246BFD',
        website: '',
        industry: 'Lifestyle',
        description: '',
        location: 'Mumbai, Maharashtra',
        contactEmail: normalizedEmail,
        contactPhone: '',
        preferredCategories: ['Lifestyle'],
        teamMembers: [{ name: fullName.trim(), role: 'Founder / Marketing', email: normalizedEmail }],
        verificationStatus: 'unsubmitted',
        activeCampaignsCount: 0,
        completedDealsCount: 0,
        totalBudgetAllocatedINR: 0,
        ratingAvg: 0,
        reviewCount: 0,
        isDemo: false,
        updatedAt: now,
      };
      db.brandProfiles.push(profile);
    }

    pushNotification({
      userId,
      type: 'verification',
      title: 'Welcome to BRIDGE',
      body: 'Complete your onboarding profile to activate deterministic AI matching.',
      link: role === 'creator' ? '/onboarding/creator' : '/onboarding/brand',
    });

    saveDatabase();
    res.json({ token: signToken(userId), user: newUser });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.suspended) {
      res.status(403).json({ error: 'This account has been suspended by moderation.' });
      return;
    }
    const storedHash = db.passwordHashes[user.id];
    if (!password || !storedHash || !verifyPassword(password, storedHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    res.json({ token: signToken(user.id), user });
  });

  app.post('/api/auth/demo-login', (req: Request, res: Response) => {
    const { role } = req.body as { role?: UserRole };
    const emailMap: Record<UserRole, string> = {
      creator: 'demo.creator@bridge.in',
      brand: 'demo.brand@bridge.in',
      admin: 'demo.admin@bridge.in',
    };
    const targetEmail = emailMap[role || 'creator'];
    const user = db.users.find((u) => u.email === targetEmail);
    if (!user) {
      res.status(404).json({ error: 'Demo account not found.' });
      return;
    }
    res.json({ token: signToken(user.id), user });
  });

  app.post('/api/auth/google-adapter', (req: Request, res: Response) => {
    const { email, fullName, role } = req.body as {
      email?: string;
      fullName?: string;
      role?: UserRole;
    };
    const normalizedEmail = (email || 'creator.google@bridge-local.in').trim().toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      const assignedRole: UserRole = role === 'brand' ? 'brand' : 'creator';
      const userId = makeId('user');
      const now = new Date().toISOString();
      const nameToUse = (fullName || 'Google Workspace User').trim();
      user = {
        id: userId,
        email: normalizedEmail,
        fullName: nameToUse,
        role: assignedRole,
        emailVerified: true,
        onboardingCompleted: false,
        plan: assignedRole === 'creator' ? 'creator_free' : 'brand_starter',
        suspended: false,
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(user);
      db.passwordHashes[userId] = hashPassword(crypto.randomBytes(16).toString('hex'));
      if (assignedRole === 'creator') {
        db.creatorProfiles.push({
          id: makeId('cr'),
          userId,
          fullName: nameToUse,
          handle: `@${nameToUse.toLowerCase().replace(/[^a-z0-9]+/g, '.')}`,
          avatarStyle: 'linear-gradient(135deg, #246BFD, #9C65FF)',
          coverStyle: 'linear-gradient(120deg, #0B0D18 0%, #171B2C 55%, #246BFD 100%)',
          bio: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          languages: ['English', 'Hindi'],
          niches: ['Lifestyle'],
          instagramHandle: `@${nameToUse.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
          instagramFollowers: 18000,
          otherPlatforms: [],
          totalFollowers: 18000,
          engagementRate: 5.6,
          statsSelfReported: true,
          audienceTopCities: ['Mumbai', 'Bengaluru'],
          audienceAgeRange: '18–28',
          portfolio: [],
          previousCollaborations: [],
          preferredCollabTypes: ['Sponsored Reels'],
          rateCard: {
            instagramReel: 20000,
            instagramStorySet: 6000,
            youtubeDedicated: 30000,
            youtubeShorts: 18000,
            ugcBundle: 24000,
            currency: 'INR',
          },
          availability: 'Available',
          verificationStatus: 'unsubmitted',
          bridgeCreatorScore: 76,
          profileViews: 1,
          campaignImpressions: 0,
          completedDealsCount: 0,
          totalEarningsINR: 0,
          ratingAvg: 0,
          reviewCount: 0,
          isDemo: false,
          updatedAt: now,
        });
      } else {
        db.brandProfiles.push({
          id: makeId('br'),
          userId,
          companyName: `${nameToUse} Studio`,
          logoMonogram: nameToUse.slice(0, 2).toUpperCase(),
          brandAccent: '#00D5FF',
          website: '',
          industry: 'Technology',
          description: '',
          location: 'Bengaluru, Karnataka',
          contactEmail: normalizedEmail,
          contactPhone: '',
          preferredCategories: ['Technology', 'Lifestyle'],
          teamMembers: [{ name: nameToUse, role: 'Brand Lead', email: normalizedEmail }],
          verificationStatus: 'unsubmitted',
          activeCampaignsCount: 0,
          completedDealsCount: 0,
          totalBudgetAllocatedINR: 0,
          ratingAvg: 0,
          reviewCount: 0,
          isDemo: false,
          updatedAt: now,
        });
      }
      saveDatabase();
    }
    res.json({ token: signToken(user.id), user });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const creatorProfile =
      user.role === 'creator'
        ? db.creatorProfiles.find((c) => c.userId === user.id) || null
        : null;
    const brandProfile =
      user.role === 'brand'
        ? db.brandProfiles.find((b) => b.userId === user.id) || null
        : null;
    const unreadNotifications = db.notifications.filter(
      (n) => n.userId === user.id && !n.read
    ).length;
    res.json({ user, creatorProfile, brandProfile, unreadNotifications });
  });

  app.post('/api/auth/verify-email', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    user.emailVerified = true;
    user.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json({ ok: true, user });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email, newPassword } = req.body as { email?: string; newPassword?: string };
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === normalized);
    if (user && !user.isDemo && newPassword && newPassword.length >= 8) {
      db.passwordHashes[user.id] = hashPassword(newPassword);
      saveDatabase();
      res.json({
        ok: true,
        resetCompleted: true,
        message: 'Password updated cleanly in the local authentication adapter.',
      });
      return;
    }
    res.json({
      ok: true,
      resetCompleted: false,
      message:
        'If an account matches this email, password recovery instructions have been dispatched (Demo accounts keep BridgeDemo@2026).',
    });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.isDemo) {
      res.status(400).json({
        error: 'Protected Demo Environment accounts cannot be permanently deleted.',
      });
      return;
    }
    db.users = db.users.filter((u) => u.id !== user.id);
    delete db.passwordHashes[user.id];
    db.creatorProfiles = db.creatorProfiles.filter((c) => c.userId !== user.id);
    db.brandProfiles = db.brandProfiles.filter((b) => b.userId !== user.id);
    saveDatabase();
    res.json({ ok: true });
  });

  // ==========================================
  // ONBOARDING & PROFILE UPDATES
  // ==========================================
  app.put(
    '/api/creator/profile',
    requireAuth,
    requireRole('creator'),
    (req: AuthedRequest, res: Response) => {
      const user = req.user!;
      const profile = db.creatorProfiles.find((c) => c.userId === user.id);
      if (!profile) {
        res.status(404).json({ error: 'Creator profile not found.' });
        return;
      }
      const updates = req.body as Partial<CreatorProfile> & { completeOnboarding?: boolean };

      if (updates.fullName) {
        profile.fullName = updates.fullName.trim();
        user.fullName = updates.fullName.trim();
      }
      if (updates.handle) profile.handle = updates.handle.trim();
      if (updates.bio !== undefined) profile.bio = updates.bio;
      if (updates.city) profile.city = updates.city;
      if (updates.state) profile.state = updates.state;
      if (Array.isArray(updates.languages) && updates.languages.length > 0) {
        profile.languages = updates.languages;
      }
      if (Array.isArray(updates.niches) && updates.niches.length > 0) {
        profile.niches = updates.niches;
      }
      if (updates.instagramHandle !== undefined) profile.instagramHandle = updates.instagramHandle;
      if (typeof updates.instagramFollowers === 'number') {
        profile.instagramFollowers = Math.max(0, updates.instagramFollowers);
      }
      if (updates.youtubeHandle !== undefined) profile.youtubeHandle = updates.youtubeHandle;
      if (typeof updates.youtubeSubscribers === 'number') {
        profile.youtubeSubscribers = Math.max(0, updates.youtubeSubscribers);
      }
      if (Array.isArray(updates.otherPlatforms)) profile.otherPlatforms = updates.otherPlatforms;
      profile.totalFollowers =
        (profile.instagramFollowers || 0) + (profile.youtubeSubscribers || 0);
      if (typeof updates.engagementRate === 'number') {
        profile.engagementRate = Math.min(25, Math.max(0.1, updates.engagementRate));
      }
      if (Array.isArray(updates.audienceTopCities)) {
        profile.audienceTopCities = updates.audienceTopCities;
      }
      if (updates.audienceAgeRange) profile.audienceAgeRange = updates.audienceAgeRange;
      if (Array.isArray(updates.portfolio)) profile.portfolio = updates.portfolio;
      if (Array.isArray(updates.preferredCollabTypes)) {
        profile.preferredCollabTypes = updates.preferredCollabTypes;
      }
      if (updates.rateCard) {
        profile.rateCard = { ...profile.rateCard, ...updates.rateCard, currency: 'INR' };
      }
      if (updates.availability) profile.availability = updates.availability;
      if (updates.avatarStyle) profile.avatarStyle = updates.avatarStyle;

      // Recompute Bridge Creator Score deterministically
      let score = 60;
      if (profile.bio.length >= 40) score += 8;
      if (profile.portfolio.length >= 1) score += 10;
      if (profile.portfolio.length >= 2) score += 5;
      if (profile.engagementRate >= 5.0) score += 8;
      if (profile.verificationStatus === 'verified') score += 7;
      profile.bridgeCreatorScore = Math.min(98, score);

      if (updates.completeOnboarding) {
        user.onboardingCompleted = true;
      }
      profile.updatedAt = new Date().toISOString();
      user.updatedAt = profile.updatedAt;
      saveDatabase();
      res.json({ user, profile });
    }
  );

  app.put(
    '/api/brand/profile',
    requireAuth,
    requireRole('brand'),
    (req: AuthedRequest, res: Response) => {
      const user = req.user!;
      const profile = db.brandProfiles.find((b) => b.userId === user.id);
      if (!profile) {
        res.status(404).json({ error: 'Brand profile not found.' });
        return;
      }
      const updates = req.body as Partial<BrandProfile> & { completeOnboarding?: boolean };
      if (updates.companyName) profile.companyName = updates.companyName.trim();
      if (updates.logoMonogram) profile.logoMonogram = updates.logoMonogram.slice(0, 3).toUpperCase();
      if (updates.brandAccent) profile.brandAccent = updates.brandAccent;
      if (updates.website !== undefined) profile.website = updates.website.trim();
      if (updates.industry) profile.industry = updates.industry;
      if (updates.description !== undefined) profile.description = updates.description;
      if (updates.location) profile.location = updates.location;
      if (updates.contactEmail) profile.contactEmail = updates.contactEmail;
      if (updates.contactPhone !== undefined) profile.contactPhone = updates.contactPhone;
      if (Array.isArray(updates.preferredCategories)) {
        profile.preferredCategories = updates.preferredCategories;
      }
      if (Array.isArray(updates.teamMembers)) {
        profile.teamMembers = updates.teamMembers;
      }
      if (updates.completeOnboarding) {
        user.onboardingCompleted = true;
      }
      profile.updatedAt = new Date().toISOString();
      user.updatedAt = profile.updatedAt;
      saveDatabase();
      res.json({ user, profile });
    }
  );

  // ==========================================
  // MARKETPLACE DATA & DETERMINISTIC MATCHING
  // ==========================================
  app.get('/api/marketplace/campaigns', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const includeDemo = req.query.includeDemo !== 'false';
    const campaigns = db.campaigns.filter(
      (c) => c.status === 'Active' && (user.isDemo || includeDemo || !c.isDemo)
    );
    const creatorProfile =
      user.role === 'creator'
        ? db.creatorProfiles.find((c) => c.userId === user.id)
        : undefined;

    const weights = req.query.weights ? JSON.parse(String(req.query.weights)) : undefined;
    const matches = creatorProfile
      ? campaigns.map((camp) => computeCreatorCampaignMatch(creatorProfile, camp, weights))
      : [];

    const savedIds = db.savedCampaignIdsByUser[user.id] || [];
    res.json({ campaigns, matches, savedIds });
  });

  app.get('/api/marketplace/campaigns/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const campaign = db.campaigns.find((c) => c.id === req.params.id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }
    const user = req.user!;
    const creatorProfile =
      user.role === 'creator'
        ? db.creatorProfiles.find((c) => c.userId === user.id)
        : undefined;
    const match = creatorProfile
      ? computeCreatorCampaignMatch(creatorProfile, campaign)
      : null;
    const existingApplication = creatorProfile
      ? db.applications.find(
          (a) => a.campaignId === campaign.id && a.creatorId === creatorProfile.id
        ) || null
      : null;
    const saved = (db.savedCampaignIdsByUser[user.id] || []).includes(campaign.id);
    res.json({ campaign, match, existingApplication, saved });
  });

  app.post(
    '/api/creator/saved-campaigns/toggle',
    requireAuth,
    requireRole('creator'),
    (req: AuthedRequest, res: Response) => {
      const userId = req.user!.id;
      const { campaignId } = req.body as { campaignId?: string };
      if (!campaignId) {
        res.status(400).json({ error: 'campaignId is required.' });
        return;
      }
      const current = db.savedCampaignIdsByUser[userId] || [];
      const exists = current.includes(campaignId);
      db.savedCampaignIdsByUser[userId] = exists
        ? current.filter((id) => id !== campaignId)
        : [...current, campaignId];
      saveDatabase();
      res.json({ savedIds: db.savedCampaignIdsByUser[userId] });
    }
  );

  // ==========================================
  // APPLICATIONS WORKFLOW
  // ==========================================
  app.get('/api/applications', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'creator') {
      const apps = db.applications.filter((a) => a.creatorUserId === user.id);
      res.json({ applications: apps });
      return;
    }
    if (user.role === 'brand') {
      const brand = db.brandProfiles.find((b) => b.userId === user.id);
      const apps = brand
        ? db.applications.filter((a) => a.brandId === brand.id)
        : [];
      res.json({ applications: apps });
      return;
    }
    res.json({ applications: db.applications });
  });

  app.post(
    '/api/applications',
    requireAuth,
    requireRole('creator'),
    (req: AuthedRequest, res: Response) => {
      const user = req.user!;
      const creator = db.creatorProfiles.find((c) => c.userId === user.id);
      if (!creator) {
        res.status(404).json({ error: 'Complete creator profile before applying.' });
        return;
      }
      const {
        campaignId,
        pitch,
        proposedRateINR,
        attachedPortfolioIds,
        questionAnswers,
        asDraft,
      } = req.body as {
        campaignId?: string;
        pitch?: string;
        proposedRateINR?: number;
        attachedPortfolioIds?: string[];
        questionAnswers?: { question: string; answer: string }[];
        asDraft?: boolean;
      };

      const campaign = db.campaigns.find((c) => c.id === campaignId);
      if (!campaign || campaign.status !== 'Active') {
        res.status(400).json({ error: 'Campaign is not available for applications.' });
        return;
      }

      const duplicate = db.applications.find(
        (a) => a.campaignId === campaign.id && a.creatorId === creator.id && a.status !== 'Draft'
      );
      if (duplicate) {
        res.status(409).json({ error: 'You have already submitted an application to this campaign.' });
        return;
      }

      if (!asDraft && (!pitch || pitch.trim().length < 20)) {
        res.status(400).json({ error: 'Please write a pitch of at least 20 characters.' });
        return;
      }
      const rate = Number(proposedRateINR);
      if (!rate || rate < 1000) {
        res.status(400).json({ error: 'Please enter a valid collaboration rate in INR (minimum ₹1,000).' });
        return;
      }

      const match = computeCreatorCampaignMatch(creator, campaign);
      const status: ApplicationStatus = asDraft ? 'Draft' : 'Submitted';
      const now = new Date().toISOString();

      // Update existing draft if present
      const existingDraft = db.applications.find(
        (a) => a.campaignId === campaign.id && a.creatorId === creator.id && a.status === 'Draft'
      );

      let application: Application;
      if (existingDraft) {
        existingDraft.pitch = (pitch || '').trim();
        existingDraft.proposedRateINR = rate;
        existingDraft.attachedPortfolioIds = attachedPortfolioIds || [];
        existingDraft.questionAnswers = questionAnswers || [];
        existingDraft.matchScore = match.overallScore;
        existingDraft.status = status;
        existingDraft.timeline.push({ status, timestamp: now });
        existingDraft.updatedAt = now;
        application = existingDraft;
      } else {
        application = {
          id: makeId('app'),
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          brandId: campaign.brandId,
          brandName: campaign.brandName,
          creatorId: creator.id,
          creatorUserId: user.id,
          creatorName: creator.fullName,
          creatorHandle: creator.handle,
          pitch: (pitch || '').trim(),
          proposedRateINR: rate,
          attachedPortfolioIds: attachedPortfolioIds || [],
          questionAnswers: questionAnswers || [],
          matchScore: match.overallScore,
          status,
          brandInternalNotes: '',
          timeline: [{ status, timestamp: now }],
          isDemo: user.isDemo,
          createdAt: now,
          updatedAt: now,
        };
        db.applications.unshift(application);
        if (status === 'Submitted') {
          campaign.applicantCount += 1;
        }
      }

      if (status === 'Submitted') {
        pushNotification({
          userId: campaign.brandUserId,
          type: 'application_status',
          title: `New ${match.overallScore}% Match Application`,
          body: `${creator.fullName} (${creator.handle}) applied to "${campaign.title}" at ₹${rate.toLocaleString('en-IN')}.`,
          link: '/brand/applications',
        });
      }

      saveDatabase();
      res.json({ application });
    }
  );

  app.patch(
    '/api/applications/:id/status',
    requireAuth,
    requireRole('brand'),
    (req: AuthedRequest, res: Response) => {
      const user = req.user!;
      const brand = db.brandProfiles.find((b) => b.userId === user.id);
      const appItem = db.applications.find((a) => a.id === req.params.id);
      if (!appItem || !brand || appItem.brandId !== brand.id) {
        res.status(403).json({ error: 'Not authorized to manage this application.' });
        return;
      }
      const { status, brandInternalNotes, createDealNow } = req.body as {
        status?: ApplicationStatus;
        brandInternalNotes?: string;
        createDealNow?: boolean;
      };
      const now = new Date().toISOString();
      if (brandInternalNotes !== undefined) {
        appItem.brandInternalNotes = brandInternalNotes;
      }
      let createdDeal: Deal | null = null;
      if (status && status !== appItem.status) {
        appItem.status = status;
        appItem.timeline.push({ status, timestamp: now });
        pushNotification({
          userId: appItem.creatorUserId,
          type: 'application_status',
          title: `Application ${status} · ${brand.companyName}`,
          body: `Your application for "${appItem.campaignTitle}" is now marked ${status}.`,
          link: '/creator/applications',
        });
      }

      if ((status === 'Accepted' || createDealNow) && !db.deals.some((d) => d.applicationId === appItem.id)) {
        const campaign = db.campaigns.find((c) => c.id === appItem.campaignId);
        const delivLabels = campaign?.deliverables.length
          ? campaign.deliverables
          : ['1x Primary Sponsored Deliverable'];
        const dealId = makeId('deal');
        const perMilestone = Math.round(appItem.proposedRateINR / delivLabels.length);
        createdDeal = {
          id: dealId,
          campaignId: appItem.campaignId,
          campaignTitle: appItem.campaignTitle,
          applicationId: appItem.id,
          brandId: brand.id,
          brandUserId: user.id,
          brandName: brand.companyName,
          creatorId: appItem.creatorId,
          creatorUserId: appItem.creatorUserId,
          creatorName: appItem.creatorName,
          agreedAmountINR: appItem.proposedRateINR,
          currency: 'INR',
          paymentStatus: 'Unfunded',
          status: 'Active',
          startDate: now.slice(0, 10),
          deadline: campaign?.endDate || '2026-12-15',
          deliverables: delivLabels.map((title, idx) => ({
            id: makeId(`deliv_${idx}`),
            dealId,
            title,
            platform: campaign?.platforms[0] || 'Instagram',
            dueDate: campaign?.endDate || '2026-12-10',
            milestoneAmountINR:
              idx === delivLabels.length - 1
                ? appItem.proposedRateINR - perMilestone * (delivLabels.length - 1)
                : perMilestone,
            status: 'Not Started',
            submissions: [],
          })),
          sharedFiles: [],
          paymentTimeline: [
            {
              status: 'Unfunded',
              timestamp: now,
              note: 'Deal Room created. Waiting for simulated escrow funding in Test Mode.',
            },
          ],
          brandReviewed: false,
          creatorReviewed: false,
          isDemo: user.isDemo,
          createdAt: now,
          updatedAt: now,
        };
        db.deals.unshift(createdDeal);

        // Ensure Deal Conversation exists
        const existingConv = db.conversations.find(
          (c) => c.contextType === 'deal' && c.contextId === dealId
        );
        if (!existingConv) {
          const convId = makeId('conv');
          db.conversations.unshift({
            id: convId,
            contextType: 'deal',
            contextId: dealId,
            contextTitle: `Deal Room · ${appItem.campaignTitle}`,
            participantUserIds: [user.id, appItem.creatorUserId],
            brandUserId: user.id,
            brandName: brand.companyName,
            creatorUserId: appItem.creatorUserId,
            creatorName: appItem.creatorName,
            lastMessageText: `Deal Room opened at ₹${appItem.proposedRateINR.toLocaleString('en-IN')}.`,
            lastMessageAt: now,
            isDemo: user.isDemo,
          });
          db.messages.push({
            id: makeId('msg'),
            conversationId: convId,
            senderUserId: user.id,
            senderName: brand.companyName,
            senderRole: 'brand',
            text: `Welcome to the Deal Room! Excited to collaborate on "${appItem.campaignTitle}" for ₹${appItem.proposedRateINR.toLocaleString('en-IN')}.`,
            readByUserIds: [user.id],
            createdAt: now,
          });
        }
      }

      appItem.updatedAt = now;
      saveDatabase();
      res.json({ application: appItem, deal: createdDeal });
    }
  );

  // ==========================================
  // BRAND CAMPAIGNS & CREATOR DISCOVERY
  // ==========================================
  app.get('/api/brand/campaigns', requireAuth, requireRole('brand'), (req: AuthedRequest, res: Response) => {
    const brand = db.brandProfiles.find((b) => b.userId === req.user!.id);
    const list = brand ? db.campaigns.filter((c) => c.brandId === brand.id) : [];
    res.json({ campaigns: list });
  });

  app.post('/api/brand/campaigns', requireAuth, requireRole('brand'), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const brand = db.brandProfiles.find((b) => b.userId === user.id);
    if (!brand) {
      res.status(404).json({ error: 'Complete brand profile before publishing campaigns.' });
      return;
    }
    const body = req.body as Partial<Campaign>;
    if (!body.title || body.title.trim().length < 5) {
      res.status(400).json({ error: 'Campaign title must be at least 5 characters.' });
      return;
    }
    const budgetMin = Number(body.budgetMinINR || 15000);
    const budgetMax = Number(body.budgetMaxINR || 30000);
    if (budgetMin <= 0 || budgetMax < budgetMin) {
      res.status(400).json({ error: 'Maximum budget must be greater than or equal to minimum budget.' });
      return;
    }

    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: makeId('camp'),
      brandId: brand.id,
      brandUserId: user.id,
      brandName: brand.companyName,
      brandLogoMonogram: brand.logoMonogram,
      brandAccent: brand.brandAccent,
      brandVerified: brand.verificationStatus === 'verified',
      title: body.title.trim(),
      industry: body.industry || brand.industry || 'Lifestyle',
      description: body.description || '',
      objective: body.objective || 'Brand Awareness & Creator Storytelling',
      targetAudience: body.targetAudience || 'Indian Gen-Z & Millennial consumers',
      targetAgeRange: body.targetAgeRange || '18–30',
      niches: Array.isArray(body.niches) && body.niches.length ? body.niches : ['Lifestyle'],
      platforms: Array.isArray(body.platforms) && body.platforms.length ? body.platforms : ['Instagram'],
      deliverables:
        Array.isArray(body.deliverables) && body.deliverables.length
          ? body.deliverables
          : ['1x Instagram Reel (45–60s)'],
      budgetMinINR: budgetMin,
      budgetMaxINR: budgetMax,
      currency: 'INR',
      startDate: body.startDate || '2026-11-10',
      endDate: body.endDate || '2026-12-10',
      applicationDeadline: body.applicationDeadline || '2026-11-25',
      requiredLanguages:
        Array.isArray(body.requiredLanguages) && body.requiredLanguages.length
          ? body.requiredLanguages
          : ['English', 'Hindi'],
      location: body.location || 'Pan-India',
      followerMin: Number(body.followerMin || 10000),
      followerMax: Number(body.followerMax || 50000),
      minEngagementRate: Number(body.minEngagementRate || 4.5),
      eligibilityRequirements: body.eligibilityRequirements || ['10K–50K authentic following'],
      contentGuidelines: body.contentGuidelines || 'Authentic creator-led storytelling in natural light.',
      dos: body.dos || ['Tag brand handle and disclosure #ad'],
      donts: body.donts || ['Avoid exaggerated claims'],
      creatorsRequired: Number(body.creatorsRequired || 3),
      applicantCount: 0,
      status: 'Active',
      screeningQuestions: body.screeningQuestions?.length
        ? body.screeningQuestions
        : ['What creative hook would you use in the first 3 seconds?'],
      isDemo: user.isDemo,
      createdAt: now,
      updatedAt: now,
    };

    db.campaigns.unshift(campaign);
    brand.activeCampaignsCount += 1;
    brand.totalBudgetAllocatedINR += budgetMax * campaign.creatorsRequired;
    saveDatabase();
    res.json({ campaign });
  });

  app.get('/api/brand/discover-creators', requireAuth, requireRole('brand'), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const campaignId = req.query.campaignId ? String(req.query.campaignId) : undefined;
    const brand = db.brandProfiles.find((b) => b.userId === user.id);
    const brandCampaigns = brand ? db.campaigns.filter((c) => c.brandId === brand.id) : [];
    const referenceCampaign =
      brandCampaigns.find((c) => c.id === campaignId) ||
      brandCampaigns[0] ||
      db.campaigns[0];

    const creators = db.creatorProfiles.filter((c) => user.isDemo || c.isDemo || !c.isDemo);
    const ranked = creators
      .map((creator) => ({
        creator,
        match: referenceCampaign
          ? computeCreatorCampaignMatch(creator, referenceCampaign)
          : null,
      }))
      .sort((a, b) => (b.match?.overallScore || 0) - (a.match?.overallScore || 0));

    const shortlistedIds = db.shortlistedCreatorIdsByBrand[user.id] || [];
    const collections = db.creatorCollections.filter((col) => col.brandUserId === user.id);
    res.json({ ranked, referenceCampaign, shortlistedIds, collections });
  });

  app.post(
    '/api/brand/shortlist/toggle',
    requireAuth,
    requireRole('brand'),
    (req: AuthedRequest, res: Response) => {
      const userId = req.user!.id;
      const { creatorId } = req.body as { creatorId?: string };
      if (!creatorId) {
        res.status(400).json({ error: 'creatorId is required.' });
        return;
      }
      const list = db.shortlistedCreatorIdsByBrand[userId] || [];
      const exists = list.includes(creatorId);
      db.shortlistedCreatorIdsByBrand[userId] = exists
        ? list.filter((id) => id !== creatorId)
        : [...list, creatorId];

      if (!exists) {
        const creator = db.creatorProfiles.find((c) => c.id === creatorId);
        const brand = db.brandProfiles.find((b) => b.userId === userId);
        if (creator && brand) {
          pushNotification({
            userId: creator.userId,
            type: 'application_status',
            title: `Shortlisted by ${brand.companyName}`,
            body: `${brand.companyName} added your profile to their talent shortlist.`,
            link: '/creator/discover',
          });
        }
      }
      saveDatabase();
      res.json({ shortlistedIds: db.shortlistedCreatorIdsByBrand[userId] });
    }
  );

  app.post(
    '/api/brand/collections',
    requireAuth,
    requireRole('brand'),
    (req: AuthedRequest, res: Response) => {
      const { name, creatorId } = req.body as { name?: string; creatorId?: string };
      if (!name?.trim()) {
        res.status(400).json({ error: 'Collection name is required.' });
        return;
      }
      const col = {
        id: makeId('col'),
        brandUserId: req.user!.id,
        name: name.trim(),
        creatorIds: creatorId ? [creatorId] : [],
        createdAt: new Date().toISOString(),
      };
      db.creatorCollections.unshift(col);
      saveDatabase();
      res.json({ collection: col });
    }
  );

  app.post(
    '/api/brand/invite',
    requireAuth,
    requireRole('brand'),
    (req: AuthedRequest, res: Response) => {
      const user = req.user!;
      const brand = db.brandProfiles.find((b) => b.userId === user.id);
      const { creatorId, campaignId, note } = req.body as {
        creatorId?: string;
        campaignId?: string;
        note?: string;
      };
      const creator = db.creatorProfiles.find((c) => c.id === creatorId);
      const campaign = db.campaigns.find((c) => c.id === campaignId);
      if (!brand || !creator) {
        res.status(404).json({ error: 'Creator or brand profile not found.' });
        return;
      }
      const now = new Date().toISOString();
      const title = campaign ? `Invitation · ${campaign.title}` : `Direct Invite · ${brand.companyName}`;
      let conv = db.conversations.find(
        (c) => c.brandUserId === user.id && c.creatorUserId === creator.userId && c.contextType === 'direct'
      );
      const inviteText =
        note?.trim() ||
        `Hi ${creator.fullName}! We'd love to invite you to apply for "${campaign?.title || 'our upcoming campaign'}".`;
      if (!conv) {
        conv = {
          id: makeId('conv'),
          contextType: 'direct',
          contextId: campaign?.id || brand.id,
          contextTitle: title,
          participantUserIds: [user.id, creator.userId],
          brandUserId: user.id,
          brandName: brand.companyName,
          creatorUserId: creator.userId,
          creatorName: creator.fullName,
          lastMessageText: inviteText,
          lastMessageAt: now,
          isDemo: user.isDemo,
        };
        db.conversations.unshift(conv);
      } else {
        conv.lastMessageText = inviteText;
        conv.lastMessageAt = now;
      }
      db.messages.push({
        id: makeId('msg'),
        conversationId: conv.id,
        senderUserId: user.id,
        senderName: brand.companyName,
        senderRole: 'brand',
        text: inviteText,
        readByUserIds: [user.id],
        createdAt: now,
      });
      pushNotification({
        userId: creator.userId,
        type: 'new_message',
        title: `Direct Invitation from ${brand.companyName}`,
        body: inviteText,
        link: '/creator/messages',
      });
      saveDatabase();
      res.json({ ok: true, conversationId: conv.id });
    }
  );

  // ==========================================
  // DEAL ROOM, DELIVERABLES & SIMULATED ESCROW
  // ==========================================
  app.get('/api/deals', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'admin') {
      res.json({ deals: db.deals });
      return;
    }
    const deals = db.deals.filter(
      (d) => d.creatorUserId === user.id || d.brandUserId === user.id
    );
    res.json({ deals });
  });

  app.get('/api/deals/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal) {
      res.status(404).json({ error: 'Deal Room not found.' });
      return;
    }
    if (
      user.role !== 'admin' &&
      deal.creatorUserId !== user.id &&
      deal.brandUserId !== user.id
    ) {
      res.status(403).json({ error: 'Only authorized deal participants can access this Deal Room.' });
      return;
    }
    const dealReviews = db.reviews.filter((r) => r.dealId === deal.id);
    const conversation =
      db.conversations.find((c) => c.contextType === 'deal' && c.contextId === deal.id) || null;
    const messages = conversation
      ? db.messages.filter((m) => m.conversationId === conversation.id)
      : [];
    res.json({ deal, reviews: dealReviews, conversation, messages });
  });

  app.post('/api/deals/:id/payment', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal) {
      res.status(404).json({ error: 'Deal not found.' });
      return;
    }
    if (user.role !== 'brand' && user.role !== 'admin') {
      res.status(403).json({ error: 'Only the brand or admin can update simulated escrow funding.' });
      return;
    }
    if (user.role === 'brand' && deal.brandUserId !== user.id) {
      res.status(403).json({ error: 'Unauthorized brand user.' });
      return;
    }
    const { paymentStatus, note } = req.body as { paymentStatus?: PaymentStatus; note?: string };
    if (!paymentStatus) {
      res.status(400).json({ error: 'paymentStatus is required.' });
      return;
    }
    const now = new Date().toISOString();
    deal.paymentStatus = paymentStatus;
    deal.paymentTimeline.push({
      status: paymentStatus,
      timestamp: now,
      note:
        note ||
        `Simulated Escrow updated to ${paymentStatus} (Test Mode — no real funds transferred).`,
    });
    deal.updatedAt = now;
    pushNotification({
      userId: deal.creatorUserId,
      type: 'payment_update',
      title: `Simulated Escrow: ${paymentStatus}`,
      body: `${deal.brandName} updated payment status to ${paymentStatus} on "${deal.campaignTitle}".`,
      link: `/creator/deals/${deal.id}`,
    });
    saveDatabase();
    res.json({ deal });
  });

  app.post('/api/deals/:id/deliverables/:delivId/submit', requireAuth, requireRole('creator'), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal || deal.creatorUserId !== user.id) {
      res.status(403).json({ error: 'Unauthorized creator for this Deal Room.' });
      return;
    }
    const deliverable = deal.deliverables.find((del) => del.id === req.params.delivId);
    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable not found.' });
      return;
    }
    const { contentUrl, captionOrNotes, fileName } = req.body as {
      contentUrl?: string;
      captionOrNotes?: string;
      fileName?: string;
    };
    if (!contentUrl?.trim()) {
      res.status(400).json({ error: 'Please provide a deliverable link or file reference.' });
      return;
    }
    const now = new Date().toISOString();
    const version = deliverable.submissions.length + 1;
    deliverable.status = 'Under Review';
    deliverable.submissions.push({
      id: makeId('sub'),
      deliverableId: deliverable.id,
      dealId: deal.id,
      creatorId: deal.creatorId,
      version,
      contentUrl: contentUrl.trim(),
      captionOrNotes: captionOrNotes?.trim() || `Version ${version} submitted for review.`,
      fileName: fileName?.trim() || `deliverable_v${version}.mp4`,
      submittedAt: now,
      statusAtSubmission: 'Under Review',
    });
    if (deal.paymentStatus === 'Funded') {
      deal.paymentStatus = 'In Review';
      deal.paymentTimeline.push({
        status: 'In Review',
        timestamp: now,
        note: `Deliverable "${deliverable.title}" v${version} submitted for brand review.`,
      });
    }
    deal.updatedAt = now;
    pushNotification({
      userId: deal.brandUserId,
      type: 'deliverable_update',
      title: `Deliverable Submitted · ${deal.creatorName}`,
      body: `Version ${version} of "${deliverable.title}" is ready for review.`,
      link: `/brand/deals/${deal.id}`,
    });
    saveDatabase();
    res.json({ deal });
  });

  app.post('/api/deals/:id/deliverables/:delivId/review', requireAuth, requireRole('brand'), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal || deal.brandUserId !== user.id) {
      res.status(403).json({ error: 'Unauthorized brand user for this Deal Room.' });
      return;
    }
    const deliverable = deal.deliverables.find((del) => del.id === req.params.delivId);
    if (!deliverable) {
      res.status(404).json({ error: 'Deliverable not found.' });
      return;
    }
    const { decision, feedback } = req.body as {
      decision?: 'Approved' | 'Revision Requested';
      feedback?: string;
    };
    if (decision !== 'Approved' && decision !== 'Revision Requested') {
      res.status(400).json({ error: 'Invalid review decision.' });
      return;
    }
    if (decision === 'Revision Requested' && (!feedback || feedback.trim().length < 5)) {
      res.status(400).json({ error: 'Please provide written revision notes for the creator.' });
      return;
    }
    const now = new Date().toISOString();
    const newStatus: DeliverableStatus = decision;
    deliverable.status = newStatus;
    if (decision === 'Revision Requested') {
      deliverable.latestRevisionNote = feedback!.trim();
    }
    const latestSub = deliverable.submissions[deliverable.submissions.length - 1];
    if (latestSub && feedback) {
      latestSub.brandFeedback = feedback.trim();
      latestSub.statusAtSubmission = newStatus;
    }

    // Check if ALL deliverables are Approved -> Complete Deal!
    const allApproved = deal.deliverables.every((d) => d.status === 'Approved');
    if (allApproved) {
      deal.status = 'Completed';
      deal.paymentStatus = 'Released';
      deal.paymentTimeline.push({
        status: 'Released',
        timestamp: now,
        note: `All deliverables approved! Simulated payout of ₹${deal.agreedAmountINR.toLocaleString('en-IN')} released (Test Mode).`,
      });
      const creator = db.creatorProfiles.find((c) => c.id === deal.creatorId);
      if (creator) {
        creator.completedDealsCount += 1;
        creator.totalEarningsINR += deal.agreedAmountINR;
      }
      const brand = db.brandProfiles.find((b) => b.id === deal.brandId);
      if (brand) {
        brand.completedDealsCount += 1;
      }
      pushNotification({
        userId: deal.creatorUserId,
        type: 'deal_completed',
        title: `Deal Completed & ₹${deal.agreedAmountINR.toLocaleString('en-IN')} Released (Simulated)`,
        body: `All deliverables approved on "${deal.campaignTitle}". You can now leave a reputation review!`,
        link: `/creator/deals/${deal.id}`,
      });
    } else {
      pushNotification({
        userId: deal.creatorUserId,
        type: 'deliverable_update',
        title:
          decision === 'Approved'
            ? `Deliverable Approved · ${deliverable.title}`
            : `Revision Requested · ${deliverable.title}`,
        body: feedback?.trim() || `${deal.brandName} reviewed "${deliverable.title}".`,
        link: `/creator/deals/${deal.id}`,
      });
    }

    deal.updatedAt = now;
    saveDatabase();
    res.json({ deal });
  });

  app.post('/api/deals/:id/files', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal || (deal.creatorUserId !== user.id && deal.brandUserId !== user.id)) {
      res.status(403).json({ error: 'Unauthorized deal participant.' });
      return;
    }
    const { fileName, fileSizeLabel, fileUrl } = req.body as {
      fileName?: string;
      fileSizeLabel?: string;
      fileUrl?: string;
    };
    if (!fileName?.trim()) {
      res.status(400).json({ error: 'File name is required.' });
      return;
    }
    deal.sharedFiles.unshift({
      id: makeId('file'),
      dealId: deal.id,
      uploadedByRole: user.role,
      uploaderName: user.fullName,
      fileName: fileName.trim(),
      fileSizeLabel: fileSizeLabel || '1.2 MB',
      fileUrl: fileUrl || '#shared-workspace-asset',
      uploadedAt: new Date().toISOString(),
    });
    saveDatabase();
    res.json({ deal });
  });

  // ==========================================
  // REVIEWS & DISPUTES
  // ==========================================
  app.post('/api/deals/:id/reviews', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal || deal.status !== 'Completed') {
      res.status(400).json({ error: 'Reviews can only be submitted after deal completion.' });
      return;
    }
    const isCreator = deal.creatorUserId === user.id;
    const isBrand = deal.brandUserId === user.id;
    if (!isCreator && !isBrand) {
      res.status(403).json({ error: 'Only completed-deal participants can submit reviews.' });
      return;
    }
    if (db.reviews.some((r) => r.dealId === deal.id && r.reviewerUserId === user.id)) {
      res.status(409).json({ error: 'You have already reviewed this collaboration.' });
      return;
    }
    const { metrics, comment } = req.body as {
      metrics?: {
        communication: number;
        qualityOrClarity: number;
        timelinessOrPayment: number;
        professionalism: number;
      };
      comment?: string;
    };
    if (!metrics || !comment?.trim()) {
      res.status(400).json({ error: 'Please complete all rating dimensions and a written review.' });
      return;
    }
    const avg =
      Math.round(
        ((metrics.communication +
          metrics.qualityOrClarity +
          metrics.timelinessOrPayment +
          metrics.professionalism) /
          4) *
          10
      ) / 10;

    const review = {
      id: makeId('rev'),
      dealId: deal.id,
      campaignTitle: deal.campaignTitle,
      reviewerUserId: user.id,
      reviewerName: isBrand ? deal.brandName : deal.creatorName,
      reviewerRole: (isBrand ? 'brand' : 'creator') as 'brand' | 'creator',
      targetUserId: isBrand ? deal.creatorUserId : deal.brandUserId,
      targetName: isBrand ? deal.creatorName : deal.brandName,
      metrics,
      overallRating: avg,
      comment: comment.trim(),
      reported: false,
      createdAt: new Date().toISOString(),
      isDemo: user.isDemo,
    };
    db.reviews.unshift(review);
    if (isBrand) deal.brandReviewed = true;
    if (isCreator) deal.creatorReviewed = true;
    saveDatabase();
    res.json({ review, deal });
  });

  app.post('/api/deals/:id/disputes', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const deal = db.deals.find((d) => d.id === req.params.id);
    if (!deal || (deal.creatorUserId !== user.id && deal.brandUserId !== user.id)) {
      res.status(403).json({ error: 'Only deal participants can open a dispute.' });
      return;
    }
    const { reason, details } = req.body as { reason?: string; details?: string };
    if (!reason?.trim() || !details?.trim()) {
      res.status(400).json({ error: 'Please provide both a dispute reason and supporting details.' });
      return;
    }
    deal.status = 'Disputed';
    deal.paymentStatus = 'Disputed';
    const dispute = {
      id: makeId('disp'),
      dealId: deal.id,
      campaignTitle: deal.campaignTitle,
      raisedByUserId: user.id,
      raisedByName: user.fullName,
      raisedByRole: (user.role === 'brand' ? 'brand' : 'creator') as 'brand' | 'creator',
      reason: reason.trim(),
      details: details.trim(),
      amountInDisputeINR: deal.agreedAmountINR,
      status: 'Open' as const,
      createdAt: new Date().toISOString(),
      isDemo: user.isDemo,
    };
    db.disputes.unshift(dispute);
    saveDatabase();
    res.json({ dispute, deal });
  });

  // ==========================================
  // CONVERSATIONS, MESSAGES & NOTIFICATIONS
  // ==========================================
  app.get('/api/conversations', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const list = db.conversations.filter((c) => c.participantUserIds.includes(uid));
    res.json({ conversations: list });
  });

  app.get('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv || !conv.participantUserIds.includes(uid)) {
      res.status(403).json({ error: 'Only conversation participants can access messages.' });
      return;
    }
    const list = db.messages.filter((m) => m.conversationId === conv.id);
    list.forEach((m) => {
      if (!m.readByUserIds.includes(uid)) m.readByUserIds.push(uid);
    });
    saveDatabase();
    res.json({ conversation: conv, messages: list });
  });

  app.post('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv || !conv.participantUserIds.includes(user.id)) {
      res.status(403).json({ error: 'Only conversation participants can send messages.' });
      return;
    }
    const { text, attachmentName } = req.body as { text?: string; attachmentName?: string };
    if (!text?.trim() && !attachmentName?.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }
    const now = new Date().toISOString();
    const msg: Message = {
      id: makeId('msg'),
      conversationId: conv.id,
      senderUserId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      text: (text || '').trim(),
      attachmentName: attachmentName?.trim(),
      readByUserIds: [user.id],
      createdAt: now,
    };
    db.messages.push(msg);
    conv.lastMessageText = msg.text || `Shared attachment: ${attachmentName}`;
    conv.lastMessageAt = now;

    const recipientId = conv.participantUserIds.find((id) => id !== user.id);
    if (recipientId) {
      const recipient = db.users.find((u) => u.id === recipientId);
      pushNotification({
        userId: recipientId,
        type: 'new_message',
        title: `New message from ${user.fullName}`,
        body: conv.lastMessageText.slice(0, 90),
        link: recipient?.role === 'brand' ? '/brand/messages' : '/creator/messages',
      });
    }
    saveDatabase();
    res.json({ message: msg });
  });

  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res: Response) => {
    const list = db.notifications.filter((n) => n.userId === req.user!.id);
    res.json({ notifications: list });
  });

  app.post('/api/notifications/mark-all-read', requireAuth, (req: AuthedRequest, res: Response) => {
    db.notifications.forEach((n) => {
      if (n.userId === req.user!.id) n.read = true;
    });
    saveDatabase();
    res.json({ ok: true });
  });

  // ==========================================
  // VERIFICATION & SUBSCRIPTION PLANS
  // ==========================================
  app.post('/api/verification/submit', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'admin') {
      res.status(400).json({ error: 'Admins are already verified.' });
      return;
    }
    const { documentType, documentReference, socialOrWebsiteProof } = req.body as {
      documentType?: string;
      documentReference?: string;
      socialOrWebsiteProof?: string;
    };
    if (!documentType?.trim() || !documentReference?.trim()) {
      res.status(400).json({ error: 'Please specify document type and reference.' });
      return;
    }
    const reqItem = {
      id: makeId('ver'),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role as 'creator' | 'brand',
      documentType: documentType.trim(),
      documentReference: `private://verifications/${documentReference.trim()}`,
      socialOrWebsiteProof: socialOrWebsiteProof?.trim() || '',
      status: 'pending' as const,
      submittedAt: new Date().toISOString(),
      isDemo: user.isDemo,
    };
    db.verifications.unshift(reqItem);
    if (user.role === 'creator') {
      const cp = db.creatorProfiles.find((c) => c.userId === user.id);
      if (cp) cp.verificationStatus = 'pending';
    } else {
      const bp = db.brandProfiles.find((b) => b.userId === user.id);
      if (bp) bp.verificationStatus = 'pending';
    }
    saveDatabase();
    res.json({ verification: reqItem });
  });

  app.post('/api/billing/plan', requireAuth, (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const { plan } = req.body as { plan?: SubscriptionPlan };
    if (!plan) {
      res.status(400).json({ error: 'Plan selection is required.' });
      return;
    }
    user.plan = plan;
    user.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json({
      ok: true,
      user,
      simulatedReceipt: {
        id: makeId('test_rcpt'),
        plan,
        mode: 'TEST_MODE_SIMULATION',
        timestamp: user.updatedAt,
      },
    });
  });

  // ==========================================
  // ADMIN CONTROL CENTER (BACKEND ENFORCED)
  // ==========================================
  app.get('/api/admin/overview', requireAuth, requireRole('admin'), (_req: AuthedRequest, res: Response) => {
    const totalVolumeINR = db.deals.reduce((sum, d) => sum + d.agreedAmountINR, 0);
    res.json({
      metrics: {
        totalCreators: db.creatorProfiles.length,
        totalBrands: db.brandProfiles.length,
        activeCampaigns: db.campaigns.filter((c) => c.status === 'Active').length,
        activeDeals: db.deals.filter((d) => d.status === 'Active').length,
        completedDeals: db.deals.filter((d) => d.status === 'Completed').length,
        simulatedTransactionVolumeINR: totalVolumeINR,
        openDisputes: db.disputes.filter((d) => d.status === 'Open').length,
        pendingVerifications: db.verifications.filter((v) => v.status === 'pending').length,
        matchToApplicationRatePct: 38.4,
        avgDaysToFirstDeal: 4.2,
      },
      users: db.users,
      verifications: db.verifications,
      campaigns: db.campaigns,
      disputes: db.disputes,
      reviews: db.reviews,
      auditLogs: db.auditLogs,
    });
  });

  app.post(
    '/api/admin/verifications/:id/decide',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res: Response) => {
      const admin = req.user!;
      const item = db.verifications.find((v) => v.id === req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Verification request not found.' });
        return;
      }
      const { decision, adminNote } = req.body as {
        decision?: 'verified' | 'rejected';
        adminNote?: string;
      };
      if (decision !== 'verified' && decision !== 'rejected') {
        res.status(400).json({ error: 'Decision must be verified or rejected.' });
        return;
      }
      item.status = decision;
      item.adminNote = adminNote?.trim() || (decision === 'verified' ? 'Identity & insights verified.' : 'Insufficient proof.');
      item.reviewedBy = admin.fullName;
      item.reviewedAt = new Date().toISOString();

      if (item.userRole === 'creator') {
        const cp = db.creatorProfiles.find((c) => c.userId === item.userId);
        if (cp) {
          cp.verificationStatus = decision;
          if (decision === 'verified') cp.statsSelfReported = false;
        }
      } else {
        const bp = db.brandProfiles.find((b) => b.userId === item.userId);
        if (bp) {
          bp.verificationStatus = decision;
          db.campaigns.forEach((camp) => {
            if (camp.brandId === bp.id) camp.brandVerified = decision === 'verified';
          });
        }
      }

      pushNotification({
        userId: item.userId,
        type: 'verification',
        title:
          decision === 'verified'
            ? 'Verification Approved — Badge Active'
            : 'Verification Needs Attention',
        body: item.adminNote,
        link: item.userRole === 'creator' ? '/creator/profile' : '/brand/settings',
      });
      logAudit(
        admin,
        decision === 'verified' ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
        'VerificationRequest',
        item.id,
        `${decision.toUpperCase()} verification for ${item.userName}: ${item.adminNote}`
      );
      saveDatabase();
      res.json({ verification: item });
    }
  );

  app.post(
    '/api/admin/users/:id/toggle-suspend',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res: Response) => {
      const admin = req.user!;
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target || target.role === 'admin') {
        res.status(400).json({ error: 'Cannot suspend this account.' });
        return;
      }
      target.suspended = !target.suspended;
      logAudit(
        admin,
        target.suspended ? 'SUSPEND_USER' : 'REINSTATE_USER',
        'User',
        target.id,
        `${target.suspended ? 'Suspended' : 'Reinstated'} ${target.fullName} (${target.email}).`
      );
      saveDatabase();
      res.json({ user: target });
    }
  );

  app.post(
    '/api/admin/campaigns/:id/moderate',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res: Response) => {
      const admin = req.user!;
      const camp = db.campaigns.find((c) => c.id === req.params.id);
      if (!camp) {
        res.status(404).json({ error: 'Campaign not found.' });
        return;
      }
      const { status } = req.body as { status?: Campaign['status'] };
      if (!status) {
        res.status(400).json({ error: 'Status is required.' });
        return;
      }
      camp.status = status;
      logAudit(
        admin,
        'MODERATE_CAMPAIGN',
        'Campaign',
        camp.id,
        `Updated campaign "${camp.title}" status to ${status}.`
      );
      saveDatabase();
      res.json({ campaign: camp });
    }
  );

  app.post(
    '/api/admin/disputes/:id/resolve',
    requireAuth,
    requireRole('admin'),
    (req: AuthedRequest, res: Response) => {
      const admin = req.user!;
      const disp = db.disputes.find((d) => d.id === req.params.id);
      if (!disp) {
        res.status(404).json({ error: 'Dispute not found.' });
        return;
      }
      const { outcome, resolutionNote } = req.body as {
        outcome?: 'Resolved - Released to Creator' | 'Resolved - Refunded to Brand';
        resolutionNote?: string;
      };
      if (!outcome) {
        res.status(400).json({ error: 'Outcome is required.' });
        return;
      }
      disp.status = outcome;
      disp.resolutionNote = resolutionNote?.trim() || 'Resolved by Bridge Trust & Safety team.';
      disp.resolvedAt = new Date().toISOString();

      const deal = db.deals.find((d) => d.id === disp.dealId);
      if (deal) {
        deal.paymentStatus =
          outcome === 'Resolved - Released to Creator' ? 'Released' : 'Refunded';
        deal.status = outcome === 'Resolved - Released to Creator' ? 'Completed' : 'Cancelled';
      }

      logAudit(
        admin,
        'RESOLVE_DISPUTE',
        'Dispute',
        disp.id,
        `${outcome} on "${disp.campaignTitle}": ${disp.resolutionNote}`
      );
      saveDatabase();
      res.json({ dispute: disp });
    }
  );

  // ==========================================
  // GEMINI AI SERVER-SIDE ENDPOINTS (WITH DETERMINISTIC FALLBACKS)
  // ==========================================
  app.post('/api/ai/generate-pitch', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const { campaignId, customAngle } = req.body as {
      campaignId?: string;
      customAngle?: string;
    };
    const creator = db.creatorProfiles.find((c) => c.userId === user.id) || db.creatorProfiles[0];
    const campaign = db.campaigns.find((c) => c.id === campaignId) || db.campaigns[0];
    const match = computeCreatorCampaignMatch(creator, campaign);

    const fallbackResponse = {
      source: 'deterministic-fallback',
      pitch: `Hi ${campaign.brandName} team,\n\nI create ${creator.niches.join(' & ')} content from ${creator.city} for an engaged community of ${(creator.totalFollowers / 1000).toFixed(1)}K followers (${creator.engagementRate}% engagement) in ${creator.languages.join(' & ')}. For "${campaign.title}", I would love to produce ${campaign.deliverables[0]} anchored around ${customAngle || match.suggestedContentAngle}\n\nMy audience in ${creator.audienceTopCities.slice(0, 3).join(', ')} closely matches your ${campaign.targetAgeRange} demographic, and I can turn around the first cut within 6 days of product receipt.`,
      recommendedRateINR: match.recommendedRateINR,
      openingHook: `First 3 seconds: Real-world POV inside my ${creator.city} routine testing ${campaign.brandName} before the title beat drops.`,
      contentAngles: [
        match.suggestedContentAngle,
        `Honest 7-day routine check-in comparing expectations vs results for ${campaign.targetAgeRange} viewers.`,
        `Bilingual ${creator.languages[0]} storytelling breakdown highlighting ${campaign.dos[0] || campaign.objective}.`,
      ],
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallbackResponse);
      return;
    }

    try {
      const response = await withGeminiTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Generate a persuasive, authentic creator collaboration pitch for the Indian creator marketplace BRIDGE.
Creator: ${creator.fullName} (${creator.handle}), based in ${creator.city}, niches: ${creator.niches.join(', ')}, followers: ${creator.totalFollowers}, engagement: ${creator.engagementRate}%, languages: ${creator.languages.join(', ')}.
Campaign: "${campaign.title}" by ${campaign.brandName}. Objective: ${campaign.objective}. Deliverables: ${campaign.deliverables.join(', ')}. Budget: INR ${campaign.budgetMinINR} to ${campaign.budgetMaxINR}. Guidelines: ${campaign.contentGuidelines}.
Deterministic Match Score: ${match.overallScore}%. Suggested base rate: INR ${match.recommendedRateINR}. Optional creator note: ${customAngle || 'None'}.`,
          config: {
            systemInstruction:
              'You are an expert creator partnership strategist in India. Write concise, human, non-salesy pitches in plain text with concrete creative hooks and realistic INR pricing.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pitch: { type: Type.STRING },
                recommendedRateINR: { type: Type.INTEGER },
                openingHook: { type: Type.STRING },
                contentAngles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
        }),
        5500
      );
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        source: 'gemini',
        pitch: parsed.pitch || fallbackResponse.pitch,
        recommendedRateINR: parsed.recommendedRateINR || match.recommendedRateINR,
        openingHook: parsed.openingHook || fallbackResponse.openingHook,
        contentAngles:
          Array.isArray(parsed.contentAngles) && parsed.contentAngles.length
            ? parsed.contentAngles
            : fallbackResponse.contentAngles,
      });
    } catch (err) {
      console.warn('Gemini generate-pitch fallback triggered:', err);
      res.json(fallbackResponse);
    }
  });

  app.post('/api/ai/campaign-assistant', requireAuth, async (req: AuthedRequest, res: Response) => {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt || prompt.trim().length < 10) {
      res.status(400).json({ error: 'Please describe your campaign in at least one sentence.' });
      return;
    }

    // Smart deterministic parser for fallback
    const lower = prompt.toLowerCase();
    const detectedNiches: string[] = [];
    const allNiches = [
      'Fitness',
      'Lifestyle',
      'Technology',
      'Beauty',
      'Fashion',
      'Food & Beverages',
      'Education',
      'Travel',
    ];
    allNiches.forEach((n) => {
      if (lower.includes(n.toLowerCase().split(' ')[0])) detectedNiches.push(n);
    });
    if (detectedNiches.length === 0) detectedNiches.push('Lifestyle');

    const numberMatch = prompt.replace(/,/g, '').match(/(\d{4,7})/);
    const parsedBudget = numberMatch ? Number(numberMatch[1]) : 35000;
    const budgetMax = Math.max(15000, Math.min(250000, parsedBudget));
    const budgetMin = Math.round(budgetMax * 0.65);

    const platforms: string[] = [];
    if (lower.includes('youtube') || lower.includes('short')) platforms.push('YouTube');
    if (lower.includes('reel') || lower.includes('instagram') || platforms.length === 0) {
      platforms.unshift('Instagram');
    }

    const fallbackDraft = {
      source: 'deterministic-fallback',
      title: `${detectedNiches[0]} Creator Launch Campaign`,
      industry: detectedNiches[0],
      description: prompt.trim(),
      objective: 'Authentic Creator Discovery & Product Trial Conversions',
      targetAudience: lower.includes('college')
        ? 'Indian college students and Gen-Z communities aged 18–24'
        : 'Urban Indian audiences aged 19–30',
      targetAgeRange: lower.includes('college') ? '18–24' : '19–30',
      niches: detectedNiches,
      platforms,
      deliverables: platforms.includes('YouTube')
        ? ['1x YouTube Short (60s)', '1x Instagram Reel Cross-post']
        : ['1x Instagram Reel (45–60s)', '2x Story Frames with Link'],
      budgetMinINR: budgetMin,
      budgetMaxINR: budgetMax,
      requiredLanguages: ['English', 'Hindi'],
      location: 'Pan-India (Metro & Campus Clusters)',
      contentGuidelines:
        'Lead with a relatable day-in-the-life hook in the first 3 seconds. Keep lighting natural and integrate the product in real usage.',
      dos: ['Show real usage on camera', 'Include clear disclosure and CTA'],
      donts: ['Avoid stock footage or scripted ad-reads'],
      creatorsRequired: Math.max(2, Math.round(budgetMax / 18000)),
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallbackDraft);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Transform this brand campaign description into a structured Indian creator campaign brief (INR currency) for creators with 10K–50K followers:\n"${prompt}"`,
        config: {
          systemInstruction:
            'You are a senior Indian brand partnerships strategist. Output realistic INR per-creator budgets, specific deliverables, clear guidelines, and relevant niches chosen from: Technology, Fashion, Fitness, Beauty, Food & Beverages, Education, Lifestyle, Travel.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              industry: { type: Type.STRING },
              description: { type: Type.STRING },
              objective: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              targetAgeRange: { type: Type.STRING },
              niches: { type: Type.ARRAY, items: { type: Type.STRING } },
              platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
              deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
              budgetMinINR: { type: Type.INTEGER },
              budgetMaxINR: { type: Type.INTEGER },
              requiredLanguages: { type: Type.ARRAY, items: { type: Type.STRING } },
              location: { type: Type.STRING },
              contentGuidelines: { type: Type.STRING },
              dos: { type: Type.ARRAY, items: { type: Type.STRING } },
              donts: { type: Type.ARRAY, items: { type: Type.STRING } },
              creatorsRequired: { type: Type.INTEGER },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...fallbackDraft,
        ...parsed,
        source: 'gemini',
      });
    } catch (err) {
      console.warn('Gemini campaign-assistant fallback triggered:', err);
      res.json(fallbackDraft);
    }
  });

  app.post('/api/ai/match-explain', requireAuth, async (req: AuthedRequest, res: Response) => {
    const { creatorId, campaignId, weights } = req.body as {
      creatorId?: string;
      campaignId?: string;
      weights?: Record<string, number>;
    };
    const creator =
      db.creatorProfiles.find((c) => c.id === creatorId || c.userId === req.user!.id) ||
      db.creatorProfiles[0];
    const campaign = db.campaigns.find((c) => c.id === campaignId) || db.campaigns[0];
    const match = computeCreatorCampaignMatch(creator, campaign, weights);

    const fallbackSummary = `${creator.fullName} scores ${match.overallScore}% on "${campaign.title}" driven by ${match.breakdown.nicheScore}% niche fit and ${match.breakdown.engagementScore}% engagement strength (${creator.engagementRate}% avg). Recommended collaboration rate: ₹${match.recommendedRateINR.toLocaleString('en-IN')}.`;

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        source: 'deterministic-fallback',
        match,
        executiveSummary: fallbackSummary,
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Explain this deterministic creator-brand match concisely in 2 sentences without changing the calculated numbers:
Creator: ${creator.fullName} (${creator.city}, ${creator.totalFollowers} followers, ${creator.engagementRate}% engagement, niches: ${creator.niches.join(', ')}).
Campaign: "${campaign.title}" by ${campaign.brandName} (niches: ${campaign.niches.join(', ')}, budget INR ${campaign.budgetMinINR}-${campaign.budgetMaxINR}).
Overall Score: ${match.overallScore}%. Recommended Rate: INR ${match.recommendedRateINR}.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              suggestedContentAngle: { type: Type.STRING },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (parsed.suggestedContentAngle) {
        match.suggestedContentAngle = parsed.suggestedContentAngle;
      }
      res.json({
        source: 'gemini',
        match,
        executiveSummary: parsed.executiveSummary || fallbackSummary,
      });
    } catch {
      res.json({
        source: 'deterministic-fallback',
        match,
        executiveSummary: fallbackSummary,
      });
    }
  });

  app.post('/api/ai/profile-analysis', requireAuth, async (req: AuthedRequest, res: Response) => {
    const { creatorId } = req.body as { creatorId?: string };
    const creator =
      db.creatorProfiles.find((c) => c.id === creatorId || c.userId === req.user!.id) ||
      db.creatorProfiles[0];

    // Heuristic authenticity indicator (explicitly heuristic, never claimed as verified fraud detection)
    const engagementHealthy = creator.engagementRate >= 2.5 && creator.engagementRate <= 14.0;
    const heuristicAuthenticity = {
      label: engagementHealthy ? 'Low Heuristic Risk' : 'Review Recommended (Heuristic)',
      disclaimer:
        'Heuristic signal derived from follower-to-engagement ratios and verification status. Not verified third-party fraud detection.',
      signals: [
        `Engagement ratio (${creator.engagementRate}%) is ${
          engagementHealthy ? 'consistent with 10K–50K Indian micro-creators' : 'outside typical 2.5%–14% micro-tier range'
        }.`,
        creator.statsSelfReported
          ? 'Metrics are currently self-reported; submitting insights proof upgrades trust.'
          : 'Creator identity & 30-day insights verified by Bridge moderation.',
      ],
    };

    const suggestedReelRate =
      Math.round(((creator.totalFollowers * 0.72) + creator.engagementRate * 1400) / 500) * 500;

    const fallbackAnalysis = {
      source: 'deterministic-fallback',
      strengths: [
        `Strong ${creator.engagementRate}% community engagement in ${creator.niches.join(' & ')}.`,
        `Regional + metro reach across ${creator.audienceTopCities.join(', ')} in ${creator.languages.join('/')}.`,
      ],
      improvements: [
        creator.portfolio.length < 3
          ? 'Add 1–2 more case-study reels with retention metrics to lift conversion on ₹30K+ briefs.'
          : 'Highlight repeat brand partnerships in your bio summary.',
        creator.verificationStatus !== 'verified'
          ? 'Submit 30-day Instagram/YouTube insights in Settings to unlock the green Verified badge.'
          : 'Experiment with bundled Reel + 30-day UGC licensing packages.',
      ],
      recommendedNiches: Array.from(new Set([...creator.niches, 'Lifestyle'])).slice(0, 3),
      suggestedRateCardINR: {
        instagramReel: suggestedReelRate,
        youtubeShorts: Math.round(suggestedReelRate * 0.95),
        ugcBundle: Math.round(suggestedReelRate * 1.25),
      },
      heuristicAuthenticity,
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallbackAnalysis);
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze this emerging Indian creator profile (10K-50K tier) and suggest actionable profile improvements, adjacent niches, and INR rate guidance:
Name: ${creator.fullName}, City: ${creator.city}, Followers: ${creator.totalFollowers}, Engagement: ${creator.engagementRate}%, Current Reel Rate: INR ${creator.rateCard.instagramReel}, Niches: ${creator.niches.join(', ')}, Bio: "${creator.bio}".`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedNiches: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedReelRateINR: { type: Type.INTEGER },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      const base = parsed.suggestedReelRateINR || suggestedReelRate;
      res.json({
        source: 'gemini',
        strengths: parsed.strengths?.length ? parsed.strengths : fallbackAnalysis.strengths,
        improvements: parsed.improvements?.length
          ? parsed.improvements
          : fallbackAnalysis.improvements,
        recommendedNiches: parsed.recommendedNiches?.length
          ? parsed.recommendedNiches
          : fallbackAnalysis.recommendedNiches,
        suggestedRateCardINR: {
          instagramReel: base,
          youtubeShorts: Math.round(base * 0.95),
          ugcBundle: Math.round(base * 1.25),
        },
        heuristicAuthenticity,
      });
    } catch {
      res.json(fallbackAnalysis);
    }
  });

  app.post('/api/ai/improve-brief', requireAuth, async (req: AuthedRequest, res: Response) => {
    const { title, description, contentGuidelines, deliverables } = req.body as {
      title?: string;
      description?: string;
      contentGuidelines?: string;
      deliverables?: string[];
    };
    const fallback = {
      source: 'deterministic-fallback',
      improvedDescription:
        (description?.trim() || '') +
        ' Designed specifically for 10K–50K creators who prioritize authentic storytelling, clear hooks in the opening 3 seconds, and measurable community curiosity.',
      improvedGuidelines:
        (contentGuidelines?.trim() || 'Film in natural daylight.') +
        ' Open with a relatable personal scenario before introducing the product naturally; keep spoken call-to-action conversational.',
      suggestedDos: [
        'Hook viewers within 3 seconds with real everyday context',
        'Show close-up product usage in natural lighting',
        'Include clear #ad partnership disclosure',
      ],
      suggestedDonts: [
        'Avoid reading marketing bullet points off a script',
        'Do not apply heavy colour filters that alter product appearance',
      ],
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallback);
      return;
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Improve this creator campaign brief for higher application quality from 10K-50K Indian creators:
Title: "${title || 'Creator Campaign'}"
Draft Description: "${description || ''}"
Deliverables: "${(deliverables || []).join(', ')}"
Draft Guidelines: "${contentGuidelines || ''}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improvedDescription: { type: Type.STRING },
              improvedGuidelines: { type: Type.STRING },
              suggestedDos: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedDonts: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        source: 'gemini',
        improvedDescription: parsed.improvedDescription || fallback.improvedDescription,
        improvedGuidelines: parsed.improvedGuidelines || fallback.improvedGuidelines,
        suggestedDos: parsed.suggestedDos?.length ? parsed.suggestedDos : fallback.suggestedDos,
        suggestedDonts: parsed.suggestedDonts?.length ? parsed.suggestedDonts : fallback.suggestedDonts,
      });
    } catch {
      res.json(fallback);
    }
  });

  app.post('/api/ai/campaign-insights', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const brand = db.brandProfiles.find((b) => b.userId === user.id) || db.brandProfiles[0];
    const brandCampaigns = db.campaigns.filter((c) => c.brandId === brand.id);
    const brandApps = db.applications.filter((a) => a.brandId === brand.id);
    const avgMatch = brandApps.length
      ? Math.round(brandApps.reduce((s, a) => s + a.matchScore, 0) / brandApps.length)
      : 88;
    const avgProposed = brandApps.length
      ? Math.round(brandApps.reduce((s, a) => s + a.proposedRateINR, 0) / brandApps.length)
      : 26000;

    const fallback = {
      source: 'deterministic-fallback',
      headline: `${brandApps.length} creator pitches averaging ${avgMatch}% AI fit at ₹${avgProposed.toLocaleString('en-IN')}.`,
      insights: [
        `Applicant rates cluster around ₹${avgProposed.toLocaleString('en-IN')}, aligning well with micro-tier benchmarks.`,
        `Creators offering bilingual English + Hindi hooks show +18% higher save rates in your ${brand.industry} vertical.`,
        `Shortlisting top >88% match applicants within 48 hours doubles acceptance velocity.`,
      ],
    };

    const ai = getGeminiClient();
    if (!ai) {
      res.json(fallback);
      return;
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate 3 concise strategic insights for Indian brand "${brand.companyName}" (${brand.industry}) managing ${brandCampaigns.length} active campaigns with ${brandApps.length} creator applications (average match ${avgMatch}%, average proposed rate INR ${avgProposed}).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              insights: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        source: 'gemini',
        headline: parsed.headline || fallback.headline,
        insights: parsed.insights?.length ? parsed.insights : fallback.insights,
      });
    } catch {
      res.json(fallback);
    }
  });

  // ==========================================
  // VITE MIDDLEWARE (DEV) OR STATIC (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BRIDGE full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

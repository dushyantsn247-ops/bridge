import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import type { Campaign, CreatorProfile, ReviewRecord, SubscriptionPlan } from '../../types/domain';

// ==========================================
// 1. PUBLIC EXPLORE CAMPAIGNS PAGE
// ==========================================
export const ExplorePage: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [niche, setNiche] = useState('All');
  const [platform, setPlatform] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    api
      .getPublicCampaigns()
      .then((res) => {
        setCampaigns(res.campaigns);
        if (highlightId) {
          const found = res.campaigns.find((c) => c.id === highlightId);
          if (found) setSelectedCampaign(found);
        }
      })
      .finally(() => setLoading(false));
  }, [highlightId]);

  const niches = [
    'All',
    'Technology',
    'Fitness',
    'Beauty',
    'Fashion',
    'Food & Beverages',
    'Education',
    'Lifestyle',
    'Travel',
  ];

  const filtered = campaigns.filter((c) => {
    if (verifiedOnly && !c.brandVerified) return false;
    if (niche !== 'All' && !c.niches.includes(niche)) return false;
    if (platform !== 'All' && !c.platforms.includes(platform)) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.brandName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <PublicLayout>
      <div className="pt-28 pb-20 max-w-[1380px] mx-auto px-6 space-y-10">
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
            Public Opportunity Directory
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#F5F5FA]">
            Explore Active Campaigns
          </h1>
          <p className="text-sm sm:text-base text-[#9295A9]">
            Transparent INR collaboration briefs for 10K–50K creators across India. Sign in
            as a creator to unlock personalized AI Match scores and submit pitches.
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-xl bg-[#101426] border border-white/10 p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9295A9] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, title, or deliverable..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#050509] border border-white/10 text-sm text-[#F5F5FA] placeholder-[#9295A9] focus:outline-none focus:border-[#00D5FF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
            >
              {niches.map((n) => (
                <option key={n} value={n}>
                  Niche: {n}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
            >
              <option value="All">All Platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="YouTube">YouTube</option>
            </select>

            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                verifiedOnly
                  ? 'bg-[#34D399]/15 border-[#34D399] text-[#34D399]'
                  : 'bg-[#050509] border-white/10 text-[#9295A9]'
              }`}
            >
              Verified Brands Only
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-64 rounded-xl bg-[#101426] border border-white/8 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-[#101426] border border-white/8 p-12 text-center space-y-3">
            <p className="font-display text-lg font-semibold text-[#F5F5FA]">
              No campaigns match your current filters
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setNiche('All');
                setPlatform('All');
                setVerifiedOnly(false);
              }}
              className="px-4 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((camp) => (
              <div
                key={camp.id}
                className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#00D5FF]/50 transition-colors p-6 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#9295A9]">
                    <span className="font-semibold text-[#F5F5FA]">{camp.brandName}</span>
                    {camp.brandVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{camp.niches.join(' / ')}</span>
                    {camp.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#00D5FF]">Demo</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                    {camp.title}
                  </h2>
                  <p className="text-xs text-[#9295A9] line-clamp-3 leading-relaxed">
                    {camp.description}
                  </p>
                  <p className="text-xs text-[#9295A9]">
                    Deliverables: <span className="text-[#F5F5FA]">{camp.deliverables[0]}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-white/8 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#9295A9]">Budget Band</span>
                    <span className="font-mono-tabular text-sm font-bold text-[#F5F5FA]">
                      ₹{camp.budgetMinINR.toLocaleString('en-IN')} – ₹
                      {camp.budgetMaxINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#9295A9]">
                      Due {camp.applicationDeadline} · {camp.applicantCount} applied
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCampaign(camp)}
                      className="px-3 py-1.5 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View Brief
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Brief Modal */}
      {selectedCampaign && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCampaign(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[88vh] overflow-y-auto rounded-2xl bg-[#101426] border border-white/15 p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-[#00D5FF] font-semibold">
                  {selectedCampaign.brandName} · {selectedCampaign.location}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#F5F5FA] mt-1">
                  {selectedCampaign.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="text-xs text-[#9295A9] hover:text-[#F5F5FA] px-2 py-1 cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <p className="text-sm text-[#9295A9] leading-relaxed">
              {selectedCampaign.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-white/8 text-xs">
              <div>
                <p className="text-[#9295A9]">Budget (INR)</p>
                <p className="font-mono-tabular font-bold text-[#F5F5FA] mt-1">
                  ₹{selectedCampaign.budgetMinINR.toLocaleString('en-IN')} – ₹
                  {selectedCampaign.budgetMaxINR.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Languages</p>
                <p className="font-semibold text-[#F5F5FA] mt-1">
                  {selectedCampaign.requiredLanguages.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Follower Band</p>
                <p className="font-mono-tabular font-semibold text-[#F5F5FA] mt-1">
                  {(selectedCampaign.followerMin / 1000).toFixed(0)}K –{' '}
                  {(selectedCampaign.followerMax / 1000).toFixed(0)}K
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#F5F5FA]">Deliverables</p>
              <ul className="list-disc pl-5 text-[#9295A9] space-y-1">
                {selectedCampaign.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#F5F5FA]">Creative Guidelines</p>
              <p className="text-[#9295A9] leading-relaxed">
                {selectedCampaign.contentGuidelines}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/8">
              <button
                type="button"
                onClick={() => {
                  if (user?.role === 'creator') {
                    navigate(`/creator/campaigns/${selectedCampaign.id}`);
                  } else {
                    navigate('/login');
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
              >
                {user?.role === 'creator'
                  ? 'Open in Creator Workspace & Apply'
                  : 'Sign in as Creator to Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

// ==========================================
// 2. PUBLIC CREATOR PORTFOLIO PAGE
// ==========================================
export const PublicCreatorProfilePage: React.FC<{ creatorIdProp?: string }> = () => {
  const [searchParams] = useSearchParams();
  const idFromUrl = window.location.pathname.split('/').pop() || 'cr_1';
  const targetId = searchParams.get('id') || idFromUrl;
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPublicCreator(targetId)
      .then((res) => {
        setProfile(res.profile);
        setReviews(res.reviews);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetId]);

  return (
    <PublicLayout>
      <div className="pt-24 pb-20 max-w-5xl mx-auto px-6">
        {loading ? (
          <div className="h-72 rounded-2xl bg-[#101426] animate-pulse" />
        ) : !profile ? (
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-12 text-center space-y-4">
            <h1 className="font-display text-2xl font-bold">Creator Portfolio Not Found</h1>
            <Link to="/explore" className="text-sm text-[#00D5FF] hover:underline">
              Back to Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div
              className="h-44 rounded-2xl border border-white/10 relative overflow-hidden"
              style={{ background: profile.coverStyle }}
            />
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 -mt-16 relative z-10 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-display text-2xl font-bold text-[#F5F5FA] border-2 border-[#050509]"
                    style={{ background: profile.avatarStyle }}
                  >
                    {profile.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-[#F5F5FA]">
                        {profile.fullName}
                      </h1>
                      {profile.verificationStatus === 'verified' && (
                        <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                      )}
                    </div>
                    <p className="text-sm text-[#9295A9]">
                      {profile.handle} · {profile.city}, {profile.state} · {profile.availability}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono-tabular text-2xl font-bold text-[#00D5FF]">
                    {profile.bridgeCreatorScore}/100
                  </p>
                  <p className="text-xs text-[#9295A9]">Bridge Creator Score</p>
                </div>
              </div>

              <p className="text-sm text-[#F5F5FA]/90 leading-relaxed max-w-3xl">
                {profile.bio}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-white/8">
                <div>
                  <p className="text-xs text-[#9295A9]">Total Reach</p>
                  <p className="font-mono-tabular text-lg font-bold text-[#F5F5FA]">
                    {profile.totalFollowers.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9295A9]">Avg Engagement</p>
                  <p className="font-mono-tabular text-lg font-bold text-[#34D399]">
                    {profile.engagementRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9295A9]">Languages</p>
                  <p className="text-sm font-semibold text-[#F5F5FA]">
                    {profile.languages.join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9295A9]">Standard Reel Rate</p>
                  <p className="font-mono-tabular text-lg font-bold text-[#F5F5FA]">
                    ₹{profile.rateCard.instagramReel.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {profile.statsSelfReported && (
                <p className="text-xs text-[#F59E0B]">
                  Note: Social metrics are currently self-reported pending verification review.
                </p>
              )}

              <div className="space-y-4">
                <h2 className="font-display text-lg font-semibold text-[#F5F5FA]">
                  Featured Portfolio Work
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.portfolio.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#0B0D18] border border-white/8 p-5 space-y-2"
                    >
                      <p className="text-xs text-[#00D5FF]">
                        {item.platform} · {item.viewsOrReach}
                      </p>
                      <h3 className="font-display text-base font-semibold text-[#F5F5FA]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#9295A9]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/8">
                  <h2 className="font-display text-lg font-semibold text-[#F5F5FA]">
                    Completed Deal Reputation
                  </h2>
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-1"
                    >
                      <p className="text-xs text-[#34D399] font-mono-tabular">
                        ★ {rev.overallRating.toFixed(1)} · {rev.reviewerName}
                      </p>
                      <p className="text-xs text-[#F5F5FA]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

// ==========================================
// 3. HOW IT WORKS PAGE
// ==========================================
export const HowItWorksPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'brand' ? 'brand' : 'creator';
  const [tab, setTab] = useState<'creator' | 'brand'>(initialTab);

  return (
    <PublicLayout>
      <div className="pt-28 pb-24 max-w-5xl mx-auto px-6 space-y-12">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
            Platform Workflow
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F5F5FA]">
            How BRIDGE Works
          </h1>
          <p className="text-base text-[#9295A9] max-w-2xl">
            Every collaboration follows a transparent, deterministic workflow—from initial
            AI compatibility scan to milestone review inside a shared Deal Room.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-[#101426] border border-white/10">
          <button
            type="button"
            onClick={() => setTab('creator')}
            className={`px-5 py-2 rounded-md text-xs font-semibold cursor-pointer ${
              tab === 'creator' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
            }`}
          >
            For Emerging Creators (10K–50K)
          </button>
          <button
            type="button"
            onClick={() => setTab('brand')}
            className={`px-5 py-2 rounded-md text-xs font-semibold cursor-pointer ${
              tab === 'brand' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
            }`}
          >
            For Brands & Teams
          </button>
        </div>

        <div className="space-y-4">
          {(tab === 'creator'
            ? [
                {
                  num: '01',
                  title: 'Build your verified Creator Portfolio',
                  body: 'Document your niches, Indian city/language reach, engagement rate, portfolio links, and INR rate card. Submit 30-day insights to upgrade from self-reported to green Verified.',
                },
                {
                  num: '02',
                  title: 'Inspect Deterministic Match Scores',
                  body: 'Every active campaign shows your 0–100 compatibility score across Niche (30%), Audience (25%), Engagement (20%), Budget (15%), and Platform (10%).',
                },
                {
                  num: '03',
                  title: 'Pitch with Gemini AI Assistance',
                  body: 'Generate an editable, brand-specific pitch hook and fair INR rate recommendation, attach portfolio items, and answer screening questions.',
                },
                {
                  num: '04',
                  title: 'Collaborate inside the Deal Room',
                  body: 'Once accepted, upload video cuts, respond to structured revision notes, exchange files, and build verifiable reputation reviews.',
                },
              ]
            : [
                {
                  num: '01',
                  title: 'Launch Structured Briefs with AI Campaign Assistant',
                  body: 'Describe your product launch in natural language—Gemini structures deliverables, INR budgets, target niches, and guidelines ready for your edits.',
                },
                {
                  num: '02',
                  title: 'Discover & Compare Emerging Talent',
                  body: 'Rank creators by live compatibility scores, inspect heuristic authenticity signals, compare two creators side-by-side, and save private rosters.',
                },
                {
                  num: '03',
                  title: 'Manage Applicants via Kanban Pipeline',
                  body: 'Move pitches cleanly from Submitted → Viewed → Shortlisted → Discussion → Accepted, and spin up Deal Rooms in one click.',
                },
                {
                  num: '04',
                  title: 'Review Milestones & Simulated Escrow',
                  body: 'Fund simulated escrow in Test Mode, request written revisions or approve deliverables, and release simulated payouts transparently.',
                },
              ]
          ).map((step) => (
            <div
              key={step.num}
              className="rounded-xl bg-[#101426] border border-white/8 p-6 flex flex-col sm:flex-row gap-6 items-start"
            >
              <span className="font-mono-tabular text-2xl font-bold text-[#00D5FF]">
                {step.num}
              </span>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl font-bold text-[#F5F5FA]">
                  {step.title}
                </h2>
                <p className="text-sm text-[#9295A9] leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Link
            to={tab === 'creator' ? '/signup?role=creator' : '/signup?role=brand'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#246BFD] text-xs font-display font-bold uppercase tracking-wider text-[#F5F5FA]"
          >
            {tab === 'creator' ? 'Create Creator Account' : 'Create Brand Account'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
};

// ==========================================
// 4. PRICING PAGE WITH TEST CHECKOUT
// ==========================================
export const PricingPage: React.FC = () => {
  const { user, refreshSession, showToast } = useApp();
  const navigate = useNavigate();
  const [audienceTab, setAudienceTab] = useState<'creator' | 'brand'>('creator');
  const [checkoutPlan, setCheckoutPlan] = useState<{
    id: SubscriptionPlan;
    name: string;
    priceLabel: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleConfirmTestCheckout = async () => {
    if (!checkoutPlan) return;
    if (!user) {
      navigate('/signup');
      return;
    }
    setProcessing(true);
    try {
      await api.selectPlan(checkoutPlan.id);
      await refreshSession();
      showToast(`Activated ${checkoutPlan.name} (Test Mode — ₹0 charged)`, 'success');
      setCheckoutPlan(null);
    } catch (e: any) {
      showToast(e.message || 'Plan update failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PublicLayout>
      <div className="pt-28 pb-24 max-w-[1280px] mx-auto px-6 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
            Monetization & Subscriptions
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F5F5FA]">
            Transparent INR Plans
          </h1>
          <p className="text-sm sm:text-base text-[#9295A9]">
            All checkout flows run in clearly labelled Test Mode Simulation—no real cards
            or bank transfers are charged.
          </p>

          <div className="inline-flex p-1 rounded-lg bg-[#101426] border border-white/10 mt-4">
            <button
              type="button"
              onClick={() => setAudienceTab('creator')}
              className={`px-5 py-2 rounded-md text-xs font-semibold cursor-pointer ${
                audienceTab === 'creator' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
              }`}
            >
              Creator Plans
            </button>
            <button
              type="button"
              onClick={() => setAudienceTab('brand')}
              className={`px-5 py-2 rounded-md text-xs font-semibold cursor-pointer ${
                audienceTab === 'brand' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
              }`}
            >
              Brand Plans
            </button>
          </div>
        </div>

        {audienceTab === 'creator' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                id: 'creator_free' as SubscriptionPlan,
                name: 'Creator Free',
                subtitle: 'For emerging 10K–50K creators starting brand deals',
                price: '₹0',
                cadence: '/ month',
                features: [
                  'Public creator portfolio & INR rate card',
                  'Unlimited campaign discovery & applications',
                  'Deterministic AI match scores',
                  'Full Deal Room & messaging access',
                ],
              },
              {
                id: 'bridge_plus' as SubscriptionPlan,
                name: 'Bridge Plus',
                subtitle: 'For full-time micro-creators scaling revenue',
                price: '₹499',
                cadence: '/ month (Test Mode)',
                highlight: true,
                features: [
                  'Everything in Creator Free',
                  'Gemini Profile Audit & Rate Optimization',
                  'Unlimited AI Pitch & Hook Generations',
                  'Advanced niche & acceptance analytics',
                ],
              },
            ].map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-8 flex flex-col justify-between gap-8 border ${
                  p.highlight
                    ? 'bg-[#171B2C] border-[#246BFD]'
                    : 'bg-[#101426] border-white/10'
                }`}
              >
                <div className="space-y-4">
                  <p className="text-xs text-[#9295A9]">{p.subtitle}</p>
                  <h2 className="font-display text-2xl font-bold text-[#F5F5FA]">
                    {p.name}
                  </h2>
                  <p className="font-mono-tabular text-4xl font-bold text-[#F5F5FA]">
                    {p.price}{' '}
                    <span className="text-xs font-normal text-[#9295A9]">{p.cadence}</span>
                  </p>
                  <ul className="space-y-2.5 pt-4 border-t border-white/8 text-sm text-[#9295A9]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCheckoutPlan({ id: p.id, name: p.name, priceLabel: p.price })
                  }
                  className="w-full py-3 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-display font-bold uppercase tracking-wider text-[#F5F5FA] cursor-pointer"
                >
                  {user?.plan === p.id ? 'Current Active Plan' : `Select ${p.name}`}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: 'brand_starter' as SubscriptionPlan,
                name: 'Brand Starter',
                subtitle: 'For D2C launches testing creator marketing',
                price: '₹2,999',
                cadence: '/ month (Test Mode)',
                features: [
                  'Up to 3 active campaigns',
                  'Creator discovery & basic filters',
                  'Kanban applicant pipeline',
                  'Deal Room & simulated escrow',
                ],
              },
              {
                id: 'brand_growth' as SubscriptionPlan,
                name: 'Brand Growth',
                subtitle: 'For scaling consumer brands across India',
                price: '₹7,999',
                cadence: '/ month (Test Mode)',
                highlight: true,
                features: [
                  'Unlimited active campaigns',
                  'Gemini AI Campaign Assistant & Brief Polish',
                  'Side-by-side creator comparison & collections',
                  'Configurable AI match weights & insights',
                ],
              },
              {
                id: 'brand_enterprise' as SubscriptionPlan,
                name: 'Enterprise',
                subtitle: 'For multi-brand agencies & large teams',
                price: '₹24,999',
                cadence: '/ month (Test Mode)',
                features: [
                  'Multi-seat brand team permissions',
                  'Custom campaign moderation SLAs',
                  'Advanced ROI & cohort reporting',
                  'Dedicated partner strategist',
                ],
              },
            ].map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-7 flex flex-col justify-between gap-8 border ${
                  p.highlight
                    ? 'bg-[#171B2C] border-[#00D5FF]'
                    : 'bg-[#101426] border-white/10'
                }`}
              >
                <div className="space-y-4">
                  <p className="text-xs text-[#9295A9]">{p.subtitle}</p>
                  <h2 className="font-display text-2xl font-bold text-[#F5F5FA]">
                    {p.name}
                  </h2>
                  <p className="font-mono-tabular text-3xl font-bold text-[#F5F5FA]">
                    {p.price}{' '}
                    <span className="text-xs font-normal text-[#9295A9]">{p.cadence}</span>
                  </p>
                  <ul className="space-y-2.5 pt-4 border-t border-white/8 text-sm text-[#9295A9]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCheckoutPlan({ id: p.id, name: p.name, priceLabel: p.price })
                  }
                  className="w-full py-3 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-display font-bold uppercase tracking-wider text-[#F5F5FA] cursor-pointer"
                >
                  {user?.plan === p.id ? 'Current Active Plan' : `Activate ${p.name}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulated Test Checkout Dialog */}
      {checkoutPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setCheckoutPlan(null)}
        >
          <div
            className="max-w-md w-full rounded-2xl bg-[#101426] border border-white/15 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider">
                Simulated Test Mode Checkout
              </p>
              <h3 className="font-display text-xl font-bold text-[#F5F5FA]">
                Confirm {checkoutPlan.name}
              </h3>
            </div>
            <p className="text-xs text-[#9295A9] leading-relaxed">
              This is a simulated payment environment for demonstration. No real credit
              card, UPI, or bank charge occurs. Stripe/Razorpay production webhooks plug
              directly into this billing service layer.
            </p>
            <div className="rounded-xl bg-[#050509] border border-white/8 p-4 flex justify-between items-center text-sm">
              <span>Simulated Plan Amount</span>
              <span className="font-mono-tabular font-bold text-[#00D5FF]">
                {checkoutPlan.priceLabel} (Simulated)
              </span>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs text-[#9295A9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmTestCheckout}
                className="px-5 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
              >
                {processing ? 'Activating…' : 'Confirm Simulated Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

// ==========================================
// 5. ABOUT & TEAM BUILD4 PAGES
// ==========================================
const BUILD4_TEAM = [
  {
    name: 'Dushyant Narang',
    role: 'Product Architecture, AI Systems & Full-Stack Engineering',
    accent: '#246BFD',
  },
  {
    name: 'Kulvir Dulani',
    role: 'Marketplace Backend, Security Rules & Deal Workflows',
    accent: '#00D5FF',
  },
  {
    name: 'Kanishika Jaiswal',
    role: 'Creative Direction, 3D Visual Language & Brand Experience',
    accent: '#F000B8',
  },
  {
    name: 'Vanshika Verma',
    role: 'Creator Discovery UX, Design System & Research',
    accent: '#9C65FF',
  },
];

export const AboutPage: React.FC<{ teamFocus?: boolean }> = ({ teamFocus }) => {
  return (
    <PublicLayout>
      <div className="pt-28 pb-24 max-w-5xl mx-auto px-6 space-y-16">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F000B8]">
            {teamFocus ? 'Team BUILD4' : 'About BRIDGE'}
          </p>
          <h1
            style={{ textWrap: 'balance' }}
            className="font-display text-4xl sm:text-5xl font-bold text-[#F5F5FA]"
          >
            Redefining how India’s emerging creators and brands build together.
          </h1>
          <p className="text-base text-[#9295A9] leading-relaxed max-w-3xl">
            Bridge was created to prove a simple conviction: your influence isn’t defined
            by your follower count—it’s defined by the connection you create. By combining
            LinkedIn’s professional credibility, Upwork’s structured opportunity management,
            and deterministic + Gemini AI intelligence, Bridge gives 10K–50K creators a
            level playing field.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
              Founding Collective · BUILD4
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5FA]">
              Built by Team BUILD4
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {BUILD4_TEAM.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl bg-[#101426] border border-white/10 p-6 flex items-start gap-4"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-sm font-bold text-[#F5F5FA] shrink-0"
                  style={{ backgroundColor: member.accent }}
                >
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-[#F5F5FA]">
                    {member.name}
                  </h3>
                  <p className="text-xs text-[#9295A9] leading-relaxed">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

// ==========================================
// 6. FAQ PAGE
// ==========================================
export const FaqPage: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: 'Who can join Bridge as a creator?',
      a: 'Bridge is purpose-built for emerging creators with 10K–50K followers across Instagram, YouTube, and regional Indian content channels, though creators slightly outside that band can also register and build portfolios.',
    },
    {
      q: 'Does Bridge charge a commission or claim real money transfers in Demo Mode?',
      a: 'No real money is transferred in the current environment. All Deal Room payouts and plan upgrades operate in clearly labelled Simulated Test Mode in INR (₹).',
    },
    {
      q: 'Can AI automatically reject my creator application?',
      a: 'Never. Bridge’s matching engine calculates transparent compatibility scores to help both sides prioritize fit, while human brand managers review every pitch.',
    },
    {
      q: 'How does creator and brand verification work?',
      a: 'Users submit verification references (such as GSTIN/domain proof for brands or 30-day analytics captures for creators) through Settings. Verified Admins review and approve or reject with written feedback.',
    },
    {
      q: 'What happens if a creator and brand disagree on deliverable scope?',
      a: 'Either Deal Room participant can open a structured Dispute directly inside the Deal Room, pausing simulated payout until Admin Trust & Safety reviews the submission history.',
    },
  ];

  return (
    <PublicLayout>
      <div className="pt-28 pb-24 max-w-3xl mx-auto px-6 space-y-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
            Help Center
          </p>
          <h1 className="font-display text-4xl font-bold text-[#F5F5FA]">
            Frequently Asked Questions
          </h1>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {items.map((item, idx) => (
            <div key={item.q} className="py-5">
              <button
                type="button"
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 text-left font-display text-base font-semibold text-[#F5F5FA] cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#00D5FF] transition-transform ${
                    open === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open === idx && (
                <p className="pt-3 text-sm text-[#9295A9] leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};

// ==========================================
// 7. CONTACT PAGE (PERSISTENT SUBMISSION)
// ==========================================
export const ContactPage: React.FC = () => {
  const { showToast } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    roleOrCompany: '',
    subject: 'Brand Partnership Inquiry',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.includes('@') || form.message.trim().length < 10) {
      setError('Please enter your name, a valid email address, and at least 10 characters in your message.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitContact(form);
      setSubmitted(true);
      showToast('Inquiry saved to Bridge team inbox', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="pt-28 pb-24 max-w-2xl mx-auto px-6 space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
            Get in Touch
          </p>
          <h1 className="font-display text-4xl font-bold text-[#F5F5FA]">Contact BRIDGE</h1>
          <p className="text-sm text-[#9295A9]">
            Questions about creator verification, enterprise brand cohorts, or BUILD4 demos?
            Send us a message below.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-[#101426] border border-[#34D399]/50 p-8 space-y-3">
            <h2 className="font-display text-xl font-bold text-[#34D399]">
              Message Received
            </h2>
            <p className="text-sm text-[#9295A9]">
              Thank you, {form.name}. Your message has been persisted and routed to Team
              BUILD4.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setForm({ ...form, message: '' });
              }}
              className="text-xs font-semibold text-[#00D5FF] hover:underline cursor-pointer"
            >
              Send another inquiry
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div className="rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 px-4 py-3 text-xs text-[#EF4444]">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-medium text-[#F5F5FA]">
                  Full Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-medium text-[#F5F5FA]">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-org" className="text-xs font-medium text-[#F5F5FA]">
                  Creator Handle or Brand Name
                </label>
                <input
                  id="contact-org"
                  type="text"
                  value={form.roleOrCompany}
                  onChange={(e) => setForm({ ...form, roleOrCompany: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-subj" className="text-xs font-medium text-[#F5F5FA]">
                  Topic
                </label>
                <select
                  id="contact-subj"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
                >
                  <option>Brand Partnership Inquiry</option>
                  <option>Creator Verification Support</option>
                  <option>Investor / Press Demo</option>
                  <option>Trust & Safety Report</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-msg" className="text-xs font-medium text-[#F5F5FA]">
                Message
              </label>
              <textarea
                id="contact-msg"
                rows={4}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-display font-bold uppercase tracking-wider text-[#F5F5FA] cursor-pointer"
            >
              {submitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
};

// ==========================================
// 8. LEGAL PAGES & 404 PAGE
// ==========================================
export const LegalPage: React.FC<{ mode: 'terms' | 'privacy' }> = ({ mode }) => (
  <PublicLayout>
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6 space-y-6">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
        Legal Documentation · Effective October 2026
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5FA]">
        {mode === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
      </h1>
      <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 space-y-4 text-sm text-[#9295A9] leading-relaxed">
        {mode === 'terms' ? (
          <>
            <p>
              <strong className="text-[#F5F5FA]">1. Marketplace Scope:</strong> BRIDGE
              provides an AI-assisted creator-brand discovery and collaboration Deal Room
              platform tailored to the Indian creator ecosystem (INR ₹).
            </p>
            <p>
              <strong className="text-[#F5F5FA]">2. Demo & Simulated Escrow Notice:</strong>{' '}
              Records badged as Demo and payment states inside Test Mode (Unfunded, Funded,
              In Review, Released) represent simulated workflows and do not constitute
              regulated banking custody or real-money transfers.
            </p>
            <p>
              <strong className="text-[#F5F5FA]">3. Authentic Disclosures:</strong> Creators
              agree to label sponsored deliverables transparently in accordance with ASCI
              guidelines and accurately indicate whether metrics are self-reported or
              verified.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong className="text-[#F5F5FA]">1. Credential Protection:</strong> BRIDGE
              salts and hashes passwords server-side using cryptographic scrypt derivation
              and never stores plaintext passwords in client storage or database records.
            </p>
            <p>
              <strong className="text-[#F5F5FA]">2. Verification Confidentiality:</strong>{' '}
              Verification references submitted by creators or brands are restricted to
              authorized platform administrators for badge review and audit logging.
            </p>
            <p>
              <strong className="text-[#F5F5FA]">3. Server-Side AI Processing:</strong>{' '}
              Gemini API requests execute strictly through server-side endpoints without
              exposing API credentials to browser bundles.
            </p>
          </>
        )}
      </div>
    </div>
  </PublicLayout>
);

export const NotFoundPage: React.FC = () => (
  <PublicLayout>
    <div className="pt-36 pb-28 max-w-xl mx-auto px-6 text-center space-y-6">
      <p className="font-mono-tabular text-sm text-[#F000B8]">404 · UNMAPPED SPAN</p>
      <h1 className="font-display text-4xl font-extrabold text-[#F5F5FA]">
        This route doesn’t connect anywhere yet.
      </h1>
      <p className="text-sm text-[#9295A9]">
        Return to the main Bridge deck or explore open Indian creator collaborations.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA]"
        >
          Back to Home
        </Link>
        <Link
          to="/explore"
          className="px-5 py-2.5 rounded-lg border border-white/15 text-xs font-semibold text-[#F5F5FA]"
        >
          Explore Campaigns
        </Link>
      </div>
    </div>
  </PublicLayout>
);

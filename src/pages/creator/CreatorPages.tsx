import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Grid,
  List,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { DEFAULT_MATCH_WEIGHTS } from '../../shared/matchingEngine';
import type {
  Application,
  Campaign,
  Deal,
  MatchResult,
  MatchWeights,
} from '../../types/domain';

// ==========================================
// 1. CREATOR DASHBOARD OVERVIEW
// ==========================================
export const CreatorOverviewPage: React.FC = () => {
  const { user, creatorProfile } = useApp();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMarketplaceCampaigns(),
      api.getApplications(),
      api.getDeals(),
    ])
      .then(([mRes, aRes, dRes]) => {
        setCampaigns(mRes.campaigns);
        setMatches(mRes.matches);
        setApplications(aRes.applications);
        setDeals(dRes.deals);
      })
      .finally(() => setLoading(false));
  }, []);

  // Calculate Profile Completion %
  let completion = 45;
  if (creatorProfile) {
    if (creatorProfile.bio.length > 25) completion += 15;
    if (creatorProfile.portfolio.length > 0) completion += 15;
    if (creatorProfile.rateCard.instagramReel > 0) completion += 15;
    if (creatorProfile.verificationStatus === 'verified') completion += 10;
  }
  completion = Math.min(100, completion);

  const recommended = campaigns
    .map((camp) => ({
      camp,
      match: matches.find((m) => m.campaignId === camp.id),
    }))
    .sort((a, b) => (b.match?.overallScore || 0) - (a.match?.overallScore || 0))
    .slice(0, 4);

  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - (completion / 100) * circumference;

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.fullName.split(' ')[0] || 'Creator'}`}
      subtitle="Your deterministic AI opportunities, application pipeline, and active Deal Rooms."
      actions={
        <Link
          to="/creator/discover"
          className="px-4 py-2 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-semibold text-[#F5F5FA]"
        >
          Discover Campaigns
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Profile Completion Ring */}
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5 flex items-center gap-4">
            <svg className="w-16 h-16 -rotate-90 shrink-0" viewBox="0 0 72 72">
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#171B2C"
                strokeWidth="6"
              />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#00D5FF"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div>
              <p className="font-mono-tabular text-2xl font-bold text-[#F5F5FA]">
                {completion}%
              </p>
              <p className="text-xs text-[#9295A9]">Profile Completion</p>
              <Link
                to="/creator/profile"
                className="text-[11px] text-[#00D5FF] hover:underline"
              >
                Edit Portfolio →
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-1">
            <p className="text-xs text-[#9295A9]">Bridge Creator Score</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#9C65FF]">
              {creatorProfile?.bridgeCreatorScore || 75}
              <span className="text-sm text-[#9295A9] font-normal">/100</span>
            </p>
            <p className="text-xs text-[#9295A9]">
              {creatorProfile?.engagementRate || 5.2}% avg engagement
            </p>
          </div>

          <div className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-1">
            <p className="text-xs text-[#9295A9]">Active Deal Rooms</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#F5F5FA]">
              {deals.filter((d) => d.status === 'Active').length}
            </p>
            <p className="text-xs text-[#9295A9]">
              {applications.length} total pitches sent
            </p>
          </div>

          <div className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-1">
            <p className="text-xs text-[#9295A9]">Simulated Earnings (INR)</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#34D399]">
              ₹{(creatorProfile?.totalEarningsINR || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-[#9295A9]">
              {creatorProfile?.completedDealsCount || 0} completed collaborations
            </p>
          </div>
        </div>

        {/* Recommended Campaigns + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                Top AI-Matched Campaigns For You
              </h2>
              <Link
                to="/creator/discover"
                className="text-xs font-semibold text-[#00D5FF] hover:underline"
              >
                View all {campaigns.length} →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 rounded-xl bg-[#101426] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommended.map(({ camp, match }) => (
                  <Link
                    key={camp.id}
                    to={`/creator/campaigns/${camp.id}`}
                    className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#246BFD] transition-colors p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#9295A9] flex items-center gap-1.5">
                          <strong className="text-[#F5F5FA]">{camp.brandName}</strong>
                          {camp.brandVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                          )}
                        </span>
                        {match && (
                          <span className="font-mono-tabular font-bold text-[#34D399]">
                            {match.overallScore}% Match
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold text-[#F5F5FA] line-clamp-2">
                        {camp.title}
                      </h3>
                      {match && match.reasons[0] && (
                        <p className="text-xs text-[#9295A9] line-clamp-2">
                          {match.reasons[0]}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/8 text-xs">
                      <span className="font-mono-tabular font-semibold text-[#F5F5FA]">
                        ₹{camp.budgetMinINR.toLocaleString('en-IN')} – ₹
                        {camp.budgetMaxINR.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[#00D5FF] font-semibold">Inspect & Pitch →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Application Pipeline & Deadlines */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Application Pipeline</h2>
                <Link
                  to="/creator/applications"
                  className="text-xs text-[#00D5FF] hover:underline"
                >
                  Open All
                </Link>
              </div>
              {applications.length === 0 ? (
                <p className="text-xs text-[#9295A9]">
                  No applications yet. Pitch your first brand brief!
                </p>
              ) : (
                <div className="space-y-3">
                  {applications.slice(0, 4).map((app) => (
                    <div
                      key={app.id}
                      className="rounded-lg bg-[#0B0D18] border border-white/6 p-3 space-y-1 text-xs"
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold text-[#F5F5FA] truncate">
                          {app.brandName}
                        </span>
                        <span
                          className={`font-semibold ${
                            app.status === 'Accepted'
                              ? 'text-[#34D399]'
                              : app.status === 'Shortlisted'
                              ? 'text-[#00D5FF]'
                              : 'text-[#9295A9]'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-[#9295A9] truncate">{app.campaignTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-3">
              <h2 className="font-display text-base font-bold">Upcoming Deadlines</h2>
              {deals.filter((d) => d.status === 'Active').length === 0 ? (
                <p className="text-xs text-[#9295A9]">No active deliverable deadlines.</p>
              ) : (
                deals
                  .filter((d) => d.status === 'Active')
                  .map((d) => (
                    <Link
                      key={d.id}
                      to={`/creator/deals/${d.id}`}
                      className="block rounded-lg bg-[#0B0D18] border border-white/6 p-3 text-xs space-y-1 hover:border-[#00D5FF]"
                    >
                      <p className="font-semibold text-[#F5F5FA]">{d.campaignTitle}</p>
                      <p className="text-[#00D5FF] font-mono-tabular">Due {d.deadline}</p>
                    </Link>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 2. CREATOR DISCOVER & SAVED CAMPAIGNS
// ==========================================
export const CreatorDiscoverPage: React.FC<{ savedOnly?: boolean }> = ({ savedOnly }) => {
  const { showToast } = useApp();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [niche, setNiche] = useState('All');
  const [platform, setPlatform] = useState('All');
  const [language, setLanguage] = useState('All');
  const [minBudget, setMinBudget] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'match' | 'newest' | 'budget'>('match');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState<MatchWeights>(DEFAULT_MATCH_WEIGHTS);

  const loadData = useCallback(async (w?: MatchWeights) => {
    setLoading(true);
    try {
      const res = await api.getMarketplaceCampaigns(w);
      setCampaigns(res.campaigns);
      setMatches(res.matches);
      setSavedIds(res.savedIds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(weights);
  }, [loadData, weights]);

  const handleToggleSave = async (campaignId: string) => {
    try {
      const res = await api.toggleSavedCampaign(campaignId);
      setSavedIds(res.savedIds);
      showToast(
        res.savedIds.includes(campaignId)
          ? 'Saved to bookmarked campaigns'
          : 'Removed from saved campaigns',
        'info'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const enriched = campaigns
    .filter((c) => !savedOnly || savedIds.includes(c.id))
    .filter((c) => {
      if (verifiedOnly && !c.brandVerified) return false;
      if (niche !== 'All' && !c.niches.includes(niche)) return false;
      if (platform !== 'All' && !c.platforms.includes(platform)) return false;
      if (language !== 'All' && !c.requiredLanguages.includes(language)) return false;
      if (c.budgetMaxINR < minBudget) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.brandName.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .map((camp) => ({
      camp,
      match: matches.find((m) => m.campaignId === camp.id) || null,
    }))
    .sort((a, b) => {
      if (sortBy === 'match') {
        return (b.match?.overallScore || 0) - (a.match?.overallScore || 0);
      }
      if (sortBy === 'budget') {
        return b.camp.budgetMaxINR - a.camp.budgetMaxINR;
      }
      return b.camp.createdAt.localeCompare(a.camp.createdAt);
    });

  return (
    <DashboardLayout
      title={savedOnly ? 'Saved Campaigns' : 'Discover Campaigns'}
      subtitle={
        savedOnly
          ? 'Your bookmarked collaboration briefs.'
          : 'Ranked deterministically against your creator profile, rate card, and engagement.'
      }
      actions={
        !savedOnly ? (
          <button
            type="button"
            onClick={() => setShowWeights((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#171B2C] border border-white/10 text-xs font-semibold text-[#00D5FF] cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            AI Weights
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Configurable AI Match Weights Drawer */}
        {showWeights && (
          <div className="rounded-xl bg-[#101426] border border-[#00D5FF]/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#F5F5FA]">
                Customize Deterministic Matching Weights (Auto-Normalized to 100%)
              </p>
              <button
                type="button"
                onClick={() => setWeights(DEFAULT_MATCH_WEIGHTS)}
                className="text-xs text-[#00D5FF] hover:underline cursor-pointer"
              >
                Reset to Default (30/25/20/15/10)
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
              {(
                [
                  ['niche', 'Niche'],
                  ['audience', 'Audience'],
                  ['engagement', 'Engagement'],
                  ['budget', 'Budget'],
                  ['platform', 'Platform'],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#9295A9]">{label}</span>
                    <span className="font-mono-tabular text-[#F5F5FA]">{weights[k]}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    value={weights[k]}
                    onChange={(e) =>
                      setWeights({ ...weights, [k]: Number(e.target.value) })
                    }
                    className="w-full accent-[#246BFD]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="rounded-xl bg-[#101426] border border-white/8 p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9295A9] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brand, title, or Indian city..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              >
                <option value="All">All Niches</option>
                {[
                  'Technology',
                  'Fitness',
                  'Beauty',
                  'Fashion',
                  'Food & Beverages',
                  'Education',
                  'Lifestyle',
                  'Travel',
                ].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              >
                <option value="All">All Platforms</option>
                <option value="Instagram">Instagram</option>
                <option value="YouTube">YouTube</option>
              </select>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              >
                <option value="All">All Languages</option>
                {['English', 'Hindi', 'Bengali', 'Telugu'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <select
                value={minBudget}
                onChange={(e) => setMinBudget(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
              >
                <option value={0}>Any Budget</option>
                <option value={25000}>₹25,000+ Max</option>
                <option value={35000}>₹35,000+ Max</option>
              </select>

              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  verifiedOnly
                    ? 'bg-[#34D399]/15 border-[#34D399] text-[#34D399]'
                    : 'bg-[#050509] border-white/10 text-[#9295A9]'
                }`}
              >
                Verified Only
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-[#171B2C] border border-white/10 text-xs font-semibold text-[#F5F5FA]"
              >
                <option value="match">Sort: Best AI Match</option>
                <option value="budget">Sort: Highest Budget</option>
                <option value="newest">Sort: Newest</option>
              </select>

              <div className="inline-flex rounded-lg bg-[#050509] border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-1.5 rounded ${
                    viewMode === 'grid' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-1.5 rounded ${
                    viewMode === 'list' ? 'bg-[#246BFD] text-[#F5F5FA]' : 'text-[#9295A9]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-60 rounded-xl bg-[#101426] animate-pulse" />
            ))}
          </div>
        ) : enriched.length === 0 ? (
          <div className="rounded-xl bg-[#101426] border border-white/8 p-12 text-center space-y-2">
            <p className="font-display text-base font-bold">No matching campaigns</p>
            <p className="text-xs text-[#9295A9]">
              {savedOnly
                ? 'Bookmark campaigns in Discover to save them here.'
                : 'Try broadening your niche or budget filters.'}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'space-y-4'
            }
          >
            {enriched.map(({ camp, match }) => {
              const isSaved = savedIds.includes(camp.id);
              return (
                <div
                  key={camp.id}
                  className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#246BFD]/70 transition-colors p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-display text-xs font-bold text-[#050509] shrink-0"
                          style={{ backgroundColor: camp.brandAccent || '#00D5FF' }}
                        >
                          {camp.brandLogoMonogram}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F5F5FA]">
                            <span>{camp.brandName}</span>
                            {camp.brandVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#9295A9]">
                            {camp.niches.join(' · ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {match && (
                          <span className="font-mono-tabular text-sm font-bold text-[#34D399]">
                            {match.overallScore}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleSave(camp.id)}
                          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark campaign'}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            isSaved ? 'text-[#F000B8]' : 'text-[#9295A9] hover:text-[#F5F5FA]'
                          }`}
                        >
                          <Bookmark
                            className="w-4 h-4"
                            fill={isSaved ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-display text-base font-bold text-[#F5F5FA] leading-snug">
                      {camp.title}
                    </h3>

                    <p className="text-xs text-[#9295A9]">
                      {camp.platforms.join(' / ')} · {camp.deliverables[0]}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/8 space-y-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[#9295A9]">
                        Due {camp.applicationDeadline} · {camp.applicantCount} applied
                      </span>
                      <span className="font-mono-tabular font-bold text-[#F5F5FA]">
                        ₹{camp.budgetMinINR.toLocaleString('en-IN')}–₹
                        {camp.budgetMaxINR.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <Link
                      to={`/creator/campaigns/${camp.id}`}
                      className="block w-full text-center py-2 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] transition-colors"
                    >
                      View AI Match & Apply
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 3. CAMPAIGN DETAIL + AI MATCH + GEMINI PITCH APPLICATION
// ==========================================
export const CreatorCampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { creatorProfile, showToast } = useApp();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [pitch, setPitch] = useState('');
  const [proposedRateINR, setProposedRateINR] = useState(22000);
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Gemini AI pitch & match summary states
  const [aiPitchLoading, setAiPitchLoading] = useState(false);
  const [aiPitchError, setAiPitchError] = useState('');
  const [aiAngles, setAiAngles] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getCampaignDetail(id)
      .then((res) => {
        setCampaign(res.campaign);
        setMatch(res.match);
        setExistingApp(res.existingApplication);
        if (res.existingApplication) {
          setPitch(res.existingApplication.pitch);
          setProposedRateINR(res.existingApplication.proposedRateINR);
        } else if (res.match) {
          setProposedRateINR(res.match.recommendedRateINR);
        }
        if (creatorProfile?.portfolio.length) {
          setSelectedPortfolioIds([creatorProfile.portfolio[0].id]);
        }
      })
      .finally(() => setLoading(false));
  }, [id, creatorProfile]);

  const handleGenerateAiPitch = async (customAngleToUse?: string) => {
    if (!campaign) return;
    setAiPitchLoading(true);
    setAiPitchError('');

    // Pre-calculate immediate fallback in case of network latency
    const fallbackPitch = `Hi ${campaign.brandName} team,\n\nI create ${creatorProfile?.niches?.join(' & ') || 'lifestyle'} content from ${creatorProfile?.city || 'India'} for an engaged community of ${((creatorProfile?.totalFollowers || 25000) / 1000).toFixed(1)}K followers (${creatorProfile?.engagementRate || 5.8}% engagement) in ${creatorProfile?.languages?.join(' & ') || 'English'}.\n\nFor "${campaign.title}", I would love to produce ${campaign.deliverables[0] || '1x Instagram Reel'} anchored around ${customAngleToUse || match?.suggestedContentAngle || 'a genuine day-in-the-life product trial hook'}.\n\nMy audience closely matches your target demographic, and I can deliver the first cut within 6 days of brief confirmation.`;
    const fallbackRate = match?.recommendedRateINR || 22000;
    const fallbackAngles = [
      match?.suggestedContentAngle || 'Day-in-the-life authentic product trial opening in 3 seconds.',
      'Honest 7-day routine test comparing expectations vs real-world results.',
      'Bilingual community breakdown answering top follower questions.',
    ];

    try {
      // Race API request with a client-side 6-second timeout
      const apiCall = api.generatePitch(campaign.id, customAngleToUse);
      const timeoutCall = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 6000)
      );
      const res = await Promise.race([apiCall, timeoutCall]);

      setPitch(res.pitch || fallbackPitch);
      setProposedRateINR(res.recommendedRateINR || fallbackRate);
      setAiAngles(res.contentAngles?.length ? res.contentAngles : fallbackAngles);
      showToast(
        res.source === 'gemini'
          ? 'Pitch generated with Gemini AI — edit freely before sending!'
          : 'Pitch drafted via AI Assistant — edit freely!',
        'success'
      );
    } catch {
      // Immediate intelligent fallback so creators are never blocked or stuck
      setPitch((prev) => (prev.trim().length > 10 ? prev : fallbackPitch));
      setProposedRateINR(fallbackRate);
      setAiAngles(fallbackAngles);
      showToast('Pitch drafted via AI Assistant — customize below!', 'success');
    } finally {
      setAiPitchLoading(false);
    }
  };

  const handleExplainMatchWithAi = async () => {
    if (!campaign || !creatorProfile) return;
    setAiSummaryLoading(true);
    try {
      const res = await api.explainMatch(creatorProfile.id, campaign.id);
      setAiSummary(res.executiveSummary);
      setMatch(res.match);
    } catch (err: any) {
      showToast(err.message || 'Could not load AI explanation', 'error');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleSubmitApp = async (asDraft: boolean) => {
    if (!campaign) return;
    setSubmitting(true);
    try {
      const questionAnswers = campaign.screeningQuestions.map((q) => ({
        question: q,
        answer: answers[q] || 'Confirmed — ready to align with schedule.',
      }));
      const res = await api.submitApplication({
        campaignId: campaign.id,
        pitch,
        proposedRateINR: Number(proposedRateINR),
        attachedPortfolioIds: selectedPortfolioIds,
        questionAnswers,
        asDraft,
      });
      setExistingApp(res.application);
      showToast(
        asDraft ? 'Application saved as Draft' : 'Application submitted to brand!',
        'success'
      );
      if (!asDraft) {
        navigate('/creator/applications');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !campaign) {
    return (
      <DashboardLayout title="Campaign Brief">
        <div className="h-80 rounded-xl bg-[#101426] animate-pulse" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={campaign.title}
      subtitle={`${campaign.brandName} · ${campaign.location} · Due ${campaign.applicationDeadline}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Complete Campaign Brief + Application Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/8">
              <div className="flex items-center gap-2 text-xs text-[#9295A9]">
                <strong className="text-[#F5F5FA]">{campaign.brandName}</strong>
                {campaign.brandVerified && (
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                )}
                <span>·</span>
                <span>{campaign.industry}</span>
              </div>
              <p className="font-mono-tabular text-base font-bold text-[#00D5FF]">
                ₹{campaign.budgetMinINR.toLocaleString('en-IN')} – ₹
                {campaign.budgetMaxINR.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-base font-bold">Campaign Brief</h2>
              <p className="text-sm text-[#9295A9] leading-relaxed">
                {campaign.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-white/8 text-xs">
              <div>
                <p className="text-[#9295A9]">Platforms</p>
                <p className="font-semibold text-[#F5F5FA] mt-1">
                  {campaign.platforms.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Languages</p>
                <p className="font-semibold text-[#F5F5FA] mt-1">
                  {campaign.requiredLanguages.join(', ')}
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Creators Needed</p>
                <p className="font-mono-tabular font-semibold text-[#F5F5FA] mt-1">
                  {campaign.creatorsRequired} spots ({campaign.applicantCount} applied)
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-[#F5F5FA]">Required Deliverables</p>
              <ul className="list-disc pl-5 text-[#9295A9] space-y-1">
                {campaign.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl bg-[#0B0D18] p-4 space-y-1.5">
                <p className="font-semibold text-[#34D399]">Do’s</p>
                <ul className="list-disc pl-4 text-[#9295A9] space-y-1">
                  {campaign.dos.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-[#0B0D18] p-4 space-y-1.5">
                <p className="font-semibold text-[#EF4444]">Don’ts</p>
                <ul className="list-disc pl-4 text-[#9295A9] space-y-1">
                  {campaign.donts.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Application Composer */}
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                {existingApp && existingApp.status !== 'Draft'
                  ? `Application Status: ${existingApp.status}`
                  : 'Submit Your Creator Pitch'}
              </h2>
              {(!existingApp || existingApp.status === 'Draft') && (
                <button
                  type="button"
                  disabled={aiPitchLoading}
                  onClick={() => handleGenerateAiPitch()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#9C65FF]/20 border border-[#9C65FF] text-xs font-semibold text-[#F5F5FA] hover:bg-[#9C65FF]/35 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F000B8]" />
                  {aiPitchLoading ? 'Drafting with Gemini…' : 'Generate Pitch with Gemini'}
                </button>
              )}
            </div>

            {aiPitchError && (
              <div className="rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 p-3 flex items-center justify-between text-xs text-[#EF4444]">
                <span>{aiPitchError}</span>
                <button
                  type="button"
                  onClick={() => handleGenerateAiPitch()}
                  className="underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {existingApp && existingApp.status !== 'Draft' ? (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl bg-[#0B0D18] border border-[#34D399]/30 p-4 space-y-2">
                  <p className="text-[#34D399] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Submitted at ₹{existingApp.proposedRateINR.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[#9295A9] whitespace-pre-line">{existingApp.pitch}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {aiAngles.length > 0 && (
                  <div className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-[#00D5FF]">
                      AI Suggested Content Angles (Click to append):
                    </p>
                    <div className="space-y-1.5">
                      {aiAngles.map((ang, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setPitch((prev) => `${prev}\n\nConcept Angle: ${ang}`.trim())
                          }
                          className="block w-full text-left p-2 rounded bg-[#101426] hover:bg-[#171B2C] text-[#9295A9] hover:text-[#F5F5FA] cursor-pointer"
                        >
                          + {ang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#F5F5FA]">
                    Your Editable Pitch & Creative Concept
                  </label>
                  <textarea
                    rows={5}
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    placeholder="Explain how your community connects with this brief and your 3-second opening hook..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA] leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#F5F5FA]">
                    Proposed Collaboration Rate (₹ INR)
                  </label>
                  <input
                    type="number"
                    step={500}
                    min={1000}
                    value={proposedRateINR}
                    onChange={(e) => setProposedRateINR(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular text-[#F5F5FA]"
                  />
                </div>

                {creatorProfile && creatorProfile.portfolio.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#F5F5FA]">
                      Attach Portfolio Examples
                    </label>
                    <div className="space-y-1.5">
                      {creatorProfile.portfolio.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#050509] border border-white/8 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPortfolioIds.includes(p.id)}
                            onChange={(e) =>
                              setSelectedPortfolioIds(
                                e.target.checked
                                  ? [...selectedPortfolioIds, p.id]
                                  : selectedPortfolioIds.filter((x) => x !== p.id)
                              )
                            }
                            className="accent-[#246BFD]"
                          />
                          <span className="text-[#F5F5FA] font-medium">{p.title}</span>
                          <span className="text-[#9295A9]">({p.viewsOrReach})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {campaign.screeningQuestions.map((q) => (
                  <div key={q} className="space-y-1">
                    <label className="text-xs font-medium text-[#F5F5FA]">{q}</label>
                    <input
                      type="text"
                      value={answers[q] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                      placeholder="Your answer..."
                      className="w-full px-3.5 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                    />
                  </div>
                ))}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitApp(false)}
                    className="px-6 py-2.5 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-bold uppercase tracking-wider text-[#F5F5FA] cursor-pointer"
                  >
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmitApp(true)}
                    className="px-4 py-2.5 rounded-lg border border-white/15 text-xs font-semibold text-[#9295A9] hover:text-[#F5F5FA] cursor-pointer"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Bridge Deterministic AI Match Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {match && (
            <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#00D5FF]">
                    Bridge AI Match Engine
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#F5F5FA] mt-1">
                    Compatibility Breakdown
                  </h2>
                </div>
                <span className="font-mono-tabular text-3xl font-extrabold text-[#34D399]">
                  {match.overallScore}%
                </span>
              </div>

              <div className="space-y-3">
                {[
                  ['Niche Fit (30%)', match.breakdown.nicheScore, '#246BFD'],
                  ['Audience Alignment (25%)', match.breakdown.audienceScore, '#00D5FF'],
                  ['Engagement Quality (20%)', match.breakdown.engagementScore, '#9C65FF'],
                  ['Budget Fit (15%)', match.breakdown.budgetScore, '#F000B8'],
                  ['Platform Fit (10%)', match.breakdown.platformScore, '#34D399'],
                ].map(([label, score, col]) => (
                  <div key={String(label)} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9295A9]">{label}</span>
                      <span className="font-mono-tabular font-semibold">{score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#050509] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score}%`, backgroundColor: String(col) }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/8 text-xs">
                <p className="font-semibold text-[#F5F5FA]">Why this match works:</p>
                <ul className="space-y-1.5 text-[#9295A9]">
                  {match.reasons.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>

              {match.potentialMismatches.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/8 text-xs">
                  <p className="font-semibold text-[#F59E0B]">Potential Gaps:</p>
                  {match.potentialMismatches.map((m, i) => (
                    <p key={i} className="text-[#9295A9]">
                      • {m}
                    </p>
                  ))}
                </div>
              )}

              {match.dataNotices.length > 0 && (
                <div className="rounded-lg bg-[#0B0D18] p-3 text-[11px] text-[#9295A9] space-y-1">
                  {match.dataNotices.map((dn, i) => (
                    <p key={i}>ℹ️ {dn}</p>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-white/8 flex items-center justify-between text-xs">
                <span className="text-[#9295A9]">Recommended Rate</span>
                <span className="font-mono-tabular text-base font-bold text-[#F5F5FA]">
                  ₹{match.recommendedRateINR.toLocaleString('en-IN')}
                </span>
              </div>

              {aiSummary ? (
                <div className="rounded-xl bg-[#0B0D18] border border-[#9C65FF]/40 p-3.5 text-xs text-[#F5F5FA] leading-relaxed">
                  {aiSummary}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={aiSummaryLoading}
                  onClick={handleExplainMatchWithAi}
                  className="w-full py-2 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
                >
                  {aiSummaryLoading
                    ? 'Synthesizing Insight…'
                    : 'Generate Gemini Match Summary'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 4. CREATOR APPLICATIONS TRACKER
// ==========================================
export const CreatorApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getApplications(), api.getDeals()])
      .then(([aRes, dRes]) => {
        setApplications(aRes.applications);
        setDeals(dRes.deals);
      })
      .finally(() => setLoading(false));
  }, []);

  const stages = [
    'Draft',
    'Submitted',
    'Viewed',
    'Shortlisted',
    'Discussion',
    'Accepted',
  ];

  return (
    <DashboardLayout
      title="My Applications"
      subtitle="Real-time status tracking from pitch submission to Deal Room activation."
    >
      {loading ? (
        <div className="h-56 rounded-xl bg-[#101426] animate-pulse" />
      ) : applications.length === 0 ? (
        <div className="rounded-xl bg-[#101426] border border-white/8 p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold">No applications yet</p>
          <Link
            to="/creator/discover"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const linkedDeal = deals.find((d) => d.applicationId === app.id);
            const currentStageIdx = stages.indexOf(app.status);
            return (
              <div
                key={app.id}
                className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-[#9295A9]">
                      <strong className="text-[#F5F5FA]">{app.brandName}</strong> ·{' '}
                      <span className="font-mono-tabular text-[#34D399]">
                        {app.matchScore}% Match
                      </span>
                    </p>
                    <h2 className="font-display text-lg font-bold text-[#F5F5FA]">
                      {app.campaignTitle}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-tabular text-base font-bold text-[#F5F5FA]">
                      ₹{app.proposedRateINR.toLocaleString('en-IN')}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        app.status === 'Accepted'
                          ? 'text-[#34D399]'
                          : app.status === 'Rejected'
                          ? 'text-[#EF4444]'
                          : 'text-[#00D5FF]'
                      }`}
                    >
                      {app.status}
                    </p>
                  </div>
                </div>

                {/* Stage Progression Bar */}
                {app.status !== 'Rejected' && (
                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                    {stages.map((st, idx) => (
                      <div key={st} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            idx <= currentStageIdx ? 'bg-[#00D5FF]' : 'bg-[#171B2C]'
                          }`}
                        />
                        <p className="text-[10px] text-[#9295A9] truncate">{st}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/8 text-xs">
                  <span className="text-[#9295A9] line-clamp-1 max-w-xl">
                    Pitch: “{app.pitch}”
                  </span>
                  {linkedDeal ? (
                    <Link
                      to={`/creator/deals/${linkedDeal.id}`}
                      className="px-4 py-1.5 rounded-lg bg-[#34D399] text-[#050509] font-bold"
                    >
                      Enter Deal Room →
                    </Link>
                  ) : (
                    <Link
                      to={`/creator/campaigns/${app.campaignId}`}
                      className="text-[#00D5FF] hover:underline"
                    >
                      View Campaign
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

// ==========================================
// 5. CREATOR ANALYTICS PAGE (RECHARTS)
// ==========================================
export const CreatorAnalyticsPage: React.FC = () => {
  const { creatorProfile } = useApp();
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    api.getApplications().then((res) => setApplications(res.applications));
  }, []);

  const acceptedCount = applications.filter((a) => a.status === 'Accepted').length;
  const acceptanceRate = applications.length
    ? Math.round((acceptedCount / applications.length) * 100)
    : 0;

  const earningsSeries = [
    { month: 'Jun', earnings: 0 },
    { month: 'Jul', earnings: 18000 },
    { month: 'Aug', earnings: 24000 },
    { month: 'Sep', earnings: 26000 },
    { month: 'Oct', earnings: creatorProfile?.totalEarningsINR || 28000 },
  ];

  const nichePerformance = (creatorProfile?.niches || ['Lifestyle']).map((n, i) => ({
    niche: n,
    matchAvg: 92 - i * 4,
  }));

  return (
    <DashboardLayout
      title="Creator Analytics"
      subtitle="Platform Deal Room performance & pitch conversion metrics (Simulated Earnings in INR)."
    >
      <div className="space-y-8">
        <div className="rounded-xl bg-[#0B0D18] border border-white/8 px-4 py-3 text-xs text-[#9295A9]">
          Platform Analytics Notice: Views, applications, acceptance rates, and simulated
          escrow payouts reflect Bridge platform activity. Third-party Instagram/YouTube
          live graph APIs require verified OAuth connection.
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Bridge Profile Views</p>
            <p className="font-mono-tabular text-2xl font-bold mt-1">
              {creatorProfile?.profileViews || 1}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Campaign Impressions</p>
            <p className="font-mono-tabular text-2xl font-bold mt-1">
              {creatorProfile?.campaignImpressions || 48}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Pitch Acceptance Rate</p>
            <p className="font-mono-tabular text-2xl font-bold text-[#00D5FF] mt-1">
              {acceptanceRate}%
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Completed Deals</p>
            <p className="font-mono-tabular text-2xl font-bold text-[#34D399] mt-1">
              {creatorProfile?.completedDealsCount || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-base font-bold">
              Cumulative Simulated Earnings (₹ INR)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#9295A9" fontSize={12} />
                  <YAxis stroke="#9295A9" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B0D18',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#00D5FF"
                    fill="#246BFD"
                    fillOpacity={0.28}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-base font-bold">
              Average AI Match Strength by Niche
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nichePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="niche" stroke="#9295A9" fontSize={12} />
                  <YAxis stroke="#9295A9" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B0D18',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="matchAvg" fill="#9C65FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 6. CREATOR PROFILE & GEMINI PROFILE AUDIT
// ==========================================
export const CreatorProfileManagePage: React.FC = () => {
  const { creatorProfile, refreshSession, showToast } = useApp();
  const [bio, setBio] = useState(creatorProfile?.bio || '');
  const [city, setCity] = useState(creatorProfile?.city || 'Bengaluru');
  const [reelRate, setReelRate] = useState(
    creatorProfile?.rateCard.instagramReel || 20000
  );
  const [engagementRate, setEngagementRate] = useState(
    creatorProfile?.engagementRate || 5.5
  );
  const [availability, setAvailability] = useState(
    creatorProfile?.availability || 'Available'
  );
  const [saving, setSaving] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
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
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCreatorProfile({
        bio,
        city,
        engagementRate: Number(engagementRate),
        availability: availability as any,
        rateCard: {
          ...(creatorProfile?.rateCard || {
            instagramStorySet: 6000,
            youtubeDedicated: 32000,
            youtubeShorts: 19000,
            ugcBundle: 25000,
            currency: 'INR',
          }),
          instagramReel: Number(reelRate),
        },
      });
      await refreshSession();
      showToast('Creator profile saved!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAudit = async () => {
    setAnalysisLoading(true);
    try {
      const res = await api.analyzeCreatorProfile(creatorProfile?.id);
      setAnalysis(res);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="My Creator Portfolio"
      subtitle="Update your bio, INR rate card, and run Gemini AI Profile & Rate Analysis."
      actions={
        creatorProfile ? (
          <Link
            to={`/creators/${creatorProfile.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 text-xs font-semibold text-[#00D5FF]"
          >
            Public Portfolio
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold">Edit Portfolio & Rates</h2>
          <div className="space-y-1">
            <label className="text-xs text-[#9295A9]">Creator Bio</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-[#9295A9]">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#9295A9]">Reel Rate (₹ INR)</label>
              <input
                type="number"
                step={500}
                value={reelRate}
                onChange={(e) => setReelRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs font-mono-tabular"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#9295A9]">Engagement (%)</label>
              <input
                type="number"
                step={0.1}
                value={engagementRate}
                onChange={(e) => setEngagementRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#9295A9]">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs"
            >
              <option value="Available">Available</option>
              <option value="Limited Availability">Limited Availability</option>
              <option value="Booked Until Next Month">Booked Until Next Month</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-[#246BFD] text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Gemini AI Profile Audit */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F000B8]" />
              Gemini Profile & Rate Advisor
            </h2>
            <button
              type="button"
              disabled={analysisLoading}
              onClick={runAudit}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${analysisLoading ? 'animate-spin' : ''}`}
              />
              {analysis ? 'Re-scan' : 'Run Audit'}
            </button>
          </div>

          {!analysis ? (
            <p className="text-xs text-[#9295A9] leading-relaxed">
              Analyze your creator profile to receive suggested INR rates, adjacent niche
              opportunities, and a heuristic authenticity check.
            </p>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-[#34D399]">Profile Strengths</p>
                {analysis.strengths.map((s, i) => (
                  <p key={i} className="text-[#9295A9]">
                    • {s}
                  </p>
                ))}
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[#00D5FF]">Actionable Improvements</p>
                {analysis.improvements.map((s, i) => (
                  <p key={i} className="text-[#9295A9]">
                    • {s}
                  </p>
                ))}
              </div>

              <div className="rounded-xl bg-[#0B0D18] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#9295A9]">Suggested Reel Rate</span>
                  <span className="font-mono-tabular font-bold text-[#F5F5FA]">
                    ₹{analysis.suggestedRateCardINR.instagramReel.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReelRate(analysis.suggestedRateCardINR.instagramReel)
                  }
                  className="text-[#00D5FF] hover:underline cursor-pointer"
                >
                  Apply suggested ₹ rate to form →
                </button>
              </div>

              <div className="rounded-xl bg-[#0B0D18] border border-white/8 p-3.5 space-y-1">
                <p className="font-semibold text-[#F5F5FA]">
                  {analysis.heuristicAuthenticity.label}
                </p>
                <p className="text-[11px] text-[#F59E0B]">
                  {analysis.heuristicAuthenticity.disclaimer}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

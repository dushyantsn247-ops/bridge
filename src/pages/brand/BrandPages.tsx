import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
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
  Columns,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type {
  Application,
  ApplicationStatus,
  Campaign,
  CreatorCollection,
  CreatorProfile,
  Deal,
  MatchResult,
} from '../../types/domain';

// ==========================================
// 1. BRAND OVERVIEW DASHBOARD
// ==========================================
export const BrandOverviewPage: React.FC = () => {
  const { brandProfile } = useApp();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [shortlistedCount, setShortlistedCount] = useState(0);
  const [aiInsights, setAiInsights] = useState<{
    headline: string;
    insights: string[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getBrandCampaigns(),
      api.getApplications(),
      api.getDeals(),
      api.discoverCreators(),
    ]).then(([cRes, aRes, dRes, discRes]) => {
      setCampaigns(cRes.campaigns);
      setApplications(aRes.applications);
      setDeals(dRes.deals);
      setShortlistedCount(discRes.shortlistedIds.length);
    });
  }, []);

  const handleLoadInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.getCampaignInsights();
      setAiInsights({ headline: res.headline, insights: res.insights });
    } finally {
      setLoadingInsights(false);
    }
  };

  const committedINR = deals.reduce((s, d) => s + d.agreedAmountINR, 0);

  return (
    <DashboardLayout
      title={brandProfile?.companyName || 'Brand Studio'}
      subtitle="Manage creator campaigns, applicant pipelines, AI discovery, and Deal Rooms."
      actions={
        <Link
          to="/brand/campaigns?create=1"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-semibold text-[#F5F5FA]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </Link>
      }
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Active Campaigns</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#F5F5FA] mt-1">
              {campaigns.filter((c) => c.status === 'Active').length}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Total Applications</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#00D5FF] mt-1">
              {applications.length}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Shortlisted Talent</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#9C65FF] mt-1">
              {shortlistedCount}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Active Deals</p>
            <p className="font-mono-tabular text-3xl font-bold text-[#34D399] mt-1">
              {deals.filter((d) => d.status === 'Active').length}
            </p>
          </div>
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5">
            <p className="text-xs text-[#9295A9]">Simulated Commit (INR)</p>
            <p className="font-mono-tabular text-2xl font-bold text-[#F5F5FA] mt-1">
              ₹{committedINR.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Recent Creator Pitches</h2>
              <Link
                to="/brand/applications"
                className="text-xs font-semibold text-[#00D5FF] hover:underline"
              >
                Open Kanban Board →
              </Link>
            </div>
            {applications.length === 0 ? (
              <p className="text-xs text-[#9295A9]">
                No creator pitches yet. Launch a campaign or invite creators directly!
              </p>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="rounded-xl bg-[#0B0D18] border border-white/6 p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-[#F5F5FA]">
                        {app.creatorName} ({app.creatorHandle}) ·{' '}
                        <span className="font-mono-tabular text-[#34D399]">
                          {app.matchScore}% Match
                        </span>
                      </p>
                      <p className="text-[#9295A9]">{app.campaignTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-tabular font-bold text-[#F5F5FA]">
                        ₹{app.proposedRateINR.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[#00D5FF]">{app.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00D5FF]" />
                Gemini Partnership Intelligence
              </h2>
              <button
                type="button"
                disabled={loadingInsights}
                onClick={handleLoadInsights}
                className="px-3 py-1.5 rounded-lg bg-[#171B2C] hover:bg-[#246BFD] text-xs font-semibold cursor-pointer"
              >
                {loadingInsights ? 'Analyzing…' : 'Generate Insights'}
              </button>
            </div>
            {aiInsights ? (
              <div className="space-y-3 text-xs">
                <p className="font-semibold text-[#F5F5FA]">{aiInsights.headline}</p>
                <ul className="space-y-2 text-[#9295A9]">
                  {aiInsights.insights.map((ins, i) => (
                    <li key={i}>• {ins}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-[#9295A9] leading-relaxed">
                Synthesize applicant pricing benchmarks, language conversion patterns, and
                shortlist velocity across your active Indian creator campaigns.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 2. BRAND CAMPAIGNS + GEMINI AI CAMPAIGN BUILDER
// ==========================================
export const BrandCampaignsPage: React.FC = () => {
  const { showToast } = useApp();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showBuilder, setShowBuilder] = useState(
    window.location.search.includes('create=1')
  );
  const [aiPrompt, setAiPrompt] = useState(
    'We are launching a clean electrolyte fitness drink and want Indian college creators who produce lifestyle and fitness content. Our budget per creator is ₹30,000. We want Instagram Reels.'
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [draft, setDraft] = useState({
    title: '',
    industry: 'Fitness',
    description: '',
    objective: 'Product Launch & Trial Conversions',
    targetAudience: 'Indian Gen-Z & Millennial consumers aged 18–28',
    niches: ['Fitness', 'Lifestyle'],
    platforms: ['Instagram'],
    deliverablesText: '1x Instagram Reel (45–60s), 2x Story Frames with Link',
    budgetMinINR: 20000,
    budgetMaxINR: 32000,
    startDate: '2026-11-12',
    endDate: '2026-12-15',
    applicationDeadline: '2026-11-26',
    requiredLanguages: ['English', 'Hindi'],
    location: 'Pan-India',
    contentGuidelines: 'Open with a real workout or morning routine hook in the first 3 seconds.',
    dosText: 'Show real product usage, Include #ad disclosure',
    dontsText: 'Avoid stock footage, No medical claims',
    creatorsRequired: 4,
  });

  useEffect(() => {
    api.getBrandCampaigns().then((res) => setCampaigns(res.campaigns));
  }, []);

  const handleRunAiAssistant = async () => {
    setAiLoading(true);
    try {
      const res = await api.runCampaignAssistant(aiPrompt);
      setDraft({
        ...draft,
        title: res.title,
        industry: res.industry,
        description: res.description,
        objective: res.objective,
        targetAudience: res.targetAudience,
        niches: res.niches,
        platforms: res.platforms,
        deliverablesText: res.deliverables.join(', '),
        budgetMinINR: res.budgetMinINR,
        budgetMaxINR: res.budgetMaxINR,
        requiredLanguages: res.requiredLanguages,
        location: res.location,
        contentGuidelines: res.contentGuidelines,
        dosText: res.dos.join(', '),
        dontsText: res.donts.join(', '),
        creatorsRequired: res.creatorsRequired,
      });
      showToast('Campaign structured by AI — review & edit any field below!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleImproveBrief = async () => {
    setPolishing(true);
    try {
      const res = await api.improveBrief({
        title: draft.title,
        description: draft.description,
        contentGuidelines: draft.contentGuidelines,
        deliverables: draft.deliverablesText.split(',').map((s) => s.trim()),
      });
      setDraft({
        ...draft,
        description: res.improvedDescription,
        contentGuidelines: res.improvedGuidelines,
        dosText: res.suggestedDos.join(', '),
        dontsText: res.suggestedDonts.join(', '),
      });
      showToast('Brief polished for higher creator conversion!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPolishing(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      const res = await api.createCampaign({
        title: draft.title,
        industry: draft.industry,
        description: draft.description,
        objective: draft.objective,
        targetAudience: draft.targetAudience,
        niches: draft.niches,
        platforms: draft.platforms,
        deliverables: draft.deliverablesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        budgetMinINR: Number(draft.budgetMinINR),
        budgetMaxINR: Number(draft.budgetMaxINR),
        startDate: draft.startDate,
        endDate: draft.endDate,
        applicationDeadline: draft.applicationDeadline,
        requiredLanguages: draft.requiredLanguages,
        location: draft.location,
        contentGuidelines: draft.contentGuidelines,
        dos: draft.dosText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        donts: draft.dontsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        creatorsRequired: Number(draft.creatorsRequired),
      });
      setCampaigns((prev) => [res.campaign, ...prev]);
      setShowBuilder(false);
      showToast('Campaign published live to the marketplace!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <DashboardLayout
      title="Brand Campaigns"
      subtitle="Create structured INR briefs with Gemini AI and manage active creator campaigns."
      actions={
        <button
          type="button"
          onClick={() => setShowBuilder((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {showBuilder ? 'Close Builder' : 'Launch Campaign'}
        </button>
      }
    >
      <div className="space-y-8">
        {showBuilder && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/15 p-6 space-y-6">
              {/* Gemini Natural Language Assistant */}
              <div className="rounded-xl bg-[#0B0D18] border border-[#00D5FF]/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#00D5FF] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Campaign Assistant (Natural Language → Structured Brief)
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleRunAiAssistant}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {aiLoading ? 'Structuring with Gemini…' : 'Generate Structured Fields'}
                  </button>
                  <button
                    type="button"
                    disabled={polishing}
                    onClick={handleImproveBrief}
                    className="px-3.5 py-2 rounded-lg border border-white/15 text-xs font-semibold text-[#9C65FF] cursor-pointer"
                  >
                    {polishing ? 'Polishing…' : 'Polish Guidelines with AI'}
                  </button>
                </div>
              </div>

              <form onSubmit={handlePublish} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[#9295A9]">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Monsoon Clean Skincare 10-Day Diary"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm text-[#F5F5FA]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#9295A9]">Campaign Description</label>
                  <textarea
                    rows={3}
                    required
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#9295A9]">Min Budget (₹ INR)</label>
                    <input
                      type="number"
                      value={draft.budgetMinINR}
                      onChange={(e) =>
                        setDraft({ ...draft, budgetMinINR: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 font-mono-tabular"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#9295A9]">Max Budget (₹ INR)</label>
                    <input
                      type="number"
                      value={draft.budgetMaxINR}
                      onChange={(e) =>
                        setDraft({ ...draft, budgetMaxINR: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 font-mono-tabular"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#9295A9]">Creators Needed</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.creatorsRequired}
                      onChange={(e) =>
                        setDraft({ ...draft, creatorsRequired: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#9295A9]">Deliverables (comma-separated)</label>
                    <input
                      type="text"
                      value={draft.deliverablesText}
                      onChange={(e) =>
                        setDraft({ ...draft, deliverablesText: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[#9295A9]">Target Location</label>
                    <input
                      type="text"
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#9295A9]">Content Guidelines</label>
                  <textarea
                    rows={2}
                    value={draft.contentGuidelines}
                    onChange={(e) =>
                      setDraft({ ...draft, contentGuidelines: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12"
                  />
                </div>

                <button
                  type="submit"
                  disabled={publishing}
                  className="px-6 py-3 rounded-lg bg-[#34D399] text-[#050509] font-display text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {publishing ? 'Publishing…' : 'Approve & Publish Campaign'}
                </button>
              </form>
            </div>

            {/* Live Campaign Card Preview */}
            <div className="lg:col-span-5 rounded-2xl bg-[#0B0D18] border border-white/10 p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#00D5FF]">
                Live Marketplace Card Preview
              </p>
              <h3 className="font-display text-xl font-bold text-[#F5F5FA]">
                {draft.title || 'Untitled Campaign'}
              </h3>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                {draft.description || 'Your campaign description will appear here.'}
              </p>
              <div className="py-3 border-y border-white/8 flex justify-between text-xs">
                <span className="text-[#9295A9]">{draft.niches.join(' · ')}</span>
                <span className="font-mono-tabular font-bold text-[#34D399]">
                  ₹{draft.budgetMinINR.toLocaleString('en-IN')} – ₹
                  {draft.budgetMaxINR.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-[#9295A9]">
                Deliverables: <span className="text-[#F5F5FA]">{draft.deliverablesText}</span>
              </p>
            </div>
          </div>
        )}

        {/* Existing Brand Campaigns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#00D5FF]">
                    {c.status} · {c.niches.join(' · ')}
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#F5F5FA] mt-0.5">
                    {c.title}
                  </h2>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-[#F5F5FA]">
                  ₹{c.budgetMinINR.toLocaleString('en-IN')}–₹
                  {c.budgetMaxINR.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-[#9295A9] line-clamp-2">{c.description}</p>
              <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs">
                <span className="text-[#9295A9]">
                  {c.applicantCount} creator applications · {c.creatorsRequired} spots
                </span>
                <Link
                  to="/brand/applications"
                  className="font-semibold text-[#00D5FF] hover:underline"
                >
                  Review Applicants →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ==========================================
// 3. CREATOR DISCOVERY, COMPARISON & SHORTLISTS
// ==========================================
export const BrandDiscoverCreatorsPage: React.FC<{ shortlistedOnly?: boolean }> = ({
  shortlistedOnly,
}) => {
  const { showToast } = useApp();
  const [ranked, setRanked] = useState<
    { creator: CreatorProfile; match: MatchResult | null }[]
  >([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<CreatorCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState('All');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [inviteTarget, setInviteTarget] = useState<CreatorProfile | null>(null);
  const [inviteNote, setInviteNote] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');

  const loadDiscovery = useCallback(async (campId?: string) => {
    setLoading(true);
    try {
      const [discRes, campRes] = await Promise.all([
        api.discoverCreators(campId),
        api.getBrandCampaigns(),
      ]);
      setRanked(discRes.ranked);
      setShortlistedIds(discRes.shortlistedIds);
      setCollections(discRes.collections);
      setCampaigns(campRes.campaigns);
      if (!campId && discRes.referenceCampaign) {
        setSelectedCampaignId(discRes.referenceCampaign.id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  const handleToggleShortlist = async (creatorId: string) => {
    const res = await api.toggleShortlistCreator(creatorId);
    setShortlistedIds(res.shortlistedIds);
    showToast(
      res.shortlistedIds.includes(creatorId)
        ? 'Creator added to shortlist'
        : 'Removed from shortlist',
      'info'
    );
  };

  const toggleCompare = (creatorId: string) => {
    if (compareIds.includes(creatorId)) {
      setCompareIds(compareIds.filter((id) => id !== creatorId));
    } else if (compareIds.length < 2) {
      setCompareIds([...compareIds, creatorId]);
    } else {
      setCompareIds([compareIds[1], creatorId]);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTarget) return;
    try {
      await api.inviteCreator({
        creatorId: inviteTarget.id,
        campaignId: selectedCampaignId || undefined,
        note: inviteNote,
      });
      setInviteTarget(null);
      setInviteNote('');
      showToast(`Direct invitation sent to ${inviteTarget.fullName}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const res = await api.createCreatorCollection(
      newCollectionName.trim(),
      shortlistedIds[0]
    );
    setCollections([res.collection, ...collections]);
    setNewCollectionName('');
    showToast('Talent collection created', 'success');
  };

  const visible = ranked
    .filter(({ creator }) => !shortlistedOnly || shortlistedIds.includes(creator.id))
    .filter(({ creator }) => {
      if (nicheFilter !== 'All' && !creator.niches.includes(nicheFilter)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          creator.fullName.toLowerCase().includes(q) ||
          creator.city.toLowerCase().includes(q) ||
          creator.handle.toLowerCase().includes(q)
        );
      }
      return true;
    });

  const comparedItems = ranked.filter(({ creator }) => compareIds.includes(creator.id));

  return (
    <DashboardLayout
      title={shortlistedOnly ? 'Shortlisted Creators & Collections' : 'Discover Creators'}
      subtitle="AI-ranked 10K–50K Indian creators with transparent match explanations and rate cards."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="rounded-xl bg-[#101426] border border-white/8 p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9295A9] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creator name, handle, or Indian city..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#050509] border border-white/10 text-xs text-[#F5F5FA]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {campaigns.length > 0 && (
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  loadDiscovery(e.target.value);
                }}
                className="px-3 py-2 rounded-lg bg-[#171B2C] border border-white/12 text-xs text-[#F5F5FA]"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    Match vs: {c.title.slice(0, 34)}…
                  </option>
                ))}
              </select>
            )}

            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
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
          </div>
        </div>

        {/* Private Talent Collections bar on Shortlisted page */}
        {shortlistedOnly && (
          <div className="rounded-xl bg-[#101426] border border-white/8 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#00D5FF]">
                Private Talent Collections ({collections.length})
              </p>
              <p className="text-xs text-[#9295A9]">
                {collections.map((c) => c.name).join(' · ') || 'No custom rosters yet.'}
              </p>
            </div>
            <form onSubmit={handleCreateCollection} className="flex gap-2">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="New roster name..."
                className="px-3 py-1.5 rounded-lg bg-[#050509] border border-white/12 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#246BFD] text-xs font-semibold cursor-pointer"
              >
                Create Roster
              </button>
            </form>
          </div>
        )}

        {/* Side-by-Side Comparison Panel when 2 Creators Selected */}
        {comparedItems.length === 2 && (
          <div className="rounded-2xl bg-[#171B2C] border border-[#00D5FF] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold flex items-center gap-2 text-[#00D5FF]">
                <Columns className="w-4 h-4" />
                Side-by-Side Creator Comparison
              </h2>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs text-[#9295A9] hover:text-[#F5F5FA] cursor-pointer"
              >
                Clear Comparison ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {comparedItems.map(({ creator, match }) => (
                <div
                  key={creator.id}
                  className="rounded-xl bg-[#0B0D18] border border-white/10 p-5 space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-display text-base font-bold text-[#F5F5FA]">
                      {creator.fullName}
                    </h3>
                    <span className="font-mono-tabular text-base font-bold text-[#34D399]">
                      {match?.overallScore || 85}% Match
                    </span>
                  </div>
                  <p className="text-[#9295A9]">
                    {creator.city} · {creator.languages.join('/')} ·{' '}
                    {creator.niches.join(', ')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/8">
                    <div>
                      <p className="text-[#9295A9]">Followers</p>
                      <p className="font-mono-tabular font-bold text-[#F5F5FA]">
                        {creator.totalFollowers.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9295A9]">Engagement</p>
                      <p className="font-mono-tabular font-bold text-[#34D399]">
                        {creator.engagementRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[#9295A9]">Reel Rate</p>
                      <p className="font-mono-tabular font-bold text-[#F5F5FA]">
                        ₹{creator.rateCard.instagramReel.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-[#101426] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(({ creator, match }) => {
              const isShort = shortlistedIds.includes(creator.id);
              const isCompared = compareIds.includes(creator.id);
              return (
                <div
                  key={creator.id}
                  className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#246BFD]/60 transition-colors p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-display text-xs font-bold text-[#F5F5FA] shrink-0"
                          style={{ background: creator.avatarStyle }}
                        >
                          {creator.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/creators/${creator.id}`}
                              className="font-display text-sm font-bold text-[#F5F5FA] hover:text-[#00D5FF]"
                            >
                              {creator.fullName}
                            </Link>
                            {creator.verificationStatus === 'verified' && (
                              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#9295A9]">
                            {creator.city} · {(creator.totalFollowers / 1000).toFixed(1)}K ·{' '}
                            {creator.engagementRate}% eng.
                          </p>
                        </div>
                      </div>

                      {match && (
                        <span className="font-mono-tabular text-sm font-bold text-[#34D399]">
                          {match.overallScore}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#9295A9] line-clamp-2">{creator.bio}</p>

                    {match && match.reasons[0] && (
                      <p className="text-[11px] text-[#00D5FF] line-clamp-2">
                        Why: {match.reasons[0]}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/8 space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9295A9]">{creator.niches.join(' · ')}</span>
                      <span className="font-mono-tabular font-bold text-[#F5F5FA]">
                        ₹{creator.rateCard.instagramReel.toLocaleString('en-IN')} / Reel
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setInviteTarget(creator)}
                        className="flex-1 py-2 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] font-semibold text-[#F5F5FA] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Invite
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCompare(creator.id)}
                        className={`px-3 py-2 rounded-lg border font-medium cursor-pointer ${
                          isCompared
                            ? 'bg-[#00D5FF]/20 border-[#00D5FF] text-[#00D5FF]'
                            : 'border-white/12 text-[#9295A9]'
                        }`}
                      >
                        Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleShortlist(creator.id)}
                        aria-label="Shortlist creator"
                        className={`p-2 rounded-lg border cursor-pointer ${
                          isShort
                            ? 'border-[#F000B8] text-[#F000B8]'
                            : 'border-white/12 text-[#9295A9]'
                        }`}
                      >
                        <Bookmark
                          className="w-3.5 h-3.5"
                          fill={isShort ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Direct Invite Modal */}
      {inviteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setInviteTarget(null)}
        >
          <form
            onSubmit={handleSendInvite}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full rounded-2xl bg-[#101426] border border-white/15 p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold">
              Invite {inviteTarget.fullName}
            </h3>
            <p className="text-xs text-[#9295A9]">
              Sends a direct message and notification inviting {inviteTarget.handle} to
              pitch your selected campaign.
            </p>
            <textarea
              rows={3}
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              placeholder={`Hi ${inviteTarget.fullName}, we loved your ${inviteTarget.niches[0]} reels and would love for you to pitch our launch!`}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-xs text-[#F5F5FA]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteTarget(null)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#246BFD] text-xs font-semibold text-[#F5F5FA] cursor-pointer"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

// ==========================================
// 4. BRAND APPLICATIONS KANBAN BOARD
// ==========================================
const KANBAN_COLUMNS: { label: string; statuses: ApplicationStatus[] }[] = [
  { label: 'New / Viewed', statuses: ['Submitted', 'Viewed'] },
  { label: 'Shortlisted', statuses: ['Shortlisted'] },
  { label: 'Discussion', statuses: ['Discussion'] },
  { label: 'Accepted / Closed', statuses: ['Accepted', 'Rejected'] },
];

export const BrandApplicationsKanbanPage: React.FC = () => {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    api.getApplications().then((res) => setApplications(res.applications));
  }, []);

  const handleMoveStatus = async (app: Application, status: ApplicationStatus) => {
    try {
      const res = await api.updateApplicationStatus(app.id, {
        status,
        brandInternalNotes: selectedApp?.id === app.id ? notesDraft : app.brandInternalNotes,
        createDealNow: status === 'Accepted',
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? res.application : a))
      );
      if (selectedApp?.id === app.id) setSelectedApp(res.application);
      if (res.deal) {
        showToast('Creator accepted! Shared Deal Room initialized.', 'success');
        navigate(`/brand/deals/${res.deal.id}`);
      } else {
        showToast(`Application moved to ${status}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout
      title="Applications Kanban"
      subtitle="Review creator pitches, save internal team notes, and spin up Deal Rooms."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const items = applications.filter((a) => col.statuses.includes(a.status));
          return (
            <div
              key={col.label}
              className="rounded-xl bg-[#0B0D18] border border-white/8 p-4 space-y-3 min-h-[420px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/8">
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F5FA]">
                  {col.label}
                </h2>
                <span className="font-mono-tabular text-xs text-[#00D5FF]">
                  {items.length}
                </span>
              </div>

              {items.map((app) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedApp(app);
                    setNotesDraft(app.brandInternalNotes || '');
                  }}
                  className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#246BFD] p-4 space-y-2.5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F5F5FA]">{app.creatorName}</span>
                    <span className="font-mono-tabular font-bold text-[#34D399]">
                      {app.matchScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#00D5FF] line-clamp-1">
                    {app.campaignTitle}
                  </p>
                  <p className="text-xs text-[#9295A9] line-clamp-2">{app.pitch}</p>
                  <div className="pt-2 border-t border-white/6 flex items-center justify-between text-xs">
                    <span className="font-mono-tabular font-semibold text-[#F5F5FA]">
                      ₹{app.proposedRateINR.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#9295A9]">{app.status}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Application Review Drawer Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedApp(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-xl w-full rounded-2xl bg-[#101426] border border-white/15 p-6 space-y-5 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <Link
                  to={`/creators/${selectedApp.creatorId}`}
                  className="text-xs font-semibold text-[#00D5FF] hover:underline"
                >
                  Inspect Full Creator Portfolio ({selectedApp.creatorHandle}) →
                </Link>
                <h3 className="font-display text-xl font-bold text-[#F5F5FA] mt-1">
                  {selectedApp.creatorName} · ₹
                  {selectedApp.proposedRateINR.toLocaleString('en-IN')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-xs text-[#9295A9] cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="rounded-xl bg-[#0B0D18] p-4 text-xs text-[#F5F5FA] whitespace-pre-line leading-relaxed">
              {selectedApp.pitch}
            </div>

            {selectedApp.questionAnswers.length > 0 && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-[#9295A9]">Screening Answers</p>
                {selectedApp.questionAnswers.map((qa, i) => (
                  <div key={i} className="rounded-lg bg-[#0B0D18] p-3 space-y-1">
                    <p className="text-[#9295A9]">{qa.question}</p>
                    <p className="text-[#F5F5FA]">{qa.answer}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="text-[#9295A9]">Internal Brand Team Notes</label>
              <textarea
                rows={2}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Private team notes..."
                className="w-full px-3 py-2 rounded-lg bg-[#050509] border border-white/12 text-[#F5F5FA]"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/8">
              {(
                ['Shortlisted', 'Discussion', 'Accepted', 'Rejected'] as ApplicationStatus[]
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleMoveStatus(selectedApp, st)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    st === 'Accepted'
                      ? 'bg-[#34D399] text-[#050509] font-bold'
                      : st === 'Rejected'
                      ? 'border border-[#EF4444]/50 text-[#EF4444]'
                      : 'bg-[#171B2C] hover:bg-[#246BFD] text-[#F5F5FA]'
                  }`}
                >
                  {st === 'Accepted' ? 'Accept & Create Deal Room' : `Mark ${st}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// ==========================================
// 5. BRAND ANALYTICS & BILLING PAGES
// ==========================================
export const BrandAnalyticsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    Promise.all([api.getBrandCampaigns(), api.getApplications()]).then(([c, a]) => {
      setCampaigns(c.campaigns);
      setApplications(a.applications);
    });
  }, []);

  const chartData = campaigns.map((c) => ({
    name: c.title.slice(0, 18),
    applicants: c.applicantCount,
    maxBudgetK: Math.round(c.budgetMaxINR / 1000),
  }));

  return (
    <DashboardLayout
      title="Brand Analytics"
      subtitle="Applicant funnel velocity and simulated campaign budget utilization."
    >
      <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
        <h2 className="font-display text-base font-bold">
          Applicants & Max Per-Creator Budget (₹ Thousands) Across Campaigns (
          {applications.length} Total Pitches)
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#9295A9" fontSize={11} />
              <YAxis stroke="#9295A9" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0D18',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="applicants" fill="#00D5FF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="maxBudgetK" fill="#246BFD" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const BrandBillingPage: React.FC = () => {
  const { user } = useApp();
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    api.getDeals().then((res) => setDeals(res.deals));
  }, []);

  return (
    <DashboardLayout
      title="Billing & Simulated Escrow Ledger"
      subtitle="Manage your Brand subscription tier and inspect Test Mode Deal Room escrow commitments."
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#00D5FF] uppercase font-semibold">
              Current Subscription Plan
            </p>
            <h2 className="font-display text-2xl font-bold mt-1">
              {user?.plan.replace('_', ' ').toUpperCase()}
            </h2>
            <p className="text-xs text-[#9295A9] mt-1">
              All subscriptions and Deal Room escrow flows run in clearly labelled Test Mode
              Simulation.
            </p>
          </div>
          <Link
            to="/brand/deals"
            className="px-5 py-2.5 rounded-lg bg-[#246BFD] hover:bg-[#1e5ce0] text-xs font-semibold text-[#F5F5FA] transition-colors"
          >
            Manage Active Deal Rooms →
          </Link>
        </div>

        <div className="rounded-2xl bg-[#101426] border border-white/10 p-6 space-y-4">
          <h3 className="font-display text-base font-bold">
            Simulated Deal Escrow Ledger (INR)
          </h3>
          {deals.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/8 text-xs"
            >
              <div>
                <p className="font-semibold text-[#F5F5FA]">{d.campaignTitle}</p>
                <p className="text-[#9295A9]">Creator: {d.creatorName}</p>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular font-bold text-[#F5F5FA]">
                  ₹{d.agreedAmountINR.toLocaleString('en-IN')}
                </p>
                <p className="text-[#00D5FF]">{d.paymentStatus} (Simulated)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Lock,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { BridgeHeroScene } from '../../components/three/BridgeHeroScene';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import type { Campaign } from '../../types/domain';

const INTERACTIVE_MATCH_SAMPLES = [
  {
    creator: 'Aarav Mehta · @aarav.builds',
    city: 'Bengaluru · 39.0K Followers · 6.4% Eng.',
    campaign: 'Aether One ANC Earbuds — Deep Work Series',
    brand: 'Aether Audio Labs',
    budget: '₹22,000 – ₹40,000',
    recommendedRate: '₹28,000',
    overall: 95,
    niche: 98,
    audience: 94,
    engagement: 93,
    budgetFit: 96,
    platform: 100,
    angle:
      'Dual-laptop Indiranagar cafe live mic & ANC switch test during an engineering sprint.',
  },
  {
    creator: 'Riya Kapoor · @riyakapoor.fit',
    city: 'Mumbai · 44.3K Followers · 7.1% Eng.',
    campaign: 'Zero-Sugar Campus Run & Gym Hydration Launch',
    brand: 'Prana Hydration',
    budget: '₹20,000 – ₹35,000',
    recommendedRate: '₹30,000',
    overall: 97,
    niche: 98,
    audience: 96,
    engagement: 97,
    budgetFit: 96,
    platform: 100,
    angle:
      '6AM Marine Drive 10K humid tempo run showing sachet pour in the opening 3 seconds.',
  },
  {
    creator: 'Meera Nair · @meeraskinjournal',
    city: 'Kochi · 27.6K Followers · 6.8% Eng.',
    campaign: 'Barrier Cloud Niacinamide Gel — Texture Diary',
    brand: 'Kaveri Botanicals',
    budget: '₹16,000 – ₹28,000',
    recommendedRate: '₹20,500',
    overall: 93,
    niche: 98,
    audience: 90,
    engagement: 95,
    budgetFit: 94,
    platform: 100,
    angle:
      'Zero-filter natural morning window skin check-in testing gel absorption under SPF.',
  },
];

const LANDING_FAQS = [
  {
    q: 'Why does Bridge focus specifically on 10K–50K emerging creators?',
    a: 'Creators between 10,000 and 50,000 followers maintain intimate, high-trust communities with 5%–8% engagement rates—yet often miss structured brand deals because discovery tools index on raw follower volume.',
  },
  {
    q: 'How are Bridge AI Match scores calculated?',
    a: 'Every match uses a deterministic, transparent weighted formula: Niche Relevance (30%), Audience Alignment (25%), Engagement Quality (20%), Budget Compatibility (15%), and Platform Compatibility (10%). AI never auto-rejects an applicant.',
  },
  {
    q: 'How do Deal Rooms and payments work right now?',
    a: 'Accepted applications open a dedicated Deal Room with structured deliverables, revision history, shared files, and a clearly labelled Test Mode Simulated Escrow ledger (Unfunded → Funded → In Review → Released) in INR (₹).',
  },
  {
    q: 'Are self-reported creator metrics distinguished from verified insights?',
    a: 'Yes. Unverified creator profiles explicitly state when follower and engagement figures are self-reported. Creators and brands earn a green Verified badge only after admin review of submitted documentation.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { demoLogin } = useApp();
  const [stats, setStats] = useState({
    creatorsCount: 16,
    brandsCount: 8,
    activeCampaignsCount: 12,
    completedDealsCount: 2,
    totalOpportunityPoolINR: 432000,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [heroScroll, setHeroScroll] = useState(0);
  const [assemblySlider, setAssemblySlider] = useState(0.78);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState(0);
  const [journeyTab, setJourneyTab] = useState<'creator' | 'brand'>('creator');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPublicStats()
      .then((res) => setStats(res))
      .catch(() => {});
    api
      .getPublicCampaigns()
      .then((res) => setCampaigns(res.campaigns.slice(0, 6)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(1, window.scrollY / Math.max(600, window.innerHeight));
      setHeroScroll(progress);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleQuickDemo = async (role: 'creator' | 'brand' | 'admin') => {
    setDemoLoadingRole(role);
    try {
      await demoLogin(role);
      navigate(role === 'admin' ? '/admin' : role === 'brand' ? '/brand' : '/creator');
    } finally {
      setDemoLoadingRole(null);
    }
  };

  const sample = INTERACTIVE_MATCH_SAMPLES[selectedSampleIdx];

  return (
    <PublicLayout>
      {/* =========================================================
          HERO — IMMERSIVE 3D LIQUID CHROME SUSPENSION BRIDGE
      ========================================================= */}
      <section className="relative min-h-[94vh] w-full flex flex-col justify-between overflow-hidden pt-20 pb-10 border-b border-white/8">
        {/* 3D WebGL Sculpture Layer */}
        <div className="absolute inset-0 z-0">
          <BridgeHeroScene variant="hero" scrollProgress={heroScroll} />
          {/* Measured editorial gradient scrims for crisp WCAG AA contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#050509]/70 via-transparent to-[#050509]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#050509]/85 via-[#050509]/25 to-[#050509]/75"
          />
        </div>

        {/* Top Asymmetric Editorial Framing */}
        <div className="relative z-10 max-w-[1380px] w-full mx-auto px-6 pt-8 md:pt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            {/* Live Indicator Pill & Emerging Creator Tier */}
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101426] border border-white/12 text-[11px] text-[#00D5FF]">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
                <span className="font-semibold text-[#F5F5FA]">LIVE DISCOVERY ENGINE</span>
              </span>
              <p className="text-xs font-medium tracking-[0.22em] uppercase text-[#00D5FF]">
                India’s Emerging Creator Marketplace · 10K–50K Tier
              </p>
            </div>

            <h1
              style={{ textWrap: 'balance' }}
              className="font-display font-extrabold tracking-[-0.035em] leading-[0.98] text-[clamp(2.5rem,5.6vw,5.1rem)] text-[#F5F5FA]"
            >
              CREATORS MEET{' '}
              <span className="font-editorial italic font-normal chrome-gradient-text animate-pulse-glow inline-block">
                OPPORTUNITY.
              </span>
            </h1>

            <p className="font-display text-sm sm:text-base font-semibold tracking-[0.16em] uppercase text-[#F5F5FA]/90">
              THE FUTURE OF BRAND COLLABORATIONS.
            </p>

            <p className="text-base sm:text-lg text-[#9295A9] max-w-xl leading-relaxed">
              An intelligent marketplace connecting emerging creators with brands that
              believe in their influence.
            </p>

            {/* Primary & Secondary CTAs inspired by Choreo Class & Human Next circular directional motif */}
            <div className="pt-2 flex flex-wrap items-center gap-5">
              <Link
                to="/explore"
                className="group inline-flex items-center gap-4 pr-6 pl-2 py-2 rounded-full bg-[#246BFD] hover:bg-[#1e5ce0] text-[#F5F5FA] transition-all duration-200 hover:shadow-[0_0_24px_rgba(36,107,253,0.5)] active:scale-[0.99]"
              >
                <span className="w-10 h-10 rounded-full bg-[#050509]/40 border border-white/25 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowRight className="w-4 h-4 text-[#00D5FF]" />
                </span>
                <span className="font-display text-xs font-bold tracking-[0.16em] uppercase whitespace-nowrap">
                  EXPLORE BRIDGE
                </span>
              </Link>

              <Link
                to="/signup?role=creator"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full border border-white/20 bg-[#0B0D18]/85 hover:border-[#F000B8]/70 hover:shadow-[0_0_20px_rgba(240,0,184,0.35)] text-xs font-display font-semibold tracking-[0.15em] uppercase text-[#F5F5FA] whitespace-nowrap transition-all duration-150"
              >
                I’M A CREATOR
                <ArrowUpRight className="w-4 h-4 text-[#F000B8]" />
              </Link>
            </div>
          </div>

          {/* Right Asymmetric Bank Readout with Interactive Glass Glow */}
          <div className="lg:col-span-4 lg:justify-self-end self-end w-full max-w-sm rounded-xl bg-[#0B0D18]/90 border border-white/10 p-5 space-y-4 interactive-glow-card backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-[#9295A9]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                Live Marketplace Index
              </span>
              <span className="font-mono-tabular text-[#00D5FF]">Demo + Live DB</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/8">
              <div>
                <p className="font-mono-tabular text-2xl font-semibold text-[#F5F5FA]">
                  {stats.activeCampaignsCount}
                </p>
                <p className="text-xs text-[#9295A9]">Active Campaigns</p>
              </div>
              <div>
                <p className="font-mono-tabular text-2xl font-semibold text-[#F5F5FA]">
                  ₹{(stats.totalOpportunityPoolINR / 100000).toFixed(1)}L+
                </p>
                <p className="text-xs text-[#9295A9]">Campaign Pool (INR)</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/8 space-y-2">
              <p className="text-[11px] text-[#9295A9]">
                Instant Demo Workspace Access (Seeded Indian Data):
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['creator', 'brand', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={demoLoadingRole !== null}
                    onClick={() => handleQuickDemo(r)}
                    className="px-2.5 py-1.5 rounded-md bg-[#171B2C] hover:bg-[#246BFD] hover:shadow-[0_0_12px_rgba(36,107,253,0.4)] text-xs font-medium text-[#F5F5FA] capitalize transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {demoLoadingRole === r ? 'Opening…' : `Demo ${r}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bank Coordinate Labels */}
        <div className="relative z-10 max-w-[1380px] w-full mx-auto px-6 pt-10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#9295A9]">
          <div className="flex items-center gap-3">
            <span className="text-[#F000B8] font-semibold">WEST ANCHOR · CREATORS</span>
            <span aria-hidden="true">·</span>
            <span>{stats.creatorsCount} Seeded Portfolios</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{stats.brandsCount} Partner Brands</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#00D5FF] font-semibold">EAST ANCHOR · BRANDS</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 1 — THE PROBLEM
      ========================================================= */}
      <section className="py-24 lg:py-32 bg-[#050509] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F000B8]">
              01. The Disconnect
            </p>
            <h2
              style={{ textWrap: 'balance' }}
              className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#F5F5FA] leading-[1.06]"
            >
              YOUR FOLLOWING ISN’T{' '}
              <span className="font-editorial italic font-normal text-[#9C65FF]">
                YOUR VALUE.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-[#9295A9] leading-relaxed max-w-2xl">
              Across India, creators with 10,000 to 50,000 followers answer every DM,
              spark genuine product purchases, and shape niche culture—yet get filtered out
              by legacy influencer spreadsheets built around vanity million-view metrics.
              Meanwhile, D2C brands burn budgets on cold outreach and mismatched rosters.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-2">
              <p className="font-mono-tabular text-3xl font-bold text-[#00D5FF]">6.4%</p>
              <p className="text-sm font-semibold text-[#F5F5FA]">
                Micro-Tier Community Depth
              </p>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                Average engagement across Bridge’s demo 10K–50K creator cohort versus
                1.4% on saturated mega-accounts.
              </p>
            </div>
            <div className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-2">
              <p className="font-mono-tabular text-3xl font-bold text-[#F000B8]">100%</p>
              <p className="text-sm font-semibold text-[#F5F5FA]">
                Transparent INR Briefs
              </p>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                Every campaign states exact deliverables, budget bands in ₹, timelines,
                and eligibility upfront—zero unpaid "exposure" barter traps.
              </p>
            </div>
            <div className="sm:col-span-2 rounded-xl bg-[#101426] border border-white/8 p-6 space-y-2">
              <p className="font-editorial italic text-xl text-[#F5F5FA]">
                “Your influence isn’t defined by your follower count. It’s defined by the
                connection you create.”
              </p>
              <p className="text-xs text-[#9295A9]">Bridge Founding Thesis</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2 — THE BRIDGE (INTERACTIVE 3D ASSEMBLY)
      ========================================================= */}
      <section className="py-24 bg-[#0B0D18] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
                02. The Architecture of Connection
              </p>
              <h2
                style={{ textWrap: 'balance' }}
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5FA]"
              >
                Where creative voice meets structured deal execution.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {[
                  { label: 'Relaxed', val: 0.45 },
                  { label: 'Optimal', val: 0.78 },
                  { label: 'Full Span', val: 1.0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setAssemblySlider(preset.val)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      Math.abs(assemblySlider - preset.val) < 0.05
                        ? 'bg-[#00D5FF] text-[#050509] font-bold'
                        : 'bg-[#171B2C] text-[#9295A9] hover:text-[#F5F5FA]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 bg-[#101426] border border-white/10 rounded-lg px-4 py-2">
                <Sliders className="w-4 h-4 text-[#00D5FF] shrink-0" />
                <label
                  htmlFor="bridge-span-tension"
                  className="text-xs text-[#9295A9] whitespace-nowrap"
                >
                  Span Tension
                </label>
                <input
                  id="bridge-span-tension"
                  type="range"
                  min={0.35}
                  max={1}
                  step={0.01}
                  value={assemblySlider}
                  onChange={(e) => setAssemblySlider(Number(e.target.value))}
                  className="w-28 accent-[#00D5FF] cursor-pointer"
                />
                <span className="font-mono-tabular text-xs text-[#F5F5FA] w-9 text-right font-bold text-[#00D5FF]">
                  {Math.round(assemblySlider * 100)}%
                </span>
              </div>
            </div>
          </div>

          <div className="relative h-[380px] sm:h-[440px] rounded-2xl overflow-hidden bg-[#050509] border border-white/10">
            <BridgeHeroScene variant="assembly" scrollProgress={assemblySlider} />
            <div className="absolute bottom-4 inset-x-4 flex flex-wrap items-center justify-between gap-4 px-5 py-3 rounded-xl bg-[#0B0D18]/90 border border-white/10 text-xs">
              <div>
                <span className="font-semibold text-[#F000B8]">Creator Profiles</span>
                <span className="text-[#9295A9]"> · Verified portfolios, rate cards & niches</span>
              </div>
              <div>
                <span className="font-semibold text-[#9C65FF]">Deterministic AI Match</span>
                <span className="text-[#9295A9]"> · Weighted 5-axis scoring</span>
              </div>
              <div>
                <span className="font-semibold text-[#00D5FF]">Deal Room</span>
                <span className="text-[#9295A9]"> · Revisions, approvals & simulated escrow</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3 — INTELLIGENCE (LIVE MATCHING SIMULATOR)
      ========================================================= */}
      <section className="py-24 lg:py-28 bg-[#050509] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#246BFD]">
              03. Transparent Intelligence
            </p>
            <h2
              style={{ textWrap: 'balance' }}
              className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5FA]"
            >
              Deterministic matching—never a black-box guess.
            </h2>
            <p className="text-sm sm:text-base text-[#9295A9] leading-relaxed">
              Inspect how Bridge evaluates every creator-campaign pair across five
              weighted dimensions, suggests a fair INR rate, and drafts tailored content
              angles with Gemini.
            </p>

            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-[#9295A9]">
                Select a Demo Creator Profile to scan:
              </p>
              {INTERACTIVE_MATCH_SAMPLES.map((item, idx) => (
                <button
                  key={item.creator}
                  type="button"
                  onClick={() => setSelectedSampleIdx(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                    selectedSampleIdx === idx
                      ? 'bg-[#171B2C] border-[#246BFD]'
                      : 'bg-[#101426] border-white/8 hover:border-white/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#F5F5FA]">{item.creator}</p>
                  <p className="text-xs text-[#9295A9] mt-0.5">{item.city}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Match Readout Card */}
          <div className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-white/8">
              <div className="space-y-1">
                <p className="text-xs text-[#00D5FF] font-medium">
                  Matched Campaign · {sample.brand}
                </p>
                <h3 className="font-display text-xl font-bold text-[#F5F5FA]">
                  {sample.campaign}
                </h3>
                <p className="text-xs text-[#9295A9]">
                  Campaign Budget Band: <span className="font-mono-tabular text-[#F5F5FA]">{sample.budget}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono-tabular text-4xl font-bold text-[#34D399]">
                  {sample.overall}%
                </p>
                <p className="text-xs text-[#9295A9]">Weighted Match</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {[
                { label: 'Niche Compatibility (30% weight)', val: sample.niche, color: '#246BFD' },
                { label: 'Audience Alignment (25% weight)', val: sample.audience, color: '#00D5FF' },
                { label: 'Engagement Quality (20% weight)', val: sample.engagement, color: '#9C65FF' },
                { label: 'Budget Compatibility (15% weight)', val: sample.budgetFit, color: '#F000B8' },
                { label: 'Platform Compatibility (10% weight)', val: sample.platform, color: '#34D399' },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9295A9]">{row.label}</span>
                    <span className="font-mono-tabular font-semibold text-[#F5F5FA]">
                      {row.val}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#050509] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${row.val}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#9295A9]">Recommended Rate</p>
                <p className="font-mono-tabular text-lg font-bold text-[#F5F5FA] mt-0.5">
                  {sample.recommendedRate}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[#9295A9] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9C65FF]" />
                  Suggested Content Angle
                </p>
                <p className="text-xs text-[#F5F5FA] mt-1 leading-relaxed">
                  {sample.angle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4 — LIVE / DEMO CAMPAIGN OPPORTUNITIES
      ========================================================= */}
      <section className="py-24 bg-[#0B0D18] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
                04. Open Collaborations
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5FA]">
                Curated Indian brand briefs ready for pitches.
              </h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D5FF] hover:underline"
            >
              Browse all {stats.activeCampaignsCount} campaigns
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <article
                key={camp.id}
                className="rounded-xl bg-[#101426] border border-white/8 hover:border-[#246BFD]/60 transition-all duration-200 p-6 flex flex-col justify-between gap-6 interactive-glow-card group"
              >
                <div className="space-y-3">
                  {/* Unboxed clean metadata line */}
                  <div className="flex items-center gap-2 text-xs text-[#9295A9]">
                    <span className="font-semibold text-[#F5F5FA] group-hover:text-[#00D5FF] transition-colors">{camp.brandName}</span>
                    {camp.brandVerified && (
                      <ShieldCheck
                        className="w-3.5 h-3.5 text-[#34D399] shrink-0"
                        aria-label="Verified Brand"
                      />
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{camp.industry}</span>
                    {camp.isDemo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#00D5FF]">Demo</span>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-semibold text-[#F5F5FA] leading-snug group-hover:text-white transition-colors">
                    {camp.title}
                  </h3>

                  <p className="text-xs text-[#9295A9] line-clamp-2 leading-relaxed">
                    {camp.description}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/8">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#9295A9]">Per Creator</span>
                    <span className="font-mono-tabular text-sm font-bold text-[#F5F5FA] group-hover:text-[#34D399] transition-colors">
                      ₹{camp.budgetMinINR.toLocaleString('en-IN')} – ₹
                      {camp.budgetMaxINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#9295A9]">
                    <span>{camp.platforms.join(' / ')}</span>
                    <Link
                      to={`/explore?highlight=${camp.id}`}
                      className="font-semibold text-[#00D5FF] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                    >
                      Inspect Brief →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5 & 6 — HOW IT WORKS (INTERACTIVE ROLE TABS) & TRUST
      ========================================================= */}
      <section className="py-24 bg-[#050509] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#9C65FF]">
                05. Dual-Sided Workflow & Verification
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5FA]">
                From discovery to Deal Room sign-off.
              </h2>
            </div>

            {/* Interactive Segmented Tab Control */}
            <div className="inline-flex p-1 rounded-lg bg-[#101426] border border-white/10 self-start">
              <button
                type="button"
                onClick={() => setJourneyTab('creator')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  journeyTab === 'creator'
                    ? 'bg-[#246BFD] text-[#F5F5FA]'
                    : 'text-[#9295A9] hover:text-[#F5F5FA]'
                }`}
              >
                Creator Journey
              </button>
              <button
                type="button"
                onClick={() => setJourneyTab('brand')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  journeyTab === 'brand'
                    ? 'bg-[#246BFD] text-[#F5F5FA]'
                    : 'text-[#9295A9] hover:text-[#F5F5FA]'
                }`}
              >
                Brand Journey
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(journeyTab === 'creator'
              ? [
                  {
                    step: '01. Profile & Rate Card',
                    desc: 'Publish niches, languages, portfolio reels, and transparent INR rates.',
                  },
                  {
                    step: '02. AI Campaign Match',
                    desc: 'See exact compatibility breakdowns and why your audience fits.',
                  },
                  {
                    step: '03. Gemini Pitch Assist',
                    desc: 'Draft tailored hooks, attach case studies, and propose your rate.',
                  },
                  {
                    step: '04. Enter Deal Room',
                    desc: 'Upload cuts, track revision feedback, and message brands directly.',
                  },
                  {
                    step: '05. Approval & Reputation',
                    desc: 'Get deliverables approved, unlock simulated payout, and earn 5-star reviews.',
                  },
                ]
              : [
                  {
                    step: '01. AI Campaign Builder',
                    desc: 'Describe your launch in plain English; Gemini structures the full brief.',
                  },
                  {
                    step: '02. Ranked Discovery',
                    desc: 'Discover 10K–50K creators ranked by deterministic niche & audience fit.',
                  },
                  {
                    step: '03. Kanban Review',
                    desc: 'Compare creators side-by-side and move pitches from New to Shortlisted.',
                  },
                  {
                    step: '04. Simulated Escrow',
                    desc: 'Open a shared Deal Room with clear milestones and revision tracking.',
                  },
                  {
                    step: '05. Sign-Off & Insights',
                    desc: 'Approve final deliverables, release simulated funds, and build brand trust.',
                  },
                ]
            ).map((s) => (
              <div
                key={s.step}
                className="rounded-xl bg-[#101426] border border-white/8 p-5 space-y-2"
              >
                <h3 className="font-display text-sm font-bold text-[#F5F5FA]">{s.step}</h3>
                <p className="text-xs text-[#9295A9] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Trust Architecture Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="rounded-xl bg-[#0B0D18] border border-white/8 p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#34D399]">
                <ShieldCheck className="w-4 h-4" />
                Verified Identity & Insights
              </div>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                Admin-moderated GSTIN & creator 30-day analytics checks distinguish verified
                data from self-reported numbers.
              </p>
            </div>
            <div className="rounded-xl bg-[#0B0D18] border border-white/8 p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#00D5FF]">
                <Lock className="w-4 h-4" />
                Structured Deal Room Audit Trail
              </div>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                Every deliverable version, written revision note, and shared asset stays
                timestamped inside one shared workspace.
              </p>
            </div>
            <div className="rounded-xl bg-[#0B0D18] border border-white/8 p-6 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#9C65FF]">
                <Sparkles className="w-4 h-4" />
                Human-First AI Guardrails
              </div>
              <p className="text-xs text-[#9295A9] leading-relaxed">
                AI explains fit and drafts pitches, but never auto-rejects creators or
                fabricates fraud verdicts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 7 — DEMO PERSONA PERSPECTIVES & SECTION 8 PRICING PREVIEW
      ========================================================= */}
      <section className="py-24 bg-[#0B0D18] border-b border-white/8">
        <div className="max-w-[1380px] mx-auto px-6 space-y-16">
          <div className="space-y-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F000B8]">
                  06. Demo Environment Perspectives
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5FA]">
                  Designed around real creator & brand pain points.
                </h2>
              </div>
              <span className="text-xs text-[#9295A9]">
                Clearly labelled Demo User Scenarios · Not claimed commercial endorsements
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <blockquote className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-4">
                <p className="text-sm text-[#F5F5FA] leading-relaxed">
                  “At 24K followers, cold-emailing D2C brands felt like shouting into a
                  void. Seeing a 95% deterministic match score with a recommended ₹28,000
                  rate gave me confidence to pitch my dual-laptop audio concept.”
                </p>
                <footer className="text-xs text-[#9295A9]">
                  <strong className="text-[#F5F5FA]">Aarav Mehta (Demo Creator Persona)</strong> ·
                  Bengaluru Tech & Workspace Creator · 39.0K Combined Reach
                </footer>
              </blockquote>

              <blockquote className="rounded-xl bg-[#101426] border border-white/8 p-6 space-y-4">
                <p className="text-sm text-[#F5F5FA] leading-relaxed">
                  “Instead of sifting through 300 unvetted DMs, Bridge’s AI Campaign
                  Assistant structured our hydration launch brief in 30 seconds and ranked
                  authentic Indian runners with 6%+ engagement.”
                </p>
                <footer className="text-xs text-[#9295A9]">
                  <strong className="text-[#F5F5FA]">
                    Neha Malhotra, Prana Hydration (Demo Brand Persona)
                  </strong>{' '}
                  · Mumbai D2C Functional Beverage Team
                </footer>
              </blockquote>
            </div>
          </div>

          {/* Dynamic Deal Room Ecosystem & Collaboration Velocity (Replaces Pricing) */}
          <div className="pt-8 border-t border-white/8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
                07. Marketplace Ecosystem
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5FA]">
                A level playing field for emerging talent & modern brands.
              </h3>
              <p className="text-sm text-[#9295A9] leading-relaxed">
                BRIDGE eliminates agency gatekeepers and opaque talent markups. Creators pitch
                directly with transparent INR rate cards, and brands review applicants through
                deterministic AI match scores and milestone-driven Deal Rooms.
              </p>
              <div className="pt-2 flex items-center gap-4">
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#00D5FF] hover:underline"
                >
                  Explore Deal Room Workflow →
                </Link>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#9295A9] hover:text-[#F5F5FA]"
                >
                  Browse Open Briefs →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#101426] border border-white/10 p-6 space-y-3 interactive-glow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#F000B8] font-semibold uppercase tracking-wider">
                    Creator Economics
                  </p>
                  <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
                </div>
                <p className="font-display text-xl font-bold text-[#F5F5FA]">
                  Direct ₹ INR Deal Rooms
                </p>
                <div className="space-y-1.5 text-xs text-[#9295A9]">
                  <p className="flex items-center gap-2">
                    <span className="text-[#34D399]">✓</span> 100% upfront campaign budget transparency
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[#34D399]">✓</span> Transparent 5-factor AI compatibility breakdown
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[#34D399]">✓</span> Simulated Escrow with milestone release tracking
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#101426] border border-[#246BFD]/50 p-6 space-y-3 interactive-glow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#00D5FF] font-semibold uppercase tracking-wider">
                    Brand Collaboration
                  </p>
                  <span className="w-2 h-2 rounded-full bg-[#00D5FF] animate-pulse" />
                </div>
                <p className="font-display text-xl font-bold text-[#F5F5FA]">
                  AI Structured Pipeline
                </p>
                <div className="space-y-1.5 text-xs text-[#9295A9]">
                  <p className="flex items-center gap-2">
                    <span className="text-[#00D5FF]">✓</span> Natural-language AI Campaign Brief Builder
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[#00D5FF]">✓</span> Side-by-side creator comparison & private shortlists
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-[#00D5FF]">✓</span> Drag-and-drop applicant Kanban boards
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 9 — INTERACTIVE FAQ ACCORDION
      ========================================================= */}
      <section className="py-24 bg-[#050509] border-b border-white/8">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#9C65FF]">
              08. Questions & Clarity
            </p>
            <h2 className="font-display text-3xl font-bold text-[#F5F5FA]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {LANDING_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left font-display text-base font-semibold text-[#F5F5FA] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#00D5FF] shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pt-3 text-sm text-[#9295A9] leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 10 — FINAL EDITORIAL CTA
      ========================================================= */}
      <section className="py-28 bg-gradient-to-b from-[#050509] to-[#0B0D18]">
        <div className="max-w-[1100px] mx-auto px-6 text-center space-y-8">
          <h2
            style={{ textWrap: 'balance' }}
            className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F5F5FA]"
          >
            THE RIGHT CONNECTION{' '}
            <span className="font-editorial italic font-normal chrome-gradient-text">
              CHANGES EVERYTHING.
            </span>
          </h2>
          <p className="text-base text-[#9295A9] max-w-xl mx-auto">
            Step onto the bridge as an emerging creator or launch your next Indian brand
            campaign with deterministic AI clarity.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/signup?role=creator"
              className="px-7 py-3.5 rounded-full bg-[#246BFD] hover:bg-[#1e5ce0] font-display text-xs font-bold tracking-[0.16em] uppercase text-[#F5F5FA] transition-colors whitespace-nowrap"
            >
              JOIN AS CREATOR
            </Link>
            <Link
              to="/signup?role=brand"
              className="px-7 py-3.5 rounded-full border border-white/20 hover:border-[#00D5FF] bg-[#101426] font-display text-xs font-bold tracking-[0.16em] uppercase text-[#F5F5FA] transition-colors whitespace-nowrap"
            >
              FIND CREATORS
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

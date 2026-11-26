import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

const NICHE_OPTIONS = [
  'Technology',
  'Fashion',
  'Fitness',
  'Beauty',
  'Food & Beverages',
  'Education',
  'Lifestyle',
  'Travel',
];

const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Punjabi',
];

// ==========================================
// 1. CREATOR MULTI-STEP ONBOARDING
// ==========================================
export const CreatorOnboardingPage: React.FC = () => {
  const { user, creatorProfile, refreshSession, showToast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(creatorProfile?.fullName || user?.fullName || '');
  const [bio, setBio] = useState(
    creatorProfile?.bio ||
      'Emerging creator crafting high-retention stories and honest product tests for Indian audiences.'
  );
  const [city, setCity] = useState(creatorProfile?.city || 'Bengaluru');
  const [state, setState] = useState(creatorProfile?.state || 'Karnataka');
  const [languages, setLanguages] = useState<string[]>(
    creatorProfile?.languages || ['English', 'Hindi']
  );
  const [niches, setNiches] = useState<string[]>(
    creatorProfile?.niches || ['Technology', 'Lifestyle']
  );
  const [instagramHandle, setInstagramHandle] = useState(
    creatorProfile?.instagramHandle || '@creator.in'
  );
  const [instagramFollowers, setInstagramFollowers] = useState(
    creatorProfile?.instagramFollowers || 21000
  );
  const [youtubeHandle, setYoutubeHandle] = useState(creatorProfile?.youtubeHandle || '');
  const [youtubeSubscribers, setYoutubeSubscribers] = useState(
    creatorProfile?.youtubeSubscribers || 0
  );
  const [engagementRate, setEngagementRate] = useState(
    creatorProfile?.engagementRate || 5.8
  );
  const [reelRate, setReelRate] = useState(
    creatorProfile?.rateCard.instagramReel || 20000
  );
  const [portfolioTitle, setPortfolioTitle] = useState('Signature 60s Product Story Reel');
  const [portfolioUrl, setPortfolioUrl] = useState('https://instagram.com/reel/sample');
  const [availability, setAvailability] = useState<
    'Available' | 'Limited Availability' | 'Booked Until Next Month'
  >(creatorProfile?.availability || 'Available');

  const toggleItem = (list: string[], val: string, setter: (v: string[]) => void) => {
    if (list.includes(val)) {
      if (list.length > 1) setter(list.filter((i) => i !== val));
    } else {
      setter([...list, val]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.updateCreatorProfile({
        fullName,
        bio,
        city,
        state,
        languages,
        niches,
        instagramHandle,
        instagramFollowers: Number(instagramFollowers),
        youtubeHandle: youtubeHandle || undefined,
        youtubeSubscribers: Number(youtubeSubscribers),
        engagementRate: Number(engagementRate),
        availability,
        rateCard: {
          instagramReel: Number(reelRate),
          instagramStorySet: Math.round(Number(reelRate) * 0.3),
          youtubeDedicated: Math.round(Number(reelRate) * 1.5),
          youtubeShorts: Math.round(Number(reelRate) * 0.95),
          ugcBundle: Math.round(Number(reelRate) * 1.25),
          currency: 'INR',
        },
        portfolio: portfolioTitle
          ? [
              {
                id: `port_${Date.now()}`,
                title: portfolioTitle,
                platform: 'Instagram Reels',
                url: portfolioUrl,
                category: niches[0] || 'Lifestyle',
                viewsOrReach: `${Math.round(instagramFollowers * 1.6).toLocaleString('en-IN')} plays (Self-Reported)`,
                description: 'Uploaded during creator onboarding.',
                coverTint: '#246BFD',
              },
            ]
          : [],
        completeOnboarding: true,
      });
      await refreshSession();
      showToast('Creator profile activated! AI matches are ready.', 'success');
      navigate('/creator');
    } catch (e: any) {
      showToast(e.message || 'Could not save onboarding profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] text-[#F5F5FA] py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Progress Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F000B8]">
              Creator Onboarding · Step {step} of 3
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
              Configure Your Creator Portfolio
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-14 rounded-full transition-colors ${
                  s <= step ? 'bg-[#246BFD]' : 'bg-[#171B2C]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">
                  01. Identity, City & Content Niches
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">City & State</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-1/2 px-3 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                      />
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-1/2 px-3 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Creator Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#9295A9]">Content Niches</label>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleItem(niches, n, setNiches)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                          niches.includes(n)
                            ? 'bg-[#246BFD] border-[#246BFD] text-[#F5F5FA]'
                            : 'bg-[#050509] border-white/10 text-[#9295A9]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#9295A9]">Content Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleItem(languages, l, setLanguages)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                          languages.includes(l)
                            ? 'bg-[#171B2C] border-[#00D5FF] text-[#F5F5FA]'
                            : 'bg-[#050509] border-white/10 text-[#9295A9]'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">
                  02. Social Channels & Self-Reported Reach
                </h2>
                <div className="rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 flex items-start gap-2.5 text-xs text-[#F59E0B]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Metrics entered here are transparently marked Self-Reported until you
                    submit 30-day insights for Admin Verification.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Instagram Handle</label>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Instagram Followers</label>
                    <input
                      type="number"
                      min={1000}
                      value={instagramFollowers}
                      onChange={(e) => setInstagramFollowers(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">
                      YouTube Channel (Optional)
                    </label>
                    <input
                      type="text"
                      value={youtubeHandle}
                      onChange={(e) => setYoutubeHandle(e.target.value)}
                      placeholder="e.g. StudioChannel"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">YouTube Subscribers</label>
                    <input
                      type="number"
                      min={0}
                      value={youtubeSubscribers}
                      onChange={(e) => setYoutubeSubscribers(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">
                    Average Engagement Rate (%)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    max={25}
                    value={engagementRate}
                    onChange={(e) => setEngagementRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold">
                  03. INR Rate Card, Portfolio & Availability
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">
                      Standard Instagram Reel Rate (₹ INR)
                    </label>
                    <input
                      type="number"
                      step={500}
                      min={2000}
                      value={reelRate}
                      onChange={(e) => setReelRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Availability</label>
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    >
                      <option value="Available">Available</option>
                      <option value="Limited Availability">Limited Availability</option>
                      <option value="Booked Until Next Month">
                        Booked Until Next Month
                      </option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Featured Work Title</label>
                  <input
                    type="text"
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Featured Work URL</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold cursor-pointer"
                >
                  Save & Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#34D399] text-[#050509] text-xs font-bold cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Activating…' : 'Complete Creator Setup'}
                </button>
              )}
            </div>
          </div>

          {/* Live Profile Preview Card */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0B0D18] border border-white/10 p-6 space-y-5">
            <p className="text-xs font-semibold tracking-wider uppercase text-[#00D5FF]">
              Live Profile Preview
            </p>
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-lg font-bold"
                style={{ background: 'linear-gradient(135deg, #246BFD, #F000B8)' }}
              >
                {(fullName || 'CR').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#F5F5FA]">
                  {fullName || 'Creator Name'}
                </h3>
                <p className="text-xs text-[#9295A9]">
                  {instagramHandle} · {city}, {state}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#9295A9] leading-relaxed">{bio}</p>
            <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/8 text-xs">
              <div>
                <p className="text-[#9295A9]">Followers</p>
                <p className="font-mono-tabular font-bold text-[#F5F5FA] mt-0.5">
                  {(instagramFollowers + youtubeSubscribers).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Engagement</p>
                <p className="font-mono-tabular font-bold text-[#34D399] mt-0.5">
                  {engagementRate}%
                </p>
              </div>
              <div>
                <p className="text-[#9295A9]">Reel Rate</p>
                <p className="font-mono-tabular font-bold text-[#F5F5FA] mt-0.5">
                  ₹{Number(reelRate).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#9295A9]">
              Niches: <span className="text-[#F5F5FA]">{niches.join(' · ')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. BRAND MULTI-STEP ONBOARDING
// ==========================================
export const BrandOnboardingPage: React.FC = () => {
  const { user, brandProfile, refreshSession, showToast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(
    brandProfile?.companyName || `${user?.fullName || 'Modern'} Brands India`
  );
  const [logoMonogram, setLogoMonogram] = useState(brandProfile?.logoMonogram || 'MB');
  const [website, setWebsite] = useState(brandProfile?.website || 'https://brand.in');
  const [industry, setIndustry] = useState(brandProfile?.industry || 'Lifestyle');
  const [location, setLocation] = useState(
    brandProfile?.location || 'Mumbai, Maharashtra'
  );
  const [description, setDescription] = useState(
    brandProfile?.description ||
      'Homegrown Indian consumer brand partnering with authentic emerging creators.'
  );
  const [preferredCategories, setPreferredCategories] = useState<string[]>(
    brandProfile?.preferredCategories || ['Lifestyle', 'Fitness']
  );

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.updateBrandProfile({
        companyName,
        logoMonogram,
        website,
        industry,
        location,
        description,
        preferredCategories,
        completeOnboarding: true,
      });
      await refreshSession();
      showToast('Brand workspace ready — launch your first campaign!', 'success');
      navigate('/brand');
    } catch (e: any) {
      showToast(e.message || 'Failed to save brand profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] text-[#F5F5FA] py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00D5FF]">
              Brand Onboarding · Step {step} of 2
            </p>
            <h1 className="font-display text-3xl font-bold mt-1">
              Set Up Your Brand Studio
            </h1>
          </div>
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full ${
                  s <= step ? 'bg-[#00D5FF]' : 'bg-[#171B2C]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-2xl bg-[#101426] border border-white/10 p-6 sm:p-8 space-y-5">
            {step === 1 ? (
              <>
                <h2 className="font-display text-xl font-bold">
                  01. Company Identity & Industry
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs text-[#9295A9]">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Monogram (2–3 chars)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={logoMonogram}
                      onChange={(e) => setLogoMonogram(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm font-mono-tabular uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    >
                      {NICHE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#9295A9]">HQ City</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold">
                  02. Brand Story & Target Creator Categories
                </h2>
                <div className="space-y-1">
                  <label className="text-xs text-[#9295A9]">Brand Overview</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#050509] border border-white/12 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#9295A9]">
                    Preferred Creator Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (preferredCategories.includes(cat)) {
                            if (preferredCategories.length > 1) {
                              setPreferredCategories(
                                preferredCategories.filter((c) => c !== cat)
                              );
                            }
                          } else {
                            setPreferredCategories([...preferredCategories, cat]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                          preferredCategories.includes(cat)
                            ? 'bg-[#246BFD] border-[#246BFD] text-[#F5F5FA]'
                            : 'bg-[#050509] border-white/10 text-[#9295A9]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border border-white/15 text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[#246BFD] text-xs font-semibold cursor-pointer"
                >
                  Save & Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-lg bg-[#34D399] text-[#050509] text-xs font-bold cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Enter Brand Workspace'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-[#0B0D18] border border-white/10 p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#00D5FF]">
              Live Brand Card Preview
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#246BFD] flex items-center justify-center font-display font-bold">
                {logoMonogram || 'BR'}
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">{companyName}</h3>
                <p className="text-xs text-[#9295A9]">
                  {industry} · {location}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#9295A9] leading-relaxed">{description}</p>
            <p className="text-xs text-[#9295A9]">
              Creator Categories:{' '}
              <span className="text-[#F5F5FA]">{preferredCategories.join(' · ')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

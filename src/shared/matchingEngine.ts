import type {
  Campaign,
  CreatorProfile,
  MatchBreakdown,
  MatchResult,
  MatchWeights,
} from '../types/domain.ts';

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  niche: 30,
  audience: 25,
  engagement: 20,
  budget: 15,
  platform: 10,
};

function normalizeWeights(weights?: Partial<MatchWeights>): MatchWeights {
  const merged: MatchWeights = {
    niche: weights?.niche ?? DEFAULT_MATCH_WEIGHTS.niche,
    audience: weights?.audience ?? DEFAULT_MATCH_WEIGHTS.audience,
    engagement: weights?.engagement ?? DEFAULT_MATCH_WEIGHTS.engagement,
    budget: weights?.budget ?? DEFAULT_MATCH_WEIGHTS.budget,
    platform: weights?.platform ?? DEFAULT_MATCH_WEIGHTS.platform,
  };
  const sum =
    merged.niche +
    merged.audience +
    merged.engagement +
    merged.budget +
    merged.platform;
  if (sum <= 0) return DEFAULT_MATCH_WEIGHTS;
  return {
    niche: Math.round((merged.niche / sum) * 100),
    audience: Math.round((merged.audience / sum) * 100),
    engagement: Math.round((merged.engagement / sum) * 100),
    budget: Math.round((merged.budget / sum) * 100),
    platform: Math.max(
      0,
      100 -
        Math.round((merged.niche / sum) * 100) -
        Math.round((merged.audience / sum) * 100) -
        Math.round((merged.engagement / sum) * 100) -
        Math.round((merged.budget / sum) * 100)
    ),
  };
}

function estimateCreatorTypicalRate(
  creator: CreatorProfile,
  campaign: Campaign
): number {
  const deliverablesText = campaign.deliverables.join(' ').toLowerCase();
  if (deliverablesText.includes('youtube') && deliverablesText.includes('dedicated')) {
    return creator.rateCard.youtubeDedicated || creator.rateCard.instagramReel * 1.4;
  }
  if (deliverablesText.includes('shorts')) {
    return creator.rateCard.youtubeShorts || creator.rateCard.instagramReel;
  }
  if (deliverablesText.includes('ugc')) {
    return creator.rateCard.ugcBundle || creator.rateCard.instagramReel;
  }
  const hasStory = deliverablesText.includes('story') || deliverablesText.includes('stories');
  const baseReel = creator.rateCard.instagramReel || 18000;
  return hasStory
    ? baseReel + (creator.rateCard.instagramStorySet || 5000)
    : baseReel;
}

export function computeCreatorCampaignMatch(
  creator: CreatorProfile,
  campaign: Campaign,
  customWeights?: Partial<MatchWeights>
): MatchResult {
  const weights = normalizeWeights(customWeights);
  const reasons: string[] = [];
  const potentialMismatches: string[] = [];
  const dataNotices: string[] = [];

  if (creator.statsSelfReported) {
    dataNotices.push(
      'Follower count and engagement rate are creator self-reported until platform OAuth audit completes.'
    );
  }
  if (!creator.audienceTopCities || creator.audienceTopCities.length === 0) {
    dataNotices.push('Detailed city-level audience breakdown has not been uploaded yet.');
  }

  // 1. Niche Relevance (0-100)
  const creatorNichesLower = creator.niches.map((n) => n.toLowerCase().trim());
  const campaignNichesLower = campaign.niches.map((n) => n.toLowerCase().trim());
  const directMatches = campaign.niches.filter((cn) =>
    creatorNichesLower.includes(cn.toLowerCase().trim())
  );

  // Related Indian creator economy niche affinities
  const relatedMap: Record<string, string[]> = {
    fitness: ['lifestyle', 'health', 'sports', 'nutrition'],
    lifestyle: ['fashion', 'beauty', 'travel', 'fitness', 'food & beverages'],
    fashion: ['beauty', 'lifestyle'],
    beauty: ['fashion', 'lifestyle', 'skincare'],
    technology: ['education', 'gaming', 'productivity', 'finance'],
    education: ['technology', 'career', 'productivity'],
    'food & beverages': ['lifestyle', 'fitness', 'travel'],
    travel: ['lifestyle', 'food & beverages', 'photography'],
  };

  let relatedMatchesCount = 0;
  for (const cn of campaignNichesLower) {
    if (!creatorNichesLower.includes(cn)) {
      const affinities = relatedMap[cn] || [];
      if (creatorNichesLower.some((crn) => affinities.includes(crn))) {
        relatedMatchesCount += 1;
      }
    }
  }

  let nicheScore = 32;
  if (campaignNichesLower.length > 0) {
    const directRatio = directMatches.length / campaignNichesLower.length;
    const relatedBonus = Math.min(0.35, relatedMatchesCount * 0.18);
    nicheScore = Math.min(100, Math.round((directRatio * 0.88 + relatedBonus + 0.12) * 100));
    if (directMatches.length > 0 && directMatches.length === campaignNichesLower.length) {
      nicheScore = 98;
    } else if (directMatches.length > 0) {
      nicheScore = Math.max(78, nicheScore);
    }
  }

  if (directMatches.length > 0) {
    reasons.push(
      `Direct ${directMatches.join(' & ')} niche alignment matches the campaign brief.`
    );
  } else if (relatedMatchesCount > 0) {
    reasons.push(
      `Adjacent content affinity between ${creator.niches.slice(0, 2).join('/')} and ${campaign.niches[0]}.`
    );
  } else {
    potentialMismatches.push(
      `Primary niches (${creator.niches.join(', ')}) differ from target (${campaign.niches.join(', ')}).`
    );
  }

  // 2. Audience Alignment (Languages + City/Pan-India + Follower band 10K-50K)
  const creatorLangs = creator.languages.map((l) => l.toLowerCase());
  const reqLangs = campaign.requiredLanguages.map((l) => l.toLowerCase());
  const matchedLangs = campaign.requiredLanguages.filter((l) =>
    creatorLangs.includes(l.toLowerCase())
  );
  const langRatio = reqLangs.length > 0 ? matchedLangs.length / reqLangs.length : 1;

  const isPanIndia =
    campaign.location.toLowerCase().includes('pan-india') ||
    campaign.location.toLowerCase().includes('all india') ||
    campaign.location.toLowerCase().includes('india');

  const cityMatch =
    isPanIndia ||
    campaign.location.toLowerCase().includes(creator.city.toLowerCase()) ||
    creator.audienceTopCities.some((c) =>
      campaign.location.toLowerCase().includes(c.toLowerCase())
    );

  const inFollowerBand =
    creator.totalFollowers >= campaign.followerMin &&
    creator.totalFollowers <= campaign.followerMax;

  let audienceScore = Math.round(
    langRatio * 50 + (cityMatch ? 30 : 12) + (inFollowerBand ? 20 : 10)
  );
  audienceScore = Math.min(100, Math.max(25, audienceScore));

  if (matchedLangs.length > 0 && cityMatch) {
    reasons.push(
      `Audience aligns with ${campaign.location} reach in ${matchedLangs.join(' & ')} (${creator.audienceAgeRange}).`
    );
  } else if (!matchedLangs.length) {
    potentialMismatches.push(
      `Campaign prefers ${campaign.requiredLanguages.join('/')} delivery; profile lists ${creator.languages.join('/')}.`
    );
  }
  if (!cityMatch) {
    potentialMismatches.push(
      `Campaign prioritizes ${campaign.location}, while creator is based in ${creator.city}.`
    );
  }

  // 3. Engagement Quality (0-100)
  const minEng = campaign.minEngagementRate || 3.5;
  let engagementScore = 70;
  if (creator.engagementRate >= minEng + 2.0) {
    engagementScore = 97;
  } else if (creator.engagementRate >= minEng) {
    const excess = creator.engagementRate - minEng;
    engagementScore = Math.round(80 + Math.min(16, excess * 8));
  } else {
    const deficit = minEng - creator.engagementRate;
    engagementScore = Math.max(35, Math.round(76 - deficit * 18));
  }

  if (creator.engagementRate >= minEng) {
    reasons.push(
      `${creator.engagementRate.toFixed(1)}% average engagement exceeds the ${minEng.toFixed(1)}% campaign benchmark.`
    );
  } else {
    potentialMismatches.push(
      `Engagement (${creator.engagementRate.toFixed(1)}%) is slightly below preferred ${minEng.toFixed(1)}% threshold.`
    );
  }

  // 4. Budget Compatibility (0-100)
  const typicalRate = estimateCreatorTypicalRate(creator, campaign);
  let budgetScore = 75;
  if (typicalRate >= campaign.budgetMinINR && typicalRate <= campaign.budgetMaxINR) {
    budgetScore = 96;
    reasons.push(
      `Creator's rate card (₹${typicalRate.toLocaleString('en-IN')}) fits cleanly within ₹${campaign.budgetMinINR.toLocaleString('en-IN')}–₹${campaign.budgetMaxINR.toLocaleString('en-IN')}.`
    );
  } else if (typicalRate < campaign.budgetMinINR) {
    budgetScore = 90;
    reasons.push(
      `Creator's standard rate (₹${typicalRate.toLocaleString('en-IN')}) leaves headroom for usage rights or bonus deliverables.`
    );
  } else {
    const overPct = (typicalRate - campaign.budgetMaxINR) / Math.max(1, campaign.budgetMaxINR);
    budgetScore = Math.max(30, Math.round(82 - overPct * 95));
    potentialMismatches.push(
      `Standard deliverable rate (₹${typicalRate.toLocaleString('en-IN')}) exceeds max campaign budget (₹${campaign.budgetMaxINR.toLocaleString('en-IN')}).`
    );
  }

  // 5. Platform Compatibility (0-100)
  const creatorPlatforms: string[] = [];
  if (creator.instagramHandle) creatorPlatforms.push('instagram');
  if (creator.youtubeHandle) creatorPlatforms.push('youtube');
  creator.otherPlatforms.forEach((p) => creatorPlatforms.push(p.toLowerCase()));

  const matchedPlatforms = campaign.platforms.filter((cp) =>
    creatorPlatforms.some((crp) => cp.toLowerCase().includes(crp) || crp.includes(cp.toLowerCase()))
  );
  const platformScore =
    campaign.platforms.length > 0
      ? Math.max(35, Math.round((matchedPlatforms.length / campaign.platforms.length) * 100))
      : 90;

  if (matchedPlatforms.length < campaign.platforms.length) {
    potentialMismatches.push(
      `Missing active handle for ${campaign.platforms
        .filter((p) => !matchedPlatforms.includes(p))
        .join(', ')}.`
    );
  }

  const breakdown: MatchBreakdown = {
    nicheScore,
    audienceScore,
    engagementScore,
    budgetScore,
    platformScore,
  };

  const weightedRaw =
    (nicheScore * weights.niche +
      audienceScore * weights.audience +
      engagementScore * weights.engagement +
      budgetScore * weights.budget +
      platformScore * weights.platform) /
    100;

  const overallScore = Math.min(99, Math.max(18, Math.round(weightedRaw)));

  // Recommended Rate calculation anchored in real creator rate card + campaign budget + engagement premium
  const midpoint = Math.round((campaign.budgetMinINR + campaign.budgetMaxINR) / 2);
  const blended = Math.round(typicalRate * 0.6 + midpoint * 0.4);
  const recommendedRateINR =
    Math.round(
      Math.min(
        campaign.budgetMaxINR,
        Math.max(campaign.budgetMinINR, blended)
      ) / 500
    ) * 500;

  const topThreeReasons =
    reasons.length >= 3
      ? reasons.slice(0, 3)
      : [
          ...reasons,
          `Emerging micro-tier reach (${(creator.totalFollowers / 1000).toFixed(1)}K followers) drives authentic community trust.`,
          `Active ${creator.availability.toLowerCase()} schedule supports ${campaign.deliverables[0] || 'campaign deliverables'}.`,
        ].slice(0, 3);

  const primaryNiche = directMatches[0] || creator.niches[0] || campaign.niches[0] || 'creator';
  const suggestedContentAngle = `Day-in-the-life ${primaryNiche.toLowerCase()} storytelling in ${creator.languages[0] || 'English'} integrating ${campaign.brandName}'s ${campaign.objective.toLowerCase()} naturally within the first 3 seconds.`;

  return {
    id: `match_${creator.id}_${campaign.id}`,
    creatorId: creator.id,
    campaignId: campaign.id,
    overallScore,
    breakdown,
    weightsUsed: weights,
    reasons: topThreeReasons,
    potentialMismatches,
    dataNotices,
    recommendedRateINR,
    suggestedContentAngle,
    computedAt: new Date().toISOString(),
  };
}

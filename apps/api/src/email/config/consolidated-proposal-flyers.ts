import type { MciEngagementId, ProposalOptionsJourney } from '@repo/shared';

/**
 * Path config for the V2 consolidated proposal deck (Assets page only).
 *
 * All paths are relative to `env.consolidatedFlyersDir`
 * (`apps/api/assets/consolidated_flyers`). Sub-folders:
 *   - product_overview/  one deck per PRODUCT present in the selection
 *   - comparison/        one deck per selected scenario (transition / copilot)
 *   - mci/               one deck per selected MCI engagement
 *
 * Assembly order for the final deck:
 *   product overview → comparison → investment snapshot → engagement →
 *   partner page → disclaimer.
 */

export const CONSOLIDATED_FLYER_SUBDIRS = {
	productOverview: 'product_overview',
	comparison: 'comparison',
	mci: 'mci',
	investment: 'investment',
} as const;

// ---------------------------------------------------------------------------
// Closing sections — investment snapshot (journey/promo-based), then the last
// two static decks: the closing/partner page and the disclaimer.
// ---------------------------------------------------------------------------

/** Standard investment snapshot deck (hydrated with per-scenario values). */
export const INVESTMENT_SNAPSHOT_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/Investment Snapshot.pptx`;

/** Investment snapshot deck for renewal scenarios with any promo savings. */
export const INVESTMENT_SNAPSHOT_WITH_PROMO_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/Investment Snapshot with Promo.pptx`;

/** Investment snapshot deck for net-new customer scenarios. */
export const NEW_PRODUCT_INVESTMENT_SNAPSHOT_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/New Product Investment snapshot.pptx`;

/** Investment snapshot deck for net-new customer scenarios with any promo savings. */
export const NEW_PRODUCT_INVESTMENT_SNAPSHOT_WITH_PROMO_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/New Product Investment snapshot with promo.pptx`;

/** Closing page appended after the investment snapshot. */
export const CONSOLIDATED_LAST_PAGE_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/last_page.pptx`;

/** Final disclaimer deck. */
export const CONSOLIDATED_DISCLAIMER_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.investment}/disclaimer.pptx`;

/** Resolve the investment snapshot deck for a scenario. */
export function resolveInvestmentSnapshotFlyer(params: {
	journey: ProposalOptionsJourney;
	hasPromo?: boolean;
}): string {
	if (params.journey === 'new_customer') {
		if (params.hasPromo) {
			return NEW_PRODUCT_INVESTMENT_SNAPSHOT_WITH_PROMO_FLYER;
		}
		return NEW_PRODUCT_INVESTMENT_SNAPSHOT_FLYER;
	}
	if (params.hasPromo) {
		return INVESTMENT_SNAPSHOT_WITH_PROMO_FLYER;
	}
	return INVESTMENT_SNAPSHOT_FLYER;
}

// ---------------------------------------------------------------------------
// 1. Product overview — keyed on the PRODUCTS contained in the selected
//    ending SKUs (ending SKU only, deduped across scenarios).
// ---------------------------------------------------------------------------

/** The distinct products a consolidated deck can showcase in overview. */
export type ConsolidatedProduct = 'copilot' | 'defender' | 'purview';

/**
 * Which products each ending SKU contains. The union of these across every
 * selected scenario drives the (deduped) product-overview section.
 */
export const PRODUCTS_BY_ENDING_SKU: Record<string, ConsolidatedProduct[]> = {
	bs_cb: ['copilot'],
	bp_cb: ['copilot'],
	bp_cb_purview: ['copilot', 'purview'],
	bb_cb: ['copilot'],
	attach_copilot: ['copilot'],
	bp_defender: ['defender'],
	bp_purview: ['purview'],
	bp_defender_purview: ['defender', 'purview'],
	attach_defender: ['defender'],
	attach_purview: ['purview'],
	attach_defender_purview: ['defender', 'purview'],
};

/** Canonical render order for overview slides + their source decks. */
export const PRODUCT_OVERVIEW_ORDER: ConsolidatedProduct[] = [
	'copilot',
	'defender',
	'purview',
];

export const PRODUCT_OVERVIEW_FLYER: Record<ConsolidatedProduct, string> = {
	copilot: `${CONSOLIDATED_FLYER_SUBDIRS.productOverview}/Copilot Business.pptx`,
	defender: `${CONSOLIDATED_FLYER_SUBDIRS.productOverview}/Defender Suite for Microsoft 365 Premium.pptx`,
	purview: `${CONSOLIDATED_FLYER_SUBDIRS.productOverview}/Microsoft Purview Suite for Microsoft 365 Business Premium.pptx`,
};

/**
 * Chat-to-paid overrides for the product-overview section. When the proposal's
 * "Chat to Paid" toggle is on, these replace the default overview flyer. Only
 * Copilot has an alternate slide today; other products fall back to the default.
 */
export const PRODUCT_OVERVIEW_FLYER_CHAT_TO_PAID: Partial<
	Record<ConsolidatedProduct, string>
> = {
	copilot: `${CONSOLIDATED_FLYER_SUBDIRS.productOverview}/Copilot Business Chat to Paid slide.pptx`,
};

// ---------------------------------------------------------------------------
// 2. Comparison — one deck per selected scenario.
//    - A transition-specific deck (keyed on startingSku→endingSku) always wins.
//    - Otherwise, a Copilot-in-bundle journey that steps UP a base tier
//      (Basic→Standard, Basic→Premium, Standard→Premium) shows the matching
//      tier-comparison deck, regardless of what else rides along in the bundle
//      (e.g. Purview). See TIER_COMPARISON_FLYER_BY_TIER_JUMP.
//    - Otherwise, any remaining Copilot/AI ending SKU (same-tier or add-on)
//      falls back to the shared Copilot chat-to-paid comparison.
// ---------------------------------------------------------------------------

/**
 * Comparison decks keyed on `${startingSkuId}:${endingSkuId}`.
 * Starting SKUs: bb (Basic), bs (Standard), bp (Premium).
 *
 * Note: the pure Copilot tier jumps (bb→bp_cb, bb→bs_cb, bs→bp_cb) are NOT
 * listed here — they are resolved by the tier-jump rule below so that Copilot
 * bundles carrying extra products (e.g. bp_cb_purview) reuse the same decks.
 */
export const COMPARISON_FLYER_BY_TRANSITION: Record<string, string> = {
	// → Business Premium + Defender Suite
	'bb:bp_defender': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Basic to Business Premium + Defender Suite.pptx`,
	'bs:bp_defender': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Standard to Business Premium + Defender Suite.pptx`,
	'bp:bp_defender': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Defender Suite.pptx`,
	'bp:attach_defender': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Defender Suite.pptx`,

	// → Business Premium + Purview Suite
	'bb:bp_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Basic to Business Premium + Purview Suite.pptx`,
	'bs:bp_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Standard to Business Premium + Purview Suite.pptx`,
	'bp:bp_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Purview Suite.pptx`,
	'bp:attach_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Purview Suite.pptx`,

	// → Business Premium + Defender Suite + Purview Suite
	'bb:bp_defender_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Basic to Business Premium + Defender Suite+ Purview Suite.pptx`,
	'bs:bp_defender_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Standard to Business Premium + Defender suite + Purview Suite.pptx`,
	'bp:bp_defender_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Defender + Purview Suite.pptx`,
	'bp:attach_defender_purview': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Premium to Business Premium + Defender + Purview Suite.pptx`,
};

/**
 * Copilot/AI ending SKUs that can use the shared chat-to-paid comparison when
 * no transition-specific deck exists for the scenario.
 */
export const COPILOT_COMPARISON_ENDING_SKUS = new Set<string>([
	'bs_cb',
	'bp_cb',
	'bp_cb_purview',
	'bb_cb',
	'attach_copilot',
]);

/**
 * The shared Copilot Chat vs Copilot Business comparison is only meaningful
 * when the customer has an existing Microsoft 365 starting SKU. `other` is a
 * net-new starting point, so there is no Copilot Chat conversion story.
 */
export function shouldIncludeCopilotComparisonFlyers(params: {
	startingSkuId: string;
	endingSkuId: string;
}): boolean {
	return (
		params.startingSkuId !== 'other' &&
		COPILOT_COMPARISON_ENDING_SKUS.has(params.endingSkuId)
	);
}

/**
 * Shared Copilot comparison deck, page 1 — included in the comparison section
 * when a selected Copilot ending SKU is not starting from `other`.
 */
export const COPILOT_COMPARISON_PAGE_1_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Page 1_Proposal_Copilot-Chat-to-Paid.pptx`;

/**
 * Shared Copilot comparison deck, page 2 — appended after page 1 only when the
 * proposal's "Chat to Paid" toggle is on.
 */
export const COPILOT_COMPARISON_PAGE_2_FLYER = `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Page 2_Proposal_Copilot-Chat-to-Paid.pptx`;

/**
 * Resolve the shared Copilot comparison decks for the end of the comparison
 * section: page 1 always, plus page 2 when chat-to-paid is enabled.
 */
export function resolveCopilotComparisonFlyers(
	useChatToPaidFlyers = false,
): string[] {
	return useChatToPaidFlyers
		? [COPILOT_COMPARISON_PAGE_1_FLYER, COPILOT_COMPARISON_PAGE_2_FLYER]
		: [COPILOT_COMPARISON_PAGE_1_FLYER];
}

// ---------------------------------------------------------------------------
// Copilot tier-jump comparison — when a Copilot-in-bundle journey steps up a
// base plan tier, show the tier-comparison deck instead of the generic
// chat-to-paid deck. The deck depends only on (starting tier → ending tier),
// so every Copilot bundle at a given ending tier (bp_cb, bp_cb_purview, …)
// reuses the same deck.
// ---------------------------------------------------------------------------

/** Base plan tier ordinal (Basic < Standard < Premium) of a starting SKU. */
const STARTING_SKU_TIER: Record<string, number> = { bb: 0, bs: 1, bp: 2 };

/**
 * Base plan tier ordinal contained in each Copilot ending SKU. Add-on endings
 * (e.g. attach_copilot) have no base-tier jump and are intentionally omitted.
 */
const COPILOT_ENDING_SKU_TIER: Record<string, number> = {
	bb_cb: 0,
	bs_cb: 1,
	bp_cb: 2,
	bp_cb_purview: 2,
};

/** Tier-jump comparison decks, keyed `${startTier}:${endTier}` (end > start). */
const TIER_COMPARISON_FLYER_BY_TIER_JUMP: Record<string, string> = {
	'0:1': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Basic to Business Standard.pptx`,
	'0:2': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Basic to Business Premium.pptx`,
	'1:2': `${CONSOLIDATED_FLYER_SUBDIRS.comparison}/Business Standard vs Business Premium.pptx`,
};

// ---------------------------------------------------------------------------
// 3. MCI engagement — one deck per selected engagement id.
// ---------------------------------------------------------------------------

export const MCI_ENGAGEMENT_FLYER_BY_ID: Record<
	MciEngagementId,
	string | null
> = {
	'copilot-m365': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-Copilot-Deployment-Accelerator-Customer-Flyer.pptx`,
	'copilot-agent': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-Agent-Deployment-Accelerator-Customer-Flyer.pptx`,
	'security-defender-purview': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-BP-Deployment-Accelerator-Customer-Flyer.pptx`,
	// No dedicated flyer authored yet — reuses the BP Defender/Purview deck.
	'security-conversion-bonus': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-BP-Deployment-Accelerator-Customer-Flyer.pptx`,
	// No dedicated AI-Ready Productivity flyer authored yet — reuses the CSP BP
	// Deployment Accelerator deck for both the accelerator and its conversion bonus.
	'ai-productivity-deployment': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-BP-Deployment-Accelerator-Customer-Flyer.pptx`,
	'ai-productivity-conversion-bonus': `${CONSOLIDATED_FLYER_SUBDIRS.mci}/V2_CSP-BP-Deployment-Accelerator-Customer-Flyer.pptx`,
};

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve the deduped, ordered product-overview flyer paths for the given
 * selected ending SKU ids.
 */
export function resolveProductOverviewFlyers(
	endingSkuIds: Iterable<string>,
	useChatToPaidFlyers = false,
): string[] {
	const products = new Set<ConsolidatedProduct>();
	for (const skuId of endingSkuIds) {
		for (const product of PRODUCTS_BY_ENDING_SKU[skuId] ?? []) {
			products.add(product);
		}
	}
	return PRODUCT_OVERVIEW_ORDER.filter((product) => products.has(product)).map(
		(product) =>
			(useChatToPaidFlyers
				? PRODUCT_OVERVIEW_FLYER_CHAT_TO_PAID[product]
				: undefined) ?? PRODUCT_OVERVIEW_FLYER[product],
	);
}

/**
 * Resolve the comparison flyer path for a single scenario, or `null` when no
 * comparison deck exists for the transition (e.g. an unmapped starting SKU).
 */
export function resolveComparisonFlyer(params: {
	startingSkuId: string;
	endingSkuId: string;
}): string | null {
	const key = `${params.startingSkuId}:${params.endingSkuId}`;
	const transitionFlyer = COMPARISON_FLYER_BY_TRANSITION[key];
	if (transitionFlyer) {
		return transitionFlyer;
	}
	if (shouldIncludeCopilotComparisonFlyers(params)) {
		// Copilot in the bundle: if the journey steps up a base plan tier, use
		// the tier-comparison deck; otherwise fall back to chat-to-paid.
		const startTier = STARTING_SKU_TIER[params.startingSkuId];
		const endTier = COPILOT_ENDING_SKU_TIER[params.endingSkuId];
		if (
			startTier !== undefined &&
			endTier !== undefined &&
			endTier > startTier
		) {
			const tierFlyer =
				TIER_COMPARISON_FLYER_BY_TIER_JUMP[`${startTier}:${endTier}`];
			if (tierFlyer) {
				return tierFlyer;
			}
		}
		return COPILOT_COMPARISON_PAGE_1_FLYER;
	}
	return null;
}

/** Resolve the deduped, selection-ordered engagement flyer paths. */
export function resolveEngagementFlyers(
	engagementIds: Iterable<MciEngagementId>,
): string[] {
	const paths: string[] = [];
	const seen = new Set<string>();
	for (const id of engagementIds) {
		const path = MCI_ENGAGEMENT_FLYER_BY_ID[id];
		if (path && !seen.has(path)) {
			seen.add(path);
			paths.push(path);
		}
	}
	return paths;
}

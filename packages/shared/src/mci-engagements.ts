import type {
	RegionalCurrencyCode,
	RegionalPricingCountry,
} from './regional-pricing';

/**
 * MCI (Microsoft Commerce Incentive) engagements the partner can commit to
 * deliver. Unlike upgrade SKUs — whose incentive is `rate × dollar base` — an
 * engagement pays a FLAT amount in the proposal currency. When the partner
 * selects one, we treat it like a SKU: its amount is added straight into the
 * proposal's total incentives.
 *
 * Amounts come from the FY27 Frontier Accelerate engagement pricing table,
 * which prices every engagement in USD per Microsoft market tier (A/B/C). A
 * country's tier is fixed (see MCI_MARKET_TIER_BY_COUNTRY); the tier's USD
 * figure is then converted to the proposal currency with the MCI-specific
 * rates in MCI_USD_RATE_BY_CURRENCY. Markets that display in USD via the
 * regional-pricing fallback (e.g. Singapore, Malaysia) keep the USD figure of
 * their own tier — by design.
 */
export type MciEngagementCategory = 'copilot' | 'security' | 'ai-productivity';

export const MCI_ENGAGEMENT_CATEGORIES: MciEngagementCategory[] = [
	'copilot',
	'security',
	'ai-productivity',
];

export type MciEngagementId =
	| 'copilot-m365'
	| 'copilot-agent'
	| 'security-defender-purview'
	| 'security-conversion-bonus'
	| 'ai-productivity-deployment'
	| 'ai-productivity-conversion-bonus';

export type MciMarketTier = 'A' | 'B' | 'C';

export interface MciEngagementDefinition {
	id: MciEngagementId;
	category: MciEngagementCategory;
	label: string;
	/** Compact name for banners/chips where the full FY27 label is too long. */
	shortLabel: string;
	/** Flat USD amount per Microsoft market tier (FY27 pricing table). */
	usdAmountByMarketTier: Record<MciMarketTier, number>;
}

export const MCI_ENGAGEMENTS: Readonly<
	Record<MciEngagementId, MciEngagementDefinition>
> = {
	'copilot-m365': {
		id: 'copilot-m365',
		category: 'copilot',
		label:
			'Frontier Accelerate for Copilot: M365 Copilot Deployment Accelerator',
		shortLabel: 'M365 Copilot Deployment',
		usdAmountByMarketTier: { A: 2500, B: 1875, C: 1250 },
	},
	'copilot-agent': {
		id: 'copilot-agent',
		category: 'copilot',
		label:
			'Frontier Accelerate for Copilot: Agent Solution Deployment Accelerator',
		shortLabel: 'Agent Solution Deployment',
		usdAmountByMarketTier: { A: 2500, B: 1875, C: 1250 },
	},
	'security-defender-purview': {
		id: 'security-defender-purview',
		category: 'security',
		label:
			'Frontier Accelerate for Security: CSP BP Defender/Purview Suites Deployment Accelerator',
		shortLabel: 'Defender/Purview Deployment',
		usdAmountByMarketTier: { A: 2000, B: 1500, C: 1000 },
	},
	'security-conversion-bonus': {
		id: 'security-conversion-bonus',
		category: 'security',
		label:
			'Frontier Accelerate for Security: Conversion Bonus – Defender & Purview BP',
		shortLabel: 'Security Conversion Bonus',
		usdAmountByMarketTier: { A: 1600, B: 1200, C: 800 },
	},
	'ai-productivity-deployment': {
		id: 'ai-productivity-deployment',
		category: 'ai-productivity',
		label:
			'Frontier Accelerate for AI-Ready Productivity: CSP BP Deployment Accelerator',
		shortLabel: 'Business Premium Deployment',
		usdAmountByMarketTier: { A: 2000, B: 1500, C: 1000 },
	},
	'ai-productivity-conversion-bonus': {
		id: 'ai-productivity-conversion-bonus',
		category: 'ai-productivity',
		label:
			'Frontier Accelerate for AI-Ready Productivity: Conversion Bonus - BP',
		shortLabel: 'AI Productivity Conversion Bonus',
		usdAmountByMarketTier: { A: 1600, B: 1500, C: 1000 },
	},
};

/**
 * Microsoft market tier per supported country, from the FY27 Frontier
 * Accelerate engagement pricing table. The tier is bound to the proposal's
 * source REGION (use `regionCountry`, not the display-currency country), so a
 * display-currency toggle never moves a customer between tiers.
 */
export const MCI_MARKET_TIER_BY_COUNTRY: Record<
	RegionalPricingCountry,
	MciMarketTier
> = {
	AR: 'C',
	AU: 'A',
	BB: 'B',
	BM: 'C',
	BO: 'C',
	BR: 'B',
	BZ: 'C',
	CA: 'A',
	CL: 'B',
	CO: 'B',
	CR: 'C',
	CW: 'C',
	DE: 'A',
	DK: 'A',
	DO: 'C',
	EC: 'C',
	GB: 'A',
	GT: 'C',
	HN: 'C',
	IE: 'A',
	IN: 'C',
	JM: 'B',
	KN: 'C',
	KY: 'B',
	MX: 'B',
	MY: 'B',
	NI: 'C',
	NL: 'A',
	NO: 'A',
	NZ: 'A',
	PA: 'C',
	PE: 'C',
	PR: 'B',
	PY: 'C',
	SE: 'A',
	SG: 'B',
	SV: 'C',
	TT: 'C',
	US: 'A',
	UY: 'B',
	VE: 'C',
	VI: 'C',
};

/**
 * Fallback tier when the caller has no region country — resolved from the
 * display currency's canonical market. Only BRL and INR map to non-A tiers;
 * USD-market tiers (B/C countries like Mexico or Argentina) cannot be told
 * apart by currency alone, so pass `regionCountry` whenever it is available.
 */
const MCI_MARKET_TIER_BY_CURRENCY: Record<RegionalCurrencyCode, MciMarketTier> =
	{
		USD: 'A',
		CAD: 'A',
		BRL: 'B',
		NZD: 'A',
		AUD: 'A',
		NOK: 'A',
		GBP: 'A',
		DKK: 'A',
		SEK: 'A',
		EUR: 'A',
		INR: 'C',
	};

/**
 * MCI-specific USD → local-currency conversion rates for the flat engagement
 * amounts (per the FY27 rate sheet — deliberately separate from the SKU
 * pricing rates in regional-pricing). Currencies without a supplied MCI rate
 * (CAD, AUD, GBP, DKK, BRL) keep the USD figure as-is.
 */
export const MCI_USD_RATE_BY_CURRENCY: Record<RegionalCurrencyCode, number> = {
	USD: 1,
	CAD: 1,
	BRL: 1,
	NZD: 1.62,
	AUD: 1,
	NOK: 10.16,
	GBP: 1,
	DKK: 1,
	SEK: 9.55,
	EUR: 0.87,
	INR: 83.19,
};

export function getMciMarketTier(
	country: RegionalPricingCountry | string | null | undefined,
	currency?: RegionalCurrencyCode | string,
): MciMarketTier {
	if (
		typeof country === 'string' &&
		Object.prototype.hasOwnProperty.call(MCI_MARKET_TIER_BY_COUNTRY, country)
	) {
		return MCI_MARKET_TIER_BY_COUNTRY[country as RegionalPricingCountry];
	}
	if (
		typeof currency === 'string' &&
		Object.prototype.hasOwnProperty.call(MCI_MARKET_TIER_BY_CURRENCY, currency)
	) {
		return MCI_MARKET_TIER_BY_CURRENCY[currency as RegionalCurrencyCode];
	}
	return 'A';
}

/** Every valid engagement id, for runtime validation and iteration. */
export const MCI_ENGAGEMENT_IDS = Object.keys(
	MCI_ENGAGEMENTS,
) as MciEngagementId[];

export function isMciEngagementCategory(
	value: unknown,
): value is MciEngagementCategory {
	return (
		typeof value === 'string' &&
		MCI_ENGAGEMENT_CATEGORIES.includes(value as MciEngagementCategory)
	);
}

export function isMciEngagementId(value: unknown): value is MciEngagementId {
	return (
		typeof value === 'string' &&
		MCI_ENGAGEMENT_IDS.includes(value as MciEngagementId)
	);
}

/**
 * The partner's answers to the MCI engagement questionnaire. A single global
 * questionnaire per proposal, persisted to sessionStorage alongside the partner
 * filters. `null` means "not yet answered" for branch questions.
 *
 * @deprecated The questionnaire was replaced by per-SKU-card engagement
 * attachments (see partner-profile.ts: MciEngagementAttachment); eligibility
 * now derives from the stored partner profile. Kept only until the last
 * consumers are removed — do not add new ones.
 */
export interface MciEngagementSelection {
	/** Step 1 — one or more selected engagement areas. */
	categories: MciEngagementCategory[];
	/**
	 * Legacy single-area field from the original radio-button flow. Kept so
	 * saved sessionStorage payloads can migrate without dropping the answer.
	 */
	category?: MciEngagementCategory | null;
	/**
	 * Legacy combined Copilot eligibility answer from the single-question flow.
	 * Kept so saved sessionStorage payloads can migrate: a saved answer seeds
	 * both split questions below.
	 */
	copilotEligible?: boolean | null;
	/**
	 * Copilot Step 2 — Copilot Specialization or Copilot Jumpstart Ready (or
	 * higher tier). A Yes unlocks BOTH Copilot accelerators (M365 Copilot and
	 * Agent Solution).
	 */
	copilotSpecialization: boolean | null;
	/**
	 * Copilot Step 2 — Business Applications Specialization. On its own it
	 * gates only the Agent Solution Deployment Accelerator.
	 */
	copilotBusinessSpecialization: boolean | null;
	/** Copilot engagements the partner plans to deliver. */
	copilotEngagements: MciEngagementId[];
	/**
	 * Per-engagement Yes/No answers backing the Copilot deliver questions.
	 * `copilotEngagements` stays the source of truth for what was committed to;
	 * this only records that a question was answered, so an untouched engagement
	 * renders blank rather than a pre-selected "No" — matching the Security and
	 * AI-Productivity deliver questions. A missing entry means "not yet asked".
	 */
	copilotEngagementAnswers: Partial<Record<MciEngagementId, boolean>>;
	/** Security Step 2 — active Microsoft Security Partner Designation. */
	securityDesignation: boolean | null;
	/** Security — partner confirms they will deliver the Defender/Purview engagement. */
	securityDeliver: boolean | null;
	/** Security Step 3 — deployment displaces 25+ SentinelOne seats. */
	sentinelDisplacement: boolean | null;
	/** AI-Productivity Step 2 — active Microsoft Modern Work Solutions Partner Designation. */
	aiProductivityDesignation: boolean | null;
	/** AI-Productivity — partner confirms they will deliver the CSP BP Deployment Accelerator. */
	aiProductivityDeliver: boolean | null;
	/** AI-Productivity Step 3 — deployment displaces 25+ Google Workspace seats. */
	googleWorkspaceDisplacement: boolean | null;
}

export const DEFAULT_MCI_ENGAGEMENT_SELECTION: MciEngagementSelection = {
	categories: [],
	category: null,
	copilotSpecialization: null,
	copilotBusinessSpecialization: null,
	copilotEngagements: [],
	copilotEngagementAnswers: {},
	securityDesignation: null,
	securityDeliver: null,
	sentinelDisplacement: null,
	aiProductivityDesignation: null,
	aiProductivityDeliver: null,
	googleWorkspaceDisplacement: null,
};

function getUniqueValidCategories(
	selection: Partial<MciEngagementSelection> | null | undefined,
): MciEngagementCategory[] {
	if (!selection) return [];

	if (Array.isArray(selection.categories)) {
		const selected = new Set(
			selection.categories.filter(isMciEngagementCategory),
		);
		return MCI_ENGAGEMENT_CATEGORIES.filter((category) =>
			selected.has(category),
		);
	}

	return isMciEngagementCategory(selection.category)
		? [selection.category]
		: [];
}

export function getMciEngagementCategories(
	selection: MciEngagementSelection | null | undefined,
): MciEngagementCategory[] {
	return getUniqueValidCategories(selection);
}

export function normalizeMciEngagementSelection(
	selection: Partial<MciEngagementSelection> | null | undefined,
): MciEngagementSelection {
	const categories = getUniqueValidCategories(selection);
	const base = selection
		? { ...DEFAULT_MCI_ENGAGEMENT_SELECTION, ...selection }
		: DEFAULT_MCI_ENGAGEMENT_SELECTION;
	const copilotEngagements = Array.isArray(base.copilotEngagements)
		? base.copilotEngagements.filter(
				(id) =>
					isMciEngagementId(id) && MCI_ENGAGEMENTS[id].category === 'copilot',
			)
		: [];
	// Legacy payloads answered a single combined eligibility question; seed both
	// split questions from that answer so the saved branch state is preserved.
	const legacyCopilotEligible =
		typeof base.copilotEligible === 'boolean' ? base.copilotEligible : null;
	const copilotSpecialization =
		typeof base.copilotSpecialization === 'boolean'
			? base.copilotSpecialization
			: legacyCopilotEligible;
	const copilotBusinessSpecialization =
		typeof base.copilotBusinessSpecialization === 'boolean'
			? base.copilotBusinessSpecialization
			: legacyCopilotEligible;

	// Keep the answers map in step with the committed list: every committed
	// engagement is a Yes, and a saved payload from before this map existed
	// reconstructs its Yes answers from the list alone.
	const savedAnswers =
		base.copilotEngagementAnswers &&
		typeof base.copilotEngagementAnswers === 'object'
			? base.copilotEngagementAnswers
			: {};
	const copilotEngagementAnswers: Partial<Record<MciEngagementId, boolean>> = {};
	for (const [id, answer] of Object.entries(savedAnswers)) {
		if (
			isMciEngagementId(id) &&
			MCI_ENGAGEMENTS[id].category === 'copilot' &&
			typeof answer === 'boolean'
		) {
			copilotEngagementAnswers[id] = answer;
		}
	}
	for (const id of copilotEngagements) {
		copilotEngagementAnswers[id] = true;
	}

	return {
		...base,
		categories,
		category: categories[0] ?? null,
		copilotSpecialization,
		copilotBusinessSpecialization,
		copilotEngagements,
		copilotEngagementAnswers,
	};
}

/**
 * Flat engagement amount in the given proposal currency: the region's market
 * tier resolves the USD figure, then the MCI rate converts it to the display
 * currency. `regionCountry` should be the pricing context's `regionCountry`
 * so a display-currency override changes only the conversion, not the tier.
 */
export function getMciEngagementAmount(
	id: MciEngagementId,
	currency: RegionalCurrencyCode | string | undefined,
	regionCountry?: RegionalPricingCountry | string | null,
): number {
	const def = MCI_ENGAGEMENTS[id];
	if (!def) return 0;
	const tier = getMciMarketTier(regionCountry, currency);
	const usdAmount = def.usdAmountByMarketTier[tier];
	const rate =
		typeof currency === 'string' &&
		Object.prototype.hasOwnProperty.call(MCI_USD_RATE_BY_CURRENCY, currency)
			? MCI_USD_RATE_BY_CURRENCY[currency as RegionalCurrencyCode]
			: 1;
	return Math.round((usdAmount * rate + Number.EPSILON) * 100) / 100;
}

/**
 * The engagement IDs the partner has actually committed to, derived from the
 * questionnaire answers. Mirrors the branch/step rules of the panel so the
 * total can be recomputed anywhere (assets summary, backend) from the raw
 * selection alone.
 */
export function getSelectedMciEngagementIds(
	selection: MciEngagementSelection | null | undefined,
): MciEngagementId[] {
	if (!selection) return [];
	const categories = new Set(getUniqueValidCategories(selection));
	const ids: MciEngagementId[] = [];

	if (categories.has('copilot')) {
		const copilotEngagements = Array.isArray(selection.copilotEngagements)
			? selection.copilotEngagements
			: [];
		// A Copilot Specialization / Jumpstart "Yes" unlocks both accelerators;
		// a Business Applications "Yes" unlocks only the Agent accelerator. Fall
		// back to the legacy combined answer for payloads that predate the split.
		const m365Eligible =
			selection.copilotSpecialization ?? selection.copilotEligible ?? null;
		const agentEligible =
			m365Eligible === true ||
			(selection.copilotBusinessSpecialization ??
				selection.copilotEligible ??
				null);
		if (m365Eligible === true && copilotEngagements.includes('copilot-m365')) {
			ids.push('copilot-m365');
		}
		if (
			agentEligible === true &&
			copilotEngagements.includes('copilot-agent')
		) {
			ids.push('copilot-agent');
		}
	}

	if (
		categories.has('security') &&
		selection.securityDesignation === true &&
		selection.securityDeliver === true
	) {
		ids.push('security-defender-purview');
		if (selection.sentinelDisplacement === true) {
			ids.push('security-conversion-bonus');
		}
	}

	if (
		categories.has('ai-productivity') &&
		selection.aiProductivityDesignation === true &&
		selection.aiProductivityDeliver === true
	) {
		ids.push('ai-productivity-deployment');
		if (selection.googleWorkspaceDisplacement === true) {
			ids.push('ai-productivity-conversion-bonus');
		}
	}

	return ids;
}

/** Sum of the selected engagements' flat amounts in the proposal currency. */
export function getMciEngagementTotal(
	selection: MciEngagementSelection | null | undefined,
	currency: RegionalCurrencyCode | string | undefined,
	regionCountry?: RegionalPricingCountry | string | null,
): number {
	return getSelectedMciEngagementIds(selection).reduce(
		(sum, id) => sum + getMciEngagementAmount(id, currency, regionCountry),
		0,
	);
}

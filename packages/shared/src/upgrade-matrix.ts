import type { EndingSku, StartingSku, UpgradeType } from '@repo/types';

const UPGRADE_TYPE = {
	AI: 'AI' as unknown as UpgradeType,
	SECURITY: 'Security' as unknown as UpgradeType,
} as const;

export const STARTING_SKUS: StartingSku[] = [
	{ id: 'bb', name: 'Business Basic', monthlyPrice: 7.0 },
	{ id: 'bs', name: 'Business Standard', monthlyPrice: 14.0 },
	{ id: 'bp', name: 'Business Premium', monthlyPrice: 22.0 },
	{ id: 'other', name: 'Other', monthlyPrice: 0 },
];

export const ENDING_SKUS: EndingSku[] = [
	{
		id: 'bs_cb',
		name: 'Microsoft 365 Business Standard with Copilot',
		upgradeType: UPGRADE_TYPE.AI,
		listPrice: 23.5,
		promoPrice: 23.5,
		tagline: 'Unlock AI-powered Productivity',
		oneLiner:
			'bring generative AI directly into the Microsoft 365 apps people use every day',
		// Copy below is the Business Standard starting-SKU variant; Business
		// Basic customers get an override (see ENDING_SKU_COPY_OVERRIDES) that
		// leads with the desktop Office apps they gain in the move.
		description:
			'Entry point for Business Standard customers who would like to get started with AI',
		planHighlights: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Built-in security and observability to protect sensitive data',
		],
		solutionCapabilities: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Built-in security and observability to protect sensitive data',
		],
	},
	{
		id: 'bp_cb',
		name: 'Microsoft 365 Business Premium with Copilot',
		upgradeType: UPGRADE_TYPE.AI,
		listPrice: 32,
		promoPrice: 32,
		tagline: 'Unlock Secure AI Transformation',
		oneLiner:
			'combine AI-powered productivity and strong security controls in one solution',
		description:
			'Hero motion to provide an AI productivity upgrade while ensuring foundational security and compliance',
		planHighlights: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Advanced security and device management so sensitive data stays protected',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
		solutionCapabilities: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Advanced security and device management so sensitive data stays protected',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
	},
	{
		id: 'bp_cb_purview',
		name: 'Microsoft 365 Business Premium with Copilot + Purview Suite',
		upgradeType: UPGRADE_TYPE.AI,
		// $42 = BP with Copilot ($32) + Purview Suite ($10). Copilot and Purview
		// together earn a 50% promo discount on the Purview portion → 42 − 5.
		listPrice: 42,
		promoPrice: 37,
		tagline: 'Enhance Security and AI Productivity',
		oneLiner:
			'deliver the most secure AI experience to your employees and automatically protect sensitive data',
		description:
			'One comprehensive solution to deliver the most secure AI experience, protecting sensitive data while unlocking intelligent workflows',
		planHighlights: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Tools to discover risks and apply controls to strengthen sensitive data protection and ensure compliance',
		],
		solutionCapabilities: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Tools to discover risks and apply controls to strengthen sensitive data protection and ensure compliance',
		],
	},
	{
		id: 'bp_defender',
		name: 'Microsoft 365 Business Premium + Defender Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite-portion discount was retired; only
		// bp_cb_purview (Copilot + Purview together) keeps a promo.
		listPrice: 32,
		promoPrice: 32,
		tagline: 'Elevate Threat Protection',
		oneLiner: 'strengthen security across devices, email, identities, and apps',
		description:
			'Enterprise-grade threat protection across endpoints, email, identities, and cloud apps',
		planHighlights: [
			'Advanced email and collaboration security with automated investigation and response',
			'Risk-based conditional access, ID Governance and Privileged Identity Management',
			'Endpoint detection and response, automated investigation and advanced threat hunting',
			'Risk-based SaaS app protection with rich visibility, control over data travel, and analytics',
		],
		solutionCapabilities: [
			'Advanced email and collaboration security with automated investigation and response',
			'Risk-based conditional access, ID Governance and Privileged Identity Management',
			'Endpoint detection and response, automated investigation and advanced threat hunting',
			'Risk-based SaaS app protection with rich visibility, control over data travel, and analytics',
		],
	},
	{
		id: 'bp_purview',
		name: 'Microsoft 365 Business Premium + Purview Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite-portion discount was retired; only
		// bp_cb_purview (Copilot + Purview together) keeps a promo.
		listPrice: 32,
		promoPrice: 32,
		tagline: 'Elevate Compliance and Governance',
		oneLiner:
			'secure, govern, and ensure compliance across your entire data estate',
		description:
			'Enterprise-grade solution to manage risks, protect and govern sensitive data, and respond to regulatory requirements',
		planHighlights: [
			'Sensitive data protection across clouds, apps, and endpoints',
			'Risk-based identity protection & privilege management',
			'Investigation and response to legal requirements with relevant data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Risk discovery, protection, and governance for safe AI use',
		],
		solutionCapabilities: [
			'Sensitive data protection across clouds, apps, and endpoints',
			'Risk-based identity protection & privilege management',
			'Investigation and response to legal requirements with relevant data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Risk discovery, protection, and governance for safe AI use',
		],
	},
	{
		id: 'bp_defender_purview',
		name: 'Microsoft 365 Business Premium + Defender Suite + Purview Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite-portion discount was retired; only
		// bp_cb_purview (Copilot + Purview together) keeps a promo.
		listPrice: 37,
		promoPrice: 37,
		tagline: 'Elevate Security and Compliance',
		oneLiner:
			'build enterprise-grade security and compliance while optimizing licensing cost by up to 68%',
		description:
			'Comprehensive solution for protection across internal and external threats and compliance management',
		planHighlights: [
			'Unified protection across identities, devices, email, and SaaS',
			'Classification, protection, and management of sensitive data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
		solutionCapabilities: [
			'Unified protection across identities, devices, email, and SaaS',
			'Classification, protection, and management of sensitive data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
	},
	{
		id: 'bb_cb',
		name: 'Microsoft 365 Business Basic + Microsoft 365 Copilot Business',
		upgradeType: UPGRADE_TYPE.AI,
		listPrice: 28,
		promoPrice: 21,
		tagline: 'Unlock Secure AI Transformation',
		oneLiner:
			'bring generative AI directly into the Microsoft 365 apps people use every day',
		description:
			'Entry point for Business Basic customers who would like to get started with AI',
		planHighlights: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Built-in security and observability to protect sensitive data',
		],
		solutionCapabilities: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Built-in security and observability to protect sensitive data',
		],
	},
	{
		id: 'attach_copilot',
		name: 'Attach Copilot',
		upgradeType: UPGRADE_TYPE.AI,
		listPrice: 21,
		promoPrice: 18,
		isAddOn: true,
		tagline: 'Unlock AI-powered Productivity',
		oneLiner:
			'bring generative AI directly into the Microsoft 365 apps people use every day',
		// End state matches "Business Premium with Copilot" — mirror bp_cb copy.
		description:
			'Hero motion to provide an AI productivity upgrade while ensuring foundational security and compliance',
		planHighlights: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Advanced security and device management so sensitive data stays protected',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
		solutionCapabilities: [
			'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
			'Built-in agents and agentic templates to automate routine tasks',
			'Advanced security and device management so sensitive data stays protected',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
	},
	{
		id: 'attach_purview',
		name: 'Attach Purview Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite discount was retired; only bp_cb_purview
		// (Copilot + Purview together) keeps a promo.
		listPrice: 10,
		promoPrice: 10,
		isAddOn: true,
		// Tagline/oneLiner were previously swapped with attach_defender's —
		// this SKU attaches the Purview (compliance) suite.
		tagline: 'Elevate Compliance and Governance',
		oneLiner:
			'secure, govern, and ensure compliance across your entire data estate',
		// End state matches "Business Premium + Purview Suite" — mirror
		// bp_purview copy.
		description:
			'Enterprise-grade solution to manage risks, protect and govern sensitive data, and respond to regulatory requirements',
		planHighlights: [
			'Sensitive data protection across clouds, apps, and endpoints',
			'Risk-based identity protection & privilege management',
			'Investigation and response to legal requirements with relevant data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Risk discovery, protection, and governance for safe AI use',
		],
		solutionCapabilities: [
			'Sensitive data protection across clouds, apps, and endpoints',
			'Risk-based identity protection & privilege management',
			'Investigation and response to legal requirements with relevant data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Risk discovery, protection, and governance for safe AI use',
		],
	},
	{
		// Combined Defender + Purview attach for Business Premium customers.
		// Priced from apps/Book 22.xlsx ("Microsoft Defender and Purview Suites
		// for Microsoft 365 Business Premium") — cheaper than the sum of the two
		// single attach SKUs.
		id: 'attach_defender_purview',
		name: 'Attach Defender Suite + Purview Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite discount was retired; only bp_cb_purview
		// (Copilot + Purview together) keeps a promo.
		listPrice: 15,
		promoPrice: 15,
		isAddOn: true,
		tagline: 'Elevate Security and Compliance',
		oneLiner:
			'build enterprise-grade security and compliance while optimizing licensing cost by up to 68%',
		// End state matches "Business Premium + Purview Suite + Defender Suite"
		// — mirror bp_defender_purview copy.
		description:
			'Comprehensive solution for protection across internal and external threats and compliance management',
		planHighlights: [
			'Unified protection across identities, devices, email, and SaaS',
			'Classification, protection, and management of sensitive data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
		solutionCapabilities: [
			'Unified protection across identities, devices, email, and SaaS',
			'Classification, protection, and management of sensitive data',
			'Built-in assessments and actions for 350+ regional regulations',
			'Integrated tooling to reduce toggling and reduce licensing cost',
		],
	},
	{
		id: 'attach_defender',
		name: 'Attach Defender Suite',
		upgradeType: UPGRADE_TYPE.SECURITY,
		// No promo — the 7.5% suite discount was retired; only bp_cb_purview
		// (Copilot + Purview together) keeps a promo.
		listPrice: 10,
		promoPrice: 10,
		isAddOn: true,
		// Tagline/oneLiner were previously swapped with attach_purview's —
		// this SKU attaches the Defender (threat protection) suite.
		tagline: 'Elevate Threat Protection',
		oneLiner: 'strengthen security across devices, email, identities, and apps',
		// End state matches "Business Premium + Defender Suite" — mirror
		// bp_defender copy.
		description:
			'Enterprise-grade threat protection across endpoints, email, identities, and cloud apps',
		planHighlights: [
			'Advanced email and collaboration security with automated investigation and response',
			'Risk-based conditional access, ID Governance and Privileged Identity Management',
			'Endpoint detection and response, automated investigation and advanced threat hunting',
			'Risk-based SaaS app protection with rich visibility, control over data travel, and analytics',
		],
		solutionCapabilities: [
			'Advanced email and collaboration security with automated investigation and response',
			'Risk-based conditional access, ID Governance and Privileged Identity Management',
			'Endpoint detection and response, automated investigation and advanced threat hunting',
			'Risk-based SaaS app protection with rich visibility, control over data travel, and analytics',
		],
	},
];

export interface EndingSkuCopy {
	description: string;
	planHighlights: string[];
	solutionCapabilities: string[];
}

/**
 * Customer-facing copy overrides keyed by ending SKU id → starting SKU id.
 *
 * `bs_cb` (Business Standard + Copilot Business) reads differently when the
 * customer starts on Business Basic: the move also unlocks the desktop
 * Office apps, so the description and highlights lead with that. The base
 * copy on the `bs_cb` entry in `ENDING_SKUS` covers the Business Standard
 * (and any other) starting point.
 */
const ENDING_SKU_COPY_OVERRIDES: Record<
	string,
	Record<string, EndingSkuCopy>
> = {
	bs_cb: {
		bb: {
			description:
				'Entry point to get started with AI along with access to Office applications across desktop, mobile, and web',
			planHighlights: [
				'Desktop versions of Word, Excel, PowerPoint, and Outlook',
				'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
				'Built-in agents and agentic templates to automate routine tasks',
				'Built-in security and observability to protect sensitive data',
			],
			solutionCapabilities: [
				'Desktop versions of Word, Excel, PowerPoint, and Outlook',
				'AI embedded in everyday applications such as Outlook, Word, Excel, and Teams',
				'Built-in agents and agentic templates to automate routine tasks',
				'Built-in security and observability to protect sensitive data',
			],
		},
	},
};

/**
 * Returns the ending SKU with its description/plan highlights/solution
 * capabilities adjusted for the customer's starting SKU, when a
 * starting-SKU-specific variant exists. Pricing and identity fields are
 * never changed.
 */
export function resolveEndingSkuCopy(
	endingSku: EndingSku,
	startingSkuId?: string | null,
): EndingSku {
	const override =
		startingSkuId != null
			? ENDING_SKU_COPY_OVERRIDES[endingSku.id]?.[startingSkuId]
			: undefined;
	return override == null ? endingSku : { ...endingSku, ...override };
}

export const VALID_UPGRADE_PATHS: Record<string, string[]> = {
	bb: [
		'bp_cb',
		'bp_cb_purview',
		'bb_cb',
		'bs_cb',
		'bp_purview',
		'bp_defender',
		'bp_defender_purview',
	],
	bs: [
		'bp_cb',
		'bp_cb_purview',
		'bs_cb',
		'bp_purview',
		'bp_defender',
		'bp_defender_purview',
	],
	bp: [
		'bp_cb',
		'bp_cb_purview',
		'attach_purview',
		'attach_defender',
		'attach_defender_purview',
	],
	other: [
		'bp_cb',
		'bp_cb_purview',
		'bb_cb',
		'bs_cb',
		'bp_purview',
		'bp_defender',
		'bp_defender_purview',
	],
};

export const UPGRADE_PRICING_MATRIX: Record<
	string,
	Record<string, number | null>
> = {
	bb: {
		bb_cb: 14.0,
		bs_cb: 16.5,
		bp_cb: 25.0,
		bp_cb_purview: 30.0,
		bp_defender: 25.0,
		bp_purview: 25.0,
		bp_defender_purview: 30.0,
		attach_copilot: 18.0,
		attach_purview: 10.0,
		attach_defender: 10.0,
		attach_defender_purview: 15.0,
	},
	bs: {
		bb_cb: null,
		bs_cb: 9.5,
		bp_cb: 18.0,
		bp_cb_purview: 23.0,
		bp_defender: 18.0,
		bp_purview: 18.0,
		bp_defender_purview: 23.0,
		attach_copilot: 18.0,
		attach_purview: 10.0,
		attach_defender: 10.0,
		attach_defender_purview: 15.0,
	},
	bp: {
		bb_cb: null,
		bs_cb: null,
		bp_cb: 10.0,
		bp_cb_purview: 15.0,
		bp_defender: 10.0,
		bp_purview: 10.0,
		bp_defender_purview: 15.0,
		attach_copilot: 18.0,
		attach_purview: 10.0,
		attach_defender: 10.0,
		attach_defender_purview: 15.0,
	},
	other: {
		bb_cb: 28.0,
		bs_cb: 23.5,
		bp_cb: 32.0,
		bp_cb_purview: 37.0,
		bp_defender: 32.0,
		bp_purview: 32.0,
		bp_defender_purview: 37.0,
		attach_copilot: 18.0,
		attach_purview: 10.0,
		attach_defender: 10.0,
		attach_defender_purview: 15.0,
	},
};

export type PartnerTypeKey = 'CSP Direct' | 'CSP Indirect';

export interface IncentiveRateSet {
	cspCore: number;
	strategicAccelerator: number;
	growthAccelerator: number;
}

/**
 * CSP incentive rates now differ by partner type:
 *
 *                 | CSP Core | Strategic Accelerator | Growth Accelerator
 *   CSP Direct    |   2.5%   |         2.5%           |        10%
 *   CSP Indirect  |   0%     |         2.5%           |       12.5%
 *
 * Strategic Accelerator applies to every starting SKU EXCEPT Business Basic
 * (`bb`) and Business Standard (`bs`); Growth Accelerator applies to the
 * target (upgrade) leg only.
 */
export const INCENTIVE_RATES_BY_PARTNER_TYPE: Record<
	PartnerTypeKey,
	IncentiveRateSet
> = {
	'CSP Direct': {
		cspCore: 0.025,
		strategicAccelerator: 0.025,
		growthAccelerator: 0.1,
	},
	'CSP Indirect': {
		cspCore: 0.0,
		strategicAccelerator: 0.025,
		growthAccelerator: 0.125,
	},
};

export function getIncentiveRates(
	partnerType?: string | null,
): IncentiveRateSet {
	return partnerType === 'CSP Indirect'
		? INCENTIVE_RATES_BY_PARTNER_TYPE['CSP Indirect']
		: INCENTIVE_RATES_BY_PARTNER_TYPE['CSP Direct'];
}

/**
 * Default incentive rates (CSP Direct). Retained for back-compat with call
 * sites that display a nominal rate without a partner-type context. Prefer
 * `getIncentiveRates(partnerType)` or the per-scenario rate fields on
 * `ScenarioEconomics`.
 */
export const INCENTIVE_RATES = {
	cspCore: 0.025,
	strategicAccelerator: 0.025,
	growthAccelerator: 0.1,
	totalRate: 0.15,
} as const;

export const NEW_CUSTOMER_INCENTIVE_RATE = 0.02;

/**
 * Ending SKU IDs — Strategic Accelerator now gates on the STARTING SKU
 * (any except `bb`/`bs`) rather than the ending SKU, so every ending SKU is
 * eligible on the target leg. Kept for back-compat with callers that expect
 * this membership set.
 */
export const STRATEGIC_ACCELERATOR_SKU_IDS: ReadonlySet<string> = new Set([
	'bb_cb',
	'bs_cb',
	'bp_cb',
	'bp_cb_purview',
	'bp_defender',
	'bp_purview',
	'bp_defender_purview',
	'attach_copilot',
	'attach_purview',
	'attach_defender',
	'attach_defender_purview',
]);

/**
 * Starting SKU IDs that do NOT qualify for Strategic Accelerator. The
 * accelerator now applies to every starting SKU EXCEPT Business Basic (`bb`)
 * and Business Standard (`bs`).
 */
export const STRATEGIC_ACCELERATOR_EXCLUDED_STARTING_SKU_IDS: ReadonlySet<string> =
	new Set(['bb', 'bs']);

/**
 * Whether a starting SKU qualifies for the Strategic Accelerator. True for
 * every starting SKU except Business Basic (`bb`) and Business Standard (`bs`)
 * — i.e. Business Premium (`bp`) renewals and `other`/new-customer scenarios
 * both earn it, while `bb`/`bs` upgrade legs do not.
 */
export function isStrategicAcceleratorStartingSku(
	startingSkuId?: string | null,
): boolean {
	return (
		startingSkuId != null &&
		!STRATEGIC_ACCELERATOR_EXCLUDED_STARTING_SKU_IDS.has(startingSkuId)
	);
}

/**
 * Bundle ending SKU → its attach counterpart. The two are parallel
 * representations of the same end state: `bp_*` bundles are offered to
 * `bb`/`bs`/`other` starters, the attach add-ons to `bp` starters. Download
 * lists therefore only show the bundle, and select the attach SKU alongside it
 * so `bp` customers are still covered.
 */
export const ATTACH_SKU_ID_BY_BUNDLE_SKU_ID: Readonly<Record<string, string>> =
	{
		bp_defender: 'attach_defender',
		bp_purview: 'attach_purview',
		bp_defender_purview: 'attach_defender_purview',
	};

/**
 * Expands a user-facing selection of ending SKU IDs to include the attach SKU
 * that each selected bundle implies. Order is preserved and duplicates are
 * collapsed.
 */
export function expandSkuIdsWithAttachSkus(
	selectedSkuIds: readonly string[],
): string[] {
	const expanded: string[] = [];
	for (const skuId of selectedSkuIds) {
		if (!expanded.includes(skuId)) expanded.push(skuId);
		const attachSkuId = ATTACH_SKU_ID_BY_BUNDLE_SKU_ID[skuId];
		if (attachSkuId && !expanded.includes(attachSkuId)) {
			expanded.push(attachSkuId);
		}
	}
	return expanded;
}

export const STARTING_SKU_BY_ID = new Map(
	STARTING_SKUS.map((sku) => [sku.id, sku]),
);

export const ENDING_SKU_BY_ID = new Map(
	ENDING_SKUS.map((sku) => [sku.id, sku]),
);

// Maps ending-SKU ids (from `packages/shared/src/upgrade-matrix.ts`)
// onto translation keys in `messages/<locale>.json`. Consumers use these
// instead of the English strings baked into the shared data so plan
// descriptions and bullet lists localize.

type EndingSkuId =
	| 'bs_cb'
	| 'bb_cb'
	| 'bp_cb'
	| 'bp_cb_purview'
	| 'bp_defender'
	| 'bp_purview'
	| 'bp_defender_purview'
	| 'attach_copilot'
	| 'attach_purview'
	| 'attach_defender'
	| 'attach_defender_purview';

// Attach SKUs land the customer on the same end state as their bp_*
// counterparts, so they share the same copy keys.
export const PLAN_DESCRIPTION_KEY: Record<EndingSkuId, string> = {
	bs_cb: 'proposal.plans.copilotBusiness.description',
	bb_cb: 'proposal.plans.basicCopilot.description',
	bp_cb: 'proposal.plans.copilotBusinessSecurity.description',
	bp_cb_purview: 'proposal.plans.businessE5.description',
	bp_defender: 'proposal.plans.businessPremium.description',
	bp_purview: 'proposal.plans.complianceE5.description',
	bp_defender_purview: 'proposal.plans.businessSecurityCompliance.description',
	attach_copilot: 'proposal.plans.copilotBusinessSecurity.description',
	attach_purview: 'proposal.plans.complianceE5.description',
	attach_defender: 'proposal.plans.businessPremium.description',
	attach_defender_purview:
		'proposal.plans.businessSecurityCompliance.description',
};

const COPILOT_BUSINESS_HIGHLIGHTS = [
	'proposal.features.aiEmbeddedEverydayApps',
	'proposal.features.builtInAgentsTemplates',
	'proposal.features.builtInSecurityObservability',
];

const BP_CB_HIGHLIGHTS = [
	'proposal.features.aiEmbeddedEverydayApps',
	'proposal.features.builtInAgentsTemplates',
	'proposal.features.advancedSecurityDeviceManagement',
	'proposal.features.integratedToolingReduceCost',
];

const BP_DEFENDER_HIGHLIGHTS = [
	'proposal.features.advancedEmailCollabSecurity',
	'proposal.features.riskBasedConditionalAccess',
	'proposal.features.endpointDetectionResponse',
	'proposal.features.riskBasedSaasProtection',
];

const BP_PURVIEW_HIGHLIGHTS = [
	'proposal.features.sensitiveDataProtectionEverywhere',
	'proposal.features.riskBasedIdentityProtection',
	'proposal.features.legalInvestigationResponse',
	'proposal.features.regionalRegulationAssessments',
	'proposal.features.safeAiGovernance',
];

const BP_DEFENDER_PURVIEW_HIGHLIGHTS = [
	'proposal.features.unifiedProtectionAcrossSurfaces',
	'proposal.features.sensitiveDataClassification',
	'proposal.features.regionalRegulationAssessments',
	'proposal.features.integratedToolingReduceCost',
];

export const PLAN_HIGHLIGHTS_KEYS: Record<EndingSkuId, string[]> = {
	bs_cb: COPILOT_BUSINESS_HIGHLIGHTS,
	bb_cb: COPILOT_BUSINESS_HIGHLIGHTS,
	bp_cb: BP_CB_HIGHLIGHTS,
	bp_cb_purview: [
		'proposal.features.aiEmbeddedEverydayApps',
		'proposal.features.builtInAgentsTemplates',
		'proposal.features.discoverRisksApplyControls',
	],
	bp_defender: BP_DEFENDER_HIGHLIGHTS,
	bp_purview: BP_PURVIEW_HIGHLIGHTS,
	bp_defender_purview: BP_DEFENDER_PURVIEW_HIGHLIGHTS,
	attach_copilot: BP_CB_HIGHLIGHTS,
	attach_purview: BP_PURVIEW_HIGHLIGHTS,
	attach_defender: BP_DEFENDER_HIGHLIGHTS,
	attach_defender_purview: BP_DEFENDER_PURVIEW_HIGHLIGHTS,
};

// `bs_cb` copy varies by the customer's starting SKU: Business Basic
// customers also gain the desktop Office apps in the move, so the
// description and highlights lead with that (mirrors
// ENDING_SKU_COPY_OVERRIDES in `packages/shared/src/upgrade-matrix.ts`).
const PLAN_DESCRIPTION_KEY_BY_STARTING_SKU: Partial<
	Record<EndingSkuId, Record<string, string>>
> = {
	bs_cb: { bb: 'proposal.plans.copilotBusinessFromBasic.description' },
};

const PLAN_HIGHLIGHTS_KEYS_BY_STARTING_SKU: Partial<
	Record<EndingSkuId, Record<string, string[]>>
> = {
	bs_cb: {
		bb: [
			'proposal.features.desktopOfficeApps',
			...COPILOT_BUSINESS_HIGHLIGHTS,
		],
	},
};

export function getPlanDescriptionKey(
	endingSkuId: EndingSkuId,
	startingSkuId?: string | null,
): string {
	return (
		(startingSkuId != null
			? PLAN_DESCRIPTION_KEY_BY_STARTING_SKU[endingSkuId]?.[startingSkuId]
			: undefined) ?? PLAN_DESCRIPTION_KEY[endingSkuId]
	);
}

export function getPlanHighlightKeys(
	endingSkuId: EndingSkuId,
	startingSkuId?: string | null,
): string[] {
	return (
		(startingSkuId != null
			? PLAN_HIGHLIGHTS_KEYS_BY_STARTING_SKU[endingSkuId]?.[startingSkuId]
			: undefined) ?? PLAN_HIGHLIGHTS_KEYS[endingSkuId]
	);
}

export function isKnownEndingSku(id: string): id is EndingSkuId {
	return id in PLAN_DESCRIPTION_KEY;
}

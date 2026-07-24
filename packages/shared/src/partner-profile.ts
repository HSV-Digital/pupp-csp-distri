import {
	MCI_ENGAGEMENTS,
	isMciEngagementId,
	type MciEngagementCategory,
	type MciEngagementId,
} from './mci-engagements';

/**
 * The partner's one-time profile: the facts about the partner organization
 * (CSP relationship, designations, specializations, Copilot Jumpstart tier,
 * default ERP margin, logo) that used to be re-asked on every proposal. Deal
 * facts — funded engagement, new-customer incentive, distributor, conversion
 * displacements — stay per-proposal and are NOT part of this profile.
 *
 * The profile is stored per organization (reseller_partner_profile, 1:1 with
 * reseller_organization). MCI engagement eligibility is DERIVED from it via
 * getEligibleMciEngagementIds; the full designation/specialization lists are
 * collected up front so a future engagement can be mapped without asking
 * partners to fill anything again.
 */

export type PartnerType = 'CSP Direct' | 'CSP Indirect';

export const PARTNER_TYPES: readonly PartnerType[] = [
	'CSP Direct',
	'CSP Indirect',
];

export function isPartnerType(value: unknown): value is PartnerType {
	return (
		typeof value === 'string' && PARTNER_TYPES.includes(value as PartnerType)
	);
}

export type PartnerDesignation =
	| 'modern-work'
	| 'microsoft-security'
	| 'business-applications';

export const PARTNER_DESIGNATIONS: readonly PartnerDesignation[] = [
	'modern-work',
	'microsoft-security',
	'business-applications',
];

export const PARTNER_DESIGNATION_LABELS: Record<PartnerDesignation, string> = {
	'modern-work': 'Modern Work',
	'microsoft-security': 'Microsoft Security',
	'business-applications': 'Business Applications',
};

export function isPartnerDesignation(
	value: unknown,
): value is PartnerDesignation {
	return (
		typeof value === 'string' &&
		PARTNER_DESIGNATIONS.includes(value as PartnerDesignation)
	);
}

/**
 * Solution areas that group the Microsoft specializations. Ids are
 * area-prefixed (`modern-work:copilot`) because the same specialization name
 * can exist under two areas (Copilot exists under Modern Work and, as
 * "Microsoft Copilot", under Business Applications) and eligibility rules
 * care which area a specialization belongs to.
 */
export type SpecializationArea =
	| 'modern-work'
	| 'business-applications'
	| 'microsoft-security';

export const SPECIALIZATION_AREAS: readonly SpecializationArea[] = [
	'modern-work',
	'business-applications',
	'microsoft-security',
];

export const SPECIALIZATION_AREA_LABELS: Record<SpecializationArea, string> = {
	'modern-work': 'Modern Work',
	'business-applications': 'Business Applications',
	'microsoft-security': 'Microsoft Security',
};

export const SPECIALIZATIONS = [
	{
		id: 'modern-work:adoption-change-management',
		area: 'modern-work',
		label: 'Modern Work Adoption and Change Management',
	},
	{
		id: 'modern-work:calling-for-teams',
		area: 'modern-work',
		label: 'Calling for Microsoft Teams',
	},
	{
		id: 'modern-work:custom-solutions-for-teams',
		area: 'modern-work',
		label: 'Custom Solutions for Microsoft Teams',
	},
	{
		id: 'modern-work:meetings-meeting-rooms',
		area: 'modern-work',
		label: 'Meetings and Meeting Rooms for Microsoft Teams',
	},
	{
		id: 'modern-work:modernize-endpoints',
		area: 'modern-work',
		label: 'Modernize Endpoints',
	},
	{
		id: 'modern-work:secure-ai-productivity',
		area: 'modern-work',
		label: 'Secure AI Productivity (formerly Teamwork Deployment)',
	},
	{ id: 'modern-work:copilot', area: 'modern-work', label: 'Copilot' },
	{
		id: 'modern-work:digital-sovereignty',
		area: 'modern-work',
		label: 'Digital Sovereignty',
	},
	{
		id: 'business-applications:business-intelligence',
		area: 'business-applications',
		label: 'Business Intelligence',
	},
	{
		id: 'business-applications:finance',
		area: 'business-applications',
		label: 'Finance',
	},
	{
		id: 'business-applications:intelligent-automation',
		area: 'business-applications',
		label: 'Intelligent Automation',
	},
	{
		id: 'business-applications:low-code-application-development',
		area: 'business-applications',
		label: 'Low code Application Development',
	},
	{
		id: 'business-applications:microsoft-copilot',
		area: 'business-applications',
		label: 'Microsoft Copilot',
	},
	{
		id: 'business-applications:sales',
		area: 'business-applications',
		label: 'Sales',
	},
	{
		id: 'business-applications:service',
		area: 'business-applications',
		label: 'Service',
	},
	{
		id: 'business-applications:smb-management',
		area: 'business-applications',
		label: 'Small & Midsize Business Management',
	},
	{
		id: 'business-applications:supply-chain',
		area: 'business-applications',
		label: 'Supply Chain',
	},
	{
		id: 'microsoft-security:cloud-security',
		area: 'microsoft-security',
		label: 'Cloud Security',
	},
	{
		id: 'microsoft-security:identity-access-management',
		area: 'microsoft-security',
		label: 'Identity and Access Management',
	},
	{
		id: 'microsoft-security:data-security',
		area: 'microsoft-security',
		label: 'Data Security',
	},
	{
		id: 'microsoft-security:threat-protection',
		area: 'microsoft-security',
		label: 'Threat Protection',
	},
] as const satisfies readonly {
	id: string;
	area: SpecializationArea;
	label: string;
}[];

export type SpecializationId = (typeof SPECIALIZATIONS)[number]['id'];

export interface SpecializationDefinition {
	id: SpecializationId;
	area: SpecializationArea;
	label: string;
}

export const SPECIALIZATIONS_BY_AREA: Record<
	SpecializationArea,
	readonly SpecializationDefinition[]
> = {
	'modern-work': SPECIALIZATIONS.filter((s) => s.area === 'modern-work'),
	'business-applications': SPECIALIZATIONS.filter(
		(s) => s.area === 'business-applications',
	),
	'microsoft-security': SPECIALIZATIONS.filter(
		(s) => s.area === 'microsoft-security',
	),
};

const SPECIALIZATION_IDS = new Set<string>(SPECIALIZATIONS.map((s) => s.id));

export function isSpecializationId(value: unknown): value is SpecializationId {
	return typeof value === 'string' && SPECIALIZATION_IDS.has(value);
}

export interface PartnerProfile {
	partnerType: PartnerType;
	/**
	 * CSP Direct follow-up: "Do you hold a Modern Work or Security Solutions
	 * Partner designation?". null when the partner is CSP Indirect. Asked even
	 * though `designations` implies the answer — contradictions between the two
	 * are surfaced by getProfileContradictions rather than silently resolved.
	 */
	hasModernWorkOrSecurityDesignation: boolean | null;
	/**
	 * CSP Indirect follow-up: ">25 partner capability points in the Modern Work
	 * or Security solution area?". null when the partner is CSP Direct.
	 */
	hasOver25Points: boolean | null;
	designations: PartnerDesignation[];
	specializations: SpecializationId[];
	/** Enrolled in Copilot Jumpstart at Ready tier or higher. */
	copilotJumpstartReady: boolean;
	companyLogoUrl: string | null;
	/** Margin the partner typically applies on the ERP, in percent. */
	erpMarginPercent: number;
}

/**
 * Neutral placeholder rendered behind the profile-setup modal before the org
 * has saved a profile: passes no eligibility gate (no MCI dropdowns appear)
 * and keeps pricing at the program-default 20% margin.
 */
export const EMPTY_PARTNER_PROFILE: PartnerProfile = {
	partnerType: 'CSP Direct',
	hasModernWorkOrSecurityDesignation: null,
	hasOver25Points: null,
	designations: [],
	specializations: [],
	copilotJumpstartReady: false,
	companyLogoUrl: null,
	erpMarginPercent: 20,
};

/**
 * Canonical profile for the demo tenant: seed-demo-tenant.ts persists exactly
 * these values, and the demo UI falls back to them when no profile row exists
 * yet (the profile-setup gate must never appear in demo). The 20% margin
 * matches DEFAULT_CURRENT_SKU_MARGIN_PERCENT so demo pricing is identical to
 * the pre-profile behavior, and hasOver25Points keeps full MCI eligibility.
 */
export const DEMO_PARTNER_PROFILE: PartnerProfile = {
	partnerType: 'CSP Indirect',
	hasModernWorkOrSecurityDesignation: null,
	hasOver25Points: true,
	designations: ['modern-work', 'microsoft-security', 'business-applications'],
	specializations: [
		'modern-work:copilot',
		'modern-work:secure-ai-productivity',
		'business-applications:microsoft-copilot',
		'microsoft-security:threat-protection',
	],
	copilotJumpstartReady: true,
	companyLogoUrl: null,
	erpMarginPercent: 20,
};

export type PartnerProfileContradiction =
	/** Direct follow-up says Yes but designations name neither Modern Work nor Security. */
	| 'direct-follow-up-yes-without-designation'
	/** Direct follow-up says No but designations include Modern Work or Security. */
	| 'direct-follow-up-no-with-designation';

/**
 * Cross-field consistency issues in the profile answers. Shared by the form's
 * zod refinement and the API's DTO validation so client and server reject the
 * same payloads.
 */
export function getProfileContradictions(
	profile: Pick<
		PartnerProfile,
		'partnerType' | 'hasModernWorkOrSecurityDesignation' | 'designations'
	>,
): PartnerProfileContradiction[] {
	const issues: PartnerProfileContradiction[] = [];
	const designations = profile.designations.filter(isPartnerDesignation);
	const hasMwOrSecurity =
		designations.includes('modern-work') ||
		designations.includes('microsoft-security');

	if (profile.partnerType === 'CSP Direct') {
		if (profile.hasModernWorkOrSecurityDesignation === true && !hasMwOrSecurity) {
			issues.push('direct-follow-up-yes-without-designation');
		}
		if (profile.hasModernWorkOrSecurityDesignation === false && hasMwOrSecurity) {
			issues.push('direct-follow-up-no-with-designation');
		}
	}

	return issues;
}

/**
 * The overall MCI gate: whether the partner qualifies for MCI engagement
 * incentives at all. Replaces hasQualifyingDesignation, which read the same
 * answers from the per-proposal partner filters.
 */
export function isMciGateEligible(
	profile: Pick<
		PartnerProfile,
		'partnerType' | 'hasModernWorkOrSecurityDesignation' | 'hasOver25Points'
	>,
): boolean {
	return profile.partnerType === 'CSP Direct'
		? profile.hasModernWorkOrSecurityDesignation === true
		: profile.hasOver25Points === true;
}

const COPILOT_SPECIALIZATION_IDS: readonly SpecializationId[] = [
	'modern-work:copilot',
	'business-applications:microsoft-copilot',
];

/**
 * Engagement eligibility derived from the stored profile, mirroring the rules
 * the per-proposal questionnaire used to ask directly:
 * - copilot-m365: a Copilot specialization (either area) OR Copilot Jumpstart
 *   Ready tier or higher. Either also unlocks copilot-agent (a Copilot
 *   specialization unlocks BOTH accelerators, as in the old panel).
 * - copilot-agent: additionally unlocked by a Business Applications designation
 *   on its own, even without a Business Applications specialization.
 * - security engagements: Microsoft Security designation.
 * - ai-productivity engagements: Modern Work designation.
 * Conversion bonuses share their category's eligibility; whether one applies
 * to a given deal (displacement) is decided at selection time, not here.
 */
export function getEligibleMciEngagementIds(
	profile: PartnerProfile,
): MciEngagementId[] {
	if (!isMciGateEligible(profile)) return [];

	const specializations = profile.specializations.filter(isSpecializationId);
	const designations = profile.designations.filter(isPartnerDesignation);

	const copilotEligible =
		profile.copilotJumpstartReady ||
		COPILOT_SPECIALIZATION_IDS.some((id) => specializations.includes(id));
	const hasBizAppsDesignation = designations.includes('business-applications');

	const ids: MciEngagementId[] = [];
	if (copilotEligible) ids.push('copilot-m365');
	if (copilotEligible || hasBizAppsDesignation) ids.push('copilot-agent');
	if (designations.includes('microsoft-security')) {
		ids.push('security-defender-purview', 'security-conversion-bonus');
	}
	if (designations.includes('modern-work')) {
		ids.push('ai-productivity-deployment', 'ai-productivity-conversion-bonus');
	}
	return ids;
}

/**
 * Which engagement categories can be attached to which ending SKUs. A SKU's
 * dropdown offers the eligible engagements of its categories. Kept as a
 * category → SKU-family map (not per-engagement) so a new engagement in an
 * existing category needs no mapping change.
 *
 * Membership rationale: `copilot` — the ending state includes a Copilot
 * license; `security` — it includes a Defender and/or Purview suite;
 * `ai-productivity` — the move deploys Business Premium (attach SKUs start
 * from an existing BP, so they don't qualify).
 */
export const MCI_CATEGORY_SKU_IDS: Record<
	MciEngagementCategory,
	readonly string[]
> = {
	copilot: ['bs_cb', 'bp_cb', 'bp_cb_purview', 'bb_cb', 'attach_copilot'],
	security: [
		'bp_defender',
		'bp_purview',
		'bp_defender_purview',
		'bp_cb_purview',
		'attach_purview',
		'attach_defender',
		'attach_defender_purview',
	],
	'ai-productivity': [
		'bp_cb',
		'bp_cb_purview',
		'bp_defender',
		'bp_purview',
		'bp_defender_purview',
	],
};

export function getMciCategoriesForSku(
	endingSkuId: string,
): MciEngagementCategory[] {
	return (
		Object.keys(MCI_CATEGORY_SKU_IDS) as MciEngagementCategory[]
	).filter((category) => MCI_CATEGORY_SKU_IDS[category].includes(endingSkuId));
}

/**
 * Conversion bonuses require their base engagement to be attached to the SAME
 * card first; answering Yes to the card's displacement question attaches the
 * bonus and is itself the attestation.
 */
export const MCI_BONUS_PARENT: Partial<
	Record<MciEngagementId, MciEngagementId>
> = {
	'security-conversion-bonus': 'security-defender-purview',
	'ai-productivity-conversion-bonus': 'ai-productivity-deployment',
};

/**
 * An engagement attached to one selected SKU card. An engagement can be
 * attached to at most one card per proposal (its flat amount is paid once per
 * customer engagement, never per SKU).
 */
export interface MciEngagementAttachment {
	engagementId: MciEngagementId;
	opportunityId: string;
	endingSkuId: string;
}

export interface MciEngagementAttachmentEnvelope {
	version: 1;
	entries: MciEngagementAttachment[];
}

export const MCI_ATTACHMENT_STORAGE_VERSION = 1;

export function buildMciAttachmentCardKey(
	opportunityId: string,
	endingSkuId: string,
): string {
	return `${opportunityId}::${endingSkuId}`;
}

/** Parse a persisted envelope, dropping anything that isn't a valid entry. */
export function parseMciAttachmentEnvelope(
	raw: unknown,
): MciEngagementAttachment[] {
	if (!raw || typeof raw !== 'object') return [];
	const envelope = raw as Partial<MciEngagementAttachmentEnvelope>;
	if (envelope.version !== MCI_ATTACHMENT_STORAGE_VERSION) return [];
	if (!Array.isArray(envelope.entries)) return [];
	return envelope.entries.filter(
		(entry): entry is MciEngagementAttachment =>
			!!entry &&
			typeof entry === 'object' &&
			isMciEngagementId((entry as MciEngagementAttachment).engagementId) &&
			typeof (entry as MciEngagementAttachment).opportunityId === 'string' &&
			typeof (entry as MciEngagementAttachment).endingSkuId === 'string',
	);
}

export function serializeMciAttachments(
	entries: MciEngagementAttachment[],
): MciEngagementAttachmentEnvelope {
	return { version: MCI_ATTACHMENT_STORAGE_VERSION, entries };
}

/**
 * Re-validate attachments against the current eligibility and card selection.
 * Drops entries whose engagement the profile no longer unlocks, whose card is
 * deselected, or whose SKU doesn't map to the engagement's category; enforces
 * one card per engagement (first entry wins); and drops a conversion bonus
 * whose parent engagement isn't attached to the same card. Run on hydrate, on
 * every card-selection change, and whenever the profile changes.
 */
export function sanitizeMciAttachments(
	entries: readonly MciEngagementAttachment[],
	options: {
		eligibleIds: readonly MciEngagementId[];
		/** Keys from buildMciAttachmentCardKey for every selected card. */
		selectedCardKeys: ReadonlySet<string>;
	},
): MciEngagementAttachment[] {
	const eligible = new Set(options.eligibleIds);
	const attachedCardByEngagement = new Map<MciEngagementId, string>();
	const kept: MciEngagementAttachment[] = [];

	for (const entry of entries) {
		if (!isMciEngagementId(entry.engagementId)) continue;
		if (!eligible.has(entry.engagementId)) continue;
		const cardKey = buildMciAttachmentCardKey(
			entry.opportunityId,
			entry.endingSkuId,
		);
		if (!options.selectedCardKeys.has(cardKey)) continue;
		const category = MCI_ENGAGEMENTS[entry.engagementId].category;
		if (!MCI_CATEGORY_SKU_IDS[category].includes(entry.endingSkuId)) continue;
		if (attachedCardByEngagement.has(entry.engagementId)) continue;
		attachedCardByEngagement.set(entry.engagementId, cardKey);
		kept.push(entry);
	}

	// Bonuses ride on their parent: drop any whose parent isn't on the same card.
	return kept.filter((entry) => {
		const parent = MCI_BONUS_PARENT[entry.engagementId];
		if (!parent) return true;
		return (
			attachedCardByEngagement.get(parent) ===
			buildMciAttachmentCardKey(entry.opportunityId, entry.endingSkuId)
		);
	});
}

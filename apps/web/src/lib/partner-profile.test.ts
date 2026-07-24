import { describe, expect, it } from 'vitest';
import {
	buildMciAttachmentCardKey,
	DEMO_PARTNER_PROFILE,
	getEligibleMciEngagementIds,
	getMciCategoriesForSku,
	getProfileContradictions,
	isMciGateEligible,
	parseMciAttachmentEnvelope,
	sanitizeMciAttachments,
	serializeMciAttachments,
	type MciEngagementAttachment,
	type PartnerProfile,
} from '@repo/shared';

function makeProfile(overrides: Partial<PartnerProfile> = {}): PartnerProfile {
	return {
		partnerType: 'CSP Direct',
		hasModernWorkOrSecurityDesignation: true,
		hasOver25Points: null,
		designations: [],
		specializations: [],
		copilotJumpstartReady: false,
		companyLogoUrl: null,
		erpMarginPercent: 20,
		...overrides,
	};
}

describe('MCI gate', () => {
	it('CSP Direct qualifies via the designation follow-up', () => {
		expect(isMciGateEligible(makeProfile())).toBe(true);
		expect(
			isMciGateEligible(
				makeProfile({ hasModernWorkOrSecurityDesignation: false }),
			),
		).toBe(false);
	});

	it('CSP Indirect qualifies via >25 capability points', () => {
		expect(
			isMciGateEligible(
				makeProfile({
					partnerType: 'CSP Indirect',
					hasModernWorkOrSecurityDesignation: null,
					hasOver25Points: true,
				}),
			),
		).toBe(true);
		expect(
			isMciGateEligible(
				makeProfile({
					partnerType: 'CSP Indirect',
					hasModernWorkOrSecurityDesignation: null,
					hasOver25Points: false,
				}),
			),
		).toBe(false);
	});
});

describe('engagement eligibility derivation', () => {
	it('returns nothing when the gate fails', () => {
		expect(
			getEligibleMciEngagementIds(
				makeProfile({
					hasModernWorkOrSecurityDesignation: false,
					designations: ['modern-work', 'microsoft-security'],
					specializations: ['modern-work:copilot'],
					copilotJumpstartReady: true,
				}),
			),
		).toEqual([]);
	});

	it('a Copilot specialization unlocks both Copilot accelerators', () => {
		expect(
			getEligibleMciEngagementIds(
				makeProfile({ specializations: ['modern-work:copilot'] }),
			),
		).toEqual(['copilot-m365', 'copilot-agent']);
		expect(
			getEligibleMciEngagementIds(
				makeProfile({
					specializations: ['business-applications:microsoft-copilot'],
				}),
			),
		).toEqual(['copilot-m365', 'copilot-agent']);
	});

	it('Copilot Jumpstart Ready unlocks both Copilot accelerators', () => {
		expect(
			getEligibleMciEngagementIds(makeProfile({ copilotJumpstartReady: true })),
		).toEqual(['copilot-m365', 'copilot-agent']);
	});

	it('Business Applications designation unlocks only the agent accelerator without a specialization', () => {
		expect(
			getEligibleMciEngagementIds(
				makeProfile({
					partnerType: 'CSP Indirect',
					hasModernWorkOrSecurityDesignation: null,
					hasOver25Points: true,
					designations: ['business-applications'],
					specializations: [],
				}),
			),
		).toEqual(['copilot-agent']);
	});

	it('ignores a non-Copilot BizApps specialization without the designation', () => {
		expect(
			getEligibleMciEngagementIds(
				makeProfile({ specializations: ['business-applications:sales'] }),
			),
		).toEqual([]);
	});

	it('designations unlock security and ai-productivity pairs', () => {
		expect(
			getEligibleMciEngagementIds(
				makeProfile({ designations: ['microsoft-security'] }),
			),
		).toEqual(['security-defender-purview', 'security-conversion-bonus']);
		expect(
			getEligibleMciEngagementIds(makeProfile({ designations: ['modern-work'] })),
		).toEqual([
			'ai-productivity-deployment',
			'ai-productivity-conversion-bonus',
		]);
	});

	it('demo profile is eligible for all six engagements', () => {
		expect(getEligibleMciEngagementIds(DEMO_PARTNER_PROFILE)).toHaveLength(6);
	});
});

describe('profile contradictions', () => {
	it('flags Direct follow-up Yes without a matching designation', () => {
		expect(
			getProfileContradictions(
				makeProfile({ designations: ['business-applications'] }),
			),
		).toEqual(['direct-follow-up-yes-without-designation']);
	});

	it('flags Direct follow-up No with a matching designation', () => {
		expect(
			getProfileContradictions(
				makeProfile({
					hasModernWorkOrSecurityDesignation: false,
					designations: ['microsoft-security'],
				}),
			),
		).toEqual(['direct-follow-up-no-with-designation']);
	});

	it('does not apply the follow-up checks to CSP Indirect', () => {
		expect(
			getProfileContradictions(
				makeProfile({
					partnerType: 'CSP Indirect',
					hasModernWorkOrSecurityDesignation: null,
					designations: [],
				}),
			),
		).toEqual([]);
	});

});

describe('category → SKU map', () => {
	it('maps a combined SKU to every applicable category', () => {
		expect(getMciCategoriesForSku('bp_cb_purview')).toEqual([
			'copilot',
			'security',
			'ai-productivity',
		]);
	});

	it('attach SKUs never map to ai-productivity (BP already deployed)', () => {
		expect(getMciCategoriesForSku('attach_copilot')).toEqual(['copilot']);
		expect(getMciCategoriesForSku('attach_defender')).toEqual(['security']);
	});

	it('unknown SKUs map to nothing', () => {
		expect(getMciCategoriesForSku('other')).toEqual([]);
	});
});

describe('attachment sanitization', () => {
	const cards = (
		...pairs: [string, string][]
	): ReadonlySet<string> =>
		new Set(pairs.map(([opp, sku]) => buildMciAttachmentCardKey(opp, sku)));

	const ALL_ELIGIBLE = getEligibleMciEngagementIds(DEMO_PARTNER_PROFILE);

	it('keeps a valid attachment', () => {
		const entries: MciEngagementAttachment[] = [
			{
				engagementId: 'security-defender-purview',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
		];
		expect(
			sanitizeMciAttachments(entries, {
				eligibleIds: ALL_ELIGIBLE,
				selectedCardKeys: cards(['opp-1', 'bp_defender']),
			}),
		).toEqual(entries);
	});

	it('drops attachments for deselected cards and ineligible engagements', () => {
		const entries: MciEngagementAttachment[] = [
			{
				engagementId: 'security-defender-purview',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
			{
				engagementId: 'copilot-m365',
				opportunityId: 'opp-2',
				endingSkuId: 'bp_cb',
			},
		];
		expect(
			sanitizeMciAttachments(entries, {
				eligibleIds: ['security-defender-purview'],
				selectedCardKeys: cards(['opp-1', 'bp_defender']),
			}),
		).toEqual([entries[0]]);
	});

	it('drops attachments whose SKU does not map to the engagement category', () => {
		expect(
			sanitizeMciAttachments(
				[
					{
						engagementId: 'security-defender-purview',
						opportunityId: 'opp-1',
						endingSkuId: 'bb_cb',
					},
				],
				{
					eligibleIds: ALL_ELIGIBLE,
					selectedCardKeys: cards(['opp-1', 'bb_cb']),
				},
			),
		).toEqual([]);
	});

	it('enforces one card per engagement, first entry wins', () => {
		const entries: MciEngagementAttachment[] = [
			{
				engagementId: 'copilot-m365',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_cb',
			},
			{
				engagementId: 'copilot-m365',
				opportunityId: 'opp-2',
				endingSkuId: 'bs_cb',
			},
		];
		expect(
			sanitizeMciAttachments(entries, {
				eligibleIds: ALL_ELIGIBLE,
				selectedCardKeys: cards(['opp-1', 'bp_cb'], ['opp-2', 'bs_cb']),
			}),
		).toEqual([entries[0]]);
	});

	it('drops a conversion bonus whose parent is not on the same card', () => {
		const bonusAlone: MciEngagementAttachment[] = [
			{
				engagementId: 'security-conversion-bonus',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
		];
		expect(
			sanitizeMciAttachments(bonusAlone, {
				eligibleIds: ALL_ELIGIBLE,
				selectedCardKeys: cards(['opp-1', 'bp_defender']),
			}),
		).toEqual([]);

		const parentOnOtherCard: MciEngagementAttachment[] = [
			{
				engagementId: 'security-defender-purview',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
			{
				engagementId: 'security-conversion-bonus',
				opportunityId: 'opp-2',
				endingSkuId: 'bp_purview',
			},
		];
		expect(
			sanitizeMciAttachments(parentOnOtherCard, {
				eligibleIds: ALL_ELIGIBLE,
				selectedCardKeys: cards(
					['opp-1', 'bp_defender'],
					['opp-2', 'bp_purview'],
				),
			}),
		).toEqual([parentOnOtherCard[0]]);
	});

	it('keeps a bonus riding on its parent on the same card', () => {
		const entries: MciEngagementAttachment[] = [
			{
				engagementId: 'security-defender-purview',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
			{
				engagementId: 'security-conversion-bonus',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_defender',
			},
		];
		expect(
			sanitizeMciAttachments(entries, {
				eligibleIds: ALL_ELIGIBLE,
				selectedCardKeys: cards(['opp-1', 'bp_defender']),
			}),
		).toEqual(entries);
	});
});

describe('attachment envelope', () => {
	it('round-trips through serialize/parse and drops junk entries', () => {
		const entries: MciEngagementAttachment[] = [
			{
				engagementId: 'copilot-m365',
				opportunityId: 'opp-1',
				endingSkuId: 'bp_cb',
			},
		];
		expect(parseMciAttachmentEnvelope(serializeMciAttachments(entries))).toEqual(
			entries,
		);
		expect(parseMciAttachmentEnvelope(null)).toEqual([]);
		expect(parseMciAttachmentEnvelope({ version: 2, entries })).toEqual([]);
		expect(
			parseMciAttachmentEnvelope({
				version: 1,
				entries: [{ engagementId: 'nonsense', opportunityId: 1 }, ...entries],
			}),
		).toEqual(entries);
	});
});

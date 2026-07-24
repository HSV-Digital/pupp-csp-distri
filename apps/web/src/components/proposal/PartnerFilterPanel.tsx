// The partner-fact questions (partner type, designation follow-ups, Copilot
// Jumpstart) that this panel used to ask moved to the one-time Partner
// Profile page; the proposal page now composes `PartnerFilters` from the
// stored profile. The distributor question that used to render inside
// selected SKU cards was removed along with the retired 60% distributor
// promotion — this module now only holds the filter model and helpers.

import { QUALIFYING_DISTRIBUTORS as SHARED_QUALIFYING_DISTRIBUTORS } from '@repo/types';

export interface PartnerFilters {
	partnerType: string;
	hasSolutionPartnerDesignation: boolean;
	hasOver25Points: boolean;
	isCopilotJumpstart: boolean;
	fundedEngagement: string;
	isNewCustomerIncentive: boolean;
	/** Distributor a CSP Indirect partner works with. Empty when unselected. */
	distributor: string;
}

export const DEFAULT_PARTNER_FILTERS: PartnerFilters = {
	partnerType: 'CSP Direct',
	hasSolutionPartnerDesignation: true,
	hasOver25Points: true,
	isCopilotJumpstart: true,
	fundedEngagement: 'ECIF',
	isNewCustomerIncentive: false,
	distributor: '',
};

// Distributors CSP Indirect partners may work with. The former 60% Purview /
// Defender Suite promotion tied to the first six was retired.
export const QUALIFYING_DISTRIBUTORS = SHARED_QUALIFYING_DISTRIBUTORS;

/**
 * Whether the partner works with a qualifying distributor. The 60% Purview /
 * Defender Suite distributor promotion this used to unlock was retired (the
 * shared DISTRIBUTOR_DISCOUNT_RATE_BY_SKU_ID map is now empty), so this no
 * longer changes pricing — it is kept so the distributor answer is still
 * captured and threaded through proposals and emails.
 */
export function isDistributorDiscountEligible(filters: PartnerFilters): boolean {
	return (
		filters.partnerType === 'CSP Indirect' &&
		(QUALIFYING_DISTRIBUTORS as readonly string[]).includes(filters.distributor)
	);
}


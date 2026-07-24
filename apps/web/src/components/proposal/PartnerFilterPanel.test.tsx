import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PARTNER_FILTERS,
	isDistributorDiscountEligible,
} from './PartnerFilterPanel';
import type { PartnerFilters } from './PartnerFilterPanel';

describe('distributor helpers', () => {
	const indirect: PartnerFilters = {
		...DEFAULT_PARTNER_FILTERS,
		partnerType: 'CSP Indirect',
	};

	it('recognizes indirect partners with a qualifying distributor', () => {
		expect(
			isDistributorDiscountEligible({ ...indirect, distributor: 'PAX8' }),
		).toBe(true);
		expect(
			isDistributorDiscountEligible({ ...indirect, distributor: 'Other' }),
		).toBe(false);
		expect(
			isDistributorDiscountEligible({
				...DEFAULT_PARTNER_FILTERS,
				distributor: 'PAX8',
			}),
		).toBe(false);
	});
});

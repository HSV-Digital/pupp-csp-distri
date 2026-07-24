import { describe, expect, it } from 'vitest';
import {
	buildRegionalPricingContext,
	getRegionalEndingSkuPrice,
	getRegionalStartingSkuMonthlyPrice,
	resolveCountryFromRegion,
} from '@repo/shared';

describe('regional pricing workbook mappings', () => {
	it('resolves workbook countries to market codes', () => {
		expect(resolveCountryFromRegion('Mexico')).toBe('MX');
		expect(resolveCountryFromRegion('Curaçao')).toBe('CW');
		expect(resolveCountryFromRegion('Saint Kitts and Nevis')).toBe('KN');

		expect(
			buildRegionalPricingContext({ region: 'Puerto Rico' }),
		).toMatchObject({
			country: 'PR',
			currency: 'USD',
			fallbackApplied: false,
		});
	});

	it('uses workbook USD prices for mapped ending SKUs', () => {
		// List $42 = bp_cb ($32) + Purview ($10); 50% together-promo on the
		// Purview portion → 42 − 5.
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'bp_cb_purview',
				country: 'US',
			}),
		).toEqual({
			listPrice: 42,
			promoPrice: 37,
		});

		// The 60% distributor promotion was retired — the flag no longer
		// changes the price; the regular 50% together-promo applies.
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'bp_cb_purview',
				country: 'US',
				distributorDiscount: true,
			})?.promoPrice,
		).toBe(37);
	});

	it('uses workbook local-price overrides for New Zealand and India', () => {
		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bb',
				country: 'NZ',
			}),
		).toBe(11.3);
		expect(
			getRegionalEndingSkuPrice({ endingSkuId: 'bb_cb', country: 'NZ' }),
		).toEqual({ listPrice: 45.3, promoPrice: 33.975 });
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'attach_purview',
				country: 'NZ',
			}),
		).toEqual({ listPrice: 16.2, promoPrice: 16.2 });

		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bp',
				country: 'IN',
			}),
		).toBe(1830);
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'bp_cb_purview',
				country: 'IN',
			}),
		).toEqual({ listPrice: 3490, promoPrice: 3075 });
	});

	it('uses smb prices workbook overrides for previously fallback-priced markets', () => {
		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bp',
				country: 'AU',
			}),
		).toBe(32.9);
		expect(
			getRegionalEndingSkuPrice({ endingSkuId: 'bp_purview', country: 'AU' }),
		).toEqual({ listPrice: 47.9, promoPrice: 47.9 });
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'attach_defender_purview',
				country: 'AU',
			}),
		).toEqual({ listPrice: 22.4, promoPrice: 22.4 });

		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bp',
				country: 'GB',
			}),
		).toBe(16.9);
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'bp_cb_purview',
				country: 'GB',
			}),
		).toEqual({ listPrice: 32.3, promoPrice: 28.45 });
		expect(
			getRegionalEndingSkuPrice({
				endingSkuId: 'attach_purview',
				country: 'GB',
			}),
		).toEqual({ listPrice: 7.7, promoPrice: 7.7 });
	});

	it('uses workbook special USD-market starting prices', () => {
		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bb',
				country: 'MX',
			}),
		).toBeCloseTo(5.83, 2);
		expect(
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId: 'bs',
				country: 'MY',
			}),
		).toBe(11.2);
	});
});

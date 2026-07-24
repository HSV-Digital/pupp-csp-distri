import { describe, expect, it } from 'vitest';
import type { EndingSku, StartingSku } from '@repo/types';
import {
	ENDING_SKU_BY_ID,
	INCENTIVE_RATES,
	STARTING_SKU_BY_ID,
} from '@/lib/upgrade-matrix';
import {
	calculateIncentives,
	calculateScenario,
	getValidUpgradePaths,
	matchStartingSku,
} from '@/lib/rules-engine';

function getStartingSku(id: string): StartingSku {
	const sku = STARTING_SKU_BY_ID.get(id);
	if (!sku) {
		throw new Error(`Unknown starting SKU: ${id}`);
	}
	return sku;
}

function getEndingSku(id: string): EndingSku {
	const sku = ENDING_SKU_BY_ID.get(id);
	if (!sku) {
		throw new Error(`Unknown ending SKU: ${id}`);
	}
	return sku;
}

function getExpectedListMonthlyPrice(endingId: string): number {
	const byEndingSkuId: Partial<Record<string, number>> = {
		bs_cb: 23.5,
		bp_cb: 32,
		bp_cb_purview: 42,
		bp_defender: 32,
		bp_purview: 32,
		bp_defender_purview: 37,
	};

	return byEndingSkuId[endingId] ?? getEndingSku(endingId).listPrice;
}

describe('getValidUpgradePaths', () => {
	it.each([
		[7, 'bb'],
		[6, 'bs'],
		[5, 'bp'],
		[7, 'other'],
	])('returns %i valid paths for %s', (expectedCount, startingId) => {
		const paths = getValidUpgradePaths(startingId);
		expect(paths).toHaveLength(expectedCount);
	});

	it.each([
		['bb', ['bp_cb', 'bp_cb_purview']],
		['bs', ['bp_cb', 'bp_cb_purview']],
		['bp', ['bp_cb', 'bp_cb_purview']],
		['other', ['bp_cb', 'bp_cb_purview']],
	])(
		'puts featured Copilot cards first for %s',
		(startingId, expectedPrefix) => {
			const pathIds = getValidUpgradePaths(startingId).map((path) => path.id);
			expect(pathIds.slice(0, expectedPrefix.length)).toEqual(expectedPrefix);
		},
	);

	it.each(['bb', 'bs', 'bp', 'other'])(
		'removes retired proposal options for %s',
		(startingId) => {
			const pathIds = getValidUpgradePaths(startingId).map((path) => path.id);
			expect(pathIds).not.toContain('attach_copilot');
		},
	);

	it.each(['bb', 'bs', 'other'])(
		'shows Business Premium Purview / Defender / combined suites for %s',
		(startingId) => {
			const pathIds = getValidUpgradePaths(startingId).map((path) => path.id);
			expect(pathIds).toEqual(
				expect.arrayContaining([
					'bp_purview',
					'bp_defender',
					'bp_defender_purview',
				]),
			);
		},
	);

	it.each(['bp'])(
		'hides Business Premium Purview / Defender / combined suites for %s',
		(startingId) => {
			const pathIds = getValidUpgradePaths(startingId).map((path) => path.id);
			expect(pathIds).not.toContain('bp_purview');
			expect(pathIds).not.toContain('bp_defender');
			expect(pathIds).not.toContain('bp_defender_purview');
		},
	);

	it.each(['bb', 'bs', 'other'])(
		'hides attach Purview and attach Defender for non-Business Premium start %s',
		(startingId) => {
			const pathIds = getValidUpgradePaths(startingId).map((path) => path.id);
			expect(pathIds).not.toContain('attach_purview');
			expect(pathIds).not.toContain('attach_defender');
			expect(pathIds).not.toContain('attach_defender_purview');
		},
	);

	it('shows attach Purview, attach Defender, and the combined attach for Business Premium', () => {
		const pathIds = getValidUpgradePaths('bp').map((path) => path.id);
		expect(pathIds).toEqual(
			expect.arrayContaining([
				'attach_purview',
				'attach_defender',
				'attach_defender_purview',
			]),
		);
	});

	it('prices the combined attach from the Book 22 price list, below the sum of the single attaches', () => {
		const byId = new Map(
			getValidUpgradePaths('bp').map((path) => [path.id, path]),
		);
		const combined = byId.get('attach_defender_purview');
		expect(combined?.listPrice).toBe(15);
		// No suite promo — security SKUs sell at list.
		expect(combined?.promoPrice).toBe(15);
	});

	it('returns empty for unknown starting SKU', () => {
		expect(getValidUpgradePaths('unknown')).toEqual([]);
	});
});

describe('getValidUpgradePaths distributor discount', () => {
	const priceById = (paths: EndingSku[]) =>
		new Map(paths.map((p) => [p.id, p]));

	it('no longer changes prices — the 60% distributor promotion was retired', () => {
		const discounted = priceById(
			getValidUpgradePaths('bp', { distributorDiscount: true }),
		);
		const regular = priceById(getValidUpgradePaths('bp'));
		for (const [id, sku] of regular) {
			expect(discounted.get(id)?.promoPrice).toBe(sku.promoPrice);
			expect(discounted.get(id)?.listPrice).toBe(sku.listPrice);
		}
	});

	it('keeps only the 50% Copilot+Purview promo; security SKUs sell at list', () => {
		const full = priceById(getValidUpgradePaths('bp'));
		// 50% off the Purview portion of the bundle (42 − 5).
		expect(full.get('bp_cb_purview')?.promoPrice).toBe(37);
		expect(full.get('attach_purview')?.promoPrice).toBe(10);
		expect(full.get('attach_defender')?.promoPrice).toBe(10);
		expect(full.get('attach_defender_purview')?.promoPrice).toBe(15);
	});
});

describe('calculateScenario', () => {
	it.each([
		['bb', 'bs_cb', 100, 28200, 8400, 19800],
		['bb', 'bp_cb', 100, 38400, 8400, 30000],
		['bb', 'bp_cb_purview', 100, 44400, 8400, 36000],
		['bb', 'bp_defender', 100, 38400, 8400, 30000],
		['bb', 'bp_purview', 100, 38400, 8400, 30000],
		['bb', 'bp_defender_purview', 100, 44400, 8400, 36000],
		['bs', 'bs_cb', 100, 28200, 16800, 11400],
		['bs', 'bp_cb', 100, 38400, 16800, 21600],
		['bs', 'bp_cb_purview', 100, 44400, 16800, 27600],
		['bs', 'bp_defender', 100, 38400, 16800, 21600],
		['bs', 'bp_purview', 100, 38400, 16800, 21600],
		['bs', 'bp_defender_purview', 100, 44400, 16800, 27600],
		['bp', 'bp_cb', 100, 38400, 26400, 12000],
		['bp', 'bp_cb_purview', 100, 44400, 26400, 18000],
		['bp', 'bp_defender', 100, 38400, 26400, 12000],
		['bp', 'bp_purview', 100, 38400, 26400, 12000],
		['bp', 'bp_defender_purview', 100, 44400, 26400, 18000],
	])(
		'calculates %s -> %s at %i seats correctly',
		(
			startingId,
			endingId,
			seats,
			expectedNewAnnual,
			expectedCurrentAnnual,
			expectedIncremental,
		) => {
			const scenario = calculateScenario(
				getStartingSku(startingId),
				getEndingSku(endingId),
				seats,
			);
			const expectedListAnnual =
				getExpectedListMonthlyPrice(endingId) * seats * 12;
			const expectedPromoSavings = expectedListAnnual - expectedNewAnnual;

			expect(scenario.newAnnualValue).toBe(expectedNewAnnual);
			expect(scenario.offerAnnualValue).toBe(expectedNewAnnual);
			expect(scenario.listAnnualValue).toBe(expectedListAnnual);
			expect(scenario.promoSavingsAnnual).toBeCloseTo(expectedPromoSavings, 2);
			expect(scenario.currentAnnualValue).toBe(expectedCurrentAnnual);
			expect(scenario.incrementalCost).toBe(expectedIncremental);
			expect(scenario.seats).toBe(seats);
		},
	);

	it('normalizes invalid seat counts to 0', () => {
		const scenario = calculateScenario(
			getStartingSku('bb'),
			getEndingSku('bs_cb'),
			-10,
		);

		expect(scenario.seats).toBe(0);
		expect(scenario.newAnnualValue).toBe(0);
		expect(scenario.offerAnnualValue).toBe(0);
		expect(scenario.listAnnualValue).toBe(0);
		expect(scenario.promoSavingsAnnual).toBe(0);
		expect(scenario.currentAnnualValue).toBe(0);
		expect(scenario.incrementalCost).toBe(0);
	});

	it('returns zero promo savings when list and promo prices are equal', () => {
		const scenario = calculateScenario(
			getStartingSku('bb'),
			getEndingSku('bs_cb'),
			25,
		);

		expect(scenario.listAnnualValue).toBe(scenario.offerAnnualValue);
		expect(scenario.promoSavingsAnnual).toBe(0);
	});

	it('ignores the retired distributor discount flag', () => {
		const args = [
			getStartingSku('bp'),
			getEndingSku('bp_purview'),
			100,
		] as const;
		const full = calculateScenario(...args);
		const discounted = calculateScenario(...args, {
			distributorDiscount: true,
		});

		// The 60% distributor promotion was retired; security SKUs sell at
		// list either way, so the flag changes nothing.
		expect(full.endingMonthlyPrice).toBe(32);
		expect(discounted.endingMonthlyPrice).toBe(32);
		expect(discounted.offerAnnualValue).toBe(full.offerAnnualValue);
		expect(discounted.economics.totalIncentive).toBe(
			full.economics.totalIncentive,
		);
	});

	it('includes the current Business Premium price in attach scenario target values', () => {
		const scenario = calculateScenario(
			getStartingSku('bp'),
			getEndingSku('attach_purview'),
			100,
		);

		expect(scenario.endingMonthlyPrice).toBe(32);
		expect(scenario.listAnnualValue).toBe(38400);
		expect(scenario.offerAnnualValue).toBe(38400);
		expect(scenario.currentAnnualValue).toBe(26400);
		expect(scenario.incrementalCost).toBe(12000);
		expect(scenario.economics.currentIncentive).toBeCloseTo(1056, 2);
		expect(scenario.economics.totalIncentive).toBeCloseTo(2496, 2);
		expect(scenario.economics.incrementalIncentive).toBeCloseTo(1440, 2);
	});
});

describe('calculateIncentives', () => {
	it('Example 1: renewal bb -> bs_cb at 100 seats (US, CSP Direct)', () => {
		// Flat 20% margin; CSP Direct rates (cspCore 2.5%, growth 10%).
		// target_part  = 23.5 * 0.80 * 100 * 12 = 22,560.00
		// current_part =  7   * 0.80 * 100 * 12 =  6,720.00
		// growth_base  = 15,840.00
		// Target leg Strategic applies to every start (incl. bb); only the bb
		// current leg is skipped.
		const economics = calculateIncentives({
			endingSkuId: 'bs_cb',
			targetPrice: 23.5,
			currentPrice: 7,
			seats: 100,
			journey: 'renewal',
			startingSkuId: 'bb',
		});
		// Target leg
		expect(economics.cspCore).toBeCloseTo(564.0, 2);
		expect(economics.strategicAccelerator).toBeCloseTo(564.0, 2);
		expect(economics.growthAccelerator).toBeCloseTo(1584.0, 2);
		expect(economics.totalIncentive).toBeCloseTo(2712.0, 2);
		// Current leg — bb start, so no current Strategic Accelerator.
		expect(economics.cspCoreCurrent).toBeCloseTo(168.0, 2);
		expect(economics.strategicAcceleratorCurrent).toBe(0);
		expect(economics.currentIncentive).toBeCloseTo(168.0, 2);
		expect(economics.incrementalIncentive).toBeCloseTo(2544.0, 2);
	});

	it('Example 2: renewal bs -> bp_cb at 100 seats (US, CSP Direct)', () => {
		// target_part  = 32 * 0.80 * 100 * 12 = 30,720.00
		// current_part = 14 * 0.80 * 100 * 12 = 13,440.00
		// growth_base  = 17,280.00
		// Target leg Strategic applies to every start (incl. bs); only the bs
		// current leg is skipped.
		const economics = calculateIncentives({
			endingSkuId: 'bp_cb',
			targetPrice: 32,
			currentPrice: 14,
			seats: 100,
			journey: 'renewal',
			startingSkuId: 'bs',
		});
		expect(economics.cspCore).toBeCloseTo(768.0, 2);
		expect(economics.strategicAccelerator).toBeCloseTo(768.0, 2);
		expect(economics.growthAccelerator).toBeCloseTo(1728.0, 2);
		expect(economics.totalIncentive).toBeCloseTo(3264.0, 2);
		expect(economics.cspCoreCurrent).toBeCloseTo(336.0, 2);
		expect(economics.strategicAcceleratorCurrent).toBe(0);
		expect(economics.currentIncentive).toBeCloseTo(336.0, 2);
		expect(economics.incrementalIncentive).toBeCloseTo(2928.0, 2);
	});

	it('Example 2b: renewal bp -> bp_cb at 100 seats (US) — Premium start gets Strategic on both legs', () => {
		// Starting on Business Premium, so Strategic (2.5%) applies to BOTH legs.
		// target_part  = 32 * 0.80 * 100 * 12 = 30,720 → strategic = 768.00
		// current_part = 22 * 0.80 * 100 * 12 = 21,120 → strategicCurrent = 528.00
		const economics = calculateIncentives({
			endingSkuId: 'bp_cb',
			targetPrice: 32,
			currentPrice: 22,
			seats: 100,
			journey: 'renewal',
			startingSkuId: 'bp',
		});
		expect(economics.strategicAccelerator).toBeCloseTo(768.0, 2);
		expect(economics.cspCoreCurrent).toBeCloseTo(528.0, 2);
		expect(economics.strategicAcceleratorCurrent).toBeCloseTo(528.0, 2);
		expect(economics.currentIncentive).toBeCloseTo(1056.0, 2);
	});

	it('Example 2c: CSP Indirect zeros CSP Core and boosts Growth to 12.5%', () => {
		// Indirect: cspCore 0%, strategic 2.5% (target leg), growth 12.5%.
		// target_part  = 32 * 0.80 * 100 * 12 = 30,720
		// current_part = 22 * 0.80 * 100 * 12 = 21,120; growth_base = 9,600
		const economics = calculateIncentives({
			endingSkuId: 'bp_cb',
			targetPrice: 32,
			currentPrice: 22,
			seats: 100,
			journey: 'renewal',
			startingSkuId: 'bp',
			partnerType: 'CSP Indirect',
		});
		expect(economics.cspCore).toBe(0);
		expect(economics.strategicAccelerator).toBeCloseTo(768.0, 2);
		expect(economics.growthAccelerator).toBeCloseTo(1200.0, 2);
		expect(economics.cspCoreCurrent).toBe(0);
	});

	it.each([
		['attach_copilot', 'CSP Direct', 40, 960, 960, 1728, 1056, 2592],
		['attach_copilot', 'CSP Indirect', 40, 0, 960, 2160, 528, 2592],
		['attach_purview', 'CSP Direct', 32, 768, 768, 960, 1056, 1440],
		['attach_purview', 'CSP Indirect', 32, 0, 768, 1200, 528, 1440],
		['attach_defender', 'CSP Direct', 32, 768, 768, 960, 1056, 1440],
		['attach_defender', 'CSP Indirect', 32, 0, 768, 1200, 528, 1440],
	])(
		'calculates attach renewal economics for %s with %s',
		(
			endingSkuId,
			partnerType,
			targetPrice,
			expectedCspCore,
			expectedStrategic,
			expectedGrowth,
			expectedCurrent,
			expectedIncremental,
		) => {
			// Attach target price includes the current Business Premium price.
			const economics = calculateIncentives({
				endingSkuId,
				targetPrice,
				currentPrice: 22,
				seats: 100,
				journey: 'renewal',
				startingSkuId: 'bp',
				partnerType,
				isAddOn: true,
			});
			expect(economics.cspCore).toBeCloseTo(expectedCspCore, 2);
			expect(economics.strategicAccelerator).toBeCloseTo(expectedStrategic, 2);
			expect(economics.growthAccelerator).toBeCloseTo(expectedGrowth, 2);
			expect(economics.currentIncentive).toBeCloseTo(expectedCurrent, 2);
			expect(economics.incrementalIncentive).toBeCloseTo(
				expectedIncremental,
				2,
			);
		},
	);

	it('Example 3: new_customer (other) target = bp_purview at 100 seats (US)', () => {
		// target_part = 32 * 0.80 * 100 * 12 = 30,720.00
		// New-customer journey: NO growth, NO current leg. Starting SKU 'other' is
		// not bb/bs, so Strategic Accelerator (2.5%) applies on the target leg.
		const economics = calculateIncentives({
			endingSkuId: 'bp_purview',
			targetPrice: 32,
			currentPrice: 0,
			seats: 100,
			journey: 'new_customer',
			startingSkuId: 'other',
		});
		expect(economics.cspCore).toBeCloseTo(768.0, 2);
		expect(economics.strategicAccelerator).toBeCloseTo(768.0, 2);
		expect(economics.growthAccelerator).toBe(0);
		expect(economics.totalIncentive).toBeCloseTo(1536.0, 2);
		expect(economics.cspCoreCurrent).toBe(0);
		// No current leg on a new-customer journey → no current Strategic.
		expect(economics.strategicAcceleratorCurrent).toBe(0);
		expect(economics.currentIncentive).toBe(0);
		expect(economics.incrementalIncentive).toBeCloseTo(1536.0, 2);
	});

	it('Example 4: bb/bs start earns the target Strategic leg but skips the current leg', () => {
		// Target leg applies to every start; the bb/bs current leg is skipped.
		// target_part = 22 * 0.80 * 100 * 12 = 21,120
		// current_part = 6 * 0.80 * 100 * 12 =  5,760; growth_base = 15,360
		const economics = calculateIncentives({
			endingSkuId: 'not_in_strategic_set',
			targetPrice: 22,
			currentPrice: 6,
			seats: 100,
			journey: 'renewal',
			startingSkuId: 'bs',
		});
		expect(economics.strategicAccelerator).toBeCloseTo(21120 * 0.025, 2);
		expect(economics.cspCore).toBeCloseTo(21120 * 0.025, 2);
		expect(economics.growthAccelerator).toBeCloseTo(15360 * 0.1, 2);
		expect(economics.cspCoreCurrent).toBeCloseTo(5760 * 0.025, 2);
		// bs start → no current-leg Strategic Accelerator.
		expect(economics.strategicAcceleratorCurrent).toBe(0);
	});

	it('Example 5: ineligible partner zeros all incentives', () => {
		const economics = calculateIncentives({
			endingSkuId: 'bs_cb',
			targetPrice: 22,
			currentPrice: 6,
			seats: 100,
			journey: 'renewal',
			isIncentiveEligible: false,
		});
		expect(economics.cspCore).toBe(0);
		expect(economics.strategicAccelerator).toBe(0);
		expect(economics.growthAccelerator).toBe(0);
		expect(economics.totalIncentive).toBe(0);
		expect(economics.cspCoreCurrent).toBe(0);
		expect(economics.strategicAcceleratorCurrent).toBe(0);
		expect(economics.currentIncentive).toBe(0);
		expect(economics.incrementalIncentive).toBe(0);
	});

	it('Example 6 (pinning): partner-entered prices passed via the explicit-prices scenario builder do NOT change incentives', async () => {
		// Same canonical inputs (bb -> bs_cb, US, 100 seats) but two different
		// partner-entered customer/reseller prices. Incentives must be identical.
		const { calculateScenarioFromExplicitPrices } =
			await import('@/lib/rules-engine');
		const startingSku = getStartingSku('bb');
		const endingSku = getEndingSku('bs_cb');

		const baseline = calculateScenarioFromExplicitPrices(
			startingSku,
			endingSku,
			100,
			{
				currentSkuCustomerPrice: 6,
				currentSkuResellerPrice: 4.8,
				targetSkuCustomerPrice: 22,
				targetSkuResellerPrice: 18.99,
			},
			{ journey: 'renewal' },
		);

		const partnerEdited = calculateScenarioFromExplicitPrices(
			startingSku,
			endingSku,
			100,
			{
				// Partner cranks both customer prices way up — must NOT move incentives.
				currentSkuCustomerPrice: 9,
				currentSkuResellerPrice: 7.2,
				targetSkuCustomerPrice: 25,
				targetSkuResellerPrice: 21.5,
			},
			{ journey: 'renewal' },
		);

		expect(partnerEdited.economics.cspCore).toBe(baseline.economics.cspCore);
		expect(partnerEdited.economics.strategicAccelerator).toBe(
			baseline.economics.strategicAccelerator,
		);
		expect(partnerEdited.economics.growthAccelerator).toBe(
			baseline.economics.growthAccelerator,
		);
		expect(partnerEdited.economics.totalIncentive).toBe(
			baseline.economics.totalIncentive,
		);
		expect(partnerEdited.economics.currentIncentive).toBe(
			baseline.economics.currentIncentive,
		);
		expect(partnerEdited.economics.incrementalIncentive).toBe(
			baseline.economics.incrementalIncentive,
		);
		// And the values match Example 1 (incentives pinned to canonical prices:
		// bs_cb promo 23.5, bb 7).
		expect(baseline.economics.cspCore).toBeCloseTo(564.0, 2);
		expect(baseline.economics.totalIncentive).toBeCloseTo(2712.0, 2);
		expect(baseline.economics.currentIncentive).toBeCloseTo(168.0, 2);
	});

	it('returns zeros when seats are zero', () => {
		expect(
			calculateIncentives({
				endingSkuId: 'bs_cb',
				targetPrice: 22,
				currentPrice: 6,
				seats: 0,
				journey: 'renewal',
			}),
		).toEqual({
			cspCore: 0,
			cspCoreRate: INCENTIVE_RATES.cspCore,
			strategicAccelerator: 0,
			strategicAcceleratorRate: INCENTIVE_RATES.strategicAccelerator,
			growthAccelerator: 0,
			growthAcceleratorRate: INCENTIVE_RATES.growthAccelerator,
			totalIncentive: 0,
			cspCoreCurrent: 0,
			strategicAcceleratorCurrent: 0,
			currentIncentive: 0,
			incrementalIncentive: 0,
		});
	});
});

describe('matchStartingSku', () => {
	it.each([
		['Microsoft 365 Business Basic', 'bb'],
		['O365 Business Essentials', 'bb'],
		['O365 Business Standard', 'bs'],
		['Office 365 Business Premium', 'bs'],
		['Microsoft 365 Business Premium', 'bp'],
		['M365 Apps for Business', null],
		['Microsoft 365 Apps for business', null],
		['Microsoft 365 E3', null],
		['Microsoft 365 E5', null],
		['Exchange Online Plan 1', null],
	])("maps '%s' correctly", (product, expectedId) => {
		const matched = matchStartingSku(product);
		expect(matched?.id ?? null).toBe(expectedId);
	});
});

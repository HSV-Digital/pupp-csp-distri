import { describe, expect, it } from 'vitest';
import {
	getMciEngagementAmount,
	getMciEngagementTotal,
	getMciMarketTier,
	getSelectedMciEngagementIds,
	normalizeMciEngagementSelection,
} from '@repo/shared';

describe('MCI engagement selection', () => {
	it('selects qualifying engagements across multiple areas', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot', 'security', 'ai-productivity'],
			copilotSpecialization: true,
			copilotEngagements: ['copilot-m365'],
			securityDesignation: true,
			securityDeliver: true,
			sentinelDisplacement: true,
			aiProductivityDesignation: true,
			aiProductivityDeliver: true,
			googleWorkspaceDisplacement: true,
		});

		expect(getSelectedMciEngagementIds(selection)).toEqual([
			'copilot-m365',
			'security-defender-purview',
			'security-conversion-bonus',
			'ai-productivity-deployment',
			'ai-productivity-conversion-bonus',
		]);
		expect(getMciEngagementTotal(selection, 'USD')).toBe(9700);
	});

	it('migrates a legacy single-area payload', () => {
		const selection = normalizeMciEngagementSelection({
			category: 'security',
			securityDesignation: true,
			securityDeliver: true,
		});

		expect(selection.categories).toEqual(['security']);
		expect(getSelectedMciEngagementIds(selection)).toEqual([
			'security-defender-purview',
		]);
	});

	it('ignores branch answers for areas that are not selected', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot'],
			copilotBusinessSpecialization: true,
			copilotEngagements: ['copilot-agent'],
			securityDesignation: true,
			securityDeliver: true,
			sentinelDisplacement: true,
		});

		expect(getSelectedMciEngagementIds(selection)).toEqual(['copilot-agent']);
		expect(getMciEngagementTotal(selection, 'USD')).toBe(2500);
	});

	it('unlocks both Copilot accelerators with a Copilot Specialization alone', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot'],
			copilotSpecialization: true,
			copilotBusinessSpecialization: false,
			copilotEngagements: ['copilot-m365', 'copilot-agent'],
		});

		expect(getSelectedMciEngagementIds(selection)).toEqual([
			'copilot-m365',
			'copilot-agent',
		]);
		expect(getMciEngagementTotal(selection, 'USD')).toBe(5000);
	});

	it('unlocks only the Agent accelerator with a Business Applications Specialization alone', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot'],
			copilotSpecialization: false,
			copilotBusinessSpecialization: true,
			copilotEngagements: ['copilot-m365', 'copilot-agent'],
		});

		expect(getSelectedMciEngagementIds(selection)).toEqual(['copilot-agent']);
		expect(getMciEngagementTotal(selection, 'USD')).toBe(2500);
	});

	it('allows both Copilot accelerators when both questions are answered yes', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot'],
			copilotSpecialization: true,
			copilotBusinessSpecialization: true,
			copilotEngagements: ['copilot-m365', 'copilot-agent'],
		});

		expect(getSelectedMciEngagementIds(selection)).toEqual([
			'copilot-m365',
			'copilot-agent',
		]);
		expect(getMciEngagementTotal(selection, 'USD')).toBe(5000);
	});

	it('migrates a legacy combined Copilot eligibility answer to both questions', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['copilot'],
			copilotEligible: true,
			copilotEngagements: ['copilot-m365', 'copilot-agent'],
		});

		expect(selection.copilotSpecialization).toBe(true);
		expect(selection.copilotBusinessSpecialization).toBe(true);
		expect(getSelectedMciEngagementIds(selection)).toEqual([
			'copilot-m365',
			'copilot-agent',
		]);
	});
});

describe('MCI engagement amounts by market and currency', () => {
	it('resolves the market tier from the region country', () => {
		expect(getMciMarketTier('US')).toBe('A');
		expect(getMciMarketTier('SG')).toBe('B');
		expect(getMciMarketTier('MY')).toBe('B');
		expect(getMciMarketTier('BR')).toBe('B');
		expect(getMciMarketTier('MX')).toBe('B');
		expect(getMciMarketTier('AR')).toBe('C');
		expect(getMciMarketTier('PE')).toBe('C');
		expect(getMciMarketTier('IN')).toBe('C');
		expect(getMciMarketTier('NZ')).toBe('A');
	});

	it('falls back to the currency market when no country is given', () => {
		expect(getMciMarketTier(null, 'USD')).toBe('A');
		expect(getMciMarketTier(null, 'INR')).toBe('C');
		expect(getMciMarketTier(null, 'BRL')).toBe('B');
		expect(getMciMarketTier(undefined, undefined)).toBe('A');
	});

	it('keeps the USD figure of the tier for USD markets', () => {
		// Market A (US)
		expect(getMciEngagementAmount('copilot-m365', 'USD', 'US')).toBe(2500);
		// Market B (Singapore, Malaysia, Mexico, …) — USD amounts of Market B
		expect(getMciEngagementAmount('copilot-m365', 'USD', 'SG')).toBe(1875);
		expect(getMciEngagementAmount('security-defender-purview', 'USD', 'MY')).toBe(
			1500,
		);
		expect(getMciEngagementAmount('security-conversion-bonus', 'USD', 'MX')).toBe(
			1200,
		);
		expect(
			getMciEngagementAmount('ai-productivity-conversion-bonus', 'USD', 'UY'),
		).toBe(1500);
		// Market C (Argentina, Peru, …) — USD amounts of Market C
		expect(getMciEngagementAmount('copilot-m365', 'USD', 'AR')).toBe(1250);
		expect(getMciEngagementAmount('security-conversion-bonus', 'USD', 'PE')).toBe(
			800,
		);
		expect(
			getMciEngagementAmount('ai-productivity-deployment', 'USD', 'VE'),
		).toBe(1000);
	});

	it('converts the tier USD figure with the MCI currency rate', () => {
		// New Zealand — Market A × 1.62
		expect(getMciEngagementAmount('copilot-m365', 'NZD', 'NZ')).toBe(4050);
		expect(getMciEngagementAmount('security-defender-purview', 'NZD', 'NZ')).toBe(
			3240,
		);
		// India — Market C × 83.19
		expect(getMciEngagementAmount('copilot-m365', 'INR', 'IN')).toBe(103987.5);
		expect(getMciEngagementAmount('security-conversion-bonus', 'INR', 'IN')).toBe(
			66552,
		);
		// Netherlands / Ireland — Market A × 0.87
		expect(getMciEngagementAmount('copilot-m365', 'EUR', 'NL')).toBe(2175);
		expect(getMciEngagementAmount('ai-productivity-deployment', 'EUR', 'IE')).toBe(
			1740,
		);
		// Sweden — Market A × 9.55
		expect(getMciEngagementAmount('copilot-m365', 'SEK', 'SE')).toBe(23875);
		// Norway — Market A × 10.16
		expect(getMciEngagementAmount('copilot-m365', 'NOK', 'NO')).toBe(25400);
	});

	it('keeps the market tier bound to the region when the display currency is overridden', () => {
		// Mexican proposal (Market B) displayed in USD keeps Market B amounts…
		expect(getMciEngagementAmount('copilot-m365', 'USD', 'MX')).toBe(1875);
		// …and displayed in EUR converts the same Market B figure.
		expect(getMciEngagementAmount('copilot-m365', 'EUR', 'MX')).toBe(1631.25);
		// Indian proposal (Market C) displayed in USD shows the Market C USD figure.
		expect(getMciEngagementAmount('copilot-m365', 'USD', 'IN')).toBe(1250);
	});

	it('totals selected engagements in the regional currency', () => {
		const selection = normalizeMciEngagementSelection({
			categories: ['security'],
			securityDesignation: true,
			securityDeliver: true,
			sentinelDisplacement: true,
		});

		// Market A USD: 2000 + 1600
		expect(getMciEngagementTotal(selection, 'USD', 'US')).toBe(3600);
		// India: (1000 + 800) × 83.19
		expect(getMciEngagementTotal(selection, 'INR', 'IN')).toBe(149742);
		// Market B USD: 1500 + 1200
		expect(getMciEngagementTotal(selection, 'USD', 'SG')).toBe(2700);
	});
});

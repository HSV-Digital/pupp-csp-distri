import { buildProposalScenarios, hasValidSelectedJourney } from './pdf-rules';

describe('buildProposalScenarios', () => {
	it('returns all allowed scenarios when selectedSkuIds is empty', () => {
		const scenarios = buildProposalScenarios({
			currentProduct: 'Microsoft 365 Business Basic',
			seatCount: 10,
			selectedSkuIds: [],
		});

		const ids = scenarios.map((scenario) => scenario.endingSkuId).sort();
		expect(ids).toEqual(
			[
				'bp_cb',
				'bp_cb_purview',
				'bp_defender',
				'bp_defender_purview',
				'bp_purview',
				'bs_cb',
			].sort(),
		);
	});

	it('returns only selected scenarios when selectedSkuIds is provided', () => {
		const scenarios = buildProposalScenarios({
			currentProduct: 'Microsoft 365 Business Standard',
			seatCount: 25,
			selectedSkuIds: ['bp_cb'],
		});

		expect(scenarios).toHaveLength(1);
		expect(scenarios[0]?.endingSkuId).toBe('bp_cb');
	});

	it('returns no scenarios when starting sku cannot be mapped', () => {
		const scenarios = buildProposalScenarios({
			currentProduct: 'Office 365 E3',
			seatCount: 100,
			selectedSkuIds: [],
		});

		expect(scenarios).toEqual([]);
	});
});

describe('hasValidSelectedJourney', () => {
	it('is true when a selected SKU is a valid journey from the starting SKU', () => {
		expect(
			hasValidSelectedJourney('Microsoft 365 Business Basic', ['bp_cb']),
		).toBe(true);
	});

	it('is false when no selected SKU is a valid journey', () => {
		// bs_cb is not a valid target for a bp starter (bp upgrades to bp_cb,
		// bp_cb_purview, or the attach_* SKUs).
		expect(
			hasValidSelectedJourney('Microsoft 365 Business Premium', ['bs_cb']),
		).toBe(false);
	});

	it('is true for a bp starter when the expanded attach SKU is selected', () => {
		expect(
			hasValidSelectedJourney('Microsoft 365 Business Premium', [
				'attach_purview',
			]),
		).toBe(true);
	});

	it('agrees with buildProposalScenarios: false implies zero scenarios', () => {
		const product = 'Microsoft 365 Business Premium';
		const selectedSkuIds = ['bs_cb'];
		expect(hasValidSelectedJourney(product, selectedSkuIds)).toBe(false);
		expect(
			buildProposalScenarios({
				currentProduct: product,
				seatCount: 10,
				selectedSkuIds,
			}),
		).toEqual([]);
	});

	it('is false for unsupported starting SKUs (E5)', () => {
		expect(hasValidSelectedJourney('Office 365 E5', ['bp_cb'])).toBe(false);
	});

	it('is true for a supported starter when selection is empty (all valid paths)', () => {
		expect(hasValidSelectedJourney('Microsoft 365 Business Basic', [])).toBe(
			true,
		);
	});

	it('is false for an unsupported starter even when selection is empty', () => {
		expect(hasValidSelectedJourney('Office 365 E5', [])).toBe(false);
	});
});

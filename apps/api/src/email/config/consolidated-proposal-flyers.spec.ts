import { describe, expect, it } from 'vitest';
import {
	CONSOLIDATED_DISCLAIMER_FLYER,
	CONSOLIDATED_LAST_PAGE_FLYER,
	resolveComparisonFlyer,
	resolveCopilotComparisonFlyers,
	resolveEngagementFlyers,
	resolveInvestmentSnapshotFlyer,
	resolveProductOverviewFlyers,
} from './consolidated-proposal-flyers';

describe('consolidated-proposal-flyers config', () => {
	describe('resolveProductOverviewFlyers', () => {
		it('dedupes by product across scenarios in canonical order', () => {
			// bp_cb_purview → copilot + purview; bp_defender → defender.
			const flyers = resolveProductOverviewFlyers([
				'bp_cb_purview',
				'bp_defender',
				'bp_cb', // copilot again — must not duplicate
			]);
			expect(flyers).toEqual([
				'product_overview/Copilot Business.pptx',
				'product_overview/Defender Suite for Microsoft 365 Premium.pptx',
				'product_overview/Microsoft Purview Suite for Microsoft 365 Business Premium.pptx',
			]);
		});

		it('returns only the relevant overview for a single copilot SKU', () => {
			expect(resolveProductOverviewFlyers(['bs_cb'])).toEqual([
				'product_overview/Copilot Business.pptx',
			]);
		});

		it('ignores unknown ending SKUs', () => {
			expect(resolveProductOverviewFlyers(['nope'])).toEqual([]);
		});

		it('swaps only the Copilot overview to the chat-to-paid slide when enabled', () => {
			expect(resolveProductOverviewFlyers(['bp_cb_purview'], true)).toEqual([
				'product_overview/Copilot Business Chat to Paid slide.pptx',
				'product_overview/Microsoft Purview Suite for Microsoft 365 Business Premium.pptx',
			]);
		});

		it('keeps the default Copilot overview when chat-to-paid is disabled', () => {
			expect(resolveProductOverviewFlyers(['bp_cb'], false)).toEqual([
				'product_overview/Copilot Business.pptx',
			]);
		});
	});

	describe('resolveComparisonFlyer', () => {
		it('shows the tier-comparison deck for a copilot tier jump (pure copilot ending)', () => {
			expect(
				resolveComparisonFlyer({ startingSkuId: 'bb', endingSkuId: 'bp_cb' }),
			).toBe('comparison/Business Basic to Business Premium.pptx');
			expect(
				resolveComparisonFlyer({ startingSkuId: 'bb', endingSkuId: 'bs_cb' }),
			).toBe('comparison/Business Basic to Business Standard.pptx');
			expect(
				resolveComparisonFlyer({ startingSkuId: 'bs', endingSkuId: 'bp_cb' }),
			).toBe('comparison/Business Standard vs Business Premium.pptx');
		});

		it('shows the tier-comparison deck for a copilot bundle carrying extra products (bp_cb_purview)', () => {
			// Copilot + Purview still counts as "copilot in the bundle" — the deck
			// depends only on the base tier jump, not the exact ending SKU.
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bb',
					endingSkuId: 'bp_cb_purview',
				}),
			).toBe('comparison/Business Basic to Business Premium.pptx');
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bs',
					endingSkuId: 'bp_cb_purview',
				}),
			).toBe('comparison/Business Standard vs Business Premium.pptx');
		});

		it('falls back to the shared copilot comparison page 1 for a same-tier copilot journey', () => {
			// bp → bp_cb: no base tier jump (Premium → Premium + Copilot).
			expect(
				resolveComparisonFlyer({ startingSkuId: 'bp', endingSkuId: 'bp_cb' }),
			).toBe('comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx');
			// bp → bp_cb_purview: still same base tier.
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bp',
					endingSkuId: 'bp_cb_purview',
				}),
			).toBe('comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx');
			// attach_copilot is an add-on ending with no base tier jump.
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bb',
					endingSkuId: 'attach_copilot',
				}),
			).toBe('comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx');
		});

		it('resolves security transitions per starting SKU', () => {
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bb',
					endingSkuId: 'bp_defender_purview',
				}),
			).toBe(
				'comparison/Business Basic to Business Premium + Defender Suite+ Purview Suite.pptx',
			);
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bs',
					endingSkuId: 'bp_purview',
				}),
			).toBe(
				'comparison/Business Standard to Business Premium + Purview Suite.pptx',
			);
		});

		it('uses Business Premium comparison decks for Business Premium attach security products', () => {
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bp',
					endingSkuId: 'attach_defender',
				}),
			).toBe(
				'comparison/Business Premium to Business Premium + Defender Suite.pptx',
			);
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'bp',
					endingSkuId: 'attach_purview',
				}),
			).toBe(
				'comparison/Business Premium to Business Premium + Purview Suite.pptx',
			);
		});

		it('returns null for an unmapped transition (e.g. "other" start)', () => {
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'other',
					endingSkuId: 'bp_defender',
				}),
			).toBeNull();
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'other',
					endingSkuId: 'bp_cb',
				}),
			).toBeNull();
			expect(
				resolveComparisonFlyer({
					startingSkuId: 'other',
					endingSkuId: 'attach_copilot',
				}),
			).toBeNull();
		});
	});

	describe('resolveCopilotComparisonFlyers', () => {
		it('returns only page 1 when chat-to-paid is disabled', () => {
			expect(resolveCopilotComparisonFlyers(false)).toEqual([
				'comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx',
			]);
			expect(resolveCopilotComparisonFlyers()).toEqual([
				'comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx',
			]);
		});

		it('returns page 1 followed by page 2 when chat-to-paid is enabled', () => {
			expect(resolveCopilotComparisonFlyers(true)).toEqual([
				'comparison/Page 1_Proposal_Copilot-Chat-to-Paid.pptx',
				'comparison/Page 2_Proposal_Copilot-Chat-to-Paid.pptx',
			]);
		});
	});

	describe('resolveEngagementFlyers', () => {
		it('maps each selected engagement to its flyer, deduped', () => {
			expect(
				resolveEngagementFlyers([
					'copilot-m365',
					'copilot-agent',
					'security-defender-purview',
					'security-conversion-bonus', // reuses the BP deck → deduped
				]),
			).toEqual([
				'mci/V2_CSP-Copilot-Deployment-Accelerator-Customer-Flyer.pptx',
				'mci/V2_CSP-Agent-Deployment-Accelerator-Customer-Flyer.pptx',
				'mci/V2_CSP-BP-Deployment-Accelerator-Customer-Flyer.pptx',
			]);
		});

		it('returns an empty list when nothing is selected', () => {
			expect(resolveEngagementFlyers([])).toEqual([]);
		});
	});

	describe('closing sections', () => {
		it('resolves the standard renewal investment snapshot deck', () => {
			expect(
				resolveInvestmentSnapshotFlyer({
					journey: 'renewal',
					hasPromo: false,
				}),
			).toBe('investment/Investment Snapshot.pptx');
		});

		it('resolves the promo investment snapshot deck for renewal promos', () => {
			expect(
				resolveInvestmentSnapshotFlyer({
					journey: 'renewal',
					hasPromo: true,
				}),
			).toBe('investment/Investment Snapshot with Promo.pptx');
		});

		it('resolves the new-product investment snapshot deck for new customers', () => {
			expect(
				resolveInvestmentSnapshotFlyer({
					journey: 'new_customer',
					hasPromo: false,
				}),
			).toBe('investment/New Product Investment snapshot.pptx');
		});

		it('resolves the promo new-product investment snapshot deck for new customer promos', () => {
			expect(
				resolveInvestmentSnapshotFlyer({
					journey: 'new_customer',
					hasPromo: true,
				}),
			).toBe('investment/New Product Investment snapshot with promo.pptx');
		});

		it('points the last two sections at the investment folder', () => {
			expect(CONSOLIDATED_LAST_PAGE_FLYER).toBe('investment/last_page.pptx');
			expect(CONSOLIDATED_DISCLAIMER_FLYER).toBe('investment/disclaimer.pptx');
		});
	});
});

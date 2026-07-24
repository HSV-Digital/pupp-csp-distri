import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfChunkService } from './pdf-chunk.service';
import type { DashboardOpportunityRow } from '../dashboard/dashboard.types';

function opportunityRow(
	overrides: Partial<DashboardOpportunityRow>,
): DashboardOpportunityRow {
	return {
		customerId: 'c1',
		subscriptionId: 's1',
		customerName: 'Contoso',
		resellerName: '',
		distributorName: '',
		pssAIWorkforceName: '',
		pssAISecurityName: '',
		psaName: '',
		pdmName: '',
		pmmName: '',
		currentProduct: 'Microsoft 365 Business Basic',
		type: '',
		skuCategory: 'Basic',
		seatCount: 10,
		annualRevenueRunRate: 100,
		renewalDate: '',
		termMonths: 12,
		autoRenew: false,
		multiYear: false,
		hasCopilot: false,
		hasPurview: false,
		hasSureStep: false,
		currentMargin: 0,
		customerSegment: '',
		region: '',
		notes: '',
		...overrides,
	};
}

describe('PdfChunkService.buildCustomerListRows journey filtering', () => {
	let service: PdfChunkService;

	beforeEach(() => {
		const pdfRenderer = {} as never;
		const dlTokenService = {
			createToken: vi.fn().mockReturnValue('token'),
		} as never;
		service = new PdfChunkService(pdfRenderer, dlTokenService);
	});

	const filters = {} as never;
	const sort = {} as never;

	it('drops customers with no valid journey for the selected SKUs', () => {
		const rows = [
			opportunityRow({
				customerId: 'valid',
				customerName: 'Valid Co',
				currentProduct: 'Microsoft 365 Business Basic', // bb -> bp_cb valid
			}),
			opportunityRow({
				customerId: 'invalid',
				customerName: 'Invalid Co',
				currentProduct: 'Microsoft 365 Business Premium', // bp has no bs_cb path
			}),
		];

		const result = service.buildCustomerListRows(rows, filters, sort, [
			'bs_cb',
		]);

		expect(result.map((r) => r.customerId)).toEqual(['valid']);
	});

	it('keeps a customer if any of their subscriptions has a valid journey', () => {
		const rows = [
			opportunityRow({
				customerId: 'mixed',
				customerName: 'Mixed Co',
				subscriptionId: 's1',
				currentProduct: 'Office 365 E5', // unsupported
			}),
			opportunityRow({
				customerId: 'mixed',
				customerName: 'Mixed Co',
				subscriptionId: 's2',
				currentProduct: 'Microsoft 365 Business Basic', // valid
			}),
		];

		const result = service.buildCustomerListRows(rows, filters, sort, [
			'bp_cb',
		]);

		expect(result.map((r) => r.customerId)).toEqual(['mixed']);
	});

	it('applies no exclusion when the SKU selection is empty', () => {
		const rows = [
			opportunityRow({
				customerId: 'e5only',
				customerName: 'E5 Only',
				currentProduct: 'Office 365 E5',
			}),
		];

		const result = service.buildCustomerListRows(rows, filters, sort, []);

		expect(result.map((r) => r.customerId)).toEqual(['e5only']);
	});
});

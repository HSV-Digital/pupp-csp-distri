import { describe, expect, it, vi } from 'vitest';
import { AdminAnalyticsDownloadTrackingService } from '../admin-analytics/admin-analytics-download-tracking.service';
import { AuditService } from '../audit/audit.service';
import { ResellerCustomersService } from '../reseller-customers/reseller-customers.service';
import { DlTokenService } from './dl-token.service';
import { PdfAsyncService } from './pdf-async.service';
import { ResellerPdfController } from './reseller-pdf.controller';

describe('ResellerPdfController', () => {
	it('records reseller async customer-list analytics when a job is created', async () => {
		const pdfAsyncService = {
			createResellerCustomerAsyncJob: vi.fn().mockResolvedValue({
				id: 'job-1',
				dlToken: 'token-1',
				totalChunks: 1,
				totalParts: 1,
			}),
		};
		const resellerCustomersService = {
			getExportRowCount: vi.fn().mockResolvedValue(42),
		};
		const auditService = {
			recordEvent: vi.fn().mockResolvedValue(undefined),
		};
		const dlTokenService = {
			readTokenPayload: vi.fn().mockReturnValue({
				jti: 'token-jti-1',
				scope: 'customer-list',
				tenantId: 'default-tenant',
				filters: {
					pssAIWorkforce: [],
					pssAISecurity: [],
					psa: [],
					distributor: [],
					reseller: [],
					customer: [],
					pdm: [],
					pmm: [],
					region: [],
					expSeats: [],
					expArr: [],
					renewalDate: [],
					search: '',
				},
				sort: {
					sortBy: 'createdAt',
					sortDir: 'descending',
				},
				selectedSkuIds: [],
				iat: 1,
				exp: 2,
				v: 2,
			}),
		};
		const adminAnalyticsDownloadTrackingService = {
			recordResellerCustomerListJobCreated: vi
				.fn()
				.mockResolvedValue(undefined),
		};

		const controller = new ResellerPdfController(
			pdfAsyncService as unknown as PdfAsyncService,
			resellerCustomersService as unknown as ResellerCustomersService,
			auditService as unknown as AuditService,
			dlTokenService as unknown as DlTokenService,
			adminAnalyticsDownloadTrackingService as unknown as AdminAnalyticsDownloadTrackingService,
		);

		await controller.createListLinkAsync(
			{
				filters: {
					customerName: ['Contoso'],
					currentSku: ['Business Basic'],
					region: ['US'],
					seats: ['<50'],
					currentArr: ['$100,000-$200,000'],
					renewalDate: ['Within 1 month'],
					hasTransactedProduct: ['Yes'],
					mwPaidSeatRange: ['1-24'],
				},
				sort: {
					sortBy: 'createdAt',
					sortDir: 'descending',
				},
				selectedSkuIds: ['bp_cb'],
			},
			{
				userType: 'reseller',
				userId: 'reseller-user-1',
				orgId: 'org-1',
				tenantId: 'org-1',
				email: 'owner@example.com',
				canonicalEmail: 'owner@example.com',
				name: 'Owner',
				provider: 'entra',
				providerSubject: 'provider-subject',
				issuer: 'https://issuer.example.com',
				externalTenantId: 'external-tenant',
				displayName: 'Owner',
				mpnId: null,
			},
		);

		expect(pdfAsyncService.createResellerCustomerAsyncJob).toHaveBeenCalledWith(
			'org-1',
			'reseller-user-1',
			42,
			expect.objectContaining({
				customerName: ['Contoso'],
				currentSku: ['Business Basic'],
				hasTransactedProduct: ['Yes'],
				mwPaidSeatRange: ['1-24'],
			}),
			{
				sortBy: 'createdAt',
				sortDir: 'descending',
			},
			undefined,
			['bp_cb'],
		);
		expect(
			adminAnalyticsDownloadTrackingService.recordResellerCustomerListJobCreated,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				// Vitest asymmetric matchers are intentionally typed as any.
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				tokenPayload: expect.objectContaining({
					jti: 'token-jti-1',
					scope: 'customer-list',
				}),
				orgId: 'org-1',
				resellerFilters: {
					customerName: ['Contoso'],
					currentSku: ['Business Basic'],
					region: ['US'],
					seats: ['<50'],
					currentArr: ['$100,000-$200,000'],
					renewalDate: ['Within 1 month'],
					hasTransactedProduct: ['Yes'],
					mwPaidSeatRange: ['1-24'],
				},
				actorId: 'reseller-user-1',
				tenantId: 'org-1',
				requestId: null,
				route: null,
			}),
		);
	});
});

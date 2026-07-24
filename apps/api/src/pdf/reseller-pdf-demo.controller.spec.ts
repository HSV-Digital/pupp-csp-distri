import { describe, expect, it, vi } from 'vitest';
import { getEnv } from '../config/env';
import { ResellerCustomersService } from '../reseller-customers/reseller-customers.service';
import { PdfAsyncService } from './pdf-async.service';
import { ResellerPdfDemoController } from './reseller-pdf-demo.controller';

describe('ResellerPdfDemoController', () => {
	it('creates a queued PDF job scoped to the configured demo owner', async () => {
		const env = getEnv();
		const pdfAsyncService = {
			createResellerCustomerAsyncJob: vi.fn().mockResolvedValue({
				id: 'job-1',
				dlToken: 'token-1',
				totalChunks: 2,
				totalParts: 2,
			}),
		};
		const resellerCustomersService = {
			getExportRowCount: vi.fn().mockResolvedValue(42),
		};
		const controller = new ResellerPdfDemoController(
			pdfAsyncService as unknown as PdfAsyncService,
			resellerCustomersService as unknown as ResellerCustomersService,
		);

		const result = await controller.createListLinkAsync({
			filters: {
				customerName: ['Contoso'],
				hasTransactedProduct: ['Yes'],
				mwPaidSeatRange: ['1-24'],
			},
			sort: {
				sortBy: 'customerName',
				sortDir: 'ascending',
			},
			selectedSkuIds: ['bp_cb'],
		});

		expect(resellerCustomersService.getExportRowCount).toHaveBeenCalledWith(
			env.demoResellerOrgId,
			{
				customerName: ['Contoso'],
				hasTransactedProduct: ['Yes'],
				mwPaidSeatRange: ['1-24'],
			},
		);
		expect(pdfAsyncService.createResellerCustomerAsyncJob).toHaveBeenCalledWith(
			env.demoResellerOrgId,
			env.demoResellerUserId,
			42,
			{
				customerName: ['Contoso'],
				hasTransactedProduct: ['Yes'],
				mwPaidSeatRange: ['1-24'],
			},
			{
				sortBy: 'customerName',
				sortDir: 'ascending',
			},
			undefined,
			['bp_cb'],
		);
		expect(result).toEqual({
			jobId: 'job-1',
			url: `${env.apiPublicBaseUrl}/api/pdf/async/customer-list?dlToken=token-1`,
			estimatedRows: 42,
			totalChunks: 2,
			totalParts: 2,
		});
	});

	it('scopes status, password reveal, and cancellation to the demo owner', async () => {
		const env = getEnv();
		const expiresAt = new Date(Date.now() + 60_000);
		const pdfAsyncService = {
			getJobByIdForOwner: vi.fn().mockResolvedValue({
				id: '00000000-0000-4000-8000-000000000001',
				status: 'completed',
				progress: 100,
				totalChunks: 1,
				completedChunks: 1,
				partSize: 10_000,
				totalParts: 1,
				completedParts: 1,
				totalRows: 12,
				azureBlobUrl: 'https://example.com/list.pdf',
				parts: [],
				errorMessage: null,
				createdAt: new Date(),
				startedAt: new Date(),
				completedAt: new Date(),
				expiresAt,
				pdfPasswordCiphertext: 'encrypted',
				pdfPasswordRevealedAt: null,
			}),
			getJobParts: vi.fn().mockReturnValue([]),
			revealJobPasswordForOwner: vi.fn().mockResolvedValue('secret'),
			cancelJobForOwner: vi.fn().mockResolvedValue(undefined),
		};
		const controller = new ResellerPdfDemoController(
			pdfAsyncService as unknown as PdfAsyncService,
			{} as ResellerCustomersService,
		);
		const jobId = '00000000-0000-4000-8000-000000000001';

		const status = await controller.getAsyncJobStatus(jobId);
		const password = await controller.revealAsyncJobPassword(jobId);
		const cancelled = await controller.cancelAsyncJob(jobId);

		expect(status.passwordAvailable).toBe(true);
		expect(password).toEqual({ password: 'secret' });
		expect(cancelled).toEqual({ success: true });
		expect(pdfAsyncService.getJobByIdForOwner).toHaveBeenCalledWith(
			jobId,
			env.demoResellerUserId,
			env.demoResellerOrgId,
		);
		expect(pdfAsyncService.revealJobPasswordForOwner).toHaveBeenCalledWith(
			jobId,
			env.demoResellerUserId,
			env.demoResellerOrgId,
		);
		expect(pdfAsyncService.cancelJobForOwner).toHaveBeenCalledWith(
			jobId,
			env.demoResellerUserId,
			env.demoResellerOrgId,
		);
	});
});

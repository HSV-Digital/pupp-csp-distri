import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	cancelDemoResellerPdfJob,
	createDemoResellerAsyncPdfListLink,
	getDemoResellerPdfJobStatus,
	revealDemoResellerPdfJobPassword,
} from '@/lib/reseller-pdf-download-link';

const mockDemoResellerApiFetch = vi.fn();

vi.mock('@/lib/demo-reseller-api-client', () => ({
	demoResellerApiFetch: (...args: unknown[]) =>
		mockDemoResellerApiFetch(...args),
}));

vi.mock('@/lib/reseller-api-client', () => ({
	resellerApiFetch: vi.fn(),
}));

describe('demo reseller PDF job API', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('creates a job through the demo reseller proxy', async () => {
		mockDemoResellerApiFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				jobId: 'job-1',
				url: 'https://example.com/list.pdf',
				estimatedRows: 12,
				totalChunks: 1,
				totalParts: 1,
			}),
		} as Response);

		const request = {
			filters: { customerName: ['Contoso'] },
			sort: {
				sortBy: 'customerName',
				sortDir: 'ascending' as const,
			},
			selectedSkuIds: ['bp_cb'],
		};

		await expect(createDemoResellerAsyncPdfListLink(request)).resolves.toEqual({
			jobId: 'job-1',
			url: 'https://example.com/list.pdf',
			estimatedRows: 12,
			totalChunks: 1,
			totalParts: 1,
		});
		expect(mockDemoResellerApiFetch).toHaveBeenCalledWith(
			'/pdf/list/link-async',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify(request),
			}),
		);
	});

	it('polls and parses demo job status', async () => {
		mockDemoResellerApiFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'job-1',
				status: 'processing',
				progress: 50,
				totalChunks: 1,
				completedChunks: 0,
				partSize: 10_000,
				totalParts: 1,
				completedParts: 0,
				totalRows: 12,
				azureBlobUrl: null,
				parts: [],
				errorMessage: null,
				createdAt: '2026-07-24T00:00:00.000Z',
				startedAt: '2026-07-24T00:00:01.000Z',
				completedAt: null,
				expiresAt: null,
				passwordAvailable: false,
			}),
		} as Response);

		const result = await getDemoResellerPdfJobStatus('job-1');

		expect(result.status).toBe('processing');
		expect(result.progress).toBe(50);
		expect(mockDemoResellerApiFetch).toHaveBeenCalledWith(
			'/pdf/async/status/job-1',
			{ method: 'GET' },
		);
	});

	it('uses demo routes for cancellation and password reveal', async () => {
		mockDemoResellerApiFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ password: 'secret' }),
			} as Response);

		await cancelDemoResellerPdfJob('job-1');
		await expect(revealDemoResellerPdfJobPassword('job-1')).resolves.toEqual({
			password: 'secret',
		});

		expect(mockDemoResellerApiFetch).toHaveBeenNthCalledWith(
			1,
			'/pdf/async/job-1',
			{ method: 'DELETE' },
		);
		expect(mockDemoResellerApiFetch).toHaveBeenNthCalledWith(
			2,
			'/pdf/async/job-1/password/reveal',
			{ method: 'POST' },
		);
	});
});

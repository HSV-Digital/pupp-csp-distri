import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResellerPdfJobApi } from '@/lib/reseller-pdf-download-link';
import { ResellerDownloadListDialog } from './ResellerDownloadListDialog';

vi.mock('@/lib/upgrade-matrix', () => ({
	ENDING_SKUS: [
		{
			id: 'bp_cb',
			name: 'Business Premium + Copilot',
			isAddOn: false,
		},
	],
	expandSkuIdsWithAttachSkus: (ids: string[]) => ids,
}));

describe('ResellerDownloadListDialog', () => {
	const createListLink = vi.fn();
	const getJobStatus = vi.fn();
	const cancelJob = vi.fn();
	const revealJobPassword = vi.fn();
	const pdfJobApi: ResellerPdfJobApi = {
		createListLink,
		getJobStatus,
		cancelJob,
		revealJobPassword,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		createListLink.mockResolvedValue({
			jobId: 'job-1',
			url: 'https://example.com/list.pdf',
			estimatedRows: 12,
			totalChunks: 1,
			totalParts: 1,
		});
		getJobStatus.mockResolvedValue({
			id: 'job-1',
			status: 'processing',
			progress: 20,
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
		});
	});

	it('starts the job through the injected reseller PDF API', async () => {
		render(
			<ResellerDownloadListDialog
				open
				onOpenChange={vi.fn()}
				summary={{
					totalCustomers: 4,
					totalSubscriptions: 12,
					totalSeats: 120,
					totalArr: 0,
				}}
				totalRows={12}
				filters={{ customerName: ['Contoso'] }}
				sortBy="customerName"
				sortDir="ascending"
				onAddDownloadJob={vi.fn()}
				activeTrackerJobs={[]}
				onRemoveTrackerJob={vi.fn()}
				pdfJobApi={pdfJobApi}
			/>,
		);

		fireEvent.click(screen.getByText('Business Premium + Copilot'));
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Download List',
			}),
		);

		await waitFor(() => {
			expect(createListLink).toHaveBeenCalledWith({
				filters: { customerName: ['Contoso'] },
				sort: {
					sortBy: 'customerName',
					sortDir: 'ascending',
				},
				selectedSkuIds: ['bp_cb'],
			});
		});
		await waitFor(() => {
			expect(getJobStatus).toHaveBeenCalledWith('job-1');
		});
	});
});

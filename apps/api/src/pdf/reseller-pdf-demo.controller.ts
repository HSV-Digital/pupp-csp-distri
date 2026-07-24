import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { DemoModeGuard } from '../common/guards/demo-mode.guard';
import { DemoThrottleGuard } from '../common/guards/demo-throttle.guard';
import { getEnv } from '../config/env';
import { ResellerCustomersService } from '../reseller-customers/reseller-customers.service';
import { CreateResellerCustomerPdfDto } from './dto/create-reseller-customer-pdf.dto';
import { PdfAsyncService } from './pdf-async.service';
import { buildResellerPdfFilters } from './reseller-pdf-filters';

@Public()
@Controller('api/reseller/demo/pdf')
export class ResellerPdfDemoController {
	private readonly env = getEnv();

	constructor(
		private readonly pdfAsyncService: PdfAsyncService,
		private readonly resellerCustomersService: ResellerCustomersService,
	) {}

	@Post('list/link-async')
	@UseGuards(DemoModeGuard, DemoThrottleGuard)
	async createListLinkAsync(
		@Body() body: CreateResellerCustomerPdfDto,
	): Promise<{
		jobId: string;
		url: string;
		estimatedRows: number;
		totalChunks: number;
		totalParts: number;
	}> {
		const resellerFilters = buildResellerPdfFilters(body.filters);
		const totalRows = await this.resellerCustomersService.getExportRowCount(
			this.env.demoResellerOrgId,
			resellerFilters,
		);
		const {
			id: jobId,
			dlToken,
			totalChunks,
			totalParts,
		} = await this.pdfAsyncService.createResellerCustomerAsyncJob(
			this.env.demoResellerOrgId,
			this.env.demoResellerUserId,
			totalRows,
			resellerFilters,
			body.sort
				? {
						sortBy: body.sort.sortBy ?? 'createdAt',
						sortDir: body.sort.sortDir ?? 'descending',
					}
				: undefined,
			body.currency,
			body.selectedSkuIds ?? [],
		);

		return {
			jobId,
			url: `${this.env.apiPublicBaseUrl}/api/pdf/async/customer-list?dlToken=${dlToken}`,
			estimatedRows: totalRows,
			totalChunks,
			totalParts,
		};
	}

	@Get('async/status/:jobId')
	@Throttle({ default: { limit: 120, ttl: 60_000 } })
	@UseGuards(DemoModeGuard, DemoThrottleGuard)
	async getAsyncJobStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
		const job = await this.pdfAsyncService.getJobByIdForOwner(
			jobId,
			this.env.demoResellerUserId,
			this.env.demoResellerOrgId,
		);

		return {
			id: job.id,
			status: job.status,
			progress: job.progress,
			totalChunks: job.totalChunks,
			completedChunks: job.completedChunks,
			partSize: job.partSize,
			totalParts: job.totalParts,
			completedParts: job.completedParts,
			totalRows: job.totalRows,
			azureBlobUrl: job.azureBlobUrl,
			parts: this.pdfAsyncService.getJobParts(job.parts),
			errorMessage: job.errorMessage,
			createdAt: job.createdAt,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			expiresAt: job.expiresAt,
			passwordAvailable:
				job.status === 'completed' &&
				typeof job.pdfPasswordCiphertext === 'string' &&
				job.pdfPasswordCiphertext.length > 0 &&
				!job.pdfPasswordRevealedAt &&
				!!job.expiresAt &&
				job.expiresAt.getTime() > Date.now(),
		};
	}

	@Post('async/:jobId/password/reveal')
	@UseGuards(DemoModeGuard, DemoThrottleGuard)
	async revealAsyncJobPassword(
		@Param('jobId', ParseUUIDPipe) jobId: string,
	): Promise<{ password: string }> {
		const password = await this.pdfAsyncService.revealJobPasswordForOwner(
			jobId,
			this.env.demoResellerUserId,
			this.env.demoResellerOrgId,
		);

		return { password };
	}

	@Delete('async/:jobId')
	@UseGuards(DemoModeGuard, DemoThrottleGuard)
	async cancelAsyncJob(
		@Param('jobId', ParseUUIDPipe) jobId: string,
	): Promise<{ success: true }> {
		await this.pdfAsyncService.cancelJobForOwner(
			jobId,
			this.env.demoResellerUserId,
			this.env.demoResellerOrgId,
		);

		return { success: true };
	}
}

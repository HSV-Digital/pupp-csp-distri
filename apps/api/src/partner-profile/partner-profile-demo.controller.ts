import { randomUUID } from 'node:crypto';
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Put,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { BlobStorageService } from '../blob-storage/blob-storage.service';
import { DemoModeGuard } from '../common/guards/demo-mode.guard';
import { DemoThrottleGuard } from '../common/guards/demo-throttle.guard';
import { getEnv } from '../config/env';
import {
	ALLOWED_LOGO_TYPES,
	LOGO_CONTAINER,
	isUploadedLogoFile,
	logoFileInterceptor,
} from './logo-upload';
import { PartnerProfileService } from './partner-profile.service';
import { UpsertPartnerProfileDto } from './dto/upsert-partner-profile.dto';

/**
 * Unauthenticated profile endpoints for the shared demo tenant, pinned to the
 * demo org/user from env. Edits persist until scripts/seed-demo-tenant.ts is
 * re-run (the reset mechanism). Unlike the customers demo controller this one
 * does not audit, matching the authenticated profile controller.
 */
@Public()
@UseGuards(DemoModeGuard)
@Controller('api/reseller/demo/partner-profile')
export class PartnerProfileDemoController {
	constructor(
		private readonly partnerProfileService: PartnerProfileService,
		private readonly blobStorageService: BlobStorageService,
	) {}

	private get demoOrgId(): string {
		return getEnv().demoResellerOrgId;
	}

	private get demoUserId(): string {
		return getEnv().demoResellerUserId;
	}

	@Get()
	async getProfile() {
		const profile = await this.partnerProfileService.getProfile(
			this.demoOrgId,
		);
		return { profile };
	}

	@Put()
	async upsertProfile(@Body() body: UpsertPartnerProfileDto) {
		const profile = await this.partnerProfileService.upsertProfile(
			this.demoOrgId,
			this.demoUserId,
			body,
		);
		return { profile };
	}

	@Post('logo')
	@UseGuards(DemoModeGuard, DemoThrottleGuard)
	@UseInterceptors(logoFileInterceptor())
	async uploadLogo(@UploadedFile() file: unknown) {
		if (!isUploadedLogoFile(file)) {
			throw new BadRequestException('Missing file in request');
		}
		const extension = ALLOWED_LOGO_TYPES[file.mimetype];
		if (!extension) {
			throw new BadRequestException(
				'Only PNG, JPEG, WebP, or SVG images are supported',
			);
		}

		const url = await this.blobStorageService.upload(
			LOGO_CONTAINER,
			`${this.demoOrgId}/${randomUUID()}.${extension}`,
			file.buffer,
			file.mimetype,
		);
		return { url };
	}
}

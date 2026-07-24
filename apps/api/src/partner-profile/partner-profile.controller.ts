import { randomUUID } from 'node:crypto';
import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Put,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { AllowedUserTypes } from '../auth/decorators/allowed-user-types.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ResellerAuthUser } from '../auth/interfaces/auth-user.interface';
import { BlobStorageService } from '../blob-storage/blob-storage.service';
import {
	ALLOWED_LOGO_TYPES,
	LOGO_CONTAINER,
	isUploadedLogoFile,
	logoFileInterceptor,
} from './logo-upload';
import { PartnerProfileService } from './partner-profile.service';
import { UpsertPartnerProfileDto } from './dto/upsert-partner-profile.dto';

@AllowedUserTypes('reseller')
@Controller('api/reseller/partner-profile')
export class PartnerProfileController {
	constructor(
		private readonly partnerProfileService: PartnerProfileService,
		private readonly blobStorageService: BlobStorageService,
	) {}

	@Get()
	async getProfile(@CurrentUser() user: ResellerAuthUser) {
		const profile = await this.partnerProfileService.getProfile(user.orgId);
		return { profile };
	}

	@Put()
	async upsertProfile(
		@Body() body: UpsertPartnerProfileDto,
		@CurrentUser() user: ResellerAuthUser,
	) {
		const profile = await this.partnerProfileService.upsertProfile(
			user.orgId,
			user.userId,
			body,
		);
		return { profile };
	}

	/**
	 * Uploads the logo and returns its URL; the URL is only persisted on the
	 * profile when the form is saved, so an abandoned upload never overwrites
	 * the stored logo.
	 */
	@Post('logo')
	@UseInterceptors(logoFileInterceptor())
	async uploadLogo(
		@UploadedFile() file: unknown,
		@CurrentUser() user: ResellerAuthUser,
	) {
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
			`${user.orgId}/${randomUUID()}.${extension}`,
			file.buffer,
			file.mimetype,
		);
		return { url };
	}
}

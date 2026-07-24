import { Module } from '@nestjs/common';
import { BlobStorageModule } from '../blob-storage/blob-storage.module';
import { PartnerProfileController } from './partner-profile.controller';
import { PartnerProfileDemoController } from './partner-profile-demo.controller';
import { PartnerProfileService } from './partner-profile.service';

@Module({
	imports: [BlobStorageModule],
	controllers: [PartnerProfileController, PartnerProfileDemoController],
	providers: [PartnerProfileService],
	exports: [PartnerProfileService],
})
export class PartnerProfileModule {}

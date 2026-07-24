import {
	IsArray,
	IsBoolean,
	IsIn,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';
import {
	PARTNER_DESIGNATIONS,
	PARTNER_TYPES,
	SPECIALIZATIONS,
	type PartnerDesignation,
	type PartnerType,
	type SpecializationId,
} from '@repo/shared';

const SPECIALIZATION_IDS = SPECIALIZATIONS.map((s) => s.id);

export class UpsertPartnerProfileDto {
	@IsIn(PARTNER_TYPES)
	partnerType!: PartnerType;

	/** CSP Direct follow-up; expected null for CSP Indirect partners. */
	@IsOptional()
	@IsBoolean()
	hasModernWorkOrSecurityDesignation?: boolean | null;

	/** CSP Indirect follow-up; expected null for CSP Direct partners. */
	@IsOptional()
	@IsBoolean()
	hasOver25Points?: boolean | null;

	@IsArray()
	@IsIn(PARTNER_DESIGNATIONS, { each: true })
	designations!: PartnerDesignation[];

	@IsArray()
	@IsIn(SPECIALIZATION_IDS, { each: true })
	specializations!: SpecializationId[];

	@IsBoolean()
	copilotJumpstartReady!: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(2048)
	companyLogoUrl?: string | null;

	@IsNumber()
	@Min(0)
	@Max(100)
	erpMarginPercent!: number;
}

import { eq } from 'drizzle-orm';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import {
	getProfileContradictions,
	isPartnerDesignation,
	isSpecializationId,
	type PartnerProfile,
} from '@repo/shared';
import { createDatabaseClient } from '../database/connection';
import { resolveDatabaseUrl } from '../database/database-url';
import {
	resellerPartnerProfiles,
	type ResellerPartnerProfileRow,
} from '../database/schema';
import type { UpsertPartnerProfileDto } from './dto/upsert-partner-profile.dto';

@Injectable()
export class PartnerProfileService implements OnModuleDestroy {
	private readonly databaseClient = createDatabaseClient(resolveDatabaseUrl());
	private readonly db = this.databaseClient.db;
	private readonly sql = this.databaseClient.sql;

	async onModuleDestroy(): Promise<void> {
		await this.sql.end();
	}

	async getProfile(orgId: string): Promise<PartnerProfile | null> {
		const [row] = await this.db
			.select()
			.from(resellerPartnerProfiles)
			.where(eq(resellerPartnerProfiles.orgId, orgId))
			.limit(1);
		return row ? toPartnerProfile(row) : null;
	}

	async upsertProfile(
		orgId: string,
		userId: string,
		input: UpsertPartnerProfileDto,
	): Promise<PartnerProfile> {
		const profile = normalizeInput(input);

		const contradictions = getProfileContradictions(profile);
		if (contradictions.length > 0) {
			throw new BadRequestException({
				message: 'Profile answers contradict each other',
				contradictions,
			});
		}

		const now = new Date();
		const [row] = await this.db
			.insert(resellerPartnerProfiles)
			.values({
				orgId,
				...toRowValues(profile),
				createdBy: userId,
				updatedBy: userId,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: resellerPartnerProfiles.orgId,
				set: {
					...toRowValues(profile),
					updatedBy: userId,
					updatedAt: now,
				},
			})
			.returning();

		return toPartnerProfile(row);
	}
}

/**
 * The DTO validates membership per value; this narrows the arrays and pins
 * the follow-up answer of the *other* partner type to null so a stored
 * profile never carries a stale answer from a previous partner-type choice.
 */
function normalizeInput(input: UpsertPartnerProfileDto): PartnerProfile {
	const isDirect = input.partnerType === 'CSP Direct';
	return {
		partnerType: input.partnerType,
		hasModernWorkOrSecurityDesignation: isDirect
			? (input.hasModernWorkOrSecurityDesignation ?? null)
			: null,
		hasOver25Points: isDirect ? null : (input.hasOver25Points ?? null),
		designations: [...new Set(input.designations)],
		specializations: [...new Set(input.specializations)],
		copilotJumpstartReady: input.copilotJumpstartReady,
		companyLogoUrl: input.companyLogoUrl?.trim() || null,
		erpMarginPercent: input.erpMarginPercent,
	};
}

function toRowValues(profile: PartnerProfile) {
	return {
		partnerType: profile.partnerType,
		hasModernWorkOrSecurityDesignation:
			profile.hasModernWorkOrSecurityDesignation,
		hasOver25Points: profile.hasOver25Points,
		designations: profile.designations,
		specializations: profile.specializations,
		copilotJumpstartReady: profile.copilotJumpstartReady,
		companyLogoUrl: profile.companyLogoUrl,
		erpMarginPercent: profile.erpMarginPercent,
	};
}

function toPartnerProfile(row: ResellerPartnerProfileRow): PartnerProfile {
	return {
		partnerType: row.partnerType === 'CSP Indirect' ? 'CSP Indirect' : 'CSP Direct',
		hasModernWorkOrSecurityDesignation: row.hasModernWorkOrSecurityDesignation,
		hasOver25Points: row.hasOver25Points,
		designations: (row.designations ?? []).filter(isPartnerDesignation),
		specializations: (row.specializations ?? []).filter(isSpecializationId),
		copilotJumpstartReady: row.copilotJumpstartReady,
		companyLogoUrl: row.companyLogoUrl,
		erpMarginPercent: row.erpMarginPercent,
	};
}

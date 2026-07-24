import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockReturning = vi.fn();
const mockSqlEnd = vi.fn();

vi.mock('../database/connection', () => ({
	createDatabaseClient: () => ({
		db: {
			select: mockSelect,
			insert: mockInsert,
		},
		sql: { end: mockSqlEnd },
	}),
}));

vi.mock('../database/database-url', () => ({
	resolveDatabaseUrl: () => 'postgres://localhost:5432/test',
}));

import { PartnerProfileService } from './partner-profile.service';
import type { UpsertPartnerProfileDto } from './dto/upsert-partner-profile.dto';

const PROFILE_ROW = {
	orgId: 'org-1',
	partnerType: 'CSP Direct',
	hasModernWorkOrSecurityDesignation: true,
	hasOver25Points: null,
	designations: ['modern-work', 'bogus'],
	specializations: ['modern-work:copilot', 'junk:entry'],
	copilotJumpstartReady: true,
	companyLogoUrl: null,
	erpMarginPercent: 25,
	createdBy: 'user-1',
	updatedBy: 'user-1',
	createdAt: new Date('2026-07-01T00:00:00Z'),
	updatedAt: new Date('2026-07-01T00:00:00Z'),
};

function makeDto(
	overrides: Partial<UpsertPartnerProfileDto> = {},
): UpsertPartnerProfileDto {
	return {
		partnerType: 'CSP Direct',
		hasModernWorkOrSecurityDesignation: true,
		hasOver25Points: null,
		designations: ['modern-work'],
		specializations: ['modern-work:copilot'],
		copilotJumpstartReady: false,
		companyLogoUrl: null,
		erpMarginPercent: 25,
		...overrides,
	} as UpsertPartnerProfileDto;
}

describe('PartnerProfileService', () => {
	let service: PartnerProfileService;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSelect.mockReturnValue({ from: mockFrom });
		mockFrom.mockReturnValue({ where: mockWhere });
		mockWhere.mockReturnValue({ limit: mockLimit });
		mockInsert.mockReturnValue({ values: mockValues });
		mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
		mockOnConflictDoUpdate.mockReturnValue({ returning: mockReturning });
		service = new PartnerProfileService();
	});

	it('returns null when no profile row exists', async () => {
		mockLimit.mockResolvedValue([]);
		expect(await service.getProfile('org-1')).toBeNull();
	});

	it('filters unknown designations/specializations out of stored rows', async () => {
		mockLimit.mockResolvedValue([PROFILE_ROW]);
		const profile = await service.getProfile('org-1');
		expect(profile?.designations).toEqual(['modern-work']);
		expect(profile?.specializations).toEqual(['modern-work:copilot']);
	});

	it('upserts with audit fields and returns the stored profile', async () => {
		mockReturning.mockResolvedValue([PROFILE_ROW]);

		await service.upsertProfile('org-1', 'user-2', makeDto());

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: 'org-1',
				createdBy: 'user-2',
				updatedBy: 'user-2',
			}),
		);
		const conflictArg = mockOnConflictDoUpdate.mock.calls[0][0];
		expect(conflictArg.set).toEqual(
			expect.objectContaining({ updatedBy: 'user-2' }),
		);
		expect(conflictArg.set).not.toHaveProperty('createdBy');
	});

	it('nulls the other partner type follow-up answer', async () => {
		mockReturning.mockResolvedValue([PROFILE_ROW]);

		await service.upsertProfile(
			'org-1',
			'user-2',
			makeDto({
				partnerType: 'CSP Indirect',
				hasModernWorkOrSecurityDesignation: true,
				hasOver25Points: true,
				designations: [],
			}),
		);

		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				hasModernWorkOrSecurityDesignation: null,
				hasOver25Points: true,
			}),
		);
	});

	it('rejects contradictory answers', async () => {
		await expect(
			service.upsertProfile(
				'org-1',
				'user-2',
				makeDto({
					hasModernWorkOrSecurityDesignation: true,
					designations: ['business-applications'],
				}),
			),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(mockInsert).not.toHaveBeenCalled();
	});
});

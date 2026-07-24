import type { PartnerProfile } from '@repo/shared';
import { resellerApiFetch } from './reseller-api-client';

/** Error carrying the HTTP status so callers can special-case 401 etc. */
export class PartnerProfileApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = 'PartnerProfileApiError';
	}
}

export async function getPartnerProfile(): Promise<PartnerProfile | null> {
	const response = await resellerApiFetch('/api/reseller/partner-profile');
	if (!response.ok) {
		throw new PartnerProfileApiError(
			`Failed to load partner profile (${response.status})`,
			response.status,
		);
	}
	const data = (await response.json()) as { profile: PartnerProfile | null };
	return data.profile ?? null;
}

export async function savePartnerProfile(
	input: PartnerProfile,
): Promise<PartnerProfile> {
	const response = await resellerApiFetch('/api/reseller/partner-profile', {
		method: 'PUT',
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		throw new PartnerProfileApiError(
			`Failed to save partner profile (${response.status})`,
			response.status,
		);
	}
	const data = (await response.json()) as { profile: PartnerProfile };
	return data.profile;
}

export async function uploadPartnerLogo(file: File): Promise<string> {
	const formData = new FormData();
	formData.append('file', file);
	const response = await resellerApiFetch('/api/reseller/partner-profile/logo', {
		method: 'POST',
		body: formData,
	});
	if (!response.ok) {
		throw new PartnerProfileApiError(
			`Failed to upload logo (${response.status})`,
			response.status,
		);
	}
	const data = (await response.json()) as { url: string };
	return data.url;
}

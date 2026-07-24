import type { PartnerProfile } from '@repo/shared';
import { demoResellerApiFetch } from './demo-reseller-api-client';
import { PartnerProfileApiError } from './partner-profile-api';

export async function getDemoPartnerProfile(): Promise<PartnerProfile | null> {
	const response = await demoResellerApiFetch('/partner-profile');
	if (!response.ok) {
		throw new PartnerProfileApiError(
			`Failed to load partner profile (${response.status})`,
			response.status,
		);
	}
	const data = (await response.json()) as { profile: PartnerProfile | null };
	return data.profile ?? null;
}

export async function saveDemoPartnerProfile(
	input: PartnerProfile,
): Promise<PartnerProfile> {
	const response = await demoResellerApiFetch('/partner-profile', {
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

export async function uploadDemoPartnerLogo(file: File): Promise<string> {
	const formData = new FormData();
	formData.append('file', file);
	const response = await demoResellerApiFetch('/partner-profile/logo', {
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

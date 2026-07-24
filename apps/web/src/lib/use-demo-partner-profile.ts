'use client';

import { useEffect, useState } from 'react';
import { DEMO_PARTNER_PROFILE, type PartnerProfile } from '@repo/shared';
import { getDemoPartnerProfile } from './demo-partner-profile-api';

/**
 * Loads the demo tenant's stored partner profile. A missing row or failed
 * load resolves to DEMO_PARTNER_PROFILE — the demo surface never shows the
 * profile-setup gate and always has a usable profile for pricing/MCI.
 */
export function useDemoPartnerProfile(): {
	profile: PartnerProfile;
	loading: boolean;
} {
	const [profile, setProfile] = useState<PartnerProfile>(DEMO_PARTNER_PROFILE);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		void getDemoPartnerProfile()
			.then((loaded) => {
				if (!cancelled && loaded) setProfile(loaded);
			})
			.catch(() => {
				// Fallback constant already in state.
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return { profile, loading };
}

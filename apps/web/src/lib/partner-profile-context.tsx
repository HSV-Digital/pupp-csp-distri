'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import type { PartnerProfile } from '@repo/shared';
import { getPartnerProfile } from './partner-profile-api';

interface PartnerProfileContextValue {
	/** null = no profile saved yet (or still loading — check `loading`). */
	profile: PartnerProfile | null;
	loading: boolean;
	/**
	 * True only when the API confirmed there is no profile record for this
	 * org (200 with profile: null). A failed load leaves this false so the
	 * blocking setup modal never fires on a transient error for an org that
	 * already has a record.
	 */
	notFound: boolean;
	refresh: () => Promise<void>;
	/** Seed the context after a successful save, skipping the refetch. */
	setProfile: (profile: PartnerProfile) => void;
}

const PartnerProfileContext = createContext<PartnerProfileContextValue>({
	profile: null,
	loading: true,
	notFound: false,
	refresh: async () => {},
	setProfile: () => {},
});

export function PartnerProfileProvider({
	children,
	loadProfile = getPartnerProfile,
}: {
	children: React.ReactNode;
	/** Override the fetch source (e.g. the unauthenticated demo endpoint). */
	loadProfile?: () => Promise<PartnerProfile | null>;
}) {
	const [profile, setProfileState] = useState<PartnerProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	const refresh = useCallback(async () => {
		try {
			const loaded = await loadProfile();
			setProfileState(loaded);
			setNotFound(loaded === null);
		} catch {
			// A failed load is NOT "no record" — keep notFound false so the
			// setup modal only appears for orgs the API confirmed have no
			// profile. Saving on the profile page surfaces any real API problem.
			setProfileState(null);
			setNotFound(false);
		} finally {
			setLoading(false);
		}
	}, [loadProfile]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const setProfile = useCallback((saved: PartnerProfile) => {
		setProfileState(saved);
		setNotFound(false);
	}, []);

	const value = useMemo<PartnerProfileContextValue>(
		() => ({
			profile,
			loading,
			notFound,
			refresh,
			setProfile,
		}),
		[profile, loading, notFound, refresh, setProfile],
	);

	return (
		<PartnerProfileContext.Provider value={value}>
			{children}
		</PartnerProfileContext.Provider>
	);
}

export function usePartnerProfile() {
	return useContext(PartnerProfileContext);
}

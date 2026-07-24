'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useLocale, useTranslations } from 'next-intl';
import { DEMO_PARTNER_PROFILE, type PartnerProfile } from '@repo/shared';
import { PartnerProfileForm } from '@/components/partner-profile/PartnerProfileForm';
import {
	getDemoPartnerProfile,
	saveDemoPartnerProfile,
	uploadDemoPartnerLogo,
} from '@/lib/demo-partner-profile-api';
import {
	PartnerProfileProvider,
	usePartnerProfile,
} from '@/lib/partner-profile-context';
import { getThemeConfig } from '@/lib/theme-config';
import { localeHref, type Locale } from '@/i18n/config';

/**
 * Module-scope so the provider's refresh callback stays stable. A missing row
 * or failed load falls back to the canonical constant — the demo tenant is
 * shared and unauthenticated, and must always have a usable profile.
 */
async function loadDemoProfile(): Promise<PartnerProfile | null> {
	try {
		return (await getDemoPartnerProfile()) ?? DEMO_PARTNER_PROFILE;
	} catch {
		return DEMO_PARTNER_PROFILE;
	}
}

function DemoPartnerProfilePageContent() {
	const t = useTranslations('partnerProfile');
	const locale = useLocale() as Locale;
	const { loading } = usePartnerProfile();
	// Same validation as the protected page: internal paths only, so a crafted
	// link can't turn this into an open redirect.
	const searchParams = useSearchParams();
	const returnTo = useMemo(() => {
		const raw = searchParams.get('returnTo');
		return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
	}, [searchParams]);

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center py-24">
				<Spinner size="large" />
			</div>
		);
	}

	return (
		<main
			className="flex-1 bg-cover bg-fixed bg-center"
			style={{
				backgroundImage: `url('${getThemeConfig().assets.proposalPageBackground}')`,
			}}
		>
			<div className="mx-auto w-full max-w-[1040px] px-6 py-8">
				<Link
					href={returnTo ?? localeHref(locale, '/demo')}
					className="mb-4 inline-flex items-center gap-1.5 font-ds-text text-sm font-medium text-gray-700 no-underline hover:text-(--ds-color-violet-700)"
				>
					<ArrowLeftRegular fontSize={16} />
					Back
				</Link>
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
					<div className="px-8 pt-8">
						<h1 className="m-0 font-ds-display text-xl font-semibold text-gray-900">
							{t('title')}
						</h1>
						<p className="mb-6 mt-2 max-w-[720px] font-ds-text text-sm text-gray-600">
							{t('intro')}
						</p>
					</div>
					<PartnerProfileForm
						saveProfile={saveDemoPartnerProfile}
						uploadLogo={uploadDemoPartnerLogo}
					/>
				</div>
			</div>
		</main>
	);
}

export default function DemoPartnerProfilePage() {
	return (
		<PartnerProfileProvider loadProfile={loadDemoProfile}>
			<Suspense fallback={null}>
				<DemoPartnerProfilePageContent />
			</Suspense>
		</PartnerProfileProvider>
	);
}

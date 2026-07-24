'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { useLocale, useTranslations } from 'next-intl';
import { PartnerProfileForm } from '@/components/partner-profile/PartnerProfileForm';
import { usePartnerProfile } from '@/lib/partner-profile-context';
import { getThemeConfig } from '@/lib/theme-config';
import { localeHref, type Locale } from '@/i18n/config';

function PartnerProfilePageContent() {
	const t = useTranslations('partnerProfile');
	const locale = useLocale() as Locale;
	const { loading } = usePartnerProfile();
	// Same validation as the form's continue button: internal paths only, so a
	// crafted link can't turn this into an open redirect.
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
		// Same branded backdrop as the proposal page, with the form's white
		// cards floating on it.
		<main
			className="flex-1 bg-cover bg-fixed bg-center"
			style={{
				backgroundImage: `url('${getThemeConfig().assets.proposalPageBackground}')`,
			}}
		>
			<div className="mx-auto w-full max-w-[1040px] px-6 py-8">
				{/* Back to wherever the partner came from (returnTo is set when
				    another page sent them here); dashboard when opened directly. */}
				<Link
					href={returnTo ?? localeHref(locale, '/dashboard')}
					className="mb-4 inline-flex items-center gap-1.5 font-ds-text text-sm font-medium text-gray-700 no-underline hover:text-(--ds-color-violet-700)"
				>
					<ArrowLeftRegular fontSize={16} />
					Back
				</Link>
				{/* One containing card: heading + all sections; the form renders its
				    save bar as the card's squared footer strip. */}
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
					<div className="px-8 pt-8">
						<h1 className="m-0 font-ds-display text-xl font-semibold text-gray-900">
							{t('title')}
						</h1>
						<p className="mb-6 mt-2 max-w-[720px] font-ds-text text-sm text-gray-600">
							{t('intro')}
						</p>
					</div>
					<PartnerProfileForm />
				</div>
			</div>
		</main>
	);
}

export default function PartnerProfilePage() {
	return (
		<Suspense fallback={null}>
			<PartnerProfilePageContent />
		</Suspense>
	);
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth as resellerAuth } from '@/lib/reseller-auth';
import { localeHref } from '@/i18n/config';
import ResellersHero from './ResellersHero';

export default async function ResellersPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const session = await resellerAuth();

	if (
		session?.userType === 'reseller' &&
		session.resellerUserId &&
		session.orgId
	) {
		redirect(localeHref(locale, '/dashboard'));
	}

	return (
		<Suspense>
			<ResellersHero />
		</Suspense>
	);
}

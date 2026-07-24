import { redirect } from 'next/navigation';
import { auth as resellerAuth } from '@/lib/reseller-auth';
import { isHsvEmail } from '@/lib/hsv-email';
import { localeHref } from '@/i18n/config';
import { CspPartnerAnalyticsClient } from '@/components/csp-partner-analytics/csp-partner-analytics-client';

export default async function CspPartnerAnalyticsPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const session = await resellerAuth();

	if (!isHsvEmail(session?.user?.email)) {
		redirect(localeHref(locale, '/dashboard'));
	}

	return <CspPartnerAnalyticsClient />;
}

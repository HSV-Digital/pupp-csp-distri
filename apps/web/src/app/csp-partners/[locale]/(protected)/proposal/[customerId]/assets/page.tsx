'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useResellerCustomerSubscriptions } from '@/lib/use-reseller-customer-subscriptions';
import {
	decodeResellerCustomerRouteKey,
	encodeResellerCustomerRouteKey,
} from '@/lib/reseller-customer-route';
import { localeHref, type Locale } from '@/i18n/config';
import { AssetsPageContent } from '@/components/proposal/AssetsPageContent';
import { RequirePartnerProfile } from '@/components/partner-profile/RequirePartnerProfile';
import { usePartnerProfile } from '@/lib/partner-profile-context';

function ResellerAssetsPageContent() {
	// Null until the org saves its profile; erpMarginPercent then stays
	// undefined and pricing falls back to the program-default 20%.
	const { profile } = usePartnerProfile();
	const params = useParams<{ customerId: string }>();
	const locale = useLocale() as Locale;
	const router = useRouter();
	const searchParams = useSearchParams();
	const routeCustomerId = params.customerId;
	const customerId = decodeResellerCustomerRouteKey(routeCustomerId);
	const {
		subscriptions: customerRows,
		loading,
		error,
	} = useResellerCustomerSubscriptions(customerId);

	useEffect(() => {
		if (error) {
			router.replace(localeHref(locale, '/dashboard'));
		}
	}, [error, router, locale]);

	const from = searchParams.get('from');
	const proposalBasePath = localeHref(
		locale,
		`/proposal/${encodeResellerCustomerRouteKey(customerId)}`,
	);
	const backHref =
		from === 'dashboard'
			? `${proposalBasePath}?from=dashboard`
			: proposalBasePath;

	return (
		<AssetsPageContent
			customerId={customerId}
			erpMarginPercent={profile?.erpMarginPercent}
			backHref={backHref}
			showPartnerEmail={from === 'dashboard'}
			isNewCustomer
			proposalBasePath={backHref}
			loadRequest={
				customerRows.length > 0
					? {
							kind: 'reseller',
						}
					: null
			}
			loading={loading}
			showCspPartnerResources
		/>
	);
}

export default function ResellerAssetsPage() {
	return (
		<Suspense fallback={null}>
			<RequirePartnerProfile>
				<ResellerAssetsPageContent />
			</RequirePartnerProfile>
		</Suspense>
	);
}

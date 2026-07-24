'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useResellerCustomerSubscriptions } from '@/lib/use-reseller-customer-subscriptions';
import { synthesizeSubscriptionsFromCustomers } from '@/lib/synthesize-subscription';
import {
	decodeResellerCustomerRouteKey,
	encodeResellerCustomerRouteKey,
} from '@/lib/reseller-customer-route';
import { EMPTY_PARTNER_PROFILE } from '@repo/shared';
import { localeHref, type Locale } from '@/i18n/config';
import { ProposalPageContent } from '@/components/proposal/ProposalPageContent';
import { RequirePartnerProfile } from '@/components/partner-profile/RequirePartnerProfile';
import { usePartnerProfile } from '@/lib/partner-profile-context';
import { recordCspPartnerViewProposalEvent } from '@/components/csp-partner-analytics/csp-partner-analytics-api';

function ResellerProposalPageContent() {
	const params = useParams<{ customerId: string }>();
	const locale = useLocale() as Locale;
	const router = useRouter();
	const searchParams = useSearchParams();
	// Null until the org saves its profile; RequirePartnerProfile overlays a
	// blocking setup modal in that case while the page renders neutrally.
	const { profile } = usePartnerProfile();
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

	const viewRecordedRef = useRef(false);
	useEffect(() => {
		if (loading || error || customerRows.length === 0) return;
		if (viewRecordedRef.current) return;
		viewRecordedRef.current = true;
		void recordCspPartnerViewProposalEvent(customerId);
	}, [loading, error, customerRows.length, customerId]);

	const from = searchParams.get('from');
	const backHref = localeHref(locale, '/dashboard');

	const subscriptions = useMemo(
		() => synthesizeSubscriptionsFromCustomers(customerId, customerRows),
		[customerRows, customerId],
	);

	const customerName = customerRows[0]?.customerName ?? '';

	return (
		<ProposalPageContent
			customerId={customerId}
			customerName={customerName}
			partnerProfile={profile ?? EMPTY_PARTNER_PROFILE}
			subscriptions={subscriptions}
			backHref={backHref}
			assetsBasePath={localeHref(locale, `/proposal/${encodeResellerCustomerRouteKey(customerId)}/assets`)}
			isReseller
			showTpid={false}
			showCurrencySwitcher={true}
			resetCurrencyToRegionOnMount
			showPartnerActions={from === 'dashboard'}
			loading={loading}
		/>
	);
}

export default function ResellerProposalPage() {
	return (
		<Suspense fallback={null}>
			<RequirePartnerProfile>
				<ResellerProposalPageContent />
			</RequirePartnerProfile>
		</Suspense>
	);
}

'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useDemoResellerCustomerSubscriptions } from '@/lib/use-demo-reseller-customer-subscriptions';
import { synthesizeSubscriptionsFromCustomers } from '@/lib/synthesize-subscription';
import {
	decodeResellerCustomerRouteKey,
	encodeResellerCustomerRouteKey,
} from '@/lib/reseller-customer-route';
import { localeHref, type Locale } from '@/i18n/config';
import { useDemoPartnerProfile } from '@/lib/use-demo-partner-profile';
import { ProposalPageContent } from '@/components/proposal/ProposalPageContent';
import { writeDemoCustomerSnapshot } from '@/lib/demo-data-utils';

function DemoResellerProposalPageContent() {
	const params = useParams<{ customerId: string }>();
	const locale = useLocale() as Locale;
	const router = useRouter();
	const routeCustomerId = params.customerId;
	const customerId = decodeResellerCustomerRouteKey(routeCustomerId);
	const {
		subscriptions: customerRows,
		loading,
		error,
	} = useDemoResellerCustomerSubscriptions(customerId);
	const { profile: partnerProfile, loading: profileLoading } =
		useDemoPartnerProfile();

	useEffect(() => {
		if (error) {
			router.replace(localeHref(locale, '/demo'));
		}
	}, [error, router, locale]);

	const backHref = localeHref(locale, '/demo');

	const subscriptions = useMemo(
		() => synthesizeSubscriptionsFromCustomers(customerId, customerRows),
		[customerRows, customerId],
	);

	const customerName = customerRows[0]?.customerName ?? '';

	useEffect(() => {
		if (customerRows.length === 0) return;
		writeDemoCustomerSnapshot({
			customerId,
			customerName,
			subscriptions,
		});
	}, [customerId, customerName, customerRows.length, subscriptions]);

	return (
		<ProposalPageContent
			customerId={customerId}
			customerName={customerName}
			partnerProfile={partnerProfile}
			subscriptions={subscriptions}
			backHref={backHref}
			assetsBasePath={localeHref(locale, `/demo/proposal/${encodeResellerCustomerRouteKey(customerId)}/assets`)}
			isReseller
			showTpid={false}
			showPartnerActions
			usePublicEmailApi
			loading={loading || profileLoading}
			showCurrencySwitcher
			resetCurrencyToRegionOnMount
		/>
	);
}

export default function DemoResellerProposalPage() {
	return (
		<Suspense fallback={null}>
			<DemoResellerProposalPageContent />
		</Suspense>
	);
}

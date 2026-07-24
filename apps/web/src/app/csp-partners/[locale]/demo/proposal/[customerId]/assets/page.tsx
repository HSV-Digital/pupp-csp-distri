'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useDemoPartnerProfile } from '@/lib/use-demo-partner-profile';
import { AssetsPageContent } from '@/components/proposal/AssetsPageContent';
import { readDemoCustomerSnapshot } from '@/lib/demo-data-utils';
import {
	decodeResellerCustomerRouteKey,
	encodeResellerCustomerRouteKey,
} from '@/lib/reseller-customer-route';
import { localeHref, type Locale } from '@/i18n/config';

function DemoResellerAssetsPageContent() {
	const params = useParams<{ customerId: string }>();
	const locale = useLocale() as Locale;
	const routeCustomerId = params.customerId;
	const customerId = decodeResellerCustomerRouteKey(routeCustomerId);
	const snapshot = readDemoCustomerSnapshot();
	const { profile, loading: profileLoading } = useDemoPartnerProfile();

	// Wait for the stored profile before rendering, so generated assets never
	// flash the fallback margin and then re-render with the edited one.
	if (profileLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px] text-neutral-500" />
		);
	}

	if (!snapshot || snapshot.customerId !== customerId) {
		return (
			<div className="flex items-center justify-center min-h-[400px] text-neutral-500">
				Customer data not found. Please go back and try again.
			</div>
		);
	}

	const proposalBasePath = localeHref(
		locale,
		`/demo/proposal/${encodeResellerCustomerRouteKey(customerId)}`,
	);

	return (
		<AssetsPageContent
			customerId={customerId}
			erpMarginPercent={profile.erpMarginPercent}
			backHref={proposalBasePath}
			proposalBasePath={proposalBasePath}
			showPartnerEmail={false}
			isNewCustomer
			loadRequest={{
				kind: 'public',
				customerSnapshot: {
					customerId: snapshot.customerId,
					customerName: snapshot.customerName,
					subscriptions: snapshot.subscriptions,
				},
			}}
			showCspPartnerResources
		/>
	);
}

export default function DemoResellerAssetsPage() {
	return (
		<Suspense fallback={null}>
			<DemoResellerAssetsPageContent />
		</Suspense>
	);
}

'use client';

// Hardcoded English, matching the rest of the MCI flow.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
	CheckmarkCircle16Filled,
	ChevronDown16Regular,
	Dismiss12Regular,
} from '@fluentui/react-icons';
import {
	getEligibleMciEngagementIds,
	getIncentiveRates,
	isMciGateEligible,
	MCI_BONUS_PARENT,
	MCI_ENGAGEMENT_IDS,
	MCI_ENGAGEMENTS,
	type PartnerProfile,
} from '@repo/shared';

// Conversion bonuses are claimed via the per-card displacement question, so
// the banner only summarizes the base engagements.
const BANNER_ENGAGEMENT_IDS = MCI_ENGAGEMENT_IDS.filter(
	(id) => !MCI_BONUS_PARENT[id],
);
import { localeHref, type Locale } from '@/i18n/config';

interface PartnerProfileEligibilityBannerProps {
	profile: PartnerProfile;
	showUpdateLink?: boolean;
	/**
	 * Locale-relative path of the profile page the update link opens; demo
	 * surfaces pass '/demo/partner-profile' so the link edits the demo profile
	 * rather than the signed-in reseller's.
	 */
	profileBasePath?: string;
	className?: string;
}

function EligibleChip({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-(--ds-color-violet-50) py-1 pl-2 pr-2.5 font-ds-text text-xs font-medium text-(--ds-color-violet-700)">
			<CheckmarkCircle16Filled
				className="shrink-0 text-(--ds-color-violet-500)"
				aria-hidden
			/>
			{label}
		</span>
	);
}

function IneligibleChip({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 py-1 pl-2 pr-2.5 font-ds-text text-xs font-normal text-gray-400">
			<Dismiss12Regular className="shrink-0" aria-hidden />
			{label}
		</span>
	);
}

function ChipRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="w-28 shrink-0 whitespace-nowrap font-ds-text text-[11px] font-semibold uppercase tracking-wide text-gray-400">
				{label} –
			</span>
			{children}
		</div>
	);
}

/**
 * Summarizes which MCI engagements the saved partner profile qualifies for,
 * shown above the proposal's subscription/SKU section so partners know what
 * the per-card engagement dropdowns will (and won't) offer — and where to go
 * if their designations have changed.
 */
export function PartnerProfileEligibilityBanner({
	profile,
	showUpdateLink = true,
	profileBasePath = '/partner-profile',
	className,
}: PartnerProfileEligibilityBannerProps) {
	const locale = useLocale() as Locale;
	const pathname = usePathname();
	// Collapsed by default; partners expand to review engagement/incentive detail.
	const [isOpen, setIsOpen] = useState(false);
	// Send the current page along so the profile page's back link returns to
	// this proposal — same pattern as ResellerNavbar.
	const profileReturnTo =
		pathname && pathname.startsWith('/') && !pathname.startsWith('//')
			? `?returnTo=${encodeURIComponent(pathname)}`
			: '';
	const eligibleIds = new Set(getEligibleMciEngagementIds(profile));
	const eligible = BANNER_ENGAGEMENT_IDS.filter((id) => eligibleIds.has(id));
	const ineligible = BANNER_ENGAGEMENT_IDS.filter((id) => !eligibleIds.has(id));
	const gateEligible = isMciGateEligible(profile);

	// CSP incentive eligibility shares the MCI gate (Direct + MW/Security
	// designation, or Indirect + >25 points); the rate set additionally depends
	// on partner type (CSP Core is 0% for Indirect).
	const incentiveRates = getIncentiveRates(profile.partnerType);
	const cspIncentives = [
		{ key: 'cspCore', label: 'M365 CSP Core', rate: incentiveRates.cspCore },
		{
			key: 'strategicAccelerator',
			label: 'M365 CSP Global Strategic Product Accelerator – Tier 1',
			rate: incentiveRates.strategicAccelerator,
		},
		{
			key: 'growthAccelerator',
			label: 'M365 CSP Growth Accelerator',
			rate: incentiveRates.growthAccelerator,
		},
	].map((incentive) => ({
		...incentive,
		eligible: gateEligible && incentive.rate > 0,
		chipLabel:
			gateEligible && incentive.rate > 0
				? `${incentive.label} (${Math.round(incentive.rate * 1000) / 10}%)`
				: incentive.label,
	}));
	const cspEligible = cspIncentives.filter((incentive) => incentive.eligible);
	const cspIneligible = cspIncentives.filter(
		(incentive) => !incentive.eligible,
	);

	const updateLink = showUpdateLink ? (
		<Link
			href={localeHref(locale, `${profileBasePath}${profileReturnTo}`)}
			className="font-medium text-(--ds-color-violet-500) underline underline-offset-2 hover:text-(--ds-color-violet-700)"
		>
			update your Partner Profile
		</Link>
	) : null;

	return (
		<div
			className={['bg-white rounded-xl px-6 py-4', className]
				.filter(Boolean)
				.join(' ')}
			data-testid="partner-profile-eligibility-banner"
		>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-expanded={isOpen}
				className="flex w-full items-center justify-between gap-2 bg-transparent p-0 text-left"
			>
				<h3 className="m-0 font-ds-display text-base font-medium text-gray-900">
					Incentive Eligibility
				</h3>
				<ChevronDown16Regular
					className={`shrink-0 text-gray-400 transition-transform ${
						isOpen ? 'rotate-180' : ''
					}`}
					aria-hidden
				/>
			</button>
			{!isOpen ? null : (
				<>
					<div className="mt-1 flex flex-col gap-1 border-b border-gray-100 pb-3">
						<p className="m-0 font-ds-text text-xs font-normal text-gray-500">
							Based on your partner profile
							{gateEligible
								? ', these are the MCI engagements and CSP incentives that apply to this proposal.'
								: ", you don't currently qualify for MCI engagement or CSP incentives."}{' '}
							{updateLink ? (
								<>Has something changed? Please {updateLink}.</>
							) : null}
						</p>
					</div>
					<div className="mt-3 flex flex-col gap-2">
						<span className="font-ds-text text-[11px] font-semibold uppercase tracking-wide text-gray-500">
							MCI Engagements
						</span>
						{gateEligible ? (
							<>
								{eligible.length > 0 && (
									<ChipRow label="Eligible">
										{eligible.map((id) => (
											<EligibleChip
												key={id}
												label={MCI_ENGAGEMENTS[id].label}
											/>
										))}
									</ChipRow>
								)}
								{ineligible.length > 0 && (
									<ChipRow label="Not eligible">
										{ineligible.map((id) => (
											<IneligibleChip
												key={id}
												label={MCI_ENGAGEMENTS[id].label}
											/>
										))}
									</ChipRow>
								)}
							</>
						) : (
							<ChipRow label="Not eligible">
								{BANNER_ENGAGEMENT_IDS.map((id) => (
									<IneligibleChip key={id} label={MCI_ENGAGEMENTS[id].label} />
								))}
							</ChipRow>
						)}
					</div>
					<div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
						<span className="font-ds-text text-[11px] font-semibold uppercase tracking-wide text-gray-500">
							CSP Incentives ({profile.partnerType})
						</span>
						{cspEligible.length > 0 && (
							<ChipRow label="Eligible">
								{cspEligible.map((incentive) => (
									<EligibleChip
										key={incentive.key}
										label={incentive.chipLabel}
									/>
								))}
							</ChipRow>
						)}
						{cspIneligible.length > 0 && (
							<ChipRow label="Not eligible">
								{cspIneligible.map((incentive) => (
									<IneligibleChip
										key={incentive.key}
										label={incentive.chipLabel}
									/>
								))}
							</ChipRow>
						)}
					</div>
					<div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
						<span className="font-ds-text text-[11px] font-semibold uppercase tracking-wide text-gray-500">
							Margin
						</span>
						<p
							className="m-0 font-ds-text text-xs font-normal text-gray-500"
							data-testid="partner-profile-margin-note"
						>
							Prices are pulled from your Partner Profile margin by default. You
							can override them on any proposal card. To change the default
							going forward, {updateLink ?? 'update your Partner Profile'}.
						</p>
					</div>
				</>
			)}
		</div>
	);
}

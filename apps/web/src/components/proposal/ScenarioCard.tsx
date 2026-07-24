'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { EndingSku, UpgradeScenario } from '@repo/types';
import {
	getPlanDescriptionKey,
	getPlanHighlightKeys,
	isKnownEndingSku,
} from '@/lib/plan-translations';
import {
	formatCurrency,
	type CurrencyDisplayOptions,
} from '@/lib/format-utils';
import {
	annualizeMonthlyPrice,
	calculateIncentives,
	deriveMarginPercentFromPrices,
	getRegionalStartingSkuMonthlyPrice,
	resolveScenarioTargetMonthlyPrices,
} from '@/lib/rules-engine';
import {
	NEW_CUSTOMER_INCENTIVE_RATE,
	resolveEndingSkuCopy,
} from '@/lib/upgrade-matrix';
import type { CustomerOpportunity } from '@/lib/opportunity-utils';
import type { PartnerFilters } from '@/components/proposal/PartnerFilterPanel';
import {
	MciEngagementDropdown,
	type MciEngagementOption,
} from '@/components/proposal/MciEngagementDropdown';
import type { MciEngagementId } from '@repo/shared';
import { CheckmarkSquareFilled, Square12Regular } from '@fluentui/react-icons';
import { Input, Label, Switch } from '@fluentui/react-components';
import { getThemeConfig } from '@/lib/theme-config';

interface ScenarioCardProps {
	opportunity: CustomerOpportunity;
	endingSku: EndingSku;
	scenario: UpgradeScenario;
	partnerFilters: PartnerFilters;
	currentSkuCustomerPrice: number;
	currentSkuResellerPrice: number;
	targetSkuCustomerPrice: number;
	targetSkuResellerPrice: number;
	isSelected: boolean;
	selectedSeats: number;
	/**
	 * DB-backed current seat count for the customer's existing subscription.
	 * Drives the current-leg of every economic display (current incentive,
	 * current SKU margin, current incentive+margin row, expiring SKU cost),
	 * regardless of what the partner types into the seats input. The seats
	 * input represents the *target* / proposed seat count.
	 */
	currentSeats: number;
	maxAllowedSeats: number;
	seatLimitTotal: number;
	onToggle: () => void;
	onSeatsChange: (nextSeats: unknown) => void;
	onCurrentSkuCustomerPriceChange: (price: number) => void;
	onCurrentSkuResellerPriceChange: (price: number) => void;
	onTargetSkuCustomerPriceChange: (price: number) => void;
	onTargetSkuResellerPriceChange: (price: number) => void;
	/**
	 * Eligible MCI engagements offerable on this card (already filtered for
	 * profile eligibility, SKU category, exclusive attachment, and
	 * bonus-requires-parent). Empty/omitted hides the dropdown.
	 */
	mciEngagementOptions?: MciEngagementOption[];
	attachedMciEngagementIds?: MciEngagementId[];
	onToggleMciEngagement?: (id: MciEngagementId) => void;
	/**
	 * Partner's default ERP margin (profile). Feeds the incentive engine's
	 * margin legs; omitted → the program-wide 20%.
	 */
	erpMarginPercent?: number;
	isNewCustomer?: boolean;
	isReseller?: boolean;
}

function roundCurrency(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toSeatInputValue(value: number): string {
	if (!Number.isFinite(value)) return '0';
	return String(Math.max(0, Math.floor(value)));
}

type SeatDraftValidation =
	| { kind: 'empty' }
	| { kind: 'valid'; value: string }
	| { kind: 'clamped'; value: string }
	| { kind: 'invalid'; message: string };

function validateSeatDraft(
	value: string,
	maxAllowedSeats: number,
): SeatDraftValidation {
	const trimmed = value.trim();
	if (trimmed === '') {
		return { kind: 'empty' };
	}

	if (trimmed.startsWith('-')) {
		return { kind: 'invalid', message: 'Seats cannot be negative.' };
	}

	if (!/^\d+$/.test(trimmed)) {
		return { kind: 'invalid', message: 'Enter a whole number of seats.' };
	}

	const parsed = Number.parseInt(trimmed, 10);
	if (parsed > maxAllowedSeats) {
		return { kind: 'clamped', value: String(maxAllowedSeats) };
	}
	return { kind: 'valid', value: String(parsed) };
}

function formatHeroPrice(price: number, currencySymbol: string): string {
	const normalized = Number.isFinite(price) ? price : 0;
	return normalized % 1 === 0
		? `${currencySymbol}${normalized.toFixed(0)}`
		: `${currencySymbol}${normalized.toFixed(2)}`;
}

function clampPrice(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const normalized = Math.max(0, value);
	return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function Row({
	label,
	value,
	emphasize = false,
	showDivider,
	subdued,
	darkText = false,
}: {
	label: string;
	value: string;
	emphasize?: boolean;
	showDivider?: boolean;
	subdued?: boolean;
	darkText?: boolean;
}) {
	const shouldShowDivider = showDivider ?? emphasize;
	const labelTextClass = darkText
		? emphasize
			? 'font-semibold text-(--ds-color-violet-500)'
			: 'text-gray-950'
		: emphasize
			? 'font-semibold text-(--ds-color-violet-500)'
			: 'text-gray-600';
	const valueTextClass = darkText
		? emphasize
			? 'font-semibold text-(--ds-color-violet-500)'
			: 'font-medium text-gray-950'
		: emphasize
			? 'font-semibold text-(--ds-color-violet-500)'
			: 'font-medium text-gray-900';
	const subduedTextClass = subdued && !darkText ? 'text-gray-400' : '';

	return (
		<div
			className={`flex items-start justify-between gap-3 py-1.5 ${shouldShowDivider ? 'border-t border-gray-200/60 mt-1 pt-2' : ''}`}
		>
			<span
				className={`text-xs leading-snug ${labelTextClass} ${subduedTextClass}`}
			>
				{label}
			</span>
			<span
				className={`whitespace-nowrap font-mono text-xs ${valueTextClass} ${subduedTextClass}`}
			>
				{value}
			</span>
		</div>
	);
}

export function ScenarioCard({
	opportunity,
	endingSku,
	scenario,
	partnerFilters,
	currentSkuCustomerPrice,
	currentSkuResellerPrice,
	targetSkuCustomerPrice,
	targetSkuResellerPrice,
	isSelected,
	selectedSeats,
	maxAllowedSeats,
	seatLimitTotal,
	onToggle,
	onSeatsChange,
	onCurrentSkuCustomerPriceChange,
	onCurrentSkuResellerPriceChange,
	onTargetSkuCustomerPriceChange,
	onTargetSkuResellerPriceChange,
	mciEngagementOptions = [],
	attachedMciEngagementIds = [],
	onToggleMciEngagement,
	erpMarginPercent,
	isNewCustomer = false,
	isReseller = false,
}: ScenarioCardProps) {
	const t = useTranslations();
	const [seatInput, setSeatInput] = useState(toSeatInputValue(selectedSeats));
	const [seatError, setSeatError] = useState<string | null>(null);
	const seatLimitMessage = t('proposal.seatLimitMessage', {
		max: seatLimitTotal,
	});
	const [showDetails, setShowDetails] = useState(false);
	const [initialCurrentSkuCustomerPrice] = useState(currentSkuCustomerPrice);
	const hideCurrentFields =
		!initialCurrentSkuCustomerPrice || initialCurrentSkuCustomerPrice === 0;
	const resellerPricesValid =
		(hideCurrentFields || currentSkuResellerPrice > 0) &&
		targetSkuResellerPrice > 0;
	const targetSeats = Math.max(0, Math.floor(selectedSeats));
	const seatInputId = `seat-input-${opportunity.opportunityId}-${endingSku.id}`;
	const seatErrorId = `${seatInputId}-error`;
	const currentSkuResellerInputId = `current-reseller-input-${opportunity.opportunityId}-${endingSku.id}`;
	const currentSkuCustomerInputId = `current-customer-input-${opportunity.opportunityId}-${endingSku.id}`;
	const targetSkuResellerInputId = `target-reseller-input-${opportunity.opportunityId}-${endingSku.id}`;
	const targetSkuCustomerInputId = `target-customer-input-${opportunity.opportunityId}-${endingSku.id}`;
	const isFeatured =
		endingSku.id === 'bp_cb' || endingSku.id === 'bp_cb_purview';
	const fieldBackgroundClass = isFeatured
		? 'bg-white focus:bg-white'
		: 'bg-gray-50 focus:bg-gray-50';
	const fieldBackgroundColor = isFeatured
		? 'rgb(255 255 255)'
		: 'rgb(249 250 251)';

	const priceInputBaseClass =
		'w-18! rounded-md border px-3 py-2.5 font-mono! text-xs! font-semibold text-gray-900 shadow-sm outline-none transition-all';
	const priceInputErrorClass =
		'border-red-500 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500';
	const priceInputNormalClass = `border-gray-200 ${fieldBackgroundClass} focus:border-(--ds-color-violet-500) focus:ring-1 focus:ring-(--ds-color-violet-500)`;
	const getPriceInputClass = (value: number) =>
		`${priceInputBaseClass} ${value <= 0 ? priceInputErrorClass : priceInputNormalClass}`;
	const getPriceInputErrorStyle = (value: number) =>
		value <= 0
			? {
					border: '1px solid rgb(239 68 68)',
					backgroundColor: 'rgb(254 242 242)',
				}
			: {};

	const targetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
		startingSku: opportunity.startingSku,
		endingSku,
		currentSkuCustomerPrice,
	});
	const displayListMonthlyPrice = targetMonthlyPrices.listPrice;
	const displayPromoMonthlyPrice = targetSkuCustomerPrice;
	const hasPromo =
		roundCurrency(displayListMonthlyPrice - displayPromoMonthlyPrice) > 0;
	const currencyOptions: CurrencyDisplayOptions = {
		currency: opportunity.pricingContext.currency,
		locale: opportunity.pricingContext.locale,
		currencySymbol: opportunity.pricingContext.currencySymbol,
	};

	useEffect(() => {
		// Sync local seat input draft when selection changes externally.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSeatInput(toSeatInputValue(targetSeats));
		if (!isSelected) {
			setShowDetails(false);
		}
	}, [targetSeats, isSelected]);

	useEffect(() => {
		if (!seatError) return;
		const timer = setTimeout(() => setSeatError(null), 2500);
		return () => clearTimeout(timer);
	}, [seatError]);

	useEffect(() => {
		// Hide details when reseller prices become invalid (e.g. reset to 0).
		if (!resellerPricesValid) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setShowDetails(false);
		}
	}, [resellerPricesValid]);

	const profitability = useMemo(() => {
		const { partnerType, hasSolutionPartnerDesignation, hasOver25Points } =
			partnerFilters;
		const { currentAnnualValue, offerAnnualValue, startingSkuId } = scenario;
		const isOtherSku = startingSkuId === 'other';
		const isIncentiveEligible =
			(partnerType === 'CSP Direct' && hasSolutionPartnerDesignation) ||
			(partnerType === 'CSP Indirect' && hasOver25Points);
		// Strategic Accelerator is earned on the target SKU, so it applies to
		// every starting SKU — the row shows on every card. Only the current-leg
		// component (rolled into currentIncentive) is skipped for `bb`/`bs`
		// starts, which the engine handles inside calculateIncentives.
		const targetSkuMarginPercent = deriveMarginPercentFromPrices({
			customerPrice: targetSkuCustomerPrice,
			resellerPrice: targetSkuResellerPrice,
		});
		const currentSkuMarginPercent = deriveMarginPercentFromPrices({
			customerPrice: currentSkuCustomerPrice,
			resellerPrice: currentSkuResellerPrice,
		});
		// Both current and target legs use the user-edited seat count, so the
		// entire scenario scales uniformly with the seats input.
		const currentResellerAnnualValue = annualizeMonthlyPrice(
			currentSkuResellerPrice,
			targetSeats,
		);
		const targetResellerAnnualValue = annualizeMonthlyPrice(
			targetSkuResellerPrice,
			targetSeats,
		);
		const currentSkuMarginAmount = roundCurrency(
			currentAnnualValue - currentResellerAnnualValue,
		);
		const targetSkuMarginAmount = roundCurrency(
			offerAnnualValue - targetResellerAnnualValue,
		);
		// Incentives are PINNED to the canonical regional SKU prices — they must
		// NOT move when the partner edits cost-to-customer / cost-to-reseller
		// fields. Only the seat count, journey, and SKU choice can change them.
		const canonicalCurrentPrice =
			getRegionalStartingSkuMonthlyPrice({
				startingSkuId,
				country: opportunity.pricingContext.country,
			}) ?? 0;
		const canonicalTargetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
			startingSku: { monthlyPrice: canonicalCurrentPrice },
			endingSku,
			currentSkuCustomerPrice: canonicalCurrentPrice,
		});
		const incentives = calculateIncentives({
			endingSkuId: endingSku.id,
			targetPrice: canonicalTargetMonthlyPrices.promoPrice,
			currentPrice: canonicalCurrentPrice,
			seats: targetSeats,
			currentSeats: targetSeats,
			journey: isOtherSku ? 'new_customer' : 'renewal',
			isIncentiveEligible,
			partnerType,
			startingSkuId,
			country: opportunity.pricingContext.regionCountry,
			erpMarginPercent,
		});
		const cspCore = incentives.cspCore;
		const strategicAccelerator = incentives.strategicAccelerator;
		const growthAccelerator = incentives.growthAccelerator;
		const cspCoreRate = incentives.cspCoreRate ?? 0;
		const strategicAcceleratorRate = incentives.strategicAcceleratorRate ?? 0;
		const growthAcceleratorRate = incentives.growthAcceleratorRate ?? 0;
		const newCustomerIncentive = 0;
		const totalIM = roundCurrency(
			cspCore +
				strategicAccelerator +
				growthAccelerator +
				targetSkuMarginAmount +
				newCustomerIncentive,
		);
		// Current-leg incentives come from `calculateIncentives` (canonical SKU
		// pricing), so partner-edited reseller prices don't move them.
		const currentCspCore = isOtherSku ? 0 : incentives.cspCoreCurrent;
		const currentStrategic = isOtherSku
			? 0
			: incentives.strategicAcceleratorCurrent;
		const currentIM = roundCurrency(
			currentCspCore + currentStrategic + currentSkuMarginAmount,
		);
		const incrementalIM = roundCurrency(totalIM - currentIM);

		return {
			isOtherSku,
			isIncentiveEligible,
			cspCore,
			cspCoreRate,
			strategicAccelerator,
			strategicAcceleratorRate,
			growthAccelerator,
			growthAcceleratorRate,
			newCustomerIncentive,
			targetSkuMarginAmount,
			totalIM,
			currentIM,
			incrementalIM,
			targetSkuMarginPercent,
			currentSkuMarginPercent,
		};
	}, [
		targetSeats,
		currentSkuCustomerPrice,
		currentSkuResellerPrice,
		displayListMonthlyPrice,
		endingSku.id,
		endingSku,
		erpMarginPercent,
		opportunity.pricingContext.country,
		opportunity.pricingContext.regionCountry,
		opportunity.startingSku,
		partnerFilters,
		scenario,
		targetSkuCustomerPrice,
		targetSkuResellerPrice,
	]);

	const shouldShowPromoRows = hasPromo && scenario.promoSavingsAnnual > 0;
	const cardStateClass = isFeatured
		? isSelected
			? 'border-(--ds-color-red-violet-700) bg-[#fdf1fb] shadow-[0_10px_30px_rgba(112,37,115,0.16)] ring-1 ring-(--ds-color-violet-100)'
			: 'border-(--ds-color-red-violet-700) bg-[#fdf1fb] shadow-[0_10px_28px_rgba(112,37,115,0.1)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(112,37,115,0.16)]'
		: isSelected
			? 'border-(--ds-color-red-violet-600) bg-white/90 shadow-[0_8px_32px_rgba(112,37,115,0.15)]'
			: 'border-neutral-200 bg-neutral-50 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]';
	const featuredBackgroundStyle = isFeatured
		? {
				backgroundColor: '#fdf1fb',
				backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.52) 52%, rgba(255,255,255,0.46) 100%), url('${getThemeConfig().assets.proposalScenariosBackground}')`,
				backgroundPosition: 'center right',
				backgroundSize: 'cover',
			}
		: undefined;
	const dividerClass = 'border-gray-200';
	const titleClass = 'text-gray-900';
	const priceClass = 'text-gray-900';
	const originalPriceClass = isFeatured
		? 'text-gray-950 decoration-gray-950/50'
		: 'text-gray-600 decoration-gray-600/60';
	const priceUnitClass = isFeatured ? 'text-gray-950' : 'text-gray-600';
	const descriptionClass = 'text-(--ds-color-red-violet-700)';
	const uncheckedIconClass =
		'mt-0.5 size-6 shrink-0 text-gray-300 group-hover:text-(--ds-color-violet-500) transition-colors';
	const selectedConfigClass = 'flex flex-col gap-2';
	const configureTextClass = 'text-red-500';
	const labelTextClass = isFeatured ? 'text-gray-950' : 'text-gray-700';
	const requiredMarkClass = 'text-red-600';
	const sectionLabelClass = isFeatured
		? 'text-(--ds-color-red-violet-700) bg-white/90'
		: 'text-(--ds-color-red-violet-700) bg-gray-100';
	const mandatoryTextClass = 'text-red-600';
	const offerCostingBoxClass = isFeatured ? 'bg-white' : 'bg-gray-100';
	const offerCostingTextClass = 'text-(--ds-color-red-violet-700)';
	const detailHeadingClass = isFeatured ? 'text-gray-950' : 'text-gray-500';
	const planHighlightItemClass = isFeatured ? 'text-gray-950' : 'text-gray-600';
	const planHighlightBulletClass = 'bg-(--ds-color-violet-400)';

	return (
		<div
			onClick={onToggle}
			data-featured={isFeatured ? 'true' : undefined}
			style={featuredBackgroundStyle}
			className={`group relative flex h-full w-full min-w-0 px-6 py-4 gap-4 cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300 ${cardStateClass}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-2">
					<h3
						className={`m-0 pr-2 leading-tight tracking-tight ${titleClass} ${getThemeConfig().typography.cardTitle}`}
					>
						{endingSku.name}
					</h3>
				</div>
				{isSelected ? (
					<CheckmarkSquareFilled
						primaryFill="var(--ds-color-red-violet-700)"
						className="mt-0.5 size-6 shrink-0 drop-shadow-sm"
					/>
				) : (
					<Square12Regular
						primaryFill="currentColor"
						className={uncheckedIconClass}
					/>
				)}
			</div>

			<div className={`h-px border-t ${dividerClass}`} />

			<div className="flex flex-col gap-1">
				<div className="flex items-baseline gap-2">
					<span
						className={`leading-none tracking-tighter ${priceClass} ${getThemeConfig().typography.cardPrice}`}
					>
						{formatHeroPrice(
							displayPromoMonthlyPrice,
							opportunity.pricingContext.currencySymbol,
						)}
					</span>
					{hasPromo && (
						<span
							className={`line-through ${originalPriceClass} ${getThemeConfig().typography.cardPriceOriginal}`}
						>
							{formatHeroPrice(
								displayListMonthlyPrice,
								opportunity.pricingContext.currencySymbol,
							)}
						</span>
					)}
				</div>
				<p className={`text-xs font-medium tracking-wider ${priceUnitClass}`}>
					{t('proposal.priceUnit')}
				</p>
			</div>

			<p
				className={`leading-relaxed ${descriptionClass} ${getThemeConfig().typography.cardDescription}`}
			>
				{isKnownEndingSku(endingSku.id)
					? t(getPlanDescriptionKey(endingSku.id, scenario.startingSkuId))
					: resolveEndingSkuCopy(endingSku, scenario.startingSkuId).description}
			</p>

			{isSelected && (
				<>
					<div className={`h-px border-t ${dividerClass}`} />
					<div
						className={selectedConfigClass}
						onClick={(event) => event.stopPropagation()}
					>
						<p className={`text-sm font-semibold m-0 ${configureTextClass}`}>
							{t('proposal.configureProposal')}
						</p>
						<div className="flex items-center justify-between">
							<Label
								htmlFor={seatInputId}
								className={`text-xs! font-medium ${labelTextClass}`}
							>
								{t('proposal.targetSeats')}
								<span className={requiredMarkClass}>*</span>
							</Label>
							<Input
								size="small"
								appearance="filled-darker"
								id={seatInputId}
								type="number"
								style={{
									width: `max(65px, calc(${seatInput.length}ch + 32px))`,
									borderRadius: '4px',
									boxShadow: 'none',
									padding: '6px 0px',
									backgroundColor: fieldBackgroundColor,
									...(seatError || targetSeats <= 0
										? {
												border: '1px solid rgb(239 68 68)',
												backgroundColor: 'rgb(254 242 242)',
											}
										: {}),
								}}
								min={0}
								max={maxAllowedSeats}
								value={seatInput}
								aria-invalid={Boolean(seatError) || targetSeats <= 0}
								aria-describedby={seatError ? seatErrorId : undefined}
								onChange={(_event, data) => {
									const next = data.value;
									const validation = validateSeatDraft(next, maxAllowedSeats);

									if (validation.kind === 'empty') {
										setSeatInput('');
										return;
									}

									if (validation.kind === 'invalid') {
										setSeatError(validation.message);
										return;
									}

									if (validation.kind === 'clamped') {
										setSeatInput(validation.value);
										setSeatError(seatLimitMessage);
										onSeatsChange(validation.value);
										return;
									}

									setSeatInput(validation.value);
									onSeatsChange(validation.value);
								}}
								onBlur={() => {
									const validation = validateSeatDraft(
										seatInput,
										maxAllowedSeats,
									);

									if (
										validation.kind === 'empty' ||
										validation.kind === 'invalid'
									) {
										setSeatInput(toSeatInputValue(targetSeats));
										return;
									}

									if (validation.kind === 'clamped') {
										setSeatInput(validation.value);
										setSeatError(seatLimitMessage);
										onSeatsChange(validation.value);
										return;
									}

									setSeatInput(validation.value);
									onSeatsChange(validation.value);
								}}
								className={`w-18! rounded-md border px-3 py-2.5 font-mono! text-xs! font-semibold text-gray-900 shadow-sm outline-none transition-all ${
									seatError || targetSeats <= 0
										? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
										: `border-gray-200 ${fieldBackgroundClass} focus:border-(--ds-color-violet-500) focus:ring-1 focus:ring-(--ds-color-violet-500)`
								}`}
							/>
						</div>

						{seatError && (
							<p
								id={seatErrorId}
								data-testid="seat-input-error"
								aria-live="polite"
								className="m-0 mt-1.5 text-[11px] font-medium text-red-600 animate-in slide-in-from-top-1 fade-in duration-200"
							>
								{seatError}
							</p>
						)}

						<div className="flex flex-col gap-2">
							{!hideCurrentFields && (
								<>
									<p
										className={`text-xs font-semibold uppercase tracking-wide m-0 px-2 py-1 rounded ${sectionLabelClass}`}
									>
										{t('proposal.currentSkuCost')}
									</p>
									<div className="flex items-center justify-between">
										<Label
											htmlFor={currentSkuResellerInputId}
											className={`text-xs! font-medium ${labelTextClass}`}
										>
											{isReseller
												? t('proposal.buyingPriceFor', {
														subscription: opportunity.startingSku.name,
													})
												: t('proposal.costToReseller', {
														subscription: opportunity.startingSku.name,
													})}{' '}
											<span className={requiredMarkClass}>*</span>
										</Label>
										<Input
											size="small"
											appearance="filled-darker"
											id={currentSkuResellerInputId}
											type="number"
											step={1}
											style={{
												width: `max(65px, calc(${String(currentSkuResellerPrice).length}ch + 32px))`,
												borderRadius: '4px',
												boxShadow: 'none',
												padding: '6px 0px',
												backgroundColor: fieldBackgroundColor,
												...getPriceInputErrorStyle(currentSkuResellerPrice),
											}}
											min={0}
											value={String(currentSkuResellerPrice)}
											onChange={(_event, data) => {
												const parsed = Number.parseFloat(data.value);
												onCurrentSkuResellerPriceChange(clampPrice(parsed));
											}}
											className={getPriceInputClass(currentSkuResellerPrice)}
										/>
									</div>
									<div className="flex items-center justify-between">
										<Label
											htmlFor={currentSkuCustomerInputId}
											className={`text-xs! font-medium ${labelTextClass}`}
										>
											{isReseller
												? t('proposal.sellingPriceFor', {
														subscription: opportunity.startingSku.name,
													})
												: t('proposal.costToCustomer', {
														subscription: opportunity.startingSku.name,
													})}{' '}
											<span className={requiredMarkClass}>*</span>
										</Label>
										<Input
											size="small"
											appearance="filled-darker"
											id={currentSkuCustomerInputId}
											type="number"
											step={1}
											style={{
												width: `max(65px, calc(${String(currentSkuCustomerPrice).length}ch + 32px))`,
												borderRadius: '4px',
												boxShadow: 'none',
												padding: '6px 0px',
												backgroundColor: fieldBackgroundColor,
												...getPriceInputErrorStyle(currentSkuCustomerPrice),
											}}
											min={0}
											value={String(currentSkuCustomerPrice)}
											onChange={(_event, data) => {
												const parsed = Number.parseFloat(data.value);
												onCurrentSkuCustomerPriceChange(clampPrice(parsed));
											}}
											className={getPriceInputClass(currentSkuCustomerPrice)}
										/>
									</div>
								</>
							)}
							<p
								className={`text-xs font-semibold uppercase tracking-wide m-0 px-2 py-1 rounded ${sectionLabelClass}`}
							>
								{t('proposal.targetSkuCost')}
							</p>
							<div className="flex items-center justify-between">
								<Label
									htmlFor={targetSkuResellerInputId}
									className={`text-xs! font-medium ${labelTextClass}`}
								>
									{isReseller
										? t('proposal.buyingPriceFor', {
												subscription: endingSku.name,
											})
										: t('proposal.costToReseller', {
												subscription: endingSku.name,
											})}{' '}
									<span className={requiredMarkClass}>*</span>
								</Label>
								<Input
									size="small"
									appearance="filled-darker"
									id={targetSkuResellerInputId}
									type="number"
									step={1}
									style={{
										width: `max(65px, calc(${String(targetSkuResellerPrice).length}ch + 32px))`,
										borderRadius: '4px',
										boxShadow: 'none',
										padding: '6px 0px',
										backgroundColor: fieldBackgroundColor,
										...getPriceInputErrorStyle(targetSkuResellerPrice),
									}}
									min={0}
									value={String(targetSkuResellerPrice)}
									onChange={(_event, data) => {
										const parsed = Number.parseFloat(data.value);
										onTargetSkuResellerPriceChange(clampPrice(parsed));
									}}
									className={getPriceInputClass(targetSkuResellerPrice)}
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label
									htmlFor={targetSkuCustomerInputId}
									className={`text-xs! font-medium ${labelTextClass}`}
								>
									{isReseller
										? t('proposal.sellingPriceFor', {
												subscription: endingSku.name,
											})
										: t('proposal.costToCustomer', {
												subscription: endingSku.name,
											})}{' '}
									<span className={requiredMarkClass}>*</span>
								</Label>
								<Input
									size="small"
									appearance="filled-darker"
									id={targetSkuCustomerInputId}
									type="number"
									step={1}
									style={{
										width: `max(65px, calc(${String(targetSkuCustomerPrice).length}ch + 32px))`,
										borderRadius: '4px',
										boxShadow: 'none',
										padding: '6px 0px',
										backgroundColor: fieldBackgroundColor,
										...getPriceInputErrorStyle(targetSkuCustomerPrice),
									}}
									min={0}
									value={String(targetSkuCustomerPrice)}
									onChange={(_event, data) => {
										const parsed = Number.parseFloat(data.value);
										onTargetSkuCustomerPriceChange(clampPrice(parsed));
									}}
									className={getPriceInputClass(targetSkuCustomerPrice)}
								/>
							</div>
							<p
								className={`text-xs font-medium m-0 mt-2 ${mandatoryTextClass}`}
							>
								* {t('proposal.mandatoryInputs')}
							</p>
						</div>
						{onToggleMciEngagement && mciEngagementOptions.length > 0 && (
							<MciEngagementDropdown
								options={mciEngagementOptions}
								selectedIds={attachedMciEngagementIds}
								onToggle={onToggleMciEngagement}
								className="border-t border-gray-200 pt-3"
							/>
						)}
						<div
							className={`flex items-center justify-between rounded-md px-4  py-2  mt-2 ${offerCostingBoxClass} ${!resellerPricesValid ? 'opacity-50' : ''}`}
						>
							<span
								className={`text-xs font-semibold ${offerCostingTextClass}`}
							>
								{t('proposal.offerCostingHint')}
							</span>
							<Switch
								checked={showDetails}
								disabled={!resellerPricesValid}
								onChange={(_ev, data) => setShowDetails(data.checked)}
							/>
						</div>
					</div>
				</>
			)}

			{showDetails && <div className="h-px border-t border-gray-200" />}

			{showDetails && endingSku.planHighlights.length > 0 && (
				<div>
					<p
						className={`mb-4 tracking-widest uppercase ${detailHeadingClass} ${getThemeConfig().typography.cardSectionHeader}`}
					>
						{t('proposal.planHighlights')}
					</p>
					<ul className="m-0 list-none space-y-2 p-0">
						{(isKnownEndingSku(endingSku.id)
							? getPlanHighlightKeys(endingSku.id, scenario.startingSkuId).map(
									(k) => t(k),
								)
							: resolveEndingSkuCopy(endingSku, scenario.startingSkuId)
									.planHighlights
						).map((highlight) => (
							<li
								key={highlight}
								className={`flex items-start gap-2.5 text-xs leading-snug ${planHighlightItemClass}`}
							>
								<div
									className={`mt-[6px] size-1.5 shrink-0 rounded-full ${planHighlightBulletClass}`}
								/>
								{highlight}
							</li>
						))}
					</ul>
				</div>
			)}

			{showDetails && <div className="h-px border-t border-gray-200" />}

			{showDetails && (
				<div className="border-gray-200">
					<p
						className={`m-0 mb-2 uppercase tracking-widest ${detailHeadingClass} ${getThemeConfig().typography.cardSectionHeader}`}
					>
						{t('proposal.costOfCustomer')}
					</p>
					{!hideCurrentFields && (
						<Row
							label={t('proposal.expiringSkuCost')}
							value={formatCurrency(
								scenario.currentAnnualValue,
								currencyOptions,
							)}
							subdued
							darkText={isFeatured}
						/>
					)}
					<Row
						label={t('proposal.targetSkuCostListPrice')}
						value={formatCurrency(scenario.listAnnualValue, currencyOptions)}
						darkText={isFeatured}
					/>
					{shouldShowPromoRows && (
						<Row
							label={t('proposal.costSavingsPromos')}
							value={formatCurrency(
								scenario.promoSavingsAnnual,
								currencyOptions,
							)}
							emphasize
							showDivider={false}
							darkText={isFeatured}
						/>
					)}
					{shouldShowPromoRows && (
						<Row
							label={t('proposal.targetSkuCostPromoPrice')}
							value={formatCurrency(scenario.offerAnnualValue, currencyOptions)}
							emphasize
							showDivider
							darkText={isFeatured}
						/>
					)}
					<Row
						label={t('proposal.incrementalCostEstimated')}
						value={formatCurrency(scenario.incrementalCost, currencyOptions)}
						darkText={isFeatured}
					/>
				</div>
			)}

			{showDetails && <div className="h-px border-t border-gray-200" />}

			{showDetails && (
				<div>
					<p
						className={`m-0 mb-2 uppercase tracking-widest ${detailHeadingClass} ${getThemeConfig().typography.cardSectionHeader}`}
					>
						{t('proposal.partnerProfitability')}
					</p>

					{profitability.isIncentiveEligible && (
						<>
							{profitability.cspCore > 0 && (
								<Row
									label={`${t('proposal.cspCore')} (${(profitability.cspCoreRate * 100).toFixed(2)}%)`}
									value={formatCurrency(profitability.cspCore, currencyOptions)}
									darkText={isFeatured}
								/>
							)}
							<Row
								label={`${t('proposal.strategicAccelerator')} (${(profitability.strategicAcceleratorRate * 100).toFixed(2)}%)`}
								value={formatCurrency(
									profitability.strategicAccelerator,
									currencyOptions,
								)}
								darkText={isFeatured}
							/>
							{profitability.growthAccelerator > 0 && (
								<Row
									label={`${t('proposal.growthAccelerator')} (${(profitability.growthAcceleratorRate * 100).toFixed(2)}%)`}
									value={formatCurrency(
										profitability.growthAccelerator,
										currencyOptions,
									)}
									darkText={isFeatured}
								/>
							)}
						</>
					)}

					{profitability.newCustomerIncentive > 0 && (
						<Row
							label={`${t('proposal.newCustomerIncentive')} (${(NEW_CUSTOMER_INCENTIVE_RATE * 100).toFixed(2)}%)`}
							value={formatCurrency(
								profitability.newCustomerIncentive,
								currencyOptions,
							)}
							darkText={isFeatured}
						/>
					)}

					<Row
						label={t('proposal.targetSkuMargin')}
						value={formatCurrency(
							profitability.targetSkuMarginAmount,
							currencyOptions,
						)}
						darkText={isFeatured}
					/>

					<Row
						label={t('proposal.totalIncentiveMargin')}
						value={formatCurrency(profitability.totalIM, currencyOptions)}
						emphasize
						darkText={isFeatured}
					/>
					{!hideCurrentFields && (
						<Row
							label={t('proposal.currentIncentiveMargin')}
							value={formatCurrency(profitability.currentIM, currencyOptions)}
							darkText={isFeatured}
						/>
					)}
					<Row
						label={
							profitability.isOtherSku && isNewCustomer
								? t('proposal.targetIncentiveMargin')
								: t('proposal.incrementalIncentiveMargin')
						}
						value={formatCurrency(profitability.incrementalIM, currencyOptions)}
						emphasize
						darkText={isFeatured}
					/>
				</div>
			)}
		</div>
	);
}

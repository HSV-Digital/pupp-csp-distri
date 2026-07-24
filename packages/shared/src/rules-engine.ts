import type {
	EndingSku,
	ScenarioEconomics,
	StartingSku,
	UpgradeScenario,
	UpgradeType,
} from '@repo/types';
import {
	ENDING_SKU_BY_ID,
	getIncentiveRates,
	STARTING_SKU_BY_ID,
	isStrategicAcceleratorStartingSku,
	VALID_UPGRADE_PATHS,
} from './upgrade-matrix';
import {
	applyRegionalPricingToEndingSku,
	buildRegionalPricingContext,
	DEFAULT_CURRENT_SKU_MARGIN_PERCENT,
	getTargetSkuMarginPercent,
	getRegionalStartingSkuMonthlyPrice,
	type RegionalPricingCountry,
} from './regional-pricing';

export type ScenarioJourney = 'renewal' | 'new_customer';

export interface UpgradePricingSelectionOptions {
	region?: string | null;
	country?: string | null;
	/**
	 * Historical flag for the CSP Indirect distributor promotion (60% off the
	 * Purview / Defender Suites). The promotion was retired —
	 * DISTRIBUTOR_DISCOUNT_RATE_BY_SKU_ID is now empty, so this flag no longer
	 * changes any price. It is kept so callers (proposal page, emails) that
	 * still derive and pass it continue to compile and behave identically.
	 */
	distributorDiscount?: boolean;
}

export interface CalculateScenarioOptions extends UpgradePricingSelectionOptions {
	journey?: ScenarioJourney;
	expiringArr?: number;
	originalSeats?: number;
	/**
	 * DB-backed seat count for the customer's existing subscription.
	 * Drives the current-leg multiplier (current customer / reseller / margin /
	 * incentive). Defaults to `seats` when omitted (back-compat).
	 *
	 * The `seats` parameter to calculate* always represents the partner's
	 * target / proposed seats; `currentSeats` is the actual DB seat count.
	 */
	currentSeats?: number;
	/**
	 * Whether the partner qualifies for CSP incentives, derived from their
	 * partnerType + `hasSolutionPartnerDesignation` / `hasOver25Points` filters.
	 * When omitted, defaults to `true` for back-compat — but every caller that
	 * has access to partner filters SHOULD pass this so backend-rendered totals
	 * (email, PPT, assets summary) match what ScenarioCard displays.
	 */
	isIncentiveEligible?: boolean;
	/**
	 * Partner type ('CSP Direct' | 'CSP Indirect') — selects the incentive rate
	 * set (CSP Core / Growth Accelerator differ between direct and indirect).
	 * Defaults to CSP Direct rates when omitted.
	 */
	partnerType?: string | null;
	/**
	 * The partner's default ERP margin (profile `erpMarginPercent`). Replaces
	 * the program-wide 20% in both incentive legs; a per-SKU override in
	 * DEFAULT_TARGET_SKU_MARGIN_PERCENT_BY_ENDING_SKU_ID still wins for the
	 * target leg. Omitted → 20 (back-compat for old payloads/tokens).
	 */
	erpMarginPercent?: number | null;
}

export interface ProposalScenario {
	endingSkuId: string;
	endingSkuName: string;
	endingSkuType: UpgradeType;
	seats: number;
	offerAnnualValue: number;
	currentAnnualValue: number;
	incrementalCost: number;
	totalIncentive: number;
	promoMonthlyPerUser: number;
	listMonthlyPerUser: number;
}

export interface IncrementalCostPerUserAnnualInput {
	offerAnnualValue: number;
	currentAnnualValue: number;
	seats: number;
}

export interface ScenarioExplicitMonthlyPrices {
	currentSkuCustomerPrice: number;
	currentSkuResellerPrice: number;
	targetSkuCustomerPrice: number;
	targetSkuResellerPrice: number;
}

export interface ScenarioExplicitAnnualValues {
	currentCustomerAnnualValue: number;
	currentResellerAnnualValue: number;
	targetCustomerAnnualValue: number;
	targetListAnnualValue: number;
	targetResellerAnnualValue: number;
	promoSavingsAnnual: number;
	incrementalCustomerCost: number;
	currentMarginAnnualValue: number;
	targetMarginAnnualValue: number;
	currentMarginPercent: number;
	targetMarginPercent: number;
}

export function roundCurrency(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeSeats(seats: number): number {
	if (!Number.isFinite(seats)) return 0;
	return Math.max(0, Math.floor(seats));
}

export function normalizeCurrentSkuMarginPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(100, Math.max(0, value));
}

export function normalizeNonNegativeMoney(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return roundCurrency(Math.max(0, value));
}

export function resolveScenarioTargetMonthlyPrices(params: {
	startingSku: Pick<StartingSku, 'monthlyPrice'>;
	endingSku: Pick<EndingSku, 'isAddOn' | 'listPrice' | 'promoPrice'>;
	currentSkuCustomerPrice?: number | null;
}): { listPrice: number; promoPrice: number } {
	const listPrice = Number.isFinite(params.endingSku.listPrice)
		? Math.max(0, params.endingSku.listPrice)
		: 0;
	const promoPrice = Number.isFinite(params.endingSku.promoPrice)
		? Math.max(0, params.endingSku.promoPrice)
		: 0;
	if (!params.endingSku.isAddOn) {
		return { listPrice, promoPrice };
	}

	const currentSkuCustomerPrice = Number.isFinite(
		params.currentSkuCustomerPrice ?? params.startingSku.monthlyPrice,
	)
		? Math.max(
				0,
				params.currentSkuCustomerPrice ?? params.startingSku.monthlyPrice,
			)
		: 0;
	return {
		listPrice: currentSkuCustomerPrice + listPrice,
		promoPrice: currentSkuCustomerPrice + promoPrice,
	};
}

export function annualizeMonthlyPrice(
	monthlyPrice: number,
	seats: number,
): number {
	return roundCurrency(
		normalizeNonNegativeMoney(monthlyPrice) * normalizeSeats(seats) * 12,
	);
}

export function deriveResellerPriceFromMargin(params: {
	customerPrice: number;
	marginPercent: number;
}): number {
	const customerPrice = normalizeNonNegativeMoney(params.customerPrice);
	const marginPercent = normalizeCurrentSkuMarginPercent(params.marginPercent);
	return roundCurrency(customerPrice * (1 - marginPercent / 100));
}

export function deriveMarginPercentFromPrices(params: {
	customerPrice: number;
	resellerPrice: number;
}): number {
	const customerPrice = normalizeNonNegativeMoney(params.customerPrice);
	if (customerPrice <= 0) {
		return 0;
	}

	const resellerPrice = normalizeNonNegativeMoney(params.resellerPrice);
	return normalizeCurrentSkuMarginPercent(
		((customerPrice - resellerPrice) / customerPrice) * 100,
	);
}

export function calculateScenarioAnnualValuesFromPrices(params: {
	seats: number;
	currentSeats?: number;
	targetListPrice: number;
	prices: ScenarioExplicitMonthlyPrices;
}): ScenarioExplicitAnnualValues {
	const seats = normalizeSeats(params.seats);
	const currentSeats = normalizeSeats(params.currentSeats ?? params.seats);
	const currentCustomerAnnualValue = annualizeMonthlyPrice(
		params.prices.currentSkuCustomerPrice,
		currentSeats,
	);
	const currentResellerAnnualValue = annualizeMonthlyPrice(
		params.prices.currentSkuResellerPrice,
		currentSeats,
	);
	const targetCustomerAnnualValue = annualizeMonthlyPrice(
		params.prices.targetSkuCustomerPrice,
		seats,
	);
	const targetListAnnualValue = annualizeMonthlyPrice(
		params.targetListPrice,
		seats,
	);
	const targetResellerAnnualValue = annualizeMonthlyPrice(
		params.prices.targetSkuResellerPrice,
		seats,
	);
	const currentMarginAnnualValue = roundCurrency(
		currentCustomerAnnualValue - currentResellerAnnualValue,
	);
	const targetMarginAnnualValue = roundCurrency(
		targetCustomerAnnualValue - targetResellerAnnualValue,
	);

	return {
		currentCustomerAnnualValue,
		currentResellerAnnualValue,
		targetCustomerAnnualValue,
		targetListAnnualValue,
		targetResellerAnnualValue,
		promoSavingsAnnual: roundCurrency(
			targetListAnnualValue - targetCustomerAnnualValue,
		),
		incrementalCustomerCost: roundCurrency(
			targetCustomerAnnualValue - currentCustomerAnnualValue,
		),
		currentMarginAnnualValue,
		targetMarginAnnualValue,
		currentMarginPercent: deriveMarginPercentFromPrices({
			customerPrice: params.prices.currentSkuCustomerPrice,
			resellerPrice: params.prices.currentSkuResellerPrice,
		}),
		targetMarginPercent: deriveMarginPercentFromPrices({
			customerPrice: params.prices.targetSkuCustomerPrice,
			resellerPrice: params.prices.targetSkuResellerPrice,
		}),
	};
}

export function computeIncrementalCostPerUserAnnual(
	params: IncrementalCostPerUserAnnualInput,
): number {
	const normalizedSeats = normalizeSeats(params.seats);
	if (normalizedSeats === 0) return 0;

	const offerAnnualValue = Number.isFinite(params.offerAnnualValue)
		? params.offerAnnualValue
		: 0;
	const currentAnnualValue = Number.isFinite(params.currentAnnualValue)
		? params.currentAnnualValue
		: 0;
	return roundCurrency(
		(offerAnnualValue - currentAnnualValue) / normalizedSeats,
	);
}

export function normalizeProduct(product: string): string {
	return product
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/**
 * Returns all valid ending SKUs for a given starting SKU id.
 */
export function getValidUpgradePaths(
	startingSkuId: string,
	options?: UpgradePricingSelectionOptions,
): EndingSku[] {
	const pathIds = VALID_UPGRADE_PATHS[startingSkuId] ?? [];
	const pricingContext = buildRegionalPricingContext({
		region: options?.region ?? null,
		country: options?.country ?? null,
	});

	return pathIds
		.map((pathId) => ENDING_SKU_BY_ID.get(pathId))
		.filter((sku): sku is EndingSku => Boolean(sku))
		.map((endingSku) =>
			applyRegionalPricingToEndingSku({
				endingSku,
				country: pricingContext.country,
				distributorDiscount: options?.distributorDiscount,
			}),
		);
}

export interface CalculateIncentivesInput {
	endingSkuId: string;
	/**
	 * Canonical (regionally-adjusted) target SKU promo per-user-monthly price.
	 * MUST come from the SKU catalog, never from a partner-entered field —
	 * incentives are pinned to the canonical price.
	 */
	targetPrice: number;
	/**
	 * Canonical (regionally-adjusted) current SKU per-user-monthly price.
	 * MUST come from the SKU catalog, never from a partner-entered field.
	 * Ignored when journey is 'new_customer'.
	 */
	currentPrice: number;
	seats: number;
	/**
	 * DB-backed seat count for the existing subscription. Drives the current-leg
	 * (`currentPart`, `cspCoreCurrent`, `strategicAcceleratorCurrent`). Defaults
	 * to `seats` when omitted (back-compat). For renewals where the partner is
	 * proposing a different target seat count, callers MUST pass the actual DB
	 * seat count here so `currentIncentive` reflects the customer's true baseline.
	 */
	currentSeats?: number;
	journey: ScenarioJourney;
	/** ≥25-points partner-eligibility gate. Defaults to true for back-compat. */
	isIncentiveEligible?: boolean;
	/**
	 * Partner type ('CSP Direct' | 'CSP Indirect') — selects the incentive rate
	 * set. Defaults to CSP Direct rates when omitted.
	 */
	partnerType?: string | null;
	/**
	 * Deprecated: Strategic Accelerator is earned on the TARGET (ending) SKU on
	 * every path, so this flag no longer affects the calculation. Retained for
	 * call-site compatibility.
	 */
	endingSkuIsPremium?: boolean;
	/**
	 * Starting SKU ID — gates only the CURRENT leg of the Strategic Accelerator.
	 * The target leg applies to every starting SKU; the current leg is skipped
	 * for Business Basic (`bb`) and Business Standard (`bs`) starts.
	 */
	startingSkuId?: string;
	/**
	 * Deprecated. Attach SKUs are now calculated as normal renewal scenarios:
	 * target price includes the current SKU price plus the attach SKU price, and
	 * the current leg remains in the economics.
	 */
	isAddOn?: boolean;
	/**
	 * Pricing country. Retained for call-site compatibility; the Strategic
	 * Accelerator rate is now a flat program rate independent of region.
	 */
	country?: RegionalPricingCountry;
	/**
	 * The partner's default ERP margin (profile `erpMarginPercent`). Replaces
	 * the 20% default in both legs; a per-SKU target-margin override still
	 * wins. Omitted → 20 (back-compat).
	 */
	erpMarginPercent?: number | null;
}

/**
 * Calculates scenario economics for the three partner incentives
 * (CSP Core, Strategic Accelerator, Growth Accelerator).
 *
 * Each leg uses canonical (regional) SKU prices net of the default margin:
 *   target_part  = targetPrice  * (1 - target_margin% / 100)  * seats * 12
 *   current_part = currentPrice * (1 - DEFAULT_CURRENT_SKU_MARGIN_PERCENT/100) * seats * 12
 *
 * Rates are partner-type dependent (see INCENTIVE_RATES_BY_PARTNER_TYPE):
 *   CSP Direct   → CSP Core 2.5%, Strategic 2.5%, Growth 10%
 *   CSP Indirect → CSP Core 0%,   Strategic 2.5%, Growth 12.5%
 *
 * Target leg (always shown on proposal card):
 *   cspCore              = cspCoreRate × target_part
 *   strategicAccelerator = 2.5%        × target_part   (every starting SKU)
 *   growthAccelerator    = growthRate  × growth_base
 *     regular renewal growth_base = max(0, target_part − current_part)
 *     new_customer growth_base    = 0
 *
 * Current leg (renewal only — rolled up into `currentIncentive`):
 *   cspCoreCurrent              = cspCoreRate × current_part
 *   strategicAcceleratorCurrent = 2.5%        × current_part   (skipped for `bb`/`bs` starts)
 *
 * Attach SKUs use the same renewal math as other target SKUs. Callers should
 * pass targetPrice as the combined current-SKU-plus-attach monthly price.
 *
 * Roll-ups:
 *   totalIncentive       = target leg sum
 *   currentIncentive     = current leg sum
 *   incrementalIncentive = totalIncentive − currentIncentive
 */
export function calculateIncentives(
	input: CalculateIncentivesInput,
): ScenarioEconomics {
	const isEligible = input.isIncentiveEligible ?? true;
	const rates = getIncentiveRates(input.partnerType);
	// Strategic Accelerator is earned on the TARGET SKU, so the target leg
	// applies to every starting SKU (it shows on every card). The CURRENT leg is
	// the exception: Business Basic (`bb`) and Business Standard (`bs`) starts do
	// NOT accrue a current-leg Strategic Accelerator.
	const currentLegQualifiesForStrategic = isStrategicAcceleratorStartingSku(
		input.startingSkuId,
	);

	const seats = normalizeSeats(input.seats);
	const currentSeats = normalizeSeats(input.currentSeats ?? input.seats);
	const targetPrice = normalizeNonNegativeMoney(input.targetPrice);
	const currentPrice = normalizeNonNegativeMoney(input.currentPrice);
	const baseMarginPercent = normalizeCurrentSkuMarginPercent(
		input.erpMarginPercent ?? DEFAULT_CURRENT_SKU_MARGIN_PERCENT,
	);
	const targetMarginPercent = getTargetSkuMarginPercent(
		input.endingSkuId,
		baseMarginPercent,
	);
	const isRenewal = input.journey !== 'new_customer';

	const targetPart = targetPrice * (1 - targetMarginPercent / 100) * seats * 12;
	const hasCurrentLeg = isRenewal;
	const currentPart = hasCurrentLeg
		? currentPrice * (1 - baseMarginPercent / 100) * currentSeats * 12
		: 0;
	const growthBase = isRenewal ? Math.max(0, targetPart - currentPart) : 0;

	const cspCoreRate = rates.cspCore;
	const strategicAcceleratorRate = rates.strategicAccelerator;
	const growthAcceleratorRate = rates.growthAccelerator;

	const cspCore = isEligible ? roundCurrency(targetPart * cspCoreRate) : 0;
	const strategicAccelerator = isEligible
		? roundCurrency(targetPart * strategicAcceleratorRate)
		: 0;
	const growthAccelerator = isEligible
		? roundCurrency(growthBase * growthAcceleratorRate)
		: 0;
	const totalIncentive = roundCurrency(
		cspCore + strategicAccelerator + growthAccelerator,
	);

	const cspCoreCurrent =
		isEligible && hasCurrentLeg ? roundCurrency(currentPart * cspCoreRate) : 0;
	const strategicAcceleratorCurrent =
		isEligible && hasCurrentLeg && currentLegQualifiesForStrategic
			? roundCurrency(currentPart * strategicAcceleratorRate)
			: 0;
	const currentIncentive = roundCurrency(
		cspCoreCurrent + strategicAcceleratorCurrent,
	);
	const incrementalIncentive = roundCurrency(totalIncentive - currentIncentive);

	return {
		cspCore,
		cspCoreRate,
		strategicAccelerator,
		strategicAcceleratorRate,
		growthAccelerator,
		growthAcceleratorRate,
		totalIncentive,
		cspCoreCurrent,
		strategicAcceleratorCurrent,
		currentIncentive,
		incrementalIncentive,
	};
}

/**
 * Calculates a full upgrade scenario for a specific starting/ending SKU pair.
 */
export function calculateScenario(
	startingSku: StartingSku,
	endingSku: EndingSku,
	seats: number,
	options?: CalculateScenarioOptions,
): UpgradeScenario {
	const normalizedSeats = normalizeSeats(seats);
	const pricingContext = buildRegionalPricingContext({
		region: options?.region ?? null,
		country: options?.country ?? null,
	});
	const resolvedEndingSku = applyRegionalPricingToEndingSku({
		endingSku,
		country: pricingContext.country,
		distributorDiscount: options?.distributorDiscount,
	});
	const journey = options?.journey;
	const normalizedExpiringArr = Number.isFinite(options?.expiringArr)
		? Math.max(0, Number(options?.expiringArr))
		: null;
	const normalizedOriginalSeats = normalizeSeats(
		options?.originalSeats ?? seats,
	);
	const normalizedCurrentSeats = normalizeSeats(
		options?.currentSeats ?? options?.originalSeats ?? seats,
	);

	let effectiveStartingMonthlyPrice = startingSku.monthlyPrice;
	let currentAnnualValue = roundCurrency(
		startingSku.monthlyPrice * normalizedCurrentSeats * 12,
	);

	// Renewal flow uses the subscription's expiring ARR as the current baseline.
	if (journey === 'renewal' && normalizedExpiringArr !== null) {
		currentAnnualValue = roundCurrency(normalizedExpiringArr);
	} else if (journey === 'new_customer' && normalizedExpiringArr !== null) {
		// New-customer baseline is derived from the user-provided cost-per-user.
		// Divide by currentSeats — the seat count the call site used to compute
		// expiringArr — so the per-user price derivation inverts cleanly under
		// the unified current-and-target seat policy.
		if (normalizedCurrentSeats > 0) {
			effectiveStartingMonthlyPrice =
				normalizedExpiringArr / normalizedCurrentSeats / 12;
			currentAnnualValue = roundCurrency(
				effectiveStartingMonthlyPrice * normalizedCurrentSeats * 12,
			);
		}
	}

	const canonicalCurrentPrice =
		getRegionalStartingSkuMonthlyPrice({
			startingSkuId: startingSku.id,
			country: pricingContext.country,
		}) ?? startingSku.monthlyPrice;
	const targetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
		startingSku,
		endingSku: resolvedEndingSku,
		currentSkuCustomerPrice: canonicalCurrentPrice,
	});
	const offerAnnualValue = roundCurrency(
		targetMonthlyPrices.promoPrice * normalizedSeats * 12,
	);
	const listAnnualValue = roundCurrency(
		targetMonthlyPrices.listPrice * normalizedSeats * 12,
	);
	const promoSavingsAnnual = roundCurrency(listAnnualValue - offerAnnualValue);
	const incrementalCost = roundCurrency(offerAnnualValue - currentAnnualValue);
	const economics = calculateIncentives({
		endingSkuId: resolvedEndingSku.id,
		targetPrice: targetMonthlyPrices.promoPrice,
		currentPrice: canonicalCurrentPrice,
		seats: normalizedSeats,
		currentSeats: normalizedCurrentSeats,
		journey: journey ?? 'renewal',
		startingSkuId: startingSku.id,
		country: pricingContext.country,
		isAddOn: resolvedEndingSku.isAddOn,
		isIncentiveEligible: options?.isIncentiveEligible,
		partnerType: options?.partnerType,
		erpMarginPercent: options?.erpMarginPercent,
	});

	return {
		startingSkuId: startingSku.id,
		endingSkuId: resolvedEndingSku.id,
		startingSkuName: startingSku.name,
		endingSkuName: resolvedEndingSku.name,
		startingMonthlyPrice: effectiveStartingMonthlyPrice,
		endingMonthlyPrice: targetMonthlyPrices.promoPrice,
		seats: normalizedSeats,
		offerAnnualValue,
		listAnnualValue,
		promoSavingsAnnual,
		newAnnualValue: offerAnnualValue,
		currentAnnualValue,
		incrementalCost,
		economics,
	};
}

export function calculateScenarioFromExplicitPrices(
	startingSku: StartingSku,
	endingSku: EndingSku,
	seats: number,
	prices: ScenarioExplicitMonthlyPrices,
	options?: CalculateScenarioOptions,
): UpgradeScenario {
	const normalizedSeats = normalizeSeats(seats);
	const pricingContext = buildRegionalPricingContext({
		region: options?.region ?? null,
		country: options?.country ?? null,
	});
	// NOTE: the distributor discount is applied at catalog-resolution time
	// (getValidUpgradePaths → endingSku.promoPrice), which flows into the
	// partner-entered `prices.targetSkuCustomerPrice`. When a qualifying
	// distributor is selected (options.distributorDiscount), the canonical
	// incentive base is resolved WITH the same discount so incentives are
	// computed on the discounted promo price the customer sees. For Attach SKUs,
	// that base is current SKU price + attach promo price.
	const resolvedEndingSku = applyRegionalPricingToEndingSku({
		endingSku,
		country: pricingContext.country,
		distributorDiscount: options?.distributorDiscount,
	});
	const normalizedCurrentSeats = normalizeSeats(
		options?.currentSeats ?? options?.originalSeats ?? seats,
	);
	// Incentives use canonical regional SKU prices for the current leg, NOT the
	// partner-entered customer / reseller prices in `prices`. The target leg uses
	// the canonical effective target price, including current SKU price for
	// Attach SKUs.
	const canonicalCurrentPrice =
		getRegionalStartingSkuMonthlyPrice({
			startingSkuId: startingSku.id,
			country: pricingContext.country,
		}) ?? startingSku.monthlyPrice;
	const targetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
		startingSku,
		endingSku: resolvedEndingSku,
		currentSkuCustomerPrice: prices.currentSkuCustomerPrice,
	});
	const canonicalTargetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
		startingSku,
		endingSku: resolvedEndingSku,
		currentSkuCustomerPrice: canonicalCurrentPrice,
	});
	const annualValues = calculateScenarioAnnualValuesFromPrices({
		seats: normalizedSeats,
		currentSeats: normalizedCurrentSeats,
		targetListPrice: targetMonthlyPrices.listPrice,
		prices,
	});
	const economics = calculateIncentives({
		endingSkuId: resolvedEndingSku.id,
		targetPrice: canonicalTargetMonthlyPrices.promoPrice,
		currentPrice: canonicalCurrentPrice,
		seats: normalizedSeats,
		currentSeats: normalizedCurrentSeats,
		journey: options?.journey ?? 'renewal',
		startingSkuId: startingSku.id,
		country: pricingContext.country,
		isAddOn: resolvedEndingSku.isAddOn,
		isIncentiveEligible: options?.isIncentiveEligible,
		partnerType: options?.partnerType,
		erpMarginPercent: options?.erpMarginPercent,
	});

	return {
		startingSkuId: startingSku.id,
		endingSkuId: resolvedEndingSku.id,
		startingSkuName: startingSku.name,
		endingSkuName: resolvedEndingSku.name,
		startingMonthlyPrice: normalizeNonNegativeMoney(
			prices.currentSkuCustomerPrice,
		),
		endingMonthlyPrice: normalizeNonNegativeMoney(
			prices.targetSkuCustomerPrice,
		),
		seats: normalizedSeats,
		offerAnnualValue: annualValues.targetCustomerAnnualValue,
		listAnnualValue: annualValues.targetListAnnualValue,
		promoSavingsAnnual: annualValues.promoSavingsAnnual,
		newAnnualValue: annualValues.targetCustomerAnnualValue,
		currentAnnualValue: annualValues.currentCustomerAnnualValue,
		incrementalCost: annualValues.incrementalCustomerCost,
		economics,
	};
}

/**
 * Maps a product string to a supported starting SKU, or null for unsupported.
 */
export function matchStartingSku(product: string): StartingSku | null {
	const normalized = normalizeProduct(product);

	if (normalized === 'other') return STARTING_SKU_BY_ID.get('other') ?? null;

	if (normalized.includes(' e3 ') || normalized.endsWith(' e3')) return null;
	if (normalized.includes(' e5 ') || normalized.endsWith(' e5')) return null;

	if (/\b(o365|office 365)\s+business\s+premium\b/.test(normalized)) {
		return STARTING_SKU_BY_ID.get('bs') ?? null;
	}
	if (/\bbusiness\s+premium\b/.test(normalized)) {
		return STARTING_SKU_BY_ID.get('bp') ?? null;
	}
	if (/\bbusiness\s+standard\b/.test(normalized)) {
		return STARTING_SKU_BY_ID.get('bs') ?? null;
	}
	if (/\bbusiness\s+basic\b/.test(normalized)) {
		return STARTING_SKU_BY_ID.get('bb') ?? null;
	}
	if (/\bo365\s+business\s+essentials\b/.test(normalized)) {
		return STARTING_SKU_BY_ID.get('bb') ?? null;
	}

	return null;
}

/**
 * Returns true when at least one of the selected SKUs forms a valid upgrade
 * journey from the customer's starting SKU. Mirrors the intersection logic in
 * `buildProposalScenarios` so the two always agree: a customer for which this
 * returns false produces zero proposal scenarios and should be excluded from
 * bulk list PDFs entirely.
 *
 * Validity is region-independent (region only affects pricing), so this reads
 * the raw `VALID_UPGRADE_PATHS` id list directly. `selectedSkuIds` must be the
 * expanded list actually sent to generation (post `expandSkuIdsWithAttachSkus`).
 * An empty selection means "all valid paths" — supported only when the customer
 * has a recognised starting SKU.
 */
export function hasValidSelectedJourney(
	currentProduct: string,
	selectedSkuIds: string[],
): boolean {
	const startingSku = matchStartingSku(currentProduct);
	if (!startingSku) {
		return false;
	}
	if (selectedSkuIds.length === 0) {
		return true;
	}
	const selectedSkuSet = new Set(selectedSkuIds);
	const pathIds = VALID_UPGRADE_PATHS[startingSku.id] ?? [];
	return pathIds.some((pathId) => selectedSkuSet.has(pathId));
}

/**
 * Builds the condensed proposal scenario shape used in list PDFs.
 */
export function buildProposalScenarios(params: {
	currentProduct: string;
	seatCount: number;
	selectedSkuIds: string[];
	expiringArr?: number;
	journey?: ScenarioJourney;
	region?: string | null;
	country?: string | null;
	isIncentiveEligible?: boolean;
	partnerType?: string | null;
	erpMarginPercent?: number | null;
}): ProposalScenario[] {
	const startingSku = matchStartingSku(params.currentProduct);
	if (!startingSku) {
		return [];
	}

	const allCandidates = getValidUpgradePaths(startingSku.id, {
		region: params.region,
		country: params.country,
	});
	const selectedSkuIds = params.selectedSkuIds ?? [];
	const selectedSkuSet = new Set(selectedSkuIds);
	const candidates =
		selectedSkuIds.length === 0
			? allCandidates
			: allCandidates.filter((endingSku) => selectedSkuSet.has(endingSku.id));

	return candidates.map((endingSku) => {
		const scenario = calculateScenario(
			startingSku,
			endingSku,
			params.seatCount,
			{
				journey: params.journey ?? 'renewal',
				expiringArr: params.expiringArr,
				originalSeats: params.seatCount,
				region: params.region,
				country: params.country,
				isIncentiveEligible: params.isIncentiveEligible,
				partnerType: params.partnerType,
				erpMarginPercent: params.erpMarginPercent,
			},
		);
		const monthlyDivisor = scenario.seats > 0 ? scenario.seats * 12 : 0;
		const targetMonthlyPrices = resolveScenarioTargetMonthlyPrices({
			startingSku,
			endingSku,
			currentSkuCustomerPrice: scenario.startingMonthlyPrice,
		});
		return {
			endingSkuId: scenario.endingSkuId,
			endingSkuName: scenario.endingSkuName,
			endingSkuType: endingSku.upgradeType,
			seats: scenario.seats,
			offerAnnualValue: scenario.offerAnnualValue,
			currentAnnualValue: scenario.currentAnnualValue,
			incrementalCost: scenario.incrementalCost,
			totalIncentive: scenario.economics.totalIncentive,
			promoMonthlyPerUser:
				monthlyDivisor > 0
					? roundCurrency(scenario.offerAnnualValue / monthlyDivisor)
					: scenario.endingMonthlyPrice,
			listMonthlyPerUser:
				monthlyDivisor > 0
					? roundCurrency(scenario.listAnnualValue / monthlyDivisor)
					: targetMonthlyPrices.listPrice,
		};
	});
}

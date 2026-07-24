import type { EndingSku } from '@repo/types';

export type RegionalPricingCountry =
	| 'AR'
	| 'AU'
	| 'BB'
	| 'BM'
	| 'BO'
	| 'BR'
	| 'BZ'
	| 'CA'
	| 'CL'
	| 'CO'
	| 'CR'
	| 'CW'
	| 'DE'
	| 'DK'
	| 'DO'
	| 'EC'
	| 'GB'
	| 'GT'
	| 'HN'
	| 'IE'
	| 'IN'
	| 'JM'
	| 'KN'
	| 'KY'
	| 'MX'
	| 'MY'
	| 'NI'
	| 'NL'
	| 'NO'
	| 'NZ'
	| 'PA'
	| 'PE'
	| 'PR'
	| 'PY'
	| 'SE'
	| 'SG'
	| 'SV'
	| 'TT'
	| 'US'
	| 'UY'
	| 'VE'
	| 'VI';
export type RegionalCurrencyCode =
	| 'USD'
	| 'CAD'
	| 'BRL'
	| 'NZD'
	| 'AUD'
	| 'NOK'
	| 'GBP'
	| 'DKK'
	| 'SEK'
	| 'EUR'
	| 'INR';
export type PricingFallbackReason =
	| 'none'
	| 'missing_region'
	| 'unknown_region'
	| 'mixed_regions';

export interface RegionalPricingContext {
	country: RegionalPricingCountry;
	/**
	 * The country resolved from the source region BEFORE any currency override
	 * flip is applied. Use this — not `country` — for region-bound business
	 * logic (e.g. the strategic accelerator rate) that must NOT change when the
	 * partner toggles the display currency.
	 */
	regionCountry: RegionalPricingCountry;
	currency: RegionalCurrencyCode;
	currencySymbol: string;
	locale: string;
	sourceRegion: string | null;
	fallbackApplied: boolean;
	fallbackReason: PricingFallbackReason;
}

export interface RegionalEndingSkuPrice {
	listPrice: number;
	promoPrice: number;
}

export const DEFAULT_CURRENT_SKU_MARGIN_PERCENT = 20;

const STRATEGIC_ACCELERATOR_RATE_BY_COUNTRY: Record<
	RegionalPricingCountry,
	number
> = {
	AR: 0.03,
	AU: 0.03,
	BB: 0.03,
	BM: 0.03,
	BO: 0.03,
	BR: 0.03,
	BZ: 0.03,
	CA: 0.03,
	CL: 0.03,
	CO: 0.03,
	CR: 0.03,
	CW: 0.03,
	DE: 0.03,
	DK: 0.03,
	DO: 0.03,
	EC: 0.03,
	GB: 0.03,
	GT: 0.03,
	HN: 0.03,
	IE: 0.03,
	IN: 0.04,
	JM: 0.03,
	KN: 0.03,
	KY: 0.03,
	MX: 0.03,
	MY: 0.04,
	NI: 0.03,
	NL: 0.03,
	NO: 0.03,
	NZ: 0.03,
	PA: 0.03,
	PE: 0.03,
	PR: 0.03,
	PY: 0.03,
	SE: 0.03,
	SG: 0.04,
	SV: 0.03,
	TT: 0.03,
	US: 0.03,
	UY: 0.03,
	VE: 0.03,
	VI: 0.03,
};

export function getStrategicAcceleratorRate(
	country: RegionalPricingCountry,
): number {
	return STRATEGIC_ACCELERATOR_RATE_BY_COUNTRY[country];
}

/**
 * Target SKU margins are now a flat 20% for every SKU. Kept as a map for
 * forward-compatibility with per-SKU overrides; every entry currently resolves
 * to DEFAULT_CURRENT_SKU_MARGIN_PERCENT (20).
 */
export const DEFAULT_TARGET_SKU_MARGIN_PERCENT_BY_ENDING_SKU_ID: Readonly<
	Record<string, number>
> = {};

const DEFAULT_COUNTRY: RegionalPricingCountry = 'US';

const CURRENCY_BY_COUNTRY: Record<
	RegionalPricingCountry,
	RegionalCurrencyCode
> = {
	AR: 'USD',
	AU: 'AUD',
	BB: 'USD',
	BM: 'USD',
	BO: 'USD',
	BR: 'BRL',
	BZ: 'USD',
	CA: 'CAD',
	CL: 'USD',
	CO: 'USD',
	CR: 'USD',
	CW: 'USD',
	DE: 'EUR',
	DK: 'DKK',
	DO: 'USD',
	EC: 'USD',
	GB: 'GBP',
	GT: 'USD',
	HN: 'USD',
	IE: 'EUR',
	IN: 'INR',
	JM: 'USD',
	KN: 'USD',
	KY: 'USD',
	MX: 'USD',
	MY: 'USD',
	NI: 'USD',
	NL: 'EUR',
	NO: 'NOK',
	NZ: 'NZD',
	PA: 'USD',
	PE: 'USD',
	PR: 'USD',
	PY: 'USD',
	SE: 'SEK',
	SG: 'USD',
	SV: 'USD',
	TT: 'USD',
	US: 'USD',
	UY: 'USD',
	VE: 'USD',
	VI: 'USD',
};

const SYMBOL_BY_COUNTRY: Record<RegionalPricingCountry, string> = {
	AR: '$',
	AU: 'A$',
	BB: '$',
	BM: '$',
	BO: '$',
	BR: 'R$',
	BZ: '$',
	CA: 'CA$',
	CL: '$',
	CO: '$',
	CR: '$',
	CW: '$',
	DE: '€',
	DK: 'kr',
	DO: '$',
	EC: '$',
	GB: '£',
	GT: '$',
	HN: '$',
	IE: '€',
	IN: '₹',
	JM: '$',
	KN: '$',
	KY: '$',
	MX: '$',
	MY: '$',
	NI: '$',
	NL: '€',
	NO: 'kr',
	NZ: 'NZ$',
	PA: '$',
	PE: '$',
	PR: '$',
	PY: '$',
	SE: 'kr',
	SG: '$',
	SV: '$',
	TT: '$',
	US: '$',
	UY: '$',
	VE: '$',
	VI: '$',
};

const LOCALE_BY_COUNTRY: Record<RegionalPricingCountry, string> = {
	AR: 'es-AR',
	AU: 'en-AU',
	BB: 'en-BB',
	BM: 'en-BM',
	BO: 'es-BO',
	BR: 'pt-BR',
	BZ: 'en-BZ',
	CA: 'en-CA',
	CL: 'es-CL',
	CO: 'es-CO',
	CR: 'es-CR',
	CW: 'nl-CW',
	DE: 'de-DE',
	DK: 'da-DK',
	DO: 'es-DO',
	EC: 'es-EC',
	GB: 'en-GB',
	GT: 'es-GT',
	HN: 'es-HN',
	IE: 'en-IE',
	IN: 'en-IN',
	JM: 'en-JM',
	KN: 'en-KN',
	KY: 'en-KY',
	MX: 'es-MX',
	MY: 'en-MY',
	NI: 'es-NI',
	NL: 'nl-NL',
	NO: 'nb-NO',
	NZ: 'en-NZ',
	PA: 'es-PA',
	PE: 'es-PE',
	PR: 'es-PR',
	PY: 'es-PY',
	SE: 'sv-SE',
	SG: 'en-SG',
	SV: 'es-SV',
	TT: 'en-TT',
	US: 'en-US',
	UY: 'es-UY',
	VE: 'es-VE',
	VI: 'en-VI',
};

export const SUPPORTED_CURRENCIES: readonly RegionalCurrencyCode[] = [
	'USD',
	'CAD',
	'BRL',
	'NZD',
	'AUD',
	'NOK',
	'GBP',
	'DKK',
	'SEK',
	'EUR',
	'INR',
];

const SYMBOL_BY_CURRENCY: Record<RegionalCurrencyCode, string> = {
	USD: '$',
	CAD: 'CA$',
	BRL: 'R$',
	NZD: 'NZ$',
	AUD: 'A$',
	NOK: 'kr',
	GBP: '£',
	DKK: 'kr',
	SEK: 'kr',
	EUR: '€',
	INR: '₹',
};

const LOCALE_BY_CURRENCY: Record<RegionalCurrencyCode, string> = {
	USD: 'en-US',
	CAD: 'en-CA',
	BRL: 'pt-BR',
	NZD: 'en-NZ',
	AUD: 'en-AU',
	NOK: 'nb-NO',
	GBP: 'en-GB',
	DKK: 'da-DK',
	SEK: 'sv-SE',
	EUR: 'en-IE',
	INR: 'en-IN',
};

const COUNTRY_BY_CURRENCY: Record<
	RegionalCurrencyCode,
	RegionalPricingCountry
> = {
	USD: 'US',
	CAD: 'CA',
	BRL: 'BR',
	NZD: 'NZ',
	AUD: 'AU',
	NOK: 'NO',
	GBP: 'GB',
	DKK: 'DK',
	SEK: 'SE',
	EUR: 'IE',
	INR: 'IN',
};

export function isRegionalCurrencyCode(
	value: unknown,
): value is RegionalCurrencyCode {
	return (
		typeof value === 'string' &&
		(SUPPORTED_CURRENCIES as readonly string[]).includes(value)
	);
}

export function getCurrencySymbol(currency: RegionalCurrencyCode): string {
	return SYMBOL_BY_CURRENCY[currency];
}

export function getCurrencyLocale(currency: RegionalCurrencyCode): string {
	return LOCALE_BY_CURRENCY[currency];
}

export interface RegionalCurrencyDisplayOptions {
	currency?: RegionalCurrencyCode | string | null;
	currencySymbol?: string | null;
	locale?: string | null;
	minimumFractionDigits?: number;
	maximumFractionDigits?: number;
}

const CURRENCIES_WITH_US_NUMBER_FORMAT: ReadonlySet<RegionalCurrencyCode> =
	new Set(['BRL', 'NOK', 'DKK', 'SEK']);
const CURRENCIES_WITH_SUFFIX_SYMBOL: ReadonlySet<RegionalCurrencyCode> =
	new Set(['NOK', 'DKK', 'SEK']);

function normalizeCurrencyCode(
	currency: RegionalCurrencyCode | string | null | undefined,
): RegionalCurrencyCode | null {
	if (typeof currency !== 'string') {
		return null;
	}

	const normalized = currency.toUpperCase();
	return isRegionalCurrencyCode(normalized) ? normalized : null;
}

function normalizeCurrencyWhitespace(value: string): string {
	return value.replace(/[\u00a0\u202f]/g, ' ');
}

export function formatRegionalCurrencyDisplay(
	value: number,
	options?: RegionalCurrencyDisplayOptions,
): string {
	const currency = normalizeCurrencyCode(options?.currency);
	const locale =
		options?.locale ??
		(currency ? LOCALE_BY_CURRENCY[currency] : LOCALE_BY_CURRENCY.USD);
	const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
	const maximumFractionDigits =
		options?.maximumFractionDigits ?? minimumFractionDigits;
	const normalized = Number.isFinite(value) ? value : 0;

	const symbol =
		options?.currencySymbol ??
		(currency ? SYMBOL_BY_CURRENCY[currency] : SYMBOL_BY_CURRENCY.USD);
	const numberLocale =
		currency && CURRENCIES_WITH_US_NUMBER_FORMAT.has(currency)
			? LOCALE_BY_CURRENCY.USD
			: locale;
	const formatted = normalized.toLocaleString(numberLocale, {
		minimumFractionDigits,
		maximumFractionDigits,
	});

	if (currency && CURRENCIES_WITH_SUFFIX_SYMBOL.has(currency)) {
		return `${normalizeCurrencyWhitespace(formatted)} ${symbol}`;
	}

	return `${symbol}${normalizeCurrencyWhitespace(formatted)}`;
}

// Rates backfill regional prices when no usable explicit workbook row exists and
// bridge user-edited prices between display currencies. USD-denominated markets
// use a rate of 1.
const USD_TO_COUNTRY_RATE: Record<RegionalPricingCountry, number> = {
	AR: 1,
	AU: 1.39,
	BB: 1,
	BM: 1,
	BO: 1,
	BR: 5.725,
	BZ: 1,
	CA: 1.356,
	CL: 1,
	CO: 1,
	CR: 1,
	CW: 1,
	DE: 0.86,
	DK: 6.4,
	DO: 1,
	EC: 1,
	GB: 0.74,
	GT: 1,
	HN: 1,
	IE: 0.86,
	IN: 94.1,
	JM: 1,
	KN: 1,
	KY: 1,
	MX: 1,
	MY: 1,
	NI: 1,
	NL: 0.86,
	NO: 9.33,
	NZ: 1.7,
	PA: 1,
	PE: 1,
	PR: 1,
	PY: 1,
	SE: 9.23,
	SG: 1,
	SV: 1,
	TT: 1,
	US: 1,
	UY: 1,
	VE: 1,
	VI: 1,
};

/**
 * Full any-to-any conversion rate matrix.
 * `CONVERSION_RATES[from][to]` = how many `to` units per 1 `from` unit.
 * Computed once via USD as bridge: rate(from→to) = USD_TO_COUNTRY_RATE[toCountry] / USD_TO_COUNTRY_RATE[fromCountry].
 */
export const CONVERSION_RATES: Record<
	RegionalCurrencyCode,
	Record<RegionalCurrencyCode, number>
> = (() => {
	const matrix = {} as Record<
		RegionalCurrencyCode,
		Record<RegionalCurrencyCode, number>
	>;
	const codes = Object.keys(COUNTRY_BY_CURRENCY) as RegionalCurrencyCode[];
	for (const from of codes) {
		matrix[from] = {} as Record<RegionalCurrencyCode, number>;
		const fromUsdRate = USD_TO_COUNTRY_RATE[COUNTRY_BY_CURRENCY[from]];
		for (const to of codes) {
			if (from === to) {
				matrix[from][to] = 1;
				continue;
			}
			const toUsdRate = USD_TO_COUNTRY_RATE[COUNTRY_BY_CURRENCY[to]];
			matrix[from][to] = toUsdRate / fromUsdRate;
		}
	}
	return matrix;
})();

export function getConversionRate(
	from: RegionalCurrencyCode | string | null | undefined,
	to: RegionalCurrencyCode | string | null | undefined,
): number | null {
	if (!isRegionalCurrencyCode(from) || !isRegionalCurrencyCode(to)) return null;
	const rate = CONVERSION_RATES[from][to];
	return Number.isFinite(rate) && rate > 0 ? rate : null;
}

const COUNTRY_BY_REGION_NORMALIZED: Record<string, RegionalPricingCountry> = {
	us: 'US',
	usa: 'US',
	'united states': 'US',
	'united states of america': 'US',
	canada: 'CA',
	ca: 'CA',
	brazil: 'BR',
	br: 'BR',
	mexico: 'MX',
	mx: 'MX',
	'antigua and barbuda': 'US',
	argentina: 'AR',
	ar: 'AR',
	bahamas: 'US',
	barbados: 'BB',
	bb: 'BB',
	bermuda: 'BM',
	bm: 'BM',
	bolivia: 'BO',
	bo: 'BO',
	belize: 'BZ',
	bz: 'BZ',
	chile: 'CL',
	cl: 'CL',
	colombia: 'CO',
	co: 'CO',
	'costa rica': 'CR',
	cr: 'CR',
	curaçao: 'CW',
	curacao: 'CW',
	cw: 'CW',
	cuba: 'US',
	dominica: 'US',
	'dominican republic': 'DO',
	do: 'DO',
	'el salvador': 'SV',
	sv: 'SV',
	ecuador: 'EC',
	ec: 'EC',
	grenada: 'US',
	guatemala: 'GT',
	gt: 'GT',
	haiti: 'US',
	honduras: 'HN',
	hn: 'HN',
	jamaica: 'JM',
	jm: 'JM',
	'cayman islands': 'KY',
	ky: 'KY',
	nicaragua: 'NI',
	ni: 'NI',
	panama: 'PA',
	pa: 'PA',
	paraguay: 'PY',
	py: 'PY',
	peru: 'PE',
	pe: 'PE',
	'puerto rico': 'PR',
	pr: 'PR',
	'saint kitts and nevis': 'KN',
	'st. kitts and nevis': 'KN',
	kn: 'KN',
	'st. lucia': 'US',
	'st. vincent and the grenadines': 'US',
	'trinidad and tobago': 'TT',
	tt: 'TT',
	uruguay: 'UY',
	uy: 'UY',
	venezuela: 'VE',
	ve: 'VE',
	'u.s. virgin islands': 'VI',
	'us virgin islands': 'VI',
	'united states virgin islands': 'VI',
	vi: 'VI',
	nz: 'NZ',
	'new zealand': 'NZ',
	au: 'AU',
	australia: 'AU',
	no: 'NO',
	norway: 'NO',
	gb: 'GB',
	uk: 'GB',
	'united kingdom': 'GB',
	'great britain': 'GB',
	dk: 'DK',
	denmark: 'DK',
	se: 'SE',
	sweden: 'SE',
	ie: 'IE',
	ireland: 'IE',
	in: 'IN',
	india: 'IN',
	my: 'MY',
	malaysia: 'MY',
	sg: 'SG',
	singapore: 'SG',
	de: 'DE',
	germany: 'DE',
	nl: 'NL',
	netherlands: 'NL',
	netherland: 'NL',
};

// Canonical USD starting-SKU prices. Non-USD regions are derived from these via
// USD_TO_COUNTRY_RATE until real local prices are supplied (see
// STARTING_SKU_PRICE_OVERRIDES_BY_COUNTRY). MY/SG are USD markets (rate 1).
const STARTING_SKU_PRICE_USD: Record<string, number> = {
	bb: 7,
	bs: 14,
	bp: 22,
};

// Per-country explicit starting-SKU price overrides from smb prices.xlsx.
// MX and MY are retained from the previous Book 18 workbook because they are
// not present in smb prices.xlsx.
const STARTING_SKU_PRICE_OVERRIDES_BY_COUNTRY: Partial<
	Record<RegionalPricingCountry, Record<string, number>>
> = {
	AU: {
		bb: 10.5,
		bs: 21,
		bp: 32.9,
	},
	BR: {
		bb: 33.4,
		bs: 80.2,
		bp: 126,
	},
	CA: {
		bb: 9.5,
		bs: 19,
		bp: 29.8,
	},
	DE: {
		bb: 6.07,
		bs: 12.13,
		bp: 19.06,
	},
	DK: {
		bb: 45.27,
		bs: 90.54,
		bp: 142.27,
	},
	GB: {
		bb: 5.4,
		bs: 10.8,
		bp: 16.9,
	},
	IE: {
		bb: 6.07,
		bs: 12.13,
		bp: 19.06,
	},
	IN: {
		bb: 170,
		bs: 860,
		bp: 1830,
	},
	MX: {
		bb: 5.833333333333333,
	},
	MY: {
		bb: 3.5,
		bs: 11.2,
	},
	NL: {
		bb: 6.07,
		bs: 12.13,
		bp: 19.06,
	},
	NO: {
		bb: 71.16,
		bs: 142.31,
		bp: 223.63,
	},
	NZ: {
		bb: 11.3,
		bs: 22.6,
		bp: 35.6,
	},
	SE: {
		bb: 66.91,
		bs: 133.82,
		bp: 210.29,
	},
};

// Canonical USD ending-SKU prices. Non-USD regions are derived from these via
// USD_TO_COUNTRY_RATE until real local prices are supplied (see
// ENDING_SKU_PRICE_OVERRIDES_BY_COUNTRY). MY/SG are USD markets (rate 1).
// For add-on SKUs (attach_*), these prices are the add-on amount only; the
// combined current + add-on price is computed in the rules engine.
//
// The only remaining suite promo is on bp_cb_purview: 50% off its $10 Purview
// portion because Copilot and Purview are bought together (list $42 = bp_cb
// $32 + Purview $10). The former fixed 7.5% discount on the Purview / Defender
// suite portion of the security SKUs was retired — those SKUs now sell at list.
const ENDING_SKU_PRICE_USD: Record<string, RegionalEndingSkuPrice> = {
	bp_purview: { listPrice: 32, promoPrice: 32 },
	bp_defender: { listPrice: 32, promoPrice: 32 },
	// bp_defender_purview and attach_defender_purview come from apps/Book 22.xlsx
	// (all USD markets list 37 / 15). Its IE, NL, NO, and SE rows were broken
	// workbook formulas; apps/Book 23.xlsx supplies the corrected local rows
	// applied in ENDING_SKU_PRICE_OVERRIDES_BY_COUNTRY.
	bp_defender_purview: { listPrice: 37, promoPrice: 37 },
	attach_defender_purview: { listPrice: 15, promoPrice: 15 },
	bp_cb: { listPrice: 32, promoPrice: 32 },
	bs_cb: { listPrice: 23.5, promoPrice: 23.5 },
	bp_cb_purview: { listPrice: 42, promoPrice: 37 },
	bb_cb: { listPrice: 28, promoPrice: 21 },
	attach_copilot: { listPrice: 21, promoPrice: 18 },
	attach_purview: { listPrice: 10, promoPrice: 10 },
	attach_defender: { listPrice: 10, promoPrice: 10 },
};

// The CSP Indirect distributor promotion (60% off the Purview / Defender
// Suites) was retired along with the 7.5% suite promo — the only surviving
// promo is the 50% Purview-portion discount on bp_cb_purview. The map is kept
// (empty) so the distributorDiscount plumbing in the rules engine, emails, and
// proposal page no-ops without code changes.
export const DISTRIBUTOR_DISCOUNT_RATE_BY_SKU_ID: Record<string, number> = {};

// Per-country explicit ending-SKU price overrides from smb prices.xlsx.
// Monthly ERP rows are used as list prices; promo prices keep the existing
// business rules (Copilot promo ratios and suite-portion discounts).
// Names map as follows:
// - Microsoft 365 Business Basic and Microsoft 365 Copilot Business -> bb_cb
// - Microsoft 365 Business Standard with Copilot -> bs_cb
// - Microsoft 365 Business Premium with Copilot -> bp_cb
// - Business Premium + Copilot Business + Purview suite -> bp_cb_purview
// - Business Premium + Purview suite -> bp_purview
// - Business Premium + Defender suite -> bp_defender
// - Business Premium + Defender Suite + Purview Suite -> bp_defender_purview
// - Microsoft 365 Copilot Business -> attach_copilot
// The Microsoft Purview / Defender Suite rows are add-on-only ERPs. Full BP
// bundle prices come from the "Business Premium + ..." rows above.
// - Microsoft Purview Suite for Microsoft 365 Business Premium -> attach_purview
// - Microsoft Defender Suite for Microsoft 365 Business Premium -> attach_defender
// - Microsoft Defender and Purview Suites for Microsoft 365 Business Premium
//   -> attach_defender_purview
const ENDING_SKU_PRICE_OVERRIDES_BY_COUNTRY: Partial<
	Record<RegionalPricingCountry, Record<string, RegionalEndingSkuPrice>>
> = {
	AU: {
		bb_cb: { listPrice: 41.9, promoPrice: 31.425 },
		bs_cb: { listPrice: 35.2, promoPrice: 35.2 },
		bp_cb: { listPrice: 47.9, promoPrice: 47.9 },
		bp_cb_purview: { listPrice: 62.9, promoPrice: 55.4 },
		bp_purview: { listPrice: 47.9, promoPrice: 47.9 },
		bp_defender: { listPrice: 47.9, promoPrice: 47.9 },
		bp_defender_purview: { listPrice: 55.3, promoPrice: 55.3 },
		attach_copilot: { listPrice: 31.4, promoPrice: 26.9143 },
		attach_purview: { listPrice: 15, promoPrice: 15 },
		attach_defender: { listPrice: 15, promoPrice: 15 },
		attach_defender_purview: { listPrice: 22.4, promoPrice: 22.4 },
	},
	BR: {
		bb_cb: { listPrice: 160.3, promoPrice: 120.225 },
		bs_cb: { listPrice: 134.6, promoPrice: 134.6 },
		bp_cb: { listPrice: 183.2, promoPrice: 183.2 },
		bp_cb_purview: { listPrice: 240.5, promoPrice: 211.85 },
		bp_purview: { listPrice: 183.3, promoPrice: 183.3 },
		bp_defender: { listPrice: 183.3, promoPrice: 183.3 },
		bp_defender_purview: { listPrice: 211.9, promoPrice: 211.9 },
		attach_copilot: { listPrice: 120.2, promoPrice: 103.0286 },
		attach_purview: { listPrice: 57.3, promoPrice: 57.3 },
		attach_defender: { listPrice: 57.3, promoPrice: 57.3 },
		attach_defender_purview: { listPrice: 85.9, promoPrice: 85.9 },
	},
	CA: {
		bb_cb: { listPrice: 38, promoPrice: 28.5 },
		bs_cb: { listPrice: 31.9, promoPrice: 31.9 },
		bp_cb: { listPrice: 43.4, promoPrice: 43.4 },
		bp_cb_purview: { listPrice: 57, promoPrice: 50.2 },
		bp_purview: { listPrice: 43.4, promoPrice: 43.4 },
		bp_defender: { listPrice: 43.4, promoPrice: 43.4 },
		bp_defender_purview: { listPrice: 50.2, promoPrice: 50.2 },
		attach_copilot: { listPrice: 28.5, promoPrice: 24.4286 },
		attach_purview: { listPrice: 13.6, promoPrice: 13.6 },
		attach_defender: { listPrice: 13.6, promoPrice: 13.6 },
		attach_defender_purview: { listPrice: 20.4, promoPrice: 20.4 },
	},
	DE: {
		bb_cb: { listPrice: 24.26, promoPrice: 18.195 },
		bs_cb: { listPrice: 20.36, promoPrice: 20.36 },
		bp_cb: { listPrice: 27.73, promoPrice: 27.73 },
		bp_cb_purview: { listPrice: 36.43, promoPrice: 32.08 },
		bp_purview: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender_purview: { listPrice: 32.06, promoPrice: 32.06 },
		attach_copilot: { listPrice: 18.2, promoPrice: 15.6 },
		attach_purview: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender_purview: { listPrice: 13, promoPrice: 13 },
	},
	DK: {
		bb_cb: { listPrice: 181.07, promoPrice: 135.8025 },
		bs_cb: { listPrice: 151.97, promoPrice: 151.97 },
		bp_cb: { listPrice: 206.94, promoPrice: 206.94 },
		bp_cb_purview: { listPrice: 271.64, promoPrice: 239.29 },
		bp_purview: { listPrice: 206.97, promoPrice: 206.97 },
		bp_defender: { listPrice: 206.97, promoPrice: 206.97 },
		bp_defender_purview: { listPrice: 239.27, promoPrice: 239.27 },
		attach_copilot: { listPrice: 135.8, promoPrice: 116.4 },
		attach_purview: { listPrice: 64.7, promoPrice: 64.7 },
		attach_defender: { listPrice: 64.7, promoPrice: 64.7 },
		attach_defender_purview: { listPrice: 97, promoPrice: 97 },
	},
	GB: {
		bb_cb: { listPrice: 21.5, promoPrice: 16.125 },
		bs_cb: { listPrice: 18.1, promoPrice: 18.1 },
		bp_cb: { listPrice: 24.6, promoPrice: 24.6 },
		bp_cb_purview: { listPrice: 32.3, promoPrice: 28.45 },
		bp_purview: { listPrice: 24.6, promoPrice: 24.6 },
		bp_defender: { listPrice: 24.6, promoPrice: 24.6 },
		bp_defender_purview: { listPrice: 28.4, promoPrice: 28.4 },
		attach_copilot: { listPrice: 16.1, promoPrice: 13.8 },
		attach_purview: { listPrice: 7.7, promoPrice: 7.7 },
		attach_defender: { listPrice: 7.7, promoPrice: 7.7 },
		attach_defender_purview: { listPrice: 11.5, promoPrice: 11.5 },
	},
	IE: {
		bb_cb: { listPrice: 24.26, promoPrice: 18.195 },
		bs_cb: { listPrice: 20.36, promoPrice: 20.36 },
		bp_cb: { listPrice: 27.73, promoPrice: 27.73 },
		bp_cb_purview: { listPrice: 36.43, promoPrice: 32.08 },
		bp_purview: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender_purview: { listPrice: 32.06, promoPrice: 32.06 },
		attach_copilot: { listPrice: 18.2, promoPrice: 15.6 },
		attach_purview: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender_purview: { listPrice: 13, promoPrice: 13 },
	},
	IN: {
		bb_cb: { listPrice: 2330, promoPrice: 1747.5 },
		bs_cb: { listPrice: 1955, promoPrice: 1955 },
		bp_cb: { listPrice: 2660, promoPrice: 2660 },
		bp_cb_purview: { listPrice: 3490, promoPrice: 3075 },
		bp_purview: { listPrice: 2660, promoPrice: 2660 },
		bp_defender: { listPrice: 2660, promoPrice: 2660 },
		bp_defender_purview: { listPrice: 3080, promoPrice: 3080 },
		attach_copilot: { listPrice: 1745, promoPrice: 1495.7143 },
		attach_purview: { listPrice: 830, promoPrice: 830 },
		attach_defender: { listPrice: 830, promoPrice: 830 },
		attach_defender_purview: { listPrice: 1250, promoPrice: 1250 },
	},
	NL: {
		bb_cb: { listPrice: 24.26, promoPrice: 18.195 },
		bs_cb: { listPrice: 20.36, promoPrice: 20.36 },
		bp_cb: { listPrice: 27.73, promoPrice: 27.73 },
		bp_cb_purview: { listPrice: 36.43, promoPrice: 32.08 },
		bp_purview: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender: { listPrice: 27.76, promoPrice: 27.76 },
		bp_defender_purview: { listPrice: 32.06, promoPrice: 32.06 },
		attach_copilot: { listPrice: 18.2, promoPrice: 15.6 },
		attach_purview: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender: { listPrice: 8.7, promoPrice: 8.7 },
		attach_defender_purview: { listPrice: 13, promoPrice: 13 },
	},
	NO: {
		bb_cb: { listPrice: 284.63, promoPrice: 213.4725 },
		bs_cb: { listPrice: 238.88, promoPrice: 238.88 },
		bp_cb: { listPrice: 325.29, promoPrice: 325.29 },
		bp_cb_purview: { listPrice: 426.99, promoPrice: 376.14 },
		bp_purview: { listPrice: 325.33, promoPrice: 325.33 },
		bp_defender: { listPrice: 325.33, promoPrice: 325.33 },
		bp_defender_purview: { listPrice: 376.13, promoPrice: 376.13 },
		attach_copilot: { listPrice: 213.5, promoPrice: 183 },
		attach_purview: { listPrice: 101.7, promoPrice: 101.7 },
		attach_defender: { listPrice: 101.7, promoPrice: 101.7 },
		attach_defender_purview: { listPrice: 152.5, promoPrice: 152.5 },
	},
	NZ: {
		bb_cb: { listPrice: 45.3, promoPrice: 33.975 },
		bs_cb: { listPrice: 38, promoPrice: 38 },
		bp_cb: { listPrice: 51.8, promoPrice: 51.8 },
		bp_cb_purview: { listPrice: 68, promoPrice: 59.9 },
		bp_purview: { listPrice: 51.8, promoPrice: 51.8 },
		bp_defender: { listPrice: 51.8, promoPrice: 51.8 },
		bp_defender_purview: { listPrice: 59.9, promoPrice: 59.9 },
		attach_copilot: { listPrice: 34, promoPrice: 29.1429 },
		attach_purview: { listPrice: 16.2, promoPrice: 16.2 },
		attach_defender: { listPrice: 16.2, promoPrice: 16.2 },
		attach_defender_purview: { listPrice: 24.3, promoPrice: 24.3 },
	},
	SE: {
		bb_cb: { listPrice: 267.64, promoPrice: 200.73 },
		bs_cb: { listPrice: 224.63, promoPrice: 224.63 },
		bp_cb: { listPrice: 305.87, promoPrice: 305.87 },
		bp_cb_purview: { listPrice: 401.47, promoPrice: 353.67 },
		bp_purview: { listPrice: 305.89, promoPrice: 305.89 },
		bp_defender: { listPrice: 305.89, promoPrice: 305.89 },
		bp_defender_purview: { listPrice: 353.69, promoPrice: 353.69 },
		attach_copilot: { listPrice: 200.7, promoPrice: 172.0286 },
		attach_purview: { listPrice: 95.6, promoPrice: 95.6 },
		attach_defender: { listPrice: 95.6, promoPrice: 95.6 },
		attach_defender_purview: { listPrice: 143.4, promoPrice: 143.4 },
	},
};

function normalizeRegion(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function roundMoney(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseCountryCode(
	value: string | null | undefined,
): RegionalPricingCountry | null {
	if (!value || value.trim().length === 0) {
		return null;
	}

	const normalized = value.trim().toUpperCase();
	if (Object.prototype.hasOwnProperty.call(CURRENCY_BY_COUNTRY, normalized)) {
		return normalized as RegionalPricingCountry;
	}

	return null;
}

export function resolveCountryFromRegion(
	region: string | null | undefined,
): RegionalPricingCountry | null {
	if (!region || region.trim().length === 0) {
		return null;
	}

	return COUNTRY_BY_REGION_NORMALIZED[normalizeRegion(region)] ?? null;
}

export function buildRegionalPricingContext(params: {
	region?: string | null;
	country?: string | null;
	fallbackReason?: PricingFallbackReason;
	currencyOverride?: RegionalCurrencyCode | string | null;
}): RegionalPricingContext {
	const explicitCountry = parseCountryCode(params.country);
	const inferredCountry = resolveCountryFromRegion(params.region);
	const regionCountry = explicitCountry ?? inferredCountry ?? DEFAULT_COUNTRY;
	const fallbackReason =
		params.fallbackReason ??
		(explicitCountry || inferredCountry
			? 'none'
			: !params.region || params.region.trim().length === 0
				? 'missing_region'
				: 'unknown_region');

	const override = isRegionalCurrencyCode(params.currencyOverride)
		? params.currencyOverride
		: null;
	// When a currency override is provided, flip the country so SKU price tables
	// and USD_TO_COUNTRY_RATE resolve to the override's country — otherwise we'd
	// render the override's symbol against the source region's price (e.g. "₹6"
	// instead of "₹564.6" for bb).
	const country = override ? COUNTRY_BY_CURRENCY[override] : regionCountry;

	return {
		country,
		regionCountry,
		currency: override ?? CURRENCY_BY_COUNTRY[country],
		currencySymbol: override
			? SYMBOL_BY_CURRENCY[override]
			: SYMBOL_BY_COUNTRY[country],
		locale: override
			? LOCALE_BY_CURRENCY[override]
			: LOCALE_BY_COUNTRY[country],
		sourceRegion: params.region?.trim() ? params.region.trim() : null,
		fallbackApplied: fallbackReason !== 'none',
		fallbackReason,
	};
}

export function buildRegionalPricingContextForRegions(
	regions: Iterable<string | null | undefined>,
	options?: { currencyOverride?: RegionalCurrencyCode | string | null },
): RegionalPricingContext {
	const normalizedRegions: string[] = [];
	const countries = new Set<RegionalPricingCountry>();

	for (const region of regions) {
		if (!region || region.trim().length === 0) continue;
		const trimmed = region.trim();
		normalizedRegions.push(trimmed);

		const country = resolveCountryFromRegion(trimmed);
		if (country) {
			countries.add(country);
		}
	}

	const currencyOverride = options?.currencyOverride;

	if (countries.size === 1) {
		const [country] = Array.from(countries);
		return buildRegionalPricingContext({
			country,
			region: normalizedRegions[0] ?? null,
			fallbackReason: 'none',
			currencyOverride,
		});
	}

	if (countries.size > 1) {
		return buildRegionalPricingContext({
			country: DEFAULT_COUNTRY,
			region: normalizedRegions[0] ?? null,
			fallbackReason: 'mixed_regions',
			currencyOverride,
		});
	}

	const fallbackReason: PricingFallbackReason =
		normalizedRegions.length === 0 ? 'missing_region' : 'unknown_region';
	return buildRegionalPricingContext({
		country: DEFAULT_COUNTRY,
		region: normalizedRegions[0] ?? null,
		fallbackReason,
		currencyOverride,
	});
}

export function getRegionalEndingSkuPrice(params: {
	endingSkuId: string;
	country: RegionalPricingCountry;
	/**
	 * When true, apply the CSP Indirect distributor promotion: the Purview /
	 * Defender Suite portion of the price is discounted, dropping the customer
	 * (promo) price to the regional list price net of the per-SKU rate. The list
	 * price is preserved so the saving renders as a strikethrough.
	 */
	distributorDiscount?: boolean;
}): RegionalEndingSkuPrice | null {
	const override =
		ENDING_SKU_PRICE_OVERRIDES_BY_COUNTRY[params.country]?.[params.endingSkuId];
	const base =
		override ??
		(() => {
			const usd = ENDING_SKU_PRICE_USD[params.endingSkuId];
			if (!usd) return null;
			const rate = USD_TO_COUNTRY_RATE[params.country];
			if (rate === 1) {
				return usd;
			}
			return {
				listPrice: roundMoney(usd.listPrice * rate),
				promoPrice: roundMoney(usd.promoPrice * rate),
			};
		})();

	if (!base) {
		return null;
	}

	const discountRate = params.distributorDiscount
		? DISTRIBUTOR_DISCOUNT_RATE_BY_SKU_ID[params.endingSkuId]
		: undefined;
	if (discountRate) {
		return {
			listPrice: base.listPrice,
			promoPrice: roundMoney(base.listPrice * (1 - discountRate)),
		};
	}

	return base;
}

export function applyRegionalPricingToEndingSku(params: {
	endingSku: EndingSku;
	country: RegionalPricingCountry;
	distributorDiscount?: boolean;
}): EndingSku {
	const regional = getRegionalEndingSkuPrice({
		endingSkuId: params.endingSku.id,
		country: params.country,
		distributorDiscount: params.distributorDiscount,
	});
	if (!regional) {
		return params.endingSku;
	}

	return {
		...params.endingSku,
		listPrice: regional.listPrice,
		promoPrice: regional.promoPrice,
	};
}

export function getUsdToRegionalRate(params: {
	region?: string | null;
	country?: string | null;
}): number {
	const pricingContext = buildRegionalPricingContext({
		region: params.region,
		country: params.country,
	});
	return USD_TO_COUNTRY_RATE[pricingContext.country];
}

export function convertUsdAmountToRegional(params: {
	amountUsd: number;
	region?: string | null;
	country?: string | null;
}): number {
	const normalizedUsd = Number.isFinite(params.amountUsd)
		? Math.max(0, params.amountUsd)
		: 0;
	const rate = getUsdToRegionalRate({
		region: params.region,
		country: params.country,
	});
	return roundMoney(normalizedUsd * rate);
}

export function getRegionalStartingSkuMonthlyPrice(params: {
	startingSkuId: string;
	region?: string | null;
	country?: string | null;
}): number | null {
	const pricingContext = buildRegionalPricingContext({
		region: params.region,
		country: params.country,
	});
	const override =
		STARTING_SKU_PRICE_OVERRIDES_BY_COUNTRY[pricingContext.country]?.[
			params.startingSkuId
		];
	if (typeof override === 'number') {
		return override;
	}
	const usd = STARTING_SKU_PRICE_USD[params.startingSkuId];
	if (typeof usd !== 'number') {
		return null;
	}
	return roundMoney(usd * USD_TO_COUNTRY_RATE[pricingContext.country]);
}

export function getDefaultTargetSkuMarginPercent(endingSkuId: string): number {
	return (
		DEFAULT_TARGET_SKU_MARGIN_PERCENT_BY_ENDING_SKU_ID[endingSkuId] ??
		DEFAULT_CURRENT_SKU_MARGIN_PERCENT
	);
}

/**
 * Target-SKU margin with a caller-supplied default (the partner's profile ERP
 * margin). A per-SKU override in
 * DEFAULT_TARGET_SKU_MARGIN_PERCENT_BY_ENDING_SKU_ID still wins over the
 * partner default; absent both, the program-wide 20% applies.
 */
export function getTargetSkuMarginPercent(
	endingSkuId: string,
	defaultPercent?: number,
): number {
	return (
		DEFAULT_TARGET_SKU_MARGIN_PERCENT_BY_ENDING_SKU_ID[endingSkuId] ??
		defaultPercent ??
		DEFAULT_CURRENT_SKU_MARGIN_PERCENT
	);
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
	Button,
	Dropdown,
	Option,
	Spinner,
	Tooltip,
} from '@fluentui/react-components';
import { getThemeConfig } from '@/lib/theme-config';
import {
	AddRegular,
	ArrowLeftRegular,
	ArrowRightRegular,
	Dismiss20Regular,
	MailRegular,
} from '@fluentui/react-icons';
import {
	allocateScenarioBaselines,
	buildRegionalPricingContext,
	getSeatRangeLowerBound,
	isRegionalCurrencyCode,
	type ProposalOptionsFilter,
	type ProposalOptionsJourney,
	type ScenarioAllocation,
	type StartingSkuId,
	type MciEngagementAttachment,
	type MciEngagementId,
	type PartnerProfile,
	buildMciAttachmentCardKey,
	getEligibleMciEngagementIds,
	getMciCategoriesForSku,
	isMciGateEligible,
	MCI_BONUS_PARENT,
	MCI_ENGAGEMENTS,
	getMciEngagementAmount,
	parseMciAttachmentEnvelope,
	sanitizeMciAttachments,
	serializeMciAttachments,
} from '@repo/shared';
import type { EndingSku } from '@repo/types';
import { captureElementByIdAsPngBlob } from '@/lib/element-screenshot';
import { formatCurrency } from '@/lib/format-utils';
import {
	buildCustomerOpportunities,
	type OpportunitySubscription,
	toOpportunityDescriptorMap,
} from '@/lib/opportunity-utils';
import {
	createProposalOptionsEmailLink,
	createProposalOptionsEmailLinkPublic,
} from '@/lib/proposal-options-email-link';
import { daysUntilRenewal } from '@/lib/filter-utils';
import {
	annualizeMonthlyPrice,
	calculateScenarioFromExplicitPrices,
	deriveResellerPriceFromMargin,
	getTargetSkuMarginPercent,
	resolveScenarioTargetMonthlyPrices,
} from '@/lib/rules-engine';
import {
	buildScenarioSelectionEntryKey,
	useScenarioSelection,
} from '@/lib/use-scenario-selection';
import {
	captureProposalAssetsRequested,
	captureProposalEmailLinkRequested,
	captureProposalScenariosSelected,
	captureProposalStarted,
} from '@/lib/posthog-product-events';
import { CustomerHeader } from '@/components/proposal/CustomerHeader';
import { OpportunityTabs } from '@/components/proposal/OpportunityTabs';
import {
	DEFAULT_PARTNER_FILTERS,
	isDistributorDiscountEligible,
} from '@/components/proposal/PartnerFilterPanel';
import type { PartnerFilters } from '@/components/proposal/PartnerFilterPanel';
import type { MciEngagementOption } from '@/components/proposal/MciEngagementDropdown';
import { PartnerProfileEligibilityBanner } from '@/components/partner-profile/PartnerProfileEligibilityBanner';
import { ProposalSteps } from '@/components/proposal/proposal-steps';
import { ProposalSectionStepLabel } from '@/components/proposal/ProposalSectionStepLabel';
import { ScenarioCard } from '@/components/proposal/ScenarioCard';
import { ScenarioCardSkeleton } from '@/components/proposal/ScenarioCardSkeleton';
import { useCurrency } from '@/lib/currency-context';
import type { Currency } from '@/i18n/currency-config';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';

type ScenarioFilter = ProposalOptionsFilter;
const SCENARIO_CARDS_ROW_ID = 'scenario-cards-row';
const DEFAULT_SEND_ERROR_MESSAGE =
	'Unable to generate the proposal options email. Please try again.';
const CHAT_TO_PAID_STORAGE_KEY_PREFIX = 'chat-to-paid:';
const MAX_TOTAL_SEATS = 300;
const FEATURED_ENDING_SKU_ORDER = ['bp_cb', 'bp_cb_purview'] as const;
const FEATURED_ENDING_SKU_PRIORITY = new Map<string, number>(
	FEATURED_ENDING_SKU_ORDER.map((endingSkuId, index) => [endingSkuId, index]),
);

function buildChatToPaidStorageKey(customerId: string): string {
	return `${CHAT_TO_PAID_STORAGE_KEY_PREFIX}${customerId}`;
}

export function readChatToPaidFlag(customerId: string): boolean {
	if (typeof window === 'undefined') return false;
	try {
		return (
			window.sessionStorage.getItem(buildChatToPaidStorageKey(customerId)) ===
			'yes'
		);
	} catch {
		return false;
	}
}

function writeChatToPaidFlag(customerId: string, value: boolean): void {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(
			buildChatToPaidStorageKey(customerId),
			value ? 'yes' : 'no',
		);
	} catch {
		// sessionStorage may be unavailable (private mode); toggle simply won't
		// persist and the proposal falls back to the default Copilot overview.
	}
}

function clampPrice(value: number): number {
	if (!Number.isFinite(value)) return 0;
	const normalized = Math.max(0, value);
	return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function roundMoney(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function orderFeaturedScenarioCards(cards: EndingSku[]): EndingSku[] {
	return [...cards].sort((a, b) => {
		const aPriority = FEATURED_ENDING_SKU_PRIORITY.get(a.id) ?? Infinity;
		const bPriority = FEATURED_ENDING_SKU_PRIORITY.get(b.id) ?? Infinity;

		if (aPriority === bPriority) return 0;
		return aPriority < bPriority ? -1 : 1;
	});
}

function toStartingSkuId(value: string): StartingSkuId | null {
	switch (value) {
		case 'bb':
		case 'bs':
		case 'bp':
		case 'other':
			return value;
		default:
			return null;
	}
}

function triggerFileDownload(url: string): void {
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.target = '_blank';
	anchor.rel = 'noopener noreferrer';
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
}

export interface ProposalPageContentProps {
	customerId: string;
	customerName: string;
	/**
	 * The org's saved partner profile (or the canned demo profile on demo
	 * surfaces). Replaces the per-proposal partner-fact questions: partner
	 * type, designations, and Copilot Jumpstart come from here, and MCI
	 * engagement eligibility is derived from it.
	 */
	partnerProfile: PartnerProfile;
	subscriptions: OpportunitySubscription[];
	backHref: string;
	assetsBasePath: string;
	isNewCustomer?: boolean;
	isReseller?: boolean;
	showTpid?: boolean;
	showPartnerActions?: boolean;
	usePublicEmailApi?: boolean;
	loading?: boolean;
	/**
	 * When true, render the currency switcher above the scenario cards and
	 * apply the USD-base lock + reset-on-change behaviour. Currently only
	 * enabled on the csp-partners demo page.
	 */
	showCurrencySwitcher?: boolean;
	/**
	 * When true, on mount (and on customerId change) reset the currency to the
	 * customer's region-derived currency, overwriting any previously persisted
	 * cookie. The user can still change currency from the switcher afterwards.
	 */
	resetCurrencyToRegionOnMount?: boolean;
}

export function ProposalPageContent({
	customerId,
	customerName,
	partnerProfile,
	subscriptions,
	backHref,
	assetsBasePath,
	isNewCustomer = false,
	isReseller = false,
	showTpid = true,
	showPartnerActions = true,
	usePublicEmailApi = false,
	loading = false,
	showCurrencySwitcher = false,
	resetCurrencyToRegionOnMount = false,
}: ProposalPageContentProps) {
	const t = useTranslations();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { currency, setCurrency, setLock } = useCurrency();
	const regionResetCustomerIdRef = useRef<string | null>(null);
	const [userChangedCurrencyOnPage, setUserChangedCurrencyOnPage] =
		useState(false);

	// Region-derived currency for the active customer (computed each render so
	// the very first paint after subscriptions arrive can already show prices
	// in the region currency — no flash of the cookie currency).
	const regionDerivedCurrency = useMemo<Currency | null>(() => {
		if (!resetCurrencyToRegionOnMount) return null;
		if (subscriptions.length === 0) return null;
		const ctx = buildRegionalPricingContext({
			region: subscriptions[0]?.region,
		});
		return isRegionalCurrencyCode(ctx.currency)
			? (ctx.currency as Currency)
			: null;
	}, [resetCurrencyToRegionOnMount, subscriptions]);

	// Until the user explicitly picks a currency from the switcher, prefer the
	// region-derived currency over the cookie value. Once they pick, their
	// choice wins and is persisted via the cookie.
	const effectiveCurrency: Currency =
		regionDerivedCurrency && !userChangedCurrencyOnPage
			? regionDerivedCurrency
			: currency;
	const previousCurrencyRef = useRef(effectiveCurrency);

	// Reset the user-override flag when the customer changes — each new
	// proposal page entry starts again from the region-derived default.
	useEffect(() => {
		regionResetCustomerIdRef.current = null;
		setUserChangedCurrencyOnPage(false);
	}, [customerId]);

	// Currency switching is available for every customer regardless of the
	// region stored on the subscription — the conversion-rate matrix bridges
	// any pair via USD, so non-USD-base customers can also re-display prices
	// in any of the 13 supported currencies.
	useEffect(() => {
		if (!showCurrencySwitcher) return;
		setLock(false);
	}, [showCurrencySwitcher, setLock]);

	// Persist the region-derived currency into the cookie/global state once per
	// customerId. The user can still override via the switcher afterwards.
	useEffect(() => {
		if (!regionDerivedCurrency) return;
		if (regionResetCustomerIdRef.current === customerId) return;
		regionResetCustomerIdRef.current = customerId;
		if (regionDerivedCurrency !== currency) {
			setCurrency(regionDerivedCurrency, { persist: true, silent: true });
		}
	}, [customerId, regionDerivedCurrency, currency, setCurrency]);

	// Partner facts (type, designation answers, Jumpstart) come from the saved
	// partner profile; sessionStorage only contributes the per-proposal answers
	// (distributor, funded engagement, new-customer incentive). The composed
	// object keeps the historical PartnerFilters shape because ScenarioCard,
	// the email payloads, and the Assets page all consume it unchanged.
	const profileFilterFacts = useMemo(
		() => ({
			partnerType: partnerProfile.partnerType,
			hasSolutionPartnerDesignation:
				partnerProfile.hasModernWorkOrSecurityDesignation === true,
			hasOver25Points: partnerProfile.hasOver25Points === true,
			isCopilotJumpstart: partnerProfile.copilotJumpstartReady,
		}),
		[partnerProfile],
	);

	const [partnerFilters, setPartnerFilters] = useState<PartnerFilters>(() => {
		if (typeof window === 'undefined')
			return { ...DEFAULT_PARTNER_FILTERS, ...profileFilterFacts };
		try {
			const stored = window.sessionStorage.getItem(
				`partner-filters:${customerId}`,
			);
			if (stored) {
				const parsed = JSON.parse(stored);
				return { ...DEFAULT_PARTNER_FILTERS, ...parsed, ...profileFilterFacts };
			}
		} catch {
			/* ignore */
		}
		return { ...DEFAULT_PARTNER_FILTERS, ...profileFilterFacts };
	});

	// A profile edit mid-session (another tab, the profile page) must win over
	// whatever this page composed at mount.
	useEffect(() => {
		setPartnerFilters((prev) => ({ ...prev, ...profileFilterFacts }));
	}, [profileFilterFacts]);

	const distributorDiscount = isDistributorDiscountEligible(partnerFilters);

	const opportunities = useMemo(
		() =>
			buildCustomerOpportunities(subscriptions, {
				convertUsdToRegional: !isNewCustomer,
				currencyOverride: effectiveCurrency,
				distributorDiscount,
			}),
		[isNewCustomer, subscriptions, effectiveCurrency, distributorDiscount],
	);

	const hasRenewableOpportunities = opportunities.some(
		(o) => Math.floor(o.subscription.seatCount) > 0,
	);
	const hideOpportunityTabs = isNewCustomer || !hasRenewableOpportunities;

	const descriptors = useMemo(
		() =>
			toOpportunityDescriptorMap(opportunities, partnerProfile.erpMarginPercent),
		[opportunities, partnerProfile.erpMarginPercent],
	);

	const {
		hydrated,
		selections,
		selectedCount,
		hasSelections,
		getSelection,
		getSelectionsForOpportunity,
		selectScenario,
		deselectScenario,
		updateSeats,
		updateCurrentSkuCustomerPrice,
		updateCurrentSkuResellerPrice,
		updateTargetSkuCustomerPrice,
		updateTargetSkuResellerPrice,
		resetPricesForCurrency,
	} = useScenarioSelection({
		customerId,
		descriptors,
		currency: effectiveCurrency,
	});

	// Detect user-initiated currency changes (via CurrencySwitcher) and lock
	// the page to the cookie/state currency from that point on, so the region
	// override stops winning once the user has explicitly picked.
	useEffect(() => {
		if (!resetCurrencyToRegionOnMount) return;
		if (!regionDerivedCurrency) return;
		if (currency !== regionDerivedCurrency && !userChangedCurrencyOnPage) {
			setUserChangedCurrencyOnPage(true);
		}
	}, [
		resetCurrencyToRegionOnMount,
		regionDerivedCurrency,
		currency,
		userChangedCurrencyOnPage,
	]);

	useEffect(() => {
		if (!showCurrencySwitcher) return;
		const previous = previousCurrencyRef.current;
		if (previous === effectiveCurrency) return;
		previousCurrencyRef.current = effectiveCurrency;
		// Reset every stored input to the new currency's defaults: both reseller
		// prices re-derive from the partner-profile margin × the new currency's
		// default customer price.
		resetPricesForCurrency();
	}, [showCurrencySwitcher, effectiveCurrency, resetPricesForCurrency]);

	const selectionAllocationByKey = useMemo(() => {
		// Each selected scenario is an *alternative* — the customer picks one,
		// not a split. `originalSeats` per scenario stays at the opportunity's full
		// DB value (used for downstream template aggregations and price-per-user
		// fallbacks); the user-edited proposal seats drive `expiringArr` and all
		// current/target ARR math. Returning an empty map makes downstream lookups
		// fall back to subscription.seatCount.
		return new Map<string, ScenarioAllocation>();
	}, []);

	const selectedProposals = useMemo(() => {
		const result: {
			selectionKey: string;
			opportunityId: string;
			endingSkuId: string;
			startSkuName: string;
			endSkuName: string;
			seats: number;
			startSeats: number;
			isCopilotOffer: boolean;
		}[] = [];
		for (const selection of selections.values()) {
			const selectionKey = buildScenarioSelectionEntryKey(
				selection.opportunityId,
				selection.endingSkuId,
			);
			const opp = opportunities.find(
				(o) => o.opportunityId === selection.opportunityId,
			);
			if (!opp) continue;
			const endingSku = opp.endingSkus.find(
				(s) => s.id === selection.endingSkuId,
			);
			result.push({
				selectionKey,
				opportunityId: selection.opportunityId,
				endingSkuId: selection.endingSkuId,
				startSkuName: opp.startingSku.name,
				endSkuName: endingSku?.name ?? selection.endingSkuId,
				seats: selection.seats,
				startSeats:
					selectionAllocationByKey.get(selectionKey)?.allocatedOriginalSeats ??
					opp.subscription.seatCount,
				isCopilotOffer: endingSku?.upgradeType === 'AI',
			});
		}
		return result;
	}, [selections, opportunities, selectionAllocationByKey]);

	// Chat to Paid describes moving an existing Copilot Chat customer onto a paid
	// Copilot seat, so it only makes sense when the customer actually has a
	// subscription today. A starting SKU of 'other' means none is on record.
	const hasExistingSku = useMemo(
		() => opportunities.some((opp) => opp.startingSku.id !== 'other'),
		[opportunities],
	);
	const canBeChatToPaid = hasExistingSku;
	const hasCopilotSelection = selectedProposals.some(
		(proposal) => proposal.isCopilotOffer,
	);

	const emptyMandatoryFieldLabels = useMemo(() => {
		const labels: string[] = [];
		for (const selection of selections.values()) {
			const opp = opportunities.find(
				(o) => o.opportunityId === selection.opportunityId,
			);
			if (!opp) continue;
			const endingSku = opp.endingSkus.find(
				(s) => s.id === selection.endingSkuId,
			);
			const endSkuName = endingSku?.name ?? selection.endingSkuId;
			if (Math.floor(selection.seats) <= 0) {
				labels.push(`At least 1 seat for ${endSkuName}`);
			}
			const hasCurrentSku =
				opp.startingSku.monthlyPrice && opp.startingSku.monthlyPrice > 0;
			if (
				hasCurrentSku &&
				(!selection.currentSkuResellerPrice ||
					selection.currentSkuResellerPrice <= 0)
			) {
				labels.push(
					isReseller
						? `Buying Price for ${opp.startingSku.name}`
						: `Cost to Reseller for ${opp.startingSku.name}`,
				);
			}
			if (
				!selection.targetSkuResellerPrice ||
				selection.targetSkuResellerPrice <= 0
			) {
				labels.push(
					isReseller
						? `Buying Price for ${endSkuName}`
						: `Cost to Reseller for ${endSkuName}`,
				);
			}
		}
		return labels;
	}, [selections, opportunities, isReseller, partnerFilters]);
	const allResellerPricesValid = emptyMandatoryFieldLabels.length === 0;

	const [selectedOpportunityId, setSelectedOpportunityId] = useState<
		string | null
	>(null);
	const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>('all');
	// "Chat to Paid" proposal toggle. When Yes, the generated proposal uses the
	// Copilot "Chat to Paid" product-overview slide; persisted per-customer in
	// sessionStorage and read back on the Assets page.
	const [chatToPaidCopilotOverview, setChatToPaidCopilotOverview] =
		useState<boolean>(false);
	useEffect(() => {
		setChatToPaidCopilotOverview(readChatToPaidFlag(customerId));
	}, [customerId]);
	// The Assets page reads the flag straight back out of sessionStorage, so a
	// customer with no existing SKU has to be cleared at the source or a stale
	// "yes" would still pull in the Chat to Paid comparison slide.
	useEffect(() => {
		if (!canBeChatToPaid) {
			setChatToPaidCopilotOverview(false);
			writeChatToPaidFlag(customerId, false);
		}
	}, [canBeChatToPaid, customerId]);
	const isChatToPaid = chatToPaidCopilotOverview && canBeChatToPaid;
	// Answering "yes" commits the proposal to a Copilot story, so an all-Security
	// selection would contradict it.
	const needsCopilotSelection = isChatToPaid && !hasCopilotSelection;
	// MCI engagements now attach to individual selected SKU cards. Each
	// engagement can be attached to at most one card (paid once per customer
	// engagement); conversion bonuses require their parent engagement on the
	// same card. Persisted per customer as a versioned envelope.
	const [mciAttachments, setMciAttachments] = useState<MciEngagementAttachment[]>(
		() => {
			if (typeof window === 'undefined') return [];
			try {
				// The pre-profile questionnaire payload can't be mapped to card
				// attachments (it carried no card info) — drop it at the source.
				window.sessionStorage.removeItem(`mci-engagements:${customerId}`);
				const stored = window.sessionStorage.getItem(
					`mci-engagement-attachments:${customerId}`,
				);
				if (stored) {
					return parseMciAttachmentEnvelope(JSON.parse(stored));
				}
			} catch {
				/* ignore */
			}
			return [];
		},
	);
	// MCI engagements are only offered to partners whose profile passes the
	// designation/capability-points gate.
	const isMciEligible = isMciGateEligible(partnerProfile);
	const eligibleEngagementIds = useMemo(
		() => getEligibleMciEngagementIds(partnerProfile),
		[partnerProfile],
	);
	const [sendingPartnerEmail, setSendingPartnerEmail] = useState(false);
	const [partnerEmailError, setPartnerEmailError] = useState<string | null>(
		null,
	);
	const hasCapturedProposalStartRef = useRef(false);
	const previousSelectedCountRef = useRef(0);

	const totalSelectedSeats = useMemo(() => {
		let total = 0;
		for (const selection of selections.values()) {
			total += Math.max(0, Math.floor(selection.seats));
		}
		return total;
	}, [selections]);

	const tabParam = searchParams.get('tab');

	const activeOpportunityId = useMemo(() => {
		if (
			selectedOpportunityId &&
			opportunities.some((o) => o.opportunityId === selectedOpportunityId)
		) {
			return selectedOpportunityId;
		}

		if (tabParam) {
			const match = opportunities.find((o) => o.subscriptionId === tabParam);
			if (match) return match.opportunityId;
		}

		const today = new Date();
		const withRenewal = opportunities.filter(
			(o) =>
				o.subscription.renewalDate &&
				!Number.isNaN(new Date(o.subscription.renewalDate).getTime()),
		);
		const withoutRenewal = opportunities.filter(
			(o) =>
				!o.subscription.renewalDate ||
				Number.isNaN(new Date(o.subscription.renewalDate).getTime()),
		);
		const nearestUpcoming = withRenewal
			.filter((o) => daysUntilRenewal(o.subscription.renewalDate, today) >= 0)
			.sort((a, b) =>
				a.subscription.renewalDate.localeCompare(b.subscription.renewalDate),
			);
		const mostRecentPast = withRenewal
			.filter((o) => daysUntilRenewal(o.subscription.renewalDate, today) < 0)
			.sort((a, b) =>
				b.subscription.renewalDate.localeCompare(a.subscription.renewalDate),
			);
		return (
			nearestUpcoming[0]?.opportunityId ??
			mostRecentPast[0]?.opportunityId ??
			withoutRenewal[0]?.opportunityId ??
			null
		);
	}, [selectedOpportunityId, opportunities, tabParam]);

	const activeOpportunity = useMemo(
		() =>
			opportunities.find(
				(opportunity) => opportunity.opportunityId === activeOpportunityId,
			) ?? null,
		[opportunities, activeOpportunityId],
	);
	const assumedSeats = useMemo(() => {
		const seatRange = activeOpportunity?.subscription.seatRange;
		return seatRange ? getSeatRangeLowerBound(seatRange) : null;
	}, [activeOpportunity]);

	const mciCurrency =
		activeOpportunity?.pricingContext.currency ?? effectiveCurrency;
	const mciCurrencySymbol = activeOpportunity?.pricingContext.currencySymbol;
	const mciLocale = activeOpportunity?.pricingContext.locale;
	// Market tier (A/B/C) is bound to the source region, so it must not flip
	// with a display-currency override — hence regionCountry, not country.
	const mciRegionCountry =
		activeOpportunity?.pricingContext.regionCountry ??
		activeOpportunity?.pricingContext.country;

	// Card keys for every currently selected scenario — the attachment universe.
	const selectedCardKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const selection of selections.values()) {
			keys.add(
				buildMciAttachmentCardKey(
					selection.opportunityId,
					selection.endingSkuId,
				),
			);
		}
		return keys;
	}, [selections]);

	const sanitizeAttachments = useCallback(
		(entries: MciEngagementAttachment[]) =>
			sanitizeMciAttachments(entries, {
				eligibleIds: eligibleEngagementIds,
				selectedCardKeys,
			}),
		[eligibleEngagementIds, selectedCardKeys],
	);

	// Re-validate attachments when a card is deselected or the profile changes
	// (a mid-session profile edit can revoke eligibility). Wait for selection
	// hydration — sanitizing against an empty selection map would wipe them.
	useEffect(() => {
		if (!hydrated) return;
		setMciAttachments((prev) => {
			const next = sanitizeAttachments(prev);
			return next.length === prev.length ? prev : next;
		});
	}, [hydrated, sanitizeAttachments]);

	const toggleMciEngagement = useCallback(
		(opportunityId: string, endingSkuId: string, id: MciEngagementId) => {
			setMciAttachments((prev) => {
				const existing = prev.find((entry) => entry.engagementId === id);
				if (existing) {
					if (
						existing.opportunityId === opportunityId &&
						existing.endingSkuId === endingSkuId
					) {
						// Deselect — sanitize drops any bonus that was riding on it.
						return sanitizeAttachments(
							prev.filter((entry) => entry !== existing),
						);
					}
					// Attached to another card; the dropdown shouldn't offer it there.
					return prev;
				}
				return sanitizeAttachments([
					...prev,
					{ engagementId: id, opportunityId, endingSkuId },
				]);
			});
		},
		[sanitizeAttachments],
	);

	// Eligible engagements offerable on one card's dropdown: the card's SKU
	// categories, minus engagements attached to a different card (exclusive
	// attachment). Conversion bonuses are included only after their parent is on
	// THIS card — the dropdown renders them as a Yes/No displacement question
	// rather than a listed option.
	const getMciOptionsForCard = useCallback(
		(opportunityId: string, endingSkuId: string): MciEngagementOption[] => {
			if (!isMciEligible) return [];
			const cardKey = buildMciAttachmentCardKey(opportunityId, endingSkuId);
			const categories = getMciCategoriesForSku(endingSkuId);
			if (categories.length === 0) return [];
			const attachedHere = new Set<MciEngagementId>();
			const attachedElsewhere = new Set<MciEngagementId>();
			for (const entry of mciAttachments) {
				const entryKey = buildMciAttachmentCardKey(
					entry.opportunityId,
					entry.endingSkuId,
				);
				(entryKey === cardKey ? attachedHere : attachedElsewhere).add(
					entry.engagementId,
				);
			}
			return eligibleEngagementIds
				.filter((id) => categories.includes(MCI_ENGAGEMENTS[id].category))
				.filter((id) => !attachedElsewhere.has(id))
				.filter((id) => {
					const parent = MCI_BONUS_PARENT[id];
					return !parent || attachedHere.has(parent);
				})
				.map((id) => ({
					id,
					label: MCI_ENGAGEMENTS[id].label,
					shortLabel: MCI_ENGAGEMENTS[id].shortLabel,
					amountLabel: formatCurrency(
						getMciEngagementAmount(id, mciCurrency, mciRegionCountry),
						{
							currency: mciCurrency,
							currencySymbol: mciCurrencySymbol,
							locale: mciLocale,
						},
					),
					isBonus: Boolean(MCI_BONUS_PARENT[id]),
				}));
		},
		[
			isMciEligible,
			eligibleEngagementIds,
			mciAttachments,
			mciCurrency,
			mciCurrencySymbol,
			mciLocale,
			mciRegionCountry,
		],
	);

	// The engagements the partner has actually committed to, shaped into cards
	// for the selection bar. Distinct by construction — an engagement can only
	// be attached once.
	const selectedMciEngagements = useMemo(() => {
		if (!isMciEligible) return [];
		return mciAttachments.map((entry) => ({
			id: entry.engagementId,
			label: MCI_ENGAGEMENTS[entry.engagementId].label,
			amount: getMciEngagementAmount(
				entry.engagementId,
				mciCurrency,
				mciRegionCountry,
			),
		}));
	}, [isMciEligible, mciAttachments, mciCurrency, mciRegionCountry]);

	const hasMciEngagements = selectedMciEngagements.length > 0;

	// Remove an engagement from the selection bar — detach it from its card
	// (sanitize also drops a bonus whose parent was removed).
	const removeMciEngagement = useCallback(
		(id: MciEngagementId) => {
			setMciAttachments((prev) =>
				sanitizeAttachments(prev.filter((entry) => entry.engagementId !== id)),
			);
		},
		[sanitizeAttachments],
	);

	const renderedCards = useMemo<EndingSku[]>(() => {
		if (!activeOpportunity) return [];

		if (scenarioFilter === 'ai') {
			return orderFeaturedScenarioCards(
				activeOpportunity.endingSkus.filter(
					(endingSku) => endingSku.upgradeType === 'AI',
				),
			);
		}

		if (scenarioFilter === 'security') {
			return orderFeaturedScenarioCards(
				activeOpportunity.endingSkus.filter(
					(endingSku) => endingSku.upgradeType === 'Security',
				),
			);
		}

		return orderFeaturedScenarioCards(activeOpportunity.endingSkus);
	}, [activeOpportunity, scenarioFilter]);

	// 6-column grid so rows can mix two wide cards (span 3) with three regular
	// cards (span 2). The featured bundles (bp_cb, bp_cb_purview) always form
	// their own first row of two; the rest flow in rows of three, except a
	// would-be orphan single card collapses the last two rows into 2+2
	// (5 cards → 2-3, 6 → 2-2-2, 7 → 2-3-2).
	const cardsContainerClassName = 'grid gap-4 lg:grid-cols-6';
	const cardSpanClasses = useMemo(() => {
		const classes: string[] = [];
		const pushRow = (rowLength: number) => {
			const span = rowLength <= 2 ? 'lg:col-span-3' : 'lg:col-span-2';
			for (let i = 0; i < rowLength; i++) classes.push(span);
		};
		// orderFeaturedScenarioCards sorts featured bundles to the front, so the
		// featured cards are always a prefix of renderedCards.
		const featuredCount = renderedCards.filter((card) =>
			FEATURED_ENDING_SKU_PRIORITY.has(card.id),
		).length;
		if (featuredCount > 0) pushRow(featuredCount);
		let remaining = renderedCards.length - featuredCount;
		while (remaining > 0) {
			const rowLength = remaining === 4 ? 2 : Math.min(3, remaining);
			pushRow(rowLength);
			remaining -= rowLength;
		}
		return classes;
	}, [renderedCards]);
	// Demo hrefs are locale-prefixed (/csp-partners/<locale>/demo/...), so match
	// the /demo segment anywhere in the path, not just at the start.
	const isDemoSurface = /\/demo(\/|$)/.test(backHref) || /\/demo(\/|$)/.test(assetsBasePath);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.sessionStorage.setItem(
			`partner-filters:${customerId}`,
			JSON.stringify(partnerFilters),
		);
	}, [customerId, partnerFilters]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.sessionStorage.setItem(
			`mci-engagement-attachments:${customerId}`,
			JSON.stringify(serializeMciAttachments(mciAttachments)),
		);
	}, [customerId, mciAttachments]);

	useEffect(() => {
		setPartnerEmailError(null);
	}, [activeOpportunityId, scenarioFilter]);

	useEffect(() => {
		if (!activeOpportunity || hasCapturedProposalStartRef.current) {
			return;
		}

		hasCapturedProposalStartRef.current = true;
		captureProposalStarted({
			entrySurface: isNewCustomer
				? 'new-customer-proposal'
				: usePublicEmailApi
					? 'public-proposal'
					: 'proposal-page',
			customerId,
			fromViewMode: isNewCustomer ? 'new-customer' : 'customer',
			selectedScenarioCount: selectedCount,
			isDemo: isDemoSurface,
			isPublic: usePublicEmailApi,
		});
	}, [
		activeOpportunity,
		customerId,
		isDemoSurface,
		isNewCustomer,
		selectedCount,
		usePublicEmailApi,
	]);

	useEffect(() => {
		if (
			selectedCount <= 0 ||
			selectedCount === previousSelectedCountRef.current
		) {
			previousSelectedCountRef.current = selectedCount;
			return;
		}

		captureProposalScenariosSelected({
			customerId,
			selectedScenarioCount: selectedCount,
			upgradeTypes: Array.from(
				new Set(
					selectedProposals
						.map(
							(proposal) =>
								opportunities
									.find(
										(opportunity) =>
											opportunity.opportunityId === proposal.opportunityId,
									)
									?.endingSkus.find((sku) => sku.id === proposal.endingSkuId)
									?.upgradeType,
						)
						.filter((upgradeType) => upgradeType !== undefined),
				),
			),
			isDemo: isDemoSurface,
			isPublic: usePublicEmailApi,
		});
		previousSelectedCountRef.current = selectedCount;
	}, [
		customerId,
		isDemoSurface,
		opportunities,
		selectedCount,
		selectedProposals,
		usePublicEmailApi,
	]);

	const handleSendProposalOptions = useCallback(async () => {
		setPartnerEmailError(null);

		if (!activeOpportunity) {
			setPartnerEmailError('No active opportunity is selected.');
			return;
		}

		const startingSkuId = toStartingSkuId(activeOpportunity.startingSku.id);
		if (!startingSkuId) {
			setPartnerEmailError(
				'The selected starting SKU is not supported for proposal options.',
			);
			return;
		}

		const renderedEndingSkuIds = renderedCards.map((sku) => sku.id);
		const renderedEndingSkuIdSet = new Set(renderedEndingSkuIds);
		const selectedScenariosForOpportunity = getSelectionsForOpportunity(
			activeOpportunity.opportunityId,
		)
			.filter((selection) => renderedEndingSkuIdSet.has(selection.endingSkuId))
			.map((selection) => {
				const selectionKey = buildScenarioSelectionEntryKey(
					selection.opportunityId,
					selection.endingSkuId,
				);
				const allocation = selectionAllocationByKey.get(selectionKey);
				const endingSku = activeOpportunity.endingSkus.find(
					(candidate) => candidate.id === selection.endingSkuId,
				);
				const currentSkuCustomerPrice = clampPrice(
					selection.currentSkuCustomerPrice ??
						selection.expiringSkuRenewalPrice ??
						activeOpportunity.startingSku.monthlyPrice,
				);
				const currentSkuResellerPrice = clampPrice(
					selection.currentSkuResellerPrice ??
						deriveResellerPriceFromMargin({
							customerPrice: currentSkuCustomerPrice,
							marginPercent: partnerProfile.erpMarginPercent,
						}),
				);
				const targetMonthlyPrices = endingSku
					? resolveScenarioTargetMonthlyPrices({
							startingSku: activeOpportunity.startingSku,
							endingSku,
							currentSkuCustomerPrice,
						})
					: { promoPrice: 0 };
				const targetSkuCustomerPrice = clampPrice(
					selection.targetSkuCustomerPrice ??
						selection.targetSkuPrice ??
						targetMonthlyPrices.promoPrice,
				);
				const targetSkuResellerPrice = clampPrice(
					selection.targetSkuResellerPrice ??
						deriveResellerPriceFromMargin({
							customerPrice: targetSkuCustomerPrice,
							marginPercent: getTargetSkuMarginPercent(
								selection.endingSkuId,
								partnerProfile.erpMarginPercent,
							),
						}),
				);

				const originalSeats =
					allocation?.allocatedOriginalSeats ??
					activeOpportunity.subscription.seatCount;

				const proposedSeats = Math.max(0, Math.floor(selection.seats));
				return {
					opportunityId: selection.opportunityId,
					endingSkuId: selection.endingSkuId,
					selectedSeats: proposedSeats,
					originalSeats,
					// Current investment scales with the user-edited proposal seats so
					// current and target legs of the scenario move together.
					expiringArr: roundMoney(
						annualizeMonthlyPrice(currentSkuCustomerPrice, proposedSeats),
					),
					currentSkuCustomerPrice,
					currentSkuResellerPrice,
					targetSkuCustomerPrice,
					targetSkuResellerPrice,
					expiringSkuRenewalPrice: currentSkuCustomerPrice,
					targetSkuPrice: targetSkuCustomerPrice,
				};
			});
		const selectedEndingSkuIds =
			selectedScenariosForOpportunity.length > 0
				? selectedScenariosForOpportunity.map(
						(scenario) => scenario.endingSkuId,
					)
				: renderedEndingSkuIds;
		if (selectedEndingSkuIds.length === 0) {
			setPartnerEmailError(
				'No upgrade options are available for the selected filter.',
			);
			return;
		}

		// Each scenario is an alternative for the same opportunity — they all
		// carry the full DB seat count and full current investment. Don't sum
		// across scenarios (would multiply by the number of alternatives);
		// take the single opportunity-level baseline directly.
		const firstScenario = selectedScenariosForOpportunity[0];
		const aggregatedOriginalSeats = firstScenario
			? firstScenario.originalSeats
			: Math.max(0, Math.floor(activeOpportunity.subscription.seatCount));
		const aggregatedExpiringArr = firstScenario
			? firstScenario.expiringArr
			: roundMoney(
					annualizeMonthlyPrice(
						activeOpportunity.startingSku.monthlyPrice,
						activeOpportunity.subscription.seatCount,
					),
				);

		setSendingPartnerEmail(true);

		try {
			let screenshot: Blob | null = null;
			try {
				screenshot = await captureElementByIdAsPngBlob(SCENARIO_CARDS_ROW_ID);
			} catch (error) {
				console.warn(
					'Unable to capture scenario screenshot; proceeding without it.',
					error,
				);
			}

			const isOtherStartingSku = startingSkuId === 'other';
			const requestPayload = {
				journey: isOtherStartingSku
					? ('new_customer' as ProposalOptionsJourney)
					: ('renewal' as ProposalOptionsJourney),
				filter: scenarioFilter,
				customerId,
				customerName,
				opportunityId: activeOpportunity.opportunityId,
				startingSkuId,
				startingSkuName: activeOpportunity.startingSku.name,
				region: activeOpportunity.subscription.region,
				currency: effectiveCurrency,
				seats: aggregatedOriginalSeats,
				expiringArr: aggregatedExpiringArr,
				renewalDate: isNewCustomer
					? null
					: activeOpportunity.subscription.renewalDate,
				selectedEndingSkuIds,
				selectedScenarios:
					selectedScenariosForOpportunity.length > 0
						? selectedScenariosForOpportunity
						: undefined,
				partnerFilters: {
					partnerType: partnerFilters.partnerType,
					hasSolutionPartnerDesignation:
						partnerFilters.hasSolutionPartnerDesignation,
					hasOver25Points: partnerFilters.hasOver25Points,
					isNewCustomerIncentive: partnerFilters.isNewCustomerIncentive,
					distributor: partnerFilters.distributor,
					erpMarginPercent: partnerProfile.erpMarginPercent,
				},
			};

			const emailLinkFn = usePublicEmailApi
				? createProposalOptionsEmailLinkPublic
				: createProposalOptionsEmailLink;
			const response = await emailLinkFn({
				payload: requestPayload,
				...(screenshot ? { screenshot } : {}),
			});
			captureProposalEmailLinkRequested({
				linkType: 'proposal-options',
				customerId,
				scenarioCount: selectedScenariosForOpportunity.length,
				filter: scenarioFilter,
				isDemo: isDemoSurface,
				isPublic: usePublicEmailApi,
			});

			triggerFileDownload(response.url);
		} catch (error) {
			setPartnerEmailError(
				error instanceof Error && error.message.trim().length > 0
					? error.message
					: DEFAULT_SEND_ERROR_MESSAGE,
			);
		} finally {
			setSendingPartnerEmail(false);
		}
	}, [
		activeOpportunity,
		customerId,
		customerName,
		effectiveCurrency,
		getSelectionsForOpportunity,
		isNewCustomer,
		partnerFilters,
		partnerProfile.erpMarginPercent,
		renderedCards,
		scenarioFilter,
		selectionAllocationByKey,
		usePublicEmailApi,
	]);

	// Build the assets navigation URL, forwarding ?from if present
	const from = searchParams.get('from');
	const assetsUrl = from
		? `${assetsBasePath}${assetsBasePath.includes('?') ? '&' : '?'}from=${from}`
		: assetsBasePath;

	if (!loading && opportunities.length === 0) {
		return (
			<div className="mx-auto flex flex-1 max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
				<h2 className="m-0 font-ds-display text-(length:--ds-heading-m-font-size) font-(--ds-heading-m-font-weight) leading-(--ds-heading-m-line-height) tracking-(--ds-heading-m-letter-spacing)">
					No eligible upgrade opportunities
				</h2>
				<p className="mb-4 text-lg leading-7 text-gray-500">
					<span className="font-semibold">{customerName}</span> has
					subscriptions, but none map to supported starting SKUs for proposal
					generation.
				</p>
				<Button
					appearance="primary"
					icon={<ArrowLeftRegular className="size-5 mr-1" />}
					size="large"
					onClick={() => router.push(backHref)}
				>
					Back to Dashboard
				</Button>
			</div>
		);
	}

	return (
		<div className="app-shell-content-wrap relative min-h-screen pb-36">
			<ProposalSteps isNewCustomer={isNewCustomer} />
			<CustomerHeader
				customerName={customerName}
				tpid={showTpid && !isNewCustomer ? customerId : undefined}
				backHref={backHref}
				loading={loading}
			/>

			<div
				className="p-4 mb-6 rounded-xl bg-cover bg-center"
				style={{
					backgroundImage: `url('${getThemeConfig().assets.proposalScenariosBackground}')`,
				}}
			>
				{!loading && (
					<PartnerProfileEligibilityBanner
						profile={partnerProfile}
						profileBasePath={
							isDemoSurface ? '/demo/partner-profile' : '/partner-profile'
						}
						className="mb-4"
					/>
				)}

				{searchParams.get('reason') === 'missing-selections' && (
					<div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-100 mt-4 px-4 py-3 font-ds-text text-sm text-yellow-600">
						No valid proposal selections were found. Choose at least one
						proposal before opening assets.
					</div>
				)}

				<div className="bg-white rounded-xl px-6 py-4">
					<div className="pb-4 border-b border-gray-200">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div data-testid="opportunity-panel" className="">
								<h2 className="m-0 flex items-baseline gap-2 px-2 font-ds-display text-xl font-semibold text-gray-900">
									<ProposalSectionStepLabel stepNumber={1} />
									<span>{t('table.subscriptions')}</span>
								</h2>
							</div>
							<div
								aria-label={t('proposal.subscriptionFilter')}
								className="flex items-center gap-4 overflow-hidden"
							>
								<Button
									type="button"
									size="medium"
									style={{
										padding: '6px 12px',
									}}
									data-testid="filter-ai-attach"
									aria-pressed={scenarioFilter === 'ai'}
									onClick={() => setScenarioFilter('ai')}
									appearance={scenarioFilter === 'ai' ? 'primary' : 'outline'}
									className={`${scenarioFilter === 'ai' ? 'bg-black! text-white' : 'text-gray-700! hover:text-foreground!'}`}
								>
									{t('proposal.aiAttach')}
								</Button>
								<Button
									type="button"
									size="medium"
									data-testid="filter-security-upsell"
									aria-pressed={scenarioFilter === 'security'}
									onClick={() => setScenarioFilter('security')}
									appearance={
										scenarioFilter === 'security' ? 'primary' : 'outline'
									}
									className={`${scenarioFilter === 'security' ? 'bg-black! text-white' : 'text-gray-700! hover:text-foreground!'}`}
								>
									{t('proposal.securityOption')}
								</Button>
								<Button
									type="button"
									size="medium"
									data-testid="filter-all-options"
									aria-pressed={scenarioFilter === 'all'}
									onClick={() => setScenarioFilter('all')}
									appearance={scenarioFilter === 'all' ? 'primary' : 'outline'}
									className={`${scenarioFilter === 'all' ? 'bg-black! text-white' : 'text-gray-700! hover:text-foreground!'}`}
								>
									{t('proposal.allOptions')}
								</Button>
							</div>
						</div>
					</div>

					<div
						data-testid="proposal-background"
						className="grid grid-cols-12 mt-4"
					>
						{!hideOpportunityTabs && (
							<aside className="col-span-3 h-full self-start pr-2 border-r border-gray-200">
								{loading ? (
									<div className="flex flex-col gap-2">
										{Array.from({ length: 3 }, (_, i) => (
											<div
												key={i}
												className="h-16 w-full animate-pulse rounded-lg bg-gray-200"
											/>
										))}
									</div>
								) : (
									<div className="sticky top-16">
										<OpportunityTabs
											opportunities={opportunities}
											activeOpportunityId={activeOpportunityId}
											onChange={setSelectedOpportunityId}
										/>
									</div>
								)}
							</aside>
						)}
						<div
							className={`${hideOpportunityTabs ? 'col-span-12' : 'col-span-9'} ml-4`}
						>
							<div className="mb-4 border-b border-gray-200 pb-4">
								<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
									<div className="flex flex-col w-full gap-1">
										<div className="flex w-full justify-between items-center gap-2">
											<p className="font-ds-text text-base font-medium">
												2. Select one or more options to generate the proactive
												proposal
											</p>
											{canBeChatToPaid && (
												<div className="flex items-center gap-2">
													<label
														htmlFor="chat-to-paid-select"
														className="ml-auto font-ds-text text-sm font-medium"
													>
														Is this a Chat to Paid Opportunity?
													</label>
													<Dropdown
														id="chat-to-paid-select"
														size="small"
														style={{ minWidth: 60, width: 60, borderRadius: 6 }}
														selectedOptions={[isChatToPaid ? 'yes' : 'no']}
														value={isChatToPaid ? 'Yes' : 'No'}
														onOptionSelect={(_event, data) => {
															const next = data.optionValue === 'yes';
															setChatToPaidCopilotOverview(next);
															writeChatToPaidFlag(customerId, next);
														}}
													>
														<Option value="no">No</Option>
														<Option value="yes">Yes</Option>
													</Dropdown>
												</div>
											)}
										</div>
										{assumedSeats !== null ? (
											<p className="font-ds-text text-xs text-gray-600">
												Assumed {assumedSeats} seats. Select an option to change
												the number of seats.
											</p>
										) : null}
									</div>
								</div>
								<p className="mt-3 mb-0 p-2 font-ds-text text-xs italic bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
									{t('proposal.disclaimer')}
								</p>
								<p className="mt-2 mb-0 p-2 font-ds-text text-xs italic bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
									{t('proposal.termLengthNote')}
								</p>
							</div>
							{showCurrencySwitcher && (
								<div className="mb-3 flex items-center justify-end gap-3">
									<CurrencySwitcher variant="light" />
								</div>
							)}
							<div
								id={SCENARIO_CARDS_ROW_ID}
								data-testid="scenario-cards-row"
								className={cardsContainerClassName}
							>
								{loading
									? Array.from({ length: 3 }, (_, i) => (
											<div key={i} className="lg:col-span-2">
												<ScenarioCardSkeleton />
											</div>
										))
									: activeOpportunity &&
										renderedCards.map((endingSku, cardIndex) => {
											const selection = getSelection(
												activeOpportunity.opportunityId,
												endingSku.id,
											);
											const isSelected = Boolean(selection);
											const seats = isSelected
												? (selection?.seats ??
													activeOpportunity.subscription.seatCount)
												: activeOpportunity.subscription.seatCount;
											const currentSkuCustomerPrice = clampPrice(
												selection?.currentSkuCustomerPrice ??
													selection?.expiringSkuRenewalPrice ??
													activeOpportunity.startingSku.monthlyPrice,
											);
											const currentSkuResellerPrice = clampPrice(
												selection?.currentSkuResellerPrice ??
													deriveResellerPriceFromMargin({
														customerPrice: currentSkuCustomerPrice,
														marginPercent: partnerProfile.erpMarginPercent,
													}),
											);
											const targetMonthlyPrices =
												resolveScenarioTargetMonthlyPrices({
													startingSku: activeOpportunity.startingSku,
													endingSku,
													currentSkuCustomerPrice,
												});
											const targetSkuCustomerPrice = clampPrice(
												selection?.targetSkuCustomerPrice ??
													selection?.targetSkuPrice ??
													targetMonthlyPrices.promoPrice,
											);
											const targetSkuResellerPrice = clampPrice(
												selection?.targetSkuResellerPrice ??
													deriveResellerPriceFromMargin({
														customerPrice: targetSkuCustomerPrice,
														marginPercent: getTargetSkuMarginPercent(
															endingSku.id,
															partnerProfile.erpMarginPercent,
														),
													}),
											);

											const dbCurrentSeats = Math.max(
												0,
												Math.floor(activeOpportunity.subscription.seatCount),
											);
											const proposal = calculateScenarioFromExplicitPrices(
												activeOpportunity.startingSku,
												endingSku,
												seats,
												{
													currentSkuCustomerPrice,
													currentSkuResellerPrice,
													targetSkuCustomerPrice,
													targetSkuResellerPrice,
												},
												{
													journey:
														activeOpportunity.startingSku.id === 'other'
															? 'new_customer'
															: 'renewal',
													region: activeOpportunity.subscription.region,
													country: activeOpportunity.pricingContext.country,
													partnerType: partnerFilters.partnerType,
													// When a qualifying distributor is selected, base incentives
													// on the same discounted promo price the customer sees (margin
													// already reflects it via targetSkuCustomerPrice).
													distributorDiscount,
													// Unified seat policy: current and target legs both use the
													// user-edited proposal seats so the entire scenario scales
													// with the seats input (including the displayed expiring
													// renewal cost = scenario.currentAnnualValue).
													currentSeats: seats,
													erpMarginPercent: partnerProfile.erpMarginPercent,
												},
											);

											const currentForCard = Math.max(
												0,
												Math.floor(selection?.seats ?? 0),
											);
											const otherSelectionsTotal =
												totalSelectedSeats - (isSelected ? currentForCard : 0);
											const maxAllowedSeats = Math.max(
												0,
												MAX_TOTAL_SEATS - otherSelectionsTotal,
											);
											const scenarioKey = buildScenarioSelectionEntryKey(
												activeOpportunity.opportunityId,
												endingSku.id,
											);
											const cardKey = buildMciAttachmentCardKey(
												activeOpportunity.opportunityId,
												endingSku.id,
											);
											const mciEngagementOptions = isSelected
												? getMciOptionsForCard(
														activeOpportunity.opportunityId,
														endingSku.id,
													)
												: [];
											const attachedMciEngagementIds = mciAttachments
												.filter(
													(entry) =>
														buildMciAttachmentCardKey(
															entry.opportunityId,
															entry.endingSkuId,
														) === cardKey,
												)
												.map((entry) => entry.engagementId);

											return (
												<div
													key={scenarioKey}
													className={
														cardSpanClasses[cardIndex] ?? 'lg:col-span-2'
													}
												>
													<ScenarioCard
														opportunity={activeOpportunity}
														endingSku={endingSku}
														scenario={proposal}
														partnerFilters={partnerFilters}
														currentSkuCustomerPrice={currentSkuCustomerPrice}
														currentSkuResellerPrice={currentSkuResellerPrice}
														targetSkuCustomerPrice={targetSkuCustomerPrice}
														targetSkuResellerPrice={targetSkuResellerPrice}
														isSelected={isSelected}
														selectedSeats={seats}
														currentSeats={dbCurrentSeats}
														maxAllowedSeats={maxAllowedSeats}
														seatLimitTotal={MAX_TOTAL_SEATS}
														isNewCustomer={isNewCustomer}
														isReseller={isReseller}
														erpMarginPercent={partnerProfile.erpMarginPercent}
														mciEngagementOptions={mciEngagementOptions}
														attachedMciEngagementIds={attachedMciEngagementIds}
														onToggleMciEngagement={(engagementId) =>
															toggleMciEngagement(
																activeOpportunity.opportunityId,
																endingSku.id,
																engagementId,
															)
														}
														onToggle={() => {
															if (isSelected) {
																deselectScenario(
																	activeOpportunity.opportunityId,
																	endingSku.id,
																);
																return;
															}

															const remaining = Math.max(
																0,
																MAX_TOTAL_SEATS - totalSelectedSeats,
															);
															const isFirstSelection = selectedCount === 0;
															const baseDefault = isFirstSelection
																? Math.min(
																		Math.max(
																			0,
																			Math.floor(
																				activeOpportunity.subscription
																					.seatCount,
																			),
																		),
																		MAX_TOTAL_SEATS,
																	)
																: 0;
															const defaultSeats = Math.min(
																baseDefault,
																remaining,
															);

															selectScenario(
																activeOpportunity.opportunityId,
																activeOpportunity.startingSku.id,
																endingSku.id,
																defaultSeats,
																{
																	currentSkuCustomerPrice,
																	currentSkuResellerPrice,
																	targetSkuCustomerPrice,
																	targetSkuResellerPrice,
																},
															);
														}}
														onSeatsChange={(nextSeats) => {
															if (!isSelected) return;
															const requested = Math.max(
																0,
																Math.floor(Number(nextSeats) || 0),
															);
															const allowed = Math.max(
																0,
																MAX_TOTAL_SEATS - otherSelectionsTotal,
															);
															const clamped = Math.min(requested, allowed);
															updateSeats(
																activeOpportunity.opportunityId,
																endingSku.id,
																clamped,
															);
														}}
														onCurrentSkuResellerPriceChange={(
															nextCurrentSkuResellerPrice,
														) => {
															if (!isSelected) return;
															updateCurrentSkuResellerPrice(
																activeOpportunity.opportunityId,
																endingSku.id,
																nextCurrentSkuResellerPrice,
															);
														}}
														onCurrentSkuCustomerPriceChange={(
															nextCurrentSkuCustomerPrice,
														) => {
															if (!isSelected) return;
															updateCurrentSkuCustomerPrice(
																activeOpportunity.opportunityId,
																endingSku.id,
																nextCurrentSkuCustomerPrice,
															);
														}}
														onTargetSkuResellerPriceChange={(
															nextTargetSkuResellerPrice,
														) => {
															if (!isSelected) return;
															updateTargetSkuResellerPrice(
																activeOpportunity.opportunityId,
																endingSku.id,
																nextTargetSkuResellerPrice,
															);
														}}
														onTargetSkuCustomerPriceChange={(
															nextTargetSkuCustomerPrice,
														) => {
															if (!isSelected) return;
															updateTargetSkuCustomerPrice(
																activeOpportunity.opportunityId,
																endingSku.id,
																nextTargetSkuCustomerPrice,
															);
														}}
													/>
												</div>
											);
										})}
							</div>
							{!loading && activeOpportunity && renderedCards.length === 0 && (
								<div className="rounded-lg border border-[#f7d8a8] bg-[#fff8ec] px-4 py-3 font-ds-text text-sm text-[#8a5a00]">
									No upgrade options match this filter for the selected
									opportunity.
								</div>
							)}
							{(() => {
								const productName =
									activeOpportunity?.subscription.currentProduct?.trim();
								const showIncentiveDisclaimer =
									!productName || productName === 'Other';
								return showIncentiveDisclaimer ? (
									<p className="mt-6 p-2 font-ds-text text-xs italic bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
										{t('proposal.incentiveCalculationDisclaimer')}
									</p>
								) : null;
							})()}
							<p className="mt-2 p-2 font-ds-text text-xs italic bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
								{effectiveCurrency === 'CAD'
									? t('proposal.quebecDisclaimerFr')
									: t('proposal.quebecDisclaimer')}
							</p>
						</div>
						<div
							className={`col-span-12 sticky bottom-2 left-0 right-0 z-30 rounded-xl mt-4 shadow-2xl transition-all duration-300 ease-in-out ${
								hasSelections || hasMciEngagements
									? 'translate-y-0 opacity-100'
									: 'translate-y-24 opacity-0 pointer-events-none'
							}`}
						>
							<div
								className="flex items-center justify-between gap-4 p-2 px-2 pr-4 bg-cover bg-bottom rounded-xl"
								style={{
									backgroundImage: `url('${getThemeConfig().assets.proposalNextStepBanner}')`,
								}}
							>
								<div className="grid grid-cols-3 items-center gap-2">
									{selectedProposals.map((p, i) => (
										<div
											key={p.selectionKey}
											className={`flex items-center gap-2`}
										>
											{i % 3 !== 0 && (
												<AddRegular className="size-6 text-white" />
											)}
											<div
												className="relative flex flex-col rounded-lg bg-white/20 border border-white/30 px-3 pr-8 py-2 cursor-pointer w-full"
												onClick={() =>
													setSelectedOpportunityId(p.opportunityId)
												}
											>
												<span
													className={`text-sm mb-1 leading-tight text-white ${getThemeConfig().typography.cardDescription.includes('medium') ? 'font-medium' : 'font-semibold'}`}
												>
													{p.endSkuName}
													<span className="mx-1">·</span>
													<span className="ml-0">{p.seats} seats</span>
												</span>
												<span
													className={`text-xs text-white/80 ${getThemeConfig().typography.cardDescription.includes('medium') ? 'font-normal' : 'font-medium'}`}
												>
													From: {p.startSkuName}
												</span>
												<Button
													appearance="transparent"
													icon={
														<Dismiss20Regular className="size-3 text-white" />
													}
													onClick={(e) => {
														e.stopPropagation();
														deselectScenario(p.opportunityId, p.endingSkuId);
													}}
													aria-label={`Remove ${p.endSkuName}`}
													size="small"
													className="absolute top-2 right-2 bg-white/30! rounded-full!"
													style={{ color: '', minWidth: 'auto' }}
												/>
											</div>
										</div>
									))}
									{selectedMciEngagements.map((engagement) => (
										<div
											key={engagement.id}
											className="flex items-center gap-2"
										>
											<div className="relative flex flex-col rounded-lg bg-white/20 border border-white/30 px-3 pr-8 py-2 w-full">
												<span
													className={`text-sm mb-1 leading-tight text-white line-clamp-2 ${getThemeConfig().typography.cardDescription.includes('medium') ? 'font-medium' : 'font-semibold'}`}
												>
													{engagement.label}
												</span>
												<span
													className={`text-xs text-white/80 ${getThemeConfig().typography.cardDescription.includes('medium') ? 'font-normal' : 'font-medium'}`}
												>
													MCI incentive:{' '}
													{formatCurrency(engagement.amount, {
														currency: mciCurrency,
														currencySymbol: mciCurrencySymbol,
														locale: mciLocale,
													})}
												</span>
												<Button
													appearance="transparent"
													icon={
														<Dismiss20Regular className="size-3 text-white" />
													}
													onClick={(e) => {
														e.stopPropagation();
														removeMciEngagement(engagement.id);
													}}
													aria-label={`Remove ${engagement.label}`}
													size="small"
													className="absolute top-2 right-2 bg-white/30! rounded-full!"
													style={{ color: '', minWidth: 'auto' }}
												/>
											</div>
										</div>
									))}
									{selectedCount === 0 && !hasMciEngagements && (
										<p className="m-0 font-ds-text text-sm text-gray-500">
											No proposals selected
										</p>
									)}
								</div>
								{(() => {
									const isGenerateProposalDisabled =
										!hydrated ||
										(!hasSelections && !hasMciEngagements) ||
										!allResellerPricesValid ||
										needsCopilotSelection;
									const generateProposalLabel = t('proposal.generateProposal');
									const generateProposalAccessibleLabel =
										generateProposalLabel.replace(/\s+/g, ' ');
									const generateProposalButton = (
										<Button
											aria-label={generateProposalAccessibleLabel}
											appearance="primary"
											size="medium"
											className={
												getThemeConfig().styles.heroButtonClass || 'bg-black!'
											}
											style={{
												padding: '10px 16px',
												minWidth: '200px',
											}}
											icon={<ArrowRightRegular className="size-5" />}
											iconPosition="after"
											disabled={isGenerateProposalDisabled}
											onClick={() => {
												captureProposalAssetsRequested({
													customerId,
													scenarioCount: selectedCount,
													isDemo: isDemoSurface,
													isPublic: usePublicEmailApi,
												});
												router.push(assetsUrl);
											}}
										>
											<span className="inline-block whitespace-pre-line text-center leading-tight">
												{generateProposalLabel}
											</span>
										</Button>
									);
									const tooltipContent = needsCopilotSelection ? (
										'This is marked as a Chat to Paid opportunity, so please select at least one Copilot option — or set Chat to Paid to No.'
									) : emptyMandatoryFieldLabels.length > 0 ? (
										<div className="flex flex-col gap-1 text-xs">
											<span className="font-semibold">
												Please fill the mandatory inputs:
											</span>
											<ul className="m-0 list-disc pl-4">
												{emptyMandatoryFieldLabels.map((label, idx) => (
													<li key={`${label}-${idx}`}>{label}</li>
												))}
											</ul>
										</div>
									) : (
										'Please fill the mandatory inputs'
									);
									return isGenerateProposalDisabled ? (
										<Tooltip
											content={tooltipContent}
											relationship="label"
											withArrow
										>
											<span className="inline-block">
												{generateProposalButton}
											</span>
										</Tooltip>
									) : (
										generateProposalButton
									);
								})()}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

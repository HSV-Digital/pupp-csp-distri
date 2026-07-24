'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Spinner, Tooltip } from '@fluentui/react-components';
import {
	ArrowDownloadRegular,
	BookOpenRegular,
	ChannelShare24Regular,
	ChevronDownRegular,
	ChevronRightRegular,
	Circle12Filled,
	DocumentOnePage32Regular,
	FolderZipRegular,
	LinkRegular,
	MailRegular,
	SlideLayout20Regular,
	SlideText32Regular,
} from '@fluentui/react-icons';
import { OpenRegular } from '@fluentui/react-icons';
import { type CreateCustomerProposalEmailLinkRequest } from '@/lib/customer-proposal-email-link';
import {
	createPartnerProposalEmailLink,
	createPartnerProposalEmailLinkPublic,
} from '@/lib/partner-proposal-email-link';
import {
	captureDownloadIntentClicked,
	captureProposalEmailLinkRequested,
} from '@/lib/posthog-product-events';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const SALES_ENABLEMENT_PDF_BASE_URL =
	'https://agentbprodstorage.blob.core.windows.net/pdf-exports/sales-enablement';

const SALES_ENABLEMENT_PDFS: Record<
	string,
	{ label: string; fileName: string }
> = {
	bb_cb: {
		label: 'Copilot Business + Business Basic',
		fileName: 'Microsoft 365 Copilot Business + Business Basic (1).pdf',
	},
	bs_cb: {
		label: 'Copilot Business + Business Standard',
		fileName: 'Copilot Business + Business Standard.pdf',
	},
	bp_cb: {
		label: 'Copilot Business + Business Premium',
		fileName: 'Copilot Business + Business Premium.pdf',
	},
	bp_cb_purview: {
		label: 'Copilot Business + Business Premium + Purview',
		fileName:
			'Copilot Business + Business Premium + Purview Suite for Business Premium.pdf',
	},
	bp_defender: {
		label: 'Business Premium + Defender',
		fileName: 'Business Premium + Defender Suite for Business Premium.pdf',
	},
	bp_purview: {
		label: 'Business Premium + Purview',
		fileName: 'Business Premium + Purview Suite for Business Premium.pdf',
	},
	bp_defender_purview: {
		label: 'Business Premium + Defender + Purview',
		fileName:
			'Business Premium + Defender Suite for Business Premium + Purview Suite for Business Premium.pdf',
	},
};

interface ExternalLink {
	label: string;
	url: string;
}

interface GtmResourceLink extends ExternalLink {
	icon: React.ReactNode;
	assetType: string;
	subtitle?: string;
}

interface GtmResourceCategory {
	id: 'copilot-business' | 'purview' | 'defender';
	label: string;
	resources: GtmResourceLink[];
}

const COPILOT_GTM_KIT: GtmResourceLink = {
	label: 'GTM Kit',
	url: 'https://microsoftpartners.microsoft.com/downloads?filename=abs/protected/M365-Business-with-Copilot-Partner-Launch-Kit.zip',
	icon: <FolderZipRegular className="size-4 text-(--ds-color-violet-500)" />,
	assetType: 'zip',
};

const COPILOT_BUSINESS_LINKS: GtmResourceLink[] = [
	{
		label: 'Business Case Builder',
		url: 'https://bcbv2.transform.microsoft.com/',
		icon: <LinkRegular className="size-4 text-indigo-600" />,
		assetType: 'external-link',
	},
	{
		label: 'Copilot and Chat envisioning tool',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=abs/protected/Copilot-Chat-Value-Envisioning-Tool.xlsx',
		icon: <DocumentOnePage32Regular className="size-4 text-indigo-600" />,
		assetType: 'xlsx',
	},
];

const GTM_KIT_CONTENTS: Array<{
	label: string;
	icon: React.ReactNode;
}> = [
	{
		label: 'Customer pitch deck',
		icon: <SlideText32Regular className="size-4 text-red-500" />,
	},
	{
		label: 'Promotion one-sliders',
		icon: <SlideLayout20Regular className="size-4 text-purple-500" />,
	},
	{
		label: 'To-customer flyers',
		icon: <DocumentOnePage32Regular className="size-4 text-indigo-600" />,
	},
	{
		label: 'To-customer e-mails',
		icon: <MailRegular className="size-4 text-yellow-600" />,
	},
];

const COPILOT_BUSINESS_MORE_LINKS: GtmResourceLink[] = [
	{
		label: 'Building Agents with Microsoft Pitch deck',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=abs/unprotected/Building-Agents-with-MS-pitch-deck.pptx',
		icon: <SlideText32Regular className="size-4 text-red-500" />,
		assetType: 'pptx',
	},
	{
		label: 'Cowork Partner GTM Launch kit',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=%2Fabs%2Fprotected%2FCowork-partner-launch-kit.zip',
		icon: <FolderZipRegular className="size-4 text-(--ds-color-violet-500)" />,
		assetType: 'zip',
	},
	{
		label: 'Copilot agent immersion experience',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=abs%2Fprotected%2FCopilot-Agents-Immersion-Experience-Kit.zip',
		icon: <FolderZipRegular className="size-4 text-(--ds-color-violet-500)" />,
		assetType: 'zip',
	},
];

const SECURITY_GTM_OFFERS_URL =
	'https://microsoftpartners.microsoft.com/Microsoft-Security-Partners/sell-through-csp/#offers';

const SECURITY_COMMON_GTM_LINKS: GtmResourceLink[] = [
	{
		label: 'Customer Pitch Deck',
		url: SECURITY_GTM_OFFERS_URL,
		icon: <SlideText32Regular className="size-4 text-red-500" />,
		assetType: 'pptx',
	},
	{
		label: 'Offering Flyer',
		url: SECURITY_GTM_OFFERS_URL,
		icon: <DocumentOnePage32Regular className="size-4 text-indigo-600" />,
		assetType: 'flyer',
	},
	{
		label: 'Partner Opportunity Deck',
		url: SECURITY_GTM_OFFERS_URL,
		icon: <SlideText32Regular className="size-4 text-red-500" />,
		assetType: 'pptx',
	},
];

const DEFENDER_GTM_RESOURCES: GtmResourceLink[] = [
	...SECURITY_COMMON_GTM_LINKS,
	{
		label: 'Elevate security and compliance',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_1_Elevate security and compliance in this new world.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Elevate threat protection at SMB cost',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_2_Elevate threat protection at SMB cost.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent identity access risks',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_3_Prevent identity access risks in a connected world.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent advanced identity-based attacks',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_4_Prevent the risk of advanced identity-based attacks.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent ransomware attacks',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_5_Prevent the risk of ransomware attacks across endpoints network.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent advanced phishing and email threats',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_6_Prevent advanced phishing and email threats.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent shadow cloud and AI app risks',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/defender-resources/E-mail_7_Prevent the risk from shadow cloud and AI applications.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
];

const PURVIEW_GTM_RESOURCES: GtmResourceLink[] = [
	...SECURITY_COMMON_GTM_LINKS,
	{
		label: 'Unlock the power and promise of AI',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/purview-resources/E-mail_8_Unlock the power and promise of AI.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent data leak in the age of AI',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/purview-resources/E-mail_9_Prevent the risk of data leak in the age of AI.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent data oversharing in the age of AI',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/purview-resources/E-mail_10_Prevent the risk of data oversharing in the age of AI.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
	{
		label: 'Prevent non-compliance in the age of AI',
		url: 'https://agentbprodstorage.blob.core.windows.net/proposal-images/purview-resources/E-mail_11_Prevent the risk of non-compliance in the age of AI.oft',
		icon: <MailRegular className="size-4 text-yellow-600" />,
		assetType: 'oft',
	},
];

const TECH_READINESS_COPILOT: ExternalLink[] = [
	{
		label: 'Copilot technical overview presentation',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=abs/unprotected/M365-Copilot-technical-overview.pptx',
	},
	{
		label: 'Copilot technical readiness guide',
		url: 'https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fadoption.microsoft.com%2Ffiles%2Fcopilot%2F4_TechnicalReadinessGuide_Microsoft365Copilot.pptx&wdOrigin=BROWSELINK',
	},
];

const TECH_READINESS_PURVIEW: ExternalLink[] = [
	{
		label: 'Manage insider risk in Microsoft 365 learning path',
		url: 'https://learn.microsoft.com/en-us/training/paths/m365-compliance-insider/',
	},
	{
		label: 'Compliance learning paths',
		url: 'https://learn.microsoft.com/en-us/training/paths/describe-capabilities-of-microsoft-compliance-solutions/',
	},
	{
		label: 'Purview and Priva learning path',
		url: 'https://learn.microsoft.com/en-us/training/paths/purview-ninja-safeguard-data/',
	},
	{
		label: 'Purview Data Loss Preventions ninja training',
		url: 'https://aka.ms/DLPNinja',
	},
	{
		label: 'Purview eDiscovery ninja training',
		url: 'https://techcommunity.microsoft.com/blog/microsoftsecurityandcompliance/become-a-microsoft-purview-ediscovery-ninja/2793108',
	},
];

const TECH_READINESS_DEFENDER: ExternalLink[] = [
	{
		label: 'Microsoft Defender learning path',
		url: 'https://learn.microsoft.com/en-us/training/defender/',
	},
	{
		label: 'Microsoft Defender XDR learning path',
		url: 'https://learn.microsoft.com/en-us/training/modules/describe-threat-protection-with-microsoft-365-defender/',
	},
	{
		label: 'Additional training resources',
		url: 'https://learn.microsoft.com/en-us/defender/',
	},
];

const ADOPTION_COPILOT: ExternalLink[] = [
	{
		label: 'Copilot analytics risk and compliance discussion guide',
		url: 'https://aka.ms/Copilot/RiskComplianceDiscussionGuide',
	},
	{
		label: 'Building first agent in minutes',
		url: 'https://adoption.microsoft.com/files/copilot/AgentBuilderQuickStart.pdf',
	},
	{
		label: 'Agent governance',
		url: 'https://adoption.microsoft.com/files/customer-hub/Customer-Hub_Agent-governance.pptx',
	},
	{
		label:
			'Copilot for Microsoft 365 Copilot Success Kit for Small and Medium Business - Microsoft Adoption',
		url: 'https://adoption.microsoft.com/en-us/copilot/smb/success-kit/',
	},
	{
		label: 'M365 Adoption guide - PowerPoint Presentation',
		url: 'https://adoption.microsoft.com/files/assets/M365AdoptionGuide.pdf',
	},
	{
		label: 'Copilot Prompt Packs',
		url: 'https://microsoftpartners.microsoft.com/downloads?filename=abs/protected/Copilot-Prompt-Packs.zip',
	},
	{
		label: 'Interactive scenario library',
		url: 'https://adoption.microsoft.com/copilot-scenario-library/',
	},
	{
		label: 'Measuring impact with Copilot Analytics',
		url: 'https://adoption.microsoft.com/files/customer-hub/Customer-Hub_Microsoft-365-Copilot-analytics-Measuring-impact-with-analytics.pptx',
	},
];

const ADOPTION_SECURITY_INTERACTIVE_GUIDES: ExternalLink[] = [
	{
		label: 'Data Loss Protection',
		url: 'https://mslearn.cloudguides.com/en-us/guides/Apply%20Microsoft%20Endpoint%20DLP%20policies%20to%20devices',
	},
	{
		label: 'Information and Rights Management',
		url: 'https://mslearn.cloudguides.com/en-us/guides/Identify%20and%20take%20action%20on%20insider%20risks%20with%20Insider%20Risk%20Management',
	},
	{
		label: 'Adaptive Protection',
		url: 'https://mslearn.cloudguides.com/guides/Mitigate%20risks%20with%20Adaptive%20Protection%20in%20Microsoft%20Purview',
	},
	{
		label: 'eDiscovery',
		url: 'https://mslearn.cloudguides.com/guides/Get%20started%20with%20Microsoft%20Purview%20eDiscovery',
	},
];

const MICROSOFT_SECURITY_ADOPTION_GUIDE: ExternalLink = {
	label: 'Microsoft Security adoption guide',
	url: 'https://aka.ms/security_adoption_guide',
};

const ADOPTION_DEFENDER_TOP: ExternalLink[] = [
	MICROSOFT_SECURITY_ADOPTION_GUIDE,
	{
		label: 'A practical handbook to securing data with Purview',
		url: 'https://adoption.microsoft.com/en-us/microsoft-security/purview/',
	},
];

const ADOPTION_DEFENDER_BOTTOM: ExternalLink[] = [
	{
		label: 'Clickthrough demos',
		url: 'https://adoption.microsoft.com/en-us/microsoft-security/purview/?role=developer',
	},
	{
		label: 'Additional implementation and adoption resources',
		url: 'https://adoption.microsoft.com/en-us/microsoft-security/purview/?role=developer',
	},
];

const ADOPTION_PURVIEW: ExternalLink[] = [
	MICROSOFT_SECURITY_ADOPTION_GUIDE,
];

const CAMPAIGN_COPILOT: GtmResourceLink[] = [
	{
		label: 'Partner Marketing Center',
		url: 'https://nam06.safelinks.protection.outlook.com/?url=https%3A%2F%2Faka.ms%2FCopilotBusinessSMB_PMC&data=05%7C02%7Cmtermulo%40microsoft.com%7Cacfb7d98ad634cc8baea08de9a68e6b0%7C72f988bf86f141af91ab2d7cd011db47%7C1%7C0%7C639117972500347411%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=n%2Fq%2BHaoffOOGn%2BKXw%2BXGzkNrIpUgXwy7ctsJ1VL0V6s%3D&reserved=0',
		icon: <ChannelShare24Regular className="size-4 text-teal-500" />,
		assetType: 'external-link',
	},
	{
		label: 'Partner Marketing Center Pro',
		url: 'https://nam06.safelinks.protection.outlook.com/?url=https%3A%2F%2Faka.ms%2FCopilotBusinessSMB&data=05%7C02%7Cmtermulo%40microsoft.com%7Cacfb7d98ad634cc8baea08de9a68e6b0%7C72f988bf86f141af91ab2d7cd011db47%7C1%7C0%7C639117972500362853%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=ugt64aFv4nBz6oBwaosn1YeYoCBPlVzXXsdiGj0osIo%3D&reserved=0',
		icon: <ChannelShare24Regular className="size-4 text-teal-500" />,
		assetType: 'external-link',
	},
	{
		label: 'CSP Renewals',
		url: 'https://aka.ms/accelerate_CSP_renewals_PMC',
		icon: <ChannelShare24Regular className="size-4 text-teal-500" />,
		assetType: 'external-link',
	},
];

const CAMPAIGN_DEFENDER: GtmResourceLink[] = [
	{
		label: 'Data Security Compete Positioning for Partners',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=Microsoft-Security-Partners%2FSolution-Plays%2FData-Security%2FAccordion%2FMarketing%20materials%2FData%20Security%20Compete%20Positioning%20for%20Partners.pptx',
		icon: <ChannelShare24Regular className="size-4 text-teal-500" />,
		assetType: 'pptx',
	},
];

const CAMPAIGN_PURVIEW: GtmResourceLink[] = [
	{
		label:
			'Microsoft Security Threat Protection Compete Positioning for Partner',
		url: 'https://microsoftpartners.microsoft.com/Downloads/?filename=Microsoft-Security-Partners%2FSolution-Plays%2FModern-SecOps%2FAccordion%2FMarketing%20materials%2FMicrosoft-Security-Threat-Protection-Compete-Positioning-for-Partner.pptx',
		icon: <ChannelShare24Regular className="size-4 text-teal-500" />,
		assetType: 'pptx',
	},
];

/* ------------------------------------------------------------------ */
/*  AssetListItem                                                     */
/* ------------------------------------------------------------------ */

interface AssetListItemProps {
	icon: React.ReactNode;
	title: string;
	subtitle?: string;
	loading?: boolean;
	disabled?: boolean;
	error?: string | null;
	/** Direct link — renders an <a> download button. */
	actionHref?: string;
	/** Async callback — renders a <button> download button. */
	onAction?: () => void;
	onIntentClick?: () => void;
	ariaLabel?: string;
	/** Indent this item (used for child items under a parent). */
	indent?: boolean;
	/** Show a border between items. */
	border?: boolean;
	/** Override the default download icon on the action button. */
	actionIcon?: React.ReactElement;
}

function AssetListItem({
	icon,
	title,
	subtitle,
	loading = false,
	disabled = false,
	error = null,
	actionHref,
	onAction,
	onIntentClick,
	ariaLabel,
	indent = false,
	border = false,
	actionIcon,
}: AssetListItemProps) {
	const downloadIcon = loading ? (
		<Spinner size="tiny" />
	) : (
		(actionIcon ?? <ArrowDownloadRegular className="size-4" />)
	);

	return (
		<div className={`flex flex-col ${indent ? 'pl-6' : ''}`}>
			<div
				className={`flex items-center gap-3 py-2 pr-2 ${border ? 'border-b border-gray-100/70' : ''}`}
			>
				{/* File-type icon */}
				<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
					{icon}
				</span>

				{/* Title + subtitle */}
				<div className="min-w-0 flex-1">
					<Tooltip content={title} relationship="label">
						<p className="m-0 truncate text-sm pr-8 font-medium text-gray-800">
							{title}
						</p>
					</Tooltip>
					{subtitle && (
						<p className="m-0 truncate text-xs text-gray-500">{subtitle}</p>
					)}
				</div>

				{/* Download action */}
				{actionHref ? (
					<Button
						appearance="subtle"
						icon={downloadIcon}
						as="a"
						href={actionHref}
						target="_blank"
						rel="noopener noreferrer"
						onClick={onIntentClick}
						disabled={disabled || loading}
						aria-label={ariaLabel ?? `Download ${title}`}
						size="small"
					/>
				) : (
					<Button
						appearance="subtle"
						icon={downloadIcon}
						onClick={() => {
							onIntentClick?.();
							onAction?.();
						}}
						disabled={disabled || loading}
						aria-label={ariaLabel ?? `Download ${title}`}
						size="small"
					/>
				)}
			</div>

			{error && <p className="m-0 pl-11 text-xs text-[#b42318]">{error}</p>}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

interface AssetsLeftColumnProps {
	customerName: string;
	endingSkuIds: string[];
	showConsolidatedPpt?: boolean;
	showPartnerEmail?: boolean;
	loading?: boolean;
	customerProposalEmailRequest?: CreateCustomerProposalEmailLinkRequest | null;
	proposalDownloadUrl?: string | null;
	individualPpts?: Array<{
		key: string;
		label: string;
		downloadUrl: string | null;
		loading?: boolean;
		error?: string | null;
		onDownload?: () => void;
	}>;
	isDemo?: boolean;
	isPublic?: boolean;
	showCspPartnerResources?: boolean;
}

export function AssetsLeftColumn({
	customerName,
	endingSkuIds,
	showConsolidatedPpt = true,
	showPartnerEmail = true,
	loading = false,
	customerProposalEmailRequest = null,
	proposalDownloadUrl = null,
	individualPpts = [],
	isDemo = false,
	isPublic = false,
	showCspPartnerResources = false,
}: AssetsLeftColumnProps) {
	const t = useTranslations();
	const [downloadingCustomerEmail, setDownloadingCustomerEmail] =
		useState(false);
	const [customerEmailError, setCustomerEmailError] = useState<string | null>(
		null,
	);
	const [defenderGuidesExpanded, setDefenderGuidesExpanded] = useState(false);

	const hasCopilotSku = useMemo(
		() =>
			endingSkuIds.some((id) => id.includes('_cb') || id.includes('copilot')),
		[endingSkuIds],
	);

	const hasPurviewSku = useMemo(
		() => endingSkuIds.some((id) => id.includes('purview')),
		[endingSkuIds],
	);

	const hasDefenderSku = useMemo(
		() => endingSkuIds.some((id) => id.includes('defender')),
		[endingSkuIds],
	);

	const showTechReadiness =
		showCspPartnerResources &&
		(hasCopilotSku || hasPurviewSku || hasDefenderSku);
	const showAdoptionResources =
		showCspPartnerResources &&
		(hasCopilotSku || hasPurviewSku || hasDefenderSku);

	const gtmResourceCategories = useMemo(() => {
		const categories: GtmResourceCategory[] = [];
		if (hasCopilotSku) {
			categories.push({
				id: 'copilot-business',
				label: 'Copilot Business',
				resources: COPILOT_BUSINESS_MORE_LINKS,
			});
		}
		if (hasPurviewSku) {
			categories.push({
				id: 'purview',
				label: 'Purview',
				resources: PURVIEW_GTM_RESOURCES,
			});
		}
		if (hasDefenderSku) {
			categories.push({
				id: 'defender',
				label: 'Defender',
				resources: DEFENDER_GTM_RESOURCES,
			});
		}
		return categories;
	}, [hasCopilotSku, hasDefenderSku, hasPurviewSku]);

	const salesEnablementPdfs = useMemo(() => {
		const unique = [...new Set(endingSkuIds)];
		return unique
			.map((id) => {
				const pdf = SALES_ENABLEMENT_PDFS[id];
				if (!pdf) return null;
				return {
					id,
					label: pdf.label,
					url: `${SALES_ENABLEMENT_PDF_BASE_URL}/${encodeURIComponent(pdf.fileName)}`,
				};
			})
			.filter(
				(p): p is { id: string; label: string; url: string } => p !== null,
			);
	}, [endingSkuIds]);

	const handleDownloadPartnerEmail = useCallback(async () => {
		setCustomerEmailError(null);

		if (!customerProposalEmailRequest) {
			setCustomerEmailError(
				'No proposal selection is available to build the email.',
			);
			return;
		}

		const pendingTab = window.open('', '_blank');
		if (!pendingTab) {
			setCustomerEmailError(
				'Popup blocked by browser. Allow popups and try again.',
			);
			return;
		}
		pendingTab.opener = null;

		setDownloadingCustomerEmail(true);
		try {
			const response = await (isPublic
				? createPartnerProposalEmailLinkPublic(customerProposalEmailRequest)
				: createPartnerProposalEmailLink(customerProposalEmailRequest));
			captureProposalEmailLinkRequested({
				linkType: 'partner-ready-email',
				customerId: customerProposalEmailRequest.customerId,
				scenarioCount: customerProposalEmailRequest.scenarios.length,
				isDemo,
				isPublic,
			});
			if (pendingTab.closed) {
				window.open(response.url, '_blank', 'noopener,noreferrer');
			} else {
				pendingTab.location.href = response.url;
			}
		} catch (error) {
			if (!pendingTab.closed) {
				pendingTab.close();
			}
			setCustomerEmailError(
				error instanceof Error && error.message.trim().length > 0
					? error.message
					: 'Unable to generate the partner email. Please try again.',
			);
		} finally {
			setDownloadingCustomerEmail(false);
		}
	}, [customerProposalEmailRequest, isDemo, isPublic]);

	if (loading) {
		return (
			<div
				className="rounded-xl bg-white backdrop-blur-[80px] border-2 border-white p-4"
				aria-busy={true}
			>
				<div data-testid="assets-left-skeleton-customer">
					<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
						{t('proposal.downloadProposalPack')}
					</h3>
					<div className="mt-3 flex flex-col">
						<div className="flex items-center gap-3 border-b border-gray-100/70 py-2 pr-2">
							<div className="size-8 animate-pulse rounded-md bg-gray-200" />
							<div className="flex-1">
								<div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
								<div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
							</div>
							<div className="size-7 animate-pulse rounded-md bg-gray-100" />
						</div>
						{[0, 1, 2].map((index) => (
							<div
								key={index}
								className={`flex items-center gap-3 py-2 pr-2 ${index < 2 ? 'border-b border-gray-100/70' : ''} pl-6`}
							>
								<div className="size-8 animate-pulse rounded-md bg-gray-200" />
								<div className="flex-1">
									<div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
									<div className="mt-2 h-2.5 w-1/3 animate-pulse rounded bg-gray-100" />
								</div>
								<div className="size-7 animate-pulse rounded-md bg-gray-100" />
							</div>
						))}
					</div>
				</div>

				{showPartnerEmail && (
					<>
						<hr className="my-4 border-t border-gray-200" />
						<div data-testid="assets-left-skeleton-partner">
							<h3 className="m-0 text-sm font-semibold text-gray-500 uppercase tracking-wide">
								Partner ready proposal assets
							</h3>
							<div className="mt-3 flex items-center gap-3 py-2 pr-2">
								<div className="size-8 animate-pulse rounded-md bg-gray-200" />
								<div className="flex-1">
									<div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
									<div className="mt-2 h-2.5 w-2/3 animate-pulse rounded bg-gray-100" />
								</div>
								<div className="size-7 animate-pulse rounded-md bg-gray-100" />
							</div>
						</div>
					</>
				)}

				{endingSkuIds.length > 0 && (
					<>
						<hr className="my-4 border-t border-gray-200" />
						<div data-testid="assets-left-skeleton-gtm">
							<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
								{t('proposal.downloadGtmResources')}
							</h3>
							<p className="m-0 mt-1 text-xs text-gray-500">
								Resources grouped by category
							</p>
							<div className="mt-3 flex flex-col gap-4">
								{[0, 1].map((scenarioIndex) => (
									<div key={scenarioIndex}>
										<div className="flex items-center gap-2">
											<div className="size-4 animate-pulse rounded-full bg-gray-200" />
											<div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
											<div className="ml-auto size-7 animate-pulse rounded-md bg-gray-100" />
										</div>
										<div className="mt-2 space-y-2 pl-6">
											<div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
											<div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
										</div>
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		);
	}

	return (
		<div
			className="rounded-xl bg-white backdrop-blur-[80px] border-2 border-white p-4"
			aria-busy={false}
		>
			{/* ── Section 1: Download the customer-ready proposal pack ────── */}
			<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
				{t('proposal.downloadProposalPack')}
			</h3>

			<div className="mt-3 flex flex-col">
				{/* Proactive Proposal (ZIP) — parent */}
				<AssetListItem
					icon={
						<FolderZipRegular className="size-4 text-(--ds-color-violet-500)" />
					}
					title={`Proactive Proposal for ${customerName}`}
					subtitle={t('proposal.readyToSendCustomerProposal')}
					actionHref={proposalDownloadUrl ?? undefined}
					onIntentClick={() =>
						captureDownloadIntentClicked({
							intentType: 'proposal-bundle',
							assetType: 'bundle-zip',
							customerName,
							isDemo,
							isPublic,
						})
					}
					disabled={!proposalDownloadUrl}
					border
				/>

				{/* PPT — child */}
				{showConsolidatedPpt && (
					<AssetListItem
						indent
						icon={<SlideText32Regular className="size-4 text-red-500" />}
						title={t('proposal.consolidatedProposalDoc')}
						actionHref={
							proposalDownloadUrl
								? `${proposalDownloadUrl}&file=ppt`
								: undefined
						}
						onIntentClick={() =>
							captureDownloadIntentClicked({
								intentType: 'consolidated-proposal',
								assetType: 'pptx',
								customerName,
								isDemo,
								isPublic,
							})
						}
						disabled={!proposalDownloadUrl}
						border
					/>
				)}

				{/* Individual opportunity PPTs */}
				{individualPpts.map((ppt, index) => (
					<AssetListItem
						key={ppt.key}
						indent
						icon={<SlideText32Regular className="size-4 text-red-500" />}
						title={ppt.label}
						actionHref={ppt.downloadUrl ?? undefined}
						onAction={ppt.downloadUrl ? undefined : ppt.onDownload}
						onIntentClick={() =>
							captureDownloadIntentClicked({
								intentType: 'individual-proposal',
								assetType: 'pptx',
								scenarioKey: ppt.key,
								customerName,
								isDemo,
								isPublic,
							})
						}
						loading={ppt.loading}
						error={ppt.error}
						disabled={!ppt.downloadUrl && !ppt.onDownload}
						border={index < individualPpts.length - 1}
					/>
				))}

				{/* DOCX — child */}
				<AssetListItem
					indent
					icon={<DocumentOnePage32Regular className="size-4 text-indigo-600" />}
					title={t('proposal.customerProposalEmail')}
					actionHref={
						proposalDownloadUrl
							? `${proposalDownloadUrl}&file=email`
							: undefined
					}
					onIntentClick={() =>
						captureDownloadIntentClicked({
							intentType: 'customer-proposal-email',
							assetType: 'docx',
							customerName,
							isDemo,
							isPublic,
						})
					}
					disabled={!proposalDownloadUrl}
				/>
			</div>

			{/* ── Divider ──────────────────────────────────────── */}
			{showPartnerEmail && <hr className="my-4 border-t border-gray-200" />}

			{/* ── Section 2: Partner Ready Proposal Assets ─────── */}
			{showPartnerEmail && (
				<>
					<h3 className="m-0 text-sm font-semibold text-gray-500 uppercase tracking-wide">
						{t('proposal.partnerReadyAssets')}
					</h3>

					<div className="mt-3 flex flex-col">
						<AssetListItem
							icon={<MailRegular className="size-4 text-yellow-600" />}
							title={t('proposal.partnerReadyEmail')}
							subtitle={t('proposal.emailToPartnerSubtitle')}
							loading={downloadingCustomerEmail}
							disabled={!customerProposalEmailRequest}
							onAction={handleDownloadPartnerEmail}
							error={customerEmailError}
							ariaLabel="Download partner e-mail"
						/>
					</div>
				</>
			)}

			{/* ── Section 2b: Sales Enablement PDFs ────────────── */}
			{salesEnablementPdfs.length > 0 && (
				<>
					<hr className="my-4 border-t border-gray-200" />
					<h3 className="m-0 text-sm font-semibold text-gray-500 uppercase tracking-wide">
						{t('proposal.exploreSalesGuidance')}
					</h3>

					<div className="mt-3 flex flex-col">
						{salesEnablementPdfs.map((pdf, index) => (
							<AssetListItem
								key={pdf.id}
								icon={
									<DocumentOnePage32Regular className="size-4 text-indigo-600" />
								}
								title={pdf.label}
								actionHref={pdf.url}
								onIntentClick={() =>
									captureDownloadIntentClicked({
										intentType: 'sales-enablement-pdf',
										assetType: 'pdf',
										scenarioId: pdf.id,
										customerName,
										isDemo,
										isPublic,
									})
								}
								border={index < salesEnablementPdfs.length - 1}
							/>
						))}
					</div>
				</>
			)}

			{/* ── Divider ──────────────────────────────────────── */}
			{gtmResourceCategories.length > 0 && (
				<hr className="my-4 border-t border-gray-200" />
			)}

			{/* ── Section 3: Download additional GTM resources ────────────────────── */}
			{gtmResourceCategories.length > 0 && (
				<>
					<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
						{t('proposal.downloadGtmResources')}
					</h3>
					<p className="m-0 mt-1 text-xs text-gray-500">
						Resources grouped by category
					</p>

					<div className="mt-3 flex flex-col gap-4">
						{gtmResourceCategories.map((category) => (
							<div key={category.id}>
								<div className="flex items-center gap-2">
									<Circle12Filled
										primaryFill="currentColor"
										className="size-4 shrink-0 text-gray-300"
									/>
									<span className="text-sm font-semibold text-gray-700 truncate">
										{category.label}
									</span>
								</div>

								<div className="mt-2 flex flex-col">
									{category.id === 'copilot-business' && (
										<>
											{COPILOT_BUSINESS_LINKS.map((resource) => (
												<AssetListItem
													key={resource.label}
													indent
													icon={resource.icon}
													title={resource.label}
													subtitle={resource.subtitle}
													actionHref={resource.url}
													actionIcon={<OpenRegular className="size-4" />}
													ariaLabel={`Open ${resource.label}`}
													onIntentClick={() =>
														captureDownloadIntentClicked({
															intentType: 'gtm-resource',
															assetType: resource.assetType,
															scenarioId: category.id,
															resourceName: resource.label,
															customerName,
															isDemo,
															isPublic,
														})
													}
												/>
											))}

											<AssetListItem
												indent
												icon={COPILOT_GTM_KIT.icon}
												title={COPILOT_GTM_KIT.label}
												subtitle={COPILOT_GTM_KIT.subtitle}
												actionHref={COPILOT_GTM_KIT.url}
												actionIcon={<OpenRegular className="size-4" />}
												ariaLabel={`Open ${COPILOT_GTM_KIT.label}`}
												onIntentClick={() =>
													captureDownloadIntentClicked({
														intentType: 'gtm-resource',
														assetType: COPILOT_GTM_KIT.assetType,
														scenarioId: category.id,
														resourceName: COPILOT_GTM_KIT.label,
														customerName,
														isDemo,
														isPublic,
													})
												}
											/>

											<div className="flex flex-col pl-12">
												{GTM_KIT_CONTENTS.map((item) => (
													<div
														key={item.label}
														className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
													>
														<div className="flex size-4 shrink-0 items-center text-gray-400">
															{item.icon}
														</div>
														<p className="text-xs text-gray-700 truncate">
															{item.label}
														</p>
													</div>
												))}
											</div>
										</>
									)}

									{category.resources.map((resource) => (
										<AssetListItem
											key={resource.label}
											indent
											icon={resource.icon}
											title={resource.label}
											subtitle={resource.subtitle}
											actionHref={resource.url}
											actionIcon={<OpenRegular className="size-4" />}
											ariaLabel={`Open ${resource.label}`}
											onIntentClick={() =>
												captureDownloadIntentClicked({
													intentType: 'gtm-resource',
													assetType: resource.assetType,
													scenarioId: category.id,
													resourceName: resource.label,
													customerName,
													isDemo,
													isPublic,
												})
											}
										/>
									))}
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{gtmResourceCategories.length === 0 && endingSkuIds.length > 0 && (
				<>
					<hr className="my-4 border-t border-gray-200" />
					<p className="m-0 text-sm text-gray-400">
						No GTM resources available for the selected SKUs.
					</p>
				</>
			)}

			{/* ── Section: Explore resources to improve technical readiness ── */}
			{showTechReadiness && (
				<>
					<hr className="my-4 border-t border-gray-200" />
					<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
						{t('proposal.exploreTechnicalReadiness')}
					</h3>

					<div className="mt-3 flex flex-col">
						{hasCopilotSku &&
							TECH_READINESS_COPILOT.map((link) => (
								<AssetListItem
									key={link.label}
									icon={<BookOpenRegular className="size-4 text-indigo-600" />}
									title={link.label}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'technical-readiness',
											assetType: 'external-link',
											scenarioId: 'copilot',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}

						{hasPurviewSku &&
							TECH_READINESS_PURVIEW.map((link) => (
								<AssetListItem
									key={link.label}
									icon={<BookOpenRegular className="size-4 text-indigo-600" />}
									title={link.label}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'technical-readiness',
											assetType: 'external-link',
											scenarioId: 'purview',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}

						{hasDefenderSku &&
							TECH_READINESS_DEFENDER.map((link) => (
								<AssetListItem
									key={link.label}
									icon={<BookOpenRegular className="size-4 text-indigo-600" />}
									title={link.label}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'technical-readiness',
											assetType: 'external-link',
											scenarioId: 'defender',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}
					</div>
				</>
			)}

			{/* ── Section: Additional implementation and adoption resources ── */}
			{showAdoptionResources && (
				<>
					<hr className="my-4 border-t border-gray-200" />
					<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
						{t('proposal.additionalAdoptionResources')}
					</h3>

					<div className="mt-3 flex flex-col">
						{hasCopilotSku &&
							ADOPTION_COPILOT.map((link) => (
								<AssetListItem
									key={link.label}
									icon={<BookOpenRegular className="size-4 text-indigo-600" />}
									title={link.label}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'adoption-resource',
											assetType: 'external-link',
											scenarioId: 'copilot',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}

						{hasDefenderSku && (
							<>
								{ADOPTION_DEFENDER_TOP.map((link) => (
									<AssetListItem
										key={`defender-${link.label}`}
										icon={
											<BookOpenRegular className="size-4 text-indigo-600" />
										}
										title={link.label}
										actionHref={link.url}
										actionIcon={<OpenRegular className="size-4" />}
										onIntentClick={() =>
											captureDownloadIntentClicked({
												intentType: 'adoption-resource',
												assetType: 'external-link',
												scenarioId: 'defender',
												customerName,
												isDemo,
												isPublic,
											})
										}
									/>
								))}

								{/* Interactive guides — expandable */}
								<div className="flex flex-col">
									<div
										role="button"
										tabIndex={0}
										onClick={() => setDefenderGuidesExpanded((v) => !v)}
										onKeyDown={(e) => {
											if (e.key === ' ' || e.key === 'Enter') {
												e.preventDefault();
												setDefenderGuidesExpanded((v) => !v);
											}
										}}
										className="flex cursor-pointer items-center gap-3 py-2 pr-2 hover:bg-gray-50 rounded-md"
										aria-expanded={defenderGuidesExpanded}
									>
										<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
											<BookOpenRegular className="size-4 text-indigo-600" />
										</span>
										<div className="min-w-0 flex-1">
											<p className="m-0 truncate text-sm pr-2 font-medium text-gray-800">
												Interactive guides
											</p>
										</div>
										{defenderGuidesExpanded ? (
											<ChevronDownRegular className="size-4 text-gray-500" />
										) : (
											<ChevronRightRegular className="size-4 text-gray-500" />
										)}
									</div>

									{defenderGuidesExpanded && (
										<div className="flex flex-col">
											{ADOPTION_SECURITY_INTERACTIVE_GUIDES.map((link) => (
												<AssetListItem
													key={`defender-guide-${link.label}`}
													indent
													icon={
														<LinkRegular className="size-4 text-indigo-600" />
													}
													title={link.label}
													actionHref={link.url}
													actionIcon={<OpenRegular className="size-4" />}
													onIntentClick={() =>
														captureDownloadIntentClicked({
															intentType: 'adoption-resource',
															assetType: 'interactive-guide',
															scenarioId: 'defender',
															guideName: link.label,
															customerName,
															isDemo,
															isPublic,
														})
													}
												/>
											))}
										</div>
									)}
								</div>

								{ADOPTION_DEFENDER_BOTTOM.map((link) => (
									<AssetListItem
										key={`defender-${link.label}`}
										icon={
											<BookOpenRegular className="size-4 text-indigo-600" />
										}
										title={link.label}
										actionHref={link.url}
										actionIcon={<OpenRegular className="size-4" />}
										onIntentClick={() =>
											captureDownloadIntentClicked({
												intentType: 'adoption-resource',
												assetType: 'external-link',
												scenarioId: 'defender',
												customerName,
												isDemo,
												isPublic,
											})
										}
									/>
								))}
							</>
						)}

						{hasPurviewSku &&
							!hasDefenderSku &&
							ADOPTION_PURVIEW.map((link) => (
								<AssetListItem
									key={`purview-${link.label}`}
									icon={<BookOpenRegular className="size-4 text-indigo-600" />}
									title={link.label}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'adoption-resource',
											assetType: 'external-link',
											scenarioId: 'purview',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}
					</div>
				</>
			)}

			{/* ── Section 4: Execute Ready to Use Campaign ─────── */}
			{(hasCopilotSku || hasPurviewSku || hasDefenderSku) && (
				<>
					<hr className="my-4 border-t border-gray-200" />
					<h3 className="m-0 text-sm font-semibold text-gray-600 uppercase tracking-wide">
						{t('proposal.executeReadyToUseCampaign')}
					</h3>
					<div className="mt-3 flex flex-col">
						{hasCopilotSku &&
							CAMPAIGN_COPILOT.map((link) => (
								<AssetListItem
									key={`campaign-copilot-${link.label}`}
									icon={link.icon}
									title={link.label}
									subtitle={link.subtitle}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									ariaLabel={`Open ${link.label}`}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'ready-to-use-campaign',
											assetType: link.assetType,
											scenarioId: 'copilot',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}

						{hasPurviewSku &&
							CAMPAIGN_PURVIEW.map((link) => (
								<AssetListItem
									key={`campaign-purview-${link.label}`}
									icon={link.icon}
									title={link.label}
									subtitle={link.subtitle}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									ariaLabel={`Open ${link.label}`}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'ready-to-use-campaign',
											assetType: link.assetType,
											scenarioId: 'purview',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}

						{hasDefenderSku &&
							CAMPAIGN_DEFENDER.map((link) => (
								<AssetListItem
									key={`campaign-defender-${link.label}`}
									icon={link.icon}
									title={link.label}
									subtitle={link.subtitle}
									actionHref={link.url}
									actionIcon={<OpenRegular className="size-4" />}
									ariaLabel={`Open ${link.label}`}
									onIntentClick={() =>
										captureDownloadIntentClicked({
											intentType: 'ready-to-use-campaign',
											assetType: link.assetType,
											scenarioId: 'defender',
											customerName,
											isDemo,
											isPublic,
										})
									}
								/>
							))}
					</div>
				</>
			)}
		</div>
	);
}

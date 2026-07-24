'use client';

// Hardcoded English throughout, matching the rest of the MCI flow (the old
// MciEngagementPanel was deliberately untranslated).

import { useState } from 'react';
import {
	Dropdown,
	InteractionTag,
	InteractionTagPrimary,
	InteractionTagSecondary,
	Label,
	Option,
	Radio,
	RadioGroup,
} from '@fluentui/react-components';
import type { MciEngagementId } from '@repo/shared';

// "Read more" links from the FY27 incentive guide. The source URLs supplied by
// the business were truncated; these point at the relevant guide sections.
export const MCI_ENGAGEMENT_LINKS: Record<MciEngagementId, string> = {
	'copilot-m365':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-ai-business-solutions-modern-work-plus-business-applications',
	'copilot-agent':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-ai-business-solutions-modern-work-plus-business-applications',
	'security-defender-purview':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-security/frontier-accelerate-for-security-csp',
	'security-conversion-bonus':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-security/frontier-accelerate-for-security-csp',
	'ai-productivity-deployment':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-ai-business-solutions-modern-work-plus-business-applications',
	'ai-productivity-conversion-bonus':
		'https://incentiveguide.partner.microsoft.com/en-US/fy27-ai-business-solutions-modern-work-plus-business-applications',
};

/** Customer-fit conditions per engagement, shown once it is selected. */
export const MCI_ENGAGEMENT_NOTES: Record<MciEngagementId, string> = {
	'copilot-m365':
		'Customer should have purchased 50+ M365 Copilot seats and have a 50+ incremental M365 Copilot MAU opportunity.',
	'copilot-agent':
		'Customer should have purchased 50+ Office 365 and/or Microsoft 365 seats (includes OE3/OE5/ME3/ME5/G3/G5, Business Standard & Business Premium SKUs).',
	'security-defender-purview':
		'Customer should have 50+ seats of Defender/Purview for BP.',
	'security-conversion-bonus':
		'Additional conversion bonus for displacing at least 25 SentinelOne seats.',
	'ai-productivity-deployment':
		'Customer should have 50+ incremental Business Premium seats.',
	'ai-productivity-conversion-bonus':
		'Additional conversion bonus for displacing at least 25 Google Workspace seats.',
};

/**
 * Displacement question asked when the bonus's parent engagement is selected
 * on the card. Answering Yes IS the displacement attestation — it attaches
 * the bonus; the bonus is never offered as a dropdown option.
 */
export const MCI_BONUS_QUESTIONS: Partial<Record<MciEngagementId, string>> = {
	'security-conversion-bonus':
		'Does this deployment displace at least 25 SentinelOne seats?',
	'ai-productivity-conversion-bonus':
		'Does this deployment displace at least 25 Google Workspace seats?',
};

export interface MciEngagementOption {
	id: MciEngagementId;
	label: string;
	/** Compact name shown on the selected-engagement tags. */
	shortLabel: string;
	/** Preformatted flat incentive amount in the proposal currency. */
	amountLabel: string;
	isBonus: boolean;
}

interface MciEngagementDropdownProps {
	options: MciEngagementOption[];
	selectedIds: MciEngagementId[];
	onToggle: (id: MciEngagementId) => void;
	className?: string;
}

/**
 * Per-SKU-card multiselect of the MCI engagements the partner plans to
 * deliver with this SKU. An engagement attached to another card is not in
 * `options` (exclusive attachment). Conversion bonuses are not listed as
 * options: once their parent engagement is selected on this card they arrive
 * in `options` flagged `isBonus` and render as a Yes/No displacement
 * question — Yes attaches the bonus.
 */
export function MciEngagementDropdown({
	options,
	selectedIds,
	onToggle,
	className,
}: MciEngagementDropdownProps) {
	// An explicit "No" is distinguished from an unanswered question only for
	// display, so the radios start blank instead of pre-selecting No (matching
	// the profile form). Not persisted: unanswered and No both mean no bonus.
	const [answeredNo, setAnsweredNo] = useState<Set<MciEngagementId>>(
		() => new Set(),
	);

	const baseOptions = options.filter((option) => !option.isBonus);
	const bonusOptions = options.filter((option) => option.isBonus);
	if (baseOptions.length === 0) return null;

	const selectedBaseIds = selectedIds.filter((id) =>
		baseOptions.some((option) => option.id === id),
	);
	const selectedOptions = baseOptions.filter((option) =>
		selectedBaseIds.includes(option.id),
	);

	return (
		<div
			className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}
		>
			<Label className="font-ds-text text-xs font-normal">
				MCI engagements you plan to deliver with this option
			</Label>
			<Dropdown
				multiselect
				className="w-full!"
				placeholder="Select eligible MCI engagements"
				selectedOptions={selectedBaseIds}
				value=""
				onOptionSelect={(_event, data) => {
					if (data.optionValue) {
						onToggle(data.optionValue as MciEngagementId);
					}
				}}
			>
				{baseOptions.map((option) => (
					<Option
						key={option.id}
						value={option.id}
						text={option.label}
						// Top-align the checkbox with the first label line instead of
						// centering it against multi-line option content.
						className="items-start!"
						checkIcon={{ className: 'mt-1.5' }}
					>
						<div className="flex flex-col py-0.5">
							<span className="font-ds-text text-xs font-medium">
								{option.label}
							</span>
							<span className="font-ds-text text-[11px] text-gray-500">
								{`Flat incentive: ${option.amountLabel}`}
							</span>
						</div>
					</Option>
				))}
			</Dropdown>
			{selectedOptions.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedOptions.map((option) => (
						<InteractionTag
							key={option.id}
							size="small"
							shape="rounded"
							appearance="outline"
						>
							<InteractionTagPrimary
								style={{
									borderTopRightRadius: 0,
									borderBottomRightRadius: 0,
									borderRight: 0,
								}}
							>
								{option.shortLabel}
							</InteractionTagPrimary>
							<InteractionTagSecondary
								aria-label={`Remove ${option.label}`}
								onClick={() => onToggle(option.id)}
							/>
						</InteractionTag>
					))}
				</div>
			)}
			{selectedOptions.map((option) => (
				<p
					key={option.id}
					className="m-0 font-ds-text text-xs font-normal text-gray-500"
				>
					<span className="font-medium">{option.label}:</span>{' '}
					{MCI_ENGAGEMENT_NOTES[option.id]}{' '}
					<a
						href={MCI_ENGAGEMENT_LINKS[option.id]}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 font-ds-text text-xs text-(--ds-color-violet-500) underline hover:underline"
					>
						Read more
					</a>
				</p>
			))}
			{bonusOptions.map((bonus) => {
				const applied = selectedIds.includes(bonus.id);
				return (
					<div key={bonus.id} className="flex flex-col gap-1">
						<Label className="font-ds-text text-xs font-normal">
							{MCI_BONUS_QUESTIONS[bonus.id] ?? bonus.label}
						</Label>
						<RadioGroup
							layout="horizontal"
							value={applied ? 'yes' : answeredNo.has(bonus.id) ? 'no' : ''}
							onChange={(_event, data) => {
								const yes = data.value === 'yes';
								setAnsweredNo((prev) => {
									const next = new Set(prev);
									if (yes) {
										next.delete(bonus.id);
									} else {
										next.add(bonus.id);
									}
									return next;
								});
								if (yes !== applied) {
									onToggle(bonus.id);
								}
							}}
						>
							<Radio value="yes" label="Yes" />
							<Radio value="no" label="No" />
						</RadioGroup>
						{applied && (
							<p className="m-0 font-ds-text text-xs font-normal text-gray-500">
								<span className="font-medium">{bonus.label}:</span> conversion
								bonus of {bonus.amountLabel} applied.{' '}
								<a
									href={MCI_ENGAGEMENT_LINKS[bonus.id]}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-ds-text text-xs text-(--ds-color-violet-500) underline hover:underline"
								>
									Read more
								</a>
							</p>
						)}
					</div>
				);
			})}
		</div>
	);
}

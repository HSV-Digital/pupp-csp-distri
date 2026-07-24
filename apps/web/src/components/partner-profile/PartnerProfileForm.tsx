'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
	Button,
	Checkbox,
	Input,
	Radio,
	RadioGroup,
	Spinner,
	Tooltip,
} from '@fluentui/react-components';
import {
	ArrowUpload16Regular,
	CheckmarkCircle16Filled,
	Info16Regular,
} from '@fluentui/react-icons';
import {
	getProfileContradictions,
	isPartnerDesignation,
	isSpecializationId,
	PARTNER_DESIGNATION_LABELS,
	PARTNER_DESIGNATIONS,
	SPECIALIZATION_AREA_LABELS,
	SPECIALIZATION_AREAS,
	SPECIALIZATIONS,
	SPECIALIZATIONS_BY_AREA,
	type PartnerDesignation,
	type PartnerProfile,
	type SpecializationId,
} from '@repo/shared';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
	savePartnerProfile,
	uploadPartnerLogo,
} from '@/lib/partner-profile-api';
import { usePartnerProfile } from '@/lib/partner-profile-context';

/**
 * The active branch's eligibility follow-up was explicitly answered "No".
 * The partner then can't qualify for MCI incentives, so the designation,
 * specialization and Copilot Jumpstart sections are hidden and their answers
 * dropped on save — only the logo and margin remain to ask.
 */
function followUpAnsweredNo(values: {
	partnerType: 'CSP Direct' | 'CSP Indirect';
	hasModernWorkOrSecurityDesignation: boolean | null;
	hasOver25Points: boolean | null;
}): boolean {
	return values.partnerType === 'CSP Direct'
		? values.hasModernWorkOrSecurityDesignation === false
		: values.hasOver25Points === false;
}

const AREA_BY_SPECIALIZATION_ID = new Map(
	SPECIALIZATIONS.map((s) => [s.id, s.area]),
);

/**
 * Specialization areas map 1:1 to designations (same ids), and a partner can
 * only hold a specialization inside a designation they hold — so the form
 * shows only the selected designations' areas, and answers for a deselected
 * area are dropped on save (kept in form state meanwhile, so re-checking the
 * designation restores them).
 */
function specializationsForDesignations(
	specializations: SpecializationId[],
	designations: PartnerDesignation[],
): SpecializationId[] {
	return specializations.filter((id) => {
		const area = AREA_BY_SPECIALIZATION_ID.get(id);
		return area !== undefined && designations.includes(area);
	});
}

const profileFormSchema = z
	.object({
		partnerType: z.enum(['CSP Direct', 'CSP Indirect']),
		hasModernWorkOrSecurityDesignation: z.boolean().nullable(),
		hasOver25Points: z.boolean().nullable(),
		designations: z.array(
			z.custom<PartnerDesignation>((v) => isPartnerDesignation(v)),
		),
		specializations: z.array(
			z.custom<SpecializationId>((v) => isSpecializationId(v)),
		),
		copilotJumpstartReady: z.boolean(),
		companyLogoUrl: z.string().nullable(),
		erpMarginPercent: z
			.number('marginInvalid')
			.min(0, 'marginRange')
			.max(100, 'marginRange'),
	})
	.superRefine((values, ctx) => {
		if (
			values.partnerType === 'CSP Direct' &&
			values.hasModernWorkOrSecurityDesignation === null
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['hasModernWorkOrSecurityDesignation'],
				message: 'followUpRequired',
			});
		}
		if (
			values.partnerType === 'CSP Indirect' &&
			values.hasOver25Points === null
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['hasOver25Points'],
				message: 'followUpRequired',
			});
		}
		// Answering No to the eligibility follow-up hides the designation,
		// specialization and Jumpstart sections — nothing below the follow-up is
		// required or cross-checked (the hidden answers are dropped on save).
		if (followUpAnsweredNo(values)) return;
		if (values.designations.length === 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['designations'],
				message: 'designationsRequired',
			});
		}
		// Contradictions surface on BOTH conflicting fields so the partner sees
		// the mismatch wherever they look.
		for (const contradiction of getProfileContradictions(values)) {
			ctx.addIssue({
				code: 'custom',
				path: ['hasModernWorkOrSecurityDesignation'],
				message: contradiction,
			});
			ctx.addIssue({
				code: 'custom',
				path: ['designations'],
				message: contradiction,
			});
		}
	});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function toFormValues(profile: PartnerProfile | null): ProfileFormValues {
	return {
		partnerType: profile?.partnerType ?? 'CSP Direct',
		hasModernWorkOrSecurityDesignation:
			profile?.hasModernWorkOrSecurityDesignation ?? null,
		hasOver25Points: profile?.hasOver25Points ?? null,
		// A stored profile can predate the current designation/specialization
		// lists (e.g. the removed 'none' designation). A stale id has no
		// checkbox, so it would fail validation with nothing visibly wrong —
		// drop anything the form can't display.
		designations: (profile?.designations ?? []).filter(isPartnerDesignation),
		specializations: (profile?.specializations ?? []).filter(
			isSpecializationId,
		),
		copilotJumpstartReady: profile?.copilotJumpstartReady ?? false,
		companyLogoUrl: profile?.companyLogoUrl ?? null,
		erpMarginPercent: profile?.erpMarginPercent ?? 20,
	};
}

function YesNoRadio({
	value,
	onChange,
}: {
	value: boolean | null;
	onChange: (value: boolean) => void;
}) {
	return (
		<RadioGroup
			layout="horizontal"
			value={value === null ? '' : value ? 'yes' : 'no'}
			onChange={(_e, data) => onChange(data.value === 'yes')}
		>
			<Radio value="yes" label="Yes" />
			<Radio value="no" label="No" />
		</RadioGroup>
	);
}

// Wraps a control so a missing/invalid answer is visibly highlighted on the
// field itself, not just called out in the message text below it. Ring and
// tint only — the -m/p pair cancels out, so toggling the highlight never
// shifts layout.
function FieldHighlight({
	invalid,
	className,
	children,
}: {
	invalid: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				'-m-1.5 rounded-lg p-1.5 transition-colors',
				invalid && 'bg-red-50 ring-1 ring-red-400',
				className,
			)}
		>
			{children}
		</div>
	);
}

function FormSection({
	step,
	title,
	children,
}: {
	step: number;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="py-6">
			<div className="mb-4 flex items-center gap-2.5">
				<span className="shrink-0 font-ds-display text-base font-semibold text-(--ds-color-violet-700)">
					{step}.
				</span>
				<h2 className="m-0 font-ds-display text-base font-semibold text-gray-900">
					{title}
				</h2>
			</div>
			{children}
		</section>
	);
}

export function PartnerProfileForm({
	saveProfile = savePartnerProfile,
	uploadLogo = uploadPartnerLogo,
}: {
	/** Override the save target (e.g. the unauthenticated demo endpoint). */
	saveProfile?: (input: PartnerProfile) => Promise<PartnerProfile>;
	uploadLogo?: (file: File) => Promise<string>;
} = {}) {
	const t = useTranslations('partnerProfile');
	const router = useRouter();
	const searchParams = useSearchParams();
	const { profile, setProfile } = usePartnerProfile();
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	// A submit was blocked by validation and the answers haven't become valid
	// since. Kept separate from saveError (API failures) so it can be cleared
	// the moment the form validates clean again. invalidSections names the
	// sections holding the failures, so the message stays actionable even when
	// the failing field renders no visible error of its own.
	const [submitBlocked, setSubmitBlocked] = useState(false);
	const [invalidSections, setInvalidSections] = useState<string[]>([]);
	const [saved, setSaved] = useState(false);
	const [logoUploading, setLogoUploading] = useState(false);
	const [logoError, setLogoError] = useState<string | null>(null);
	// Original file name of the logo uploaded this session — the stored URL
	// only carries a generated blob name, so this is display-only state.
	const [logoFileName, setLogoFileName] = useState<string | null>(null);
	const logoInputRef = useRef<HTMLInputElement | null>(null);

	const returnTo = useMemo(() => {
		const raw = searchParams.get('returnTo');
		return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
	}, [searchParams]);

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues: toFormValues(profile),
		mode: 'onChange',
	});

	const partnerType = form.watch('partnerType');

	// The contradiction issues span fields (follow-up answer ↔ designations),
	// but onChange validation only refreshes the changed field's error — so a
	// resolved contradiction would stay parked on the OTHER field. Whenever a
	// field involved in cross-field rules changes, re-validate whichever of
	// them currently shows an error (only errored ones, so untouched fields
	// don't surface errors prematurely).
	const hasMwOrSecurityDesignation = form.watch(
		'hasModernWorkOrSecurityDesignation',
	);
	const hasOver25Points = form.watch('hasOver25Points');
	const designations = form.watch('designations');
	const eligibilityAnsweredNo = followUpAnsweredNo({
		partnerType,
		hasModernWorkOrSecurityDesignation: hasMwOrSecurityDesignation,
		hasOver25Points,
	});
	// Areas share their ids with designations: only the selected designations'
	// specialization columns are offered.
	const visibleSpecializationAreas = SPECIALIZATION_AREAS.filter((area) =>
		designations.includes(area),
	);
	useEffect(() => {
		const crossValidatedFields = [
			'hasModernWorkOrSecurityDesignation',
			'hasOver25Points',
			'designations',
		] as const;
		for (const name of crossValidatedFields) {
			if (form.getFieldState(name).error) {
				void form.trigger(name);
			}
		}
	}, [
		form,
		partnerType,
		hasMwOrSecurityDesignation,
		hasOver25Points,
		designations,
	]);

	// Switching partner type swaps WHICH follow-up applies. Reset the now
	// inactive branch's answer and any error parked on it — the field no
	// longer renders, so a stale value or error there could block the save
	// with nothing visibly wrong. (The save payload nulls it as well; this
	// keeps live form state consistent with that.)
	useEffect(() => {
		const inactiveFollowUp =
			partnerType === 'CSP Direct'
				? ('hasOver25Points' as const)
				: ('hasModernWorkOrSecurityDesignation' as const);
		form.setValue(inactiveFollowUp, null);
		form.clearErrors(inactiveFollowUp);
	}, [form, partnerType]);

	// The blocked-submit message would otherwise persist until the NEXT save
	// attempt — the partner fixes every highlighted field and still stares at
	// "some answers need attention" beside Save. Clear it as soon as onChange
	// validation reports the form valid again.
	const isValid = form.formState.isValid;
	useEffect(() => {
		if (isValid) {
			setSubmitBlocked(false);
			setInvalidSections([]);
		}
	}, [isValid]);

	const onSubmit = async (values: ProfileFormValues) => {
		setSaving(true);
		setSaveError(null);
		setSubmitBlocked(false);
		setInvalidSections([]);
		try {
			// A "No" follow-up hides the designation/specialization/Jumpstart
			// sections, so their (possibly stale) answers must not be persisted —
			// the server rejects e.g. No + a Modern Work designation as a
			// contradiction.
			const hideEligibilityDetails = followUpAnsweredNo(values);
			const stored = await saveProfile({
				...values,
				hasModernWorkOrSecurityDesignation:
					values.partnerType === 'CSP Direct'
						? values.hasModernWorkOrSecurityDesignation
						: null,
				hasOver25Points:
					values.partnerType === 'CSP Indirect' ? values.hasOver25Points : null,
				designations: hideEligibilityDetails ? [] : values.designations,
				specializations: hideEligibilityDetails
					? []
					: specializationsForDesignations(
							values.specializations,
							values.designations,
						),
				copilotJumpstartReady: hideEligibilityDetails
					? false
					: values.copilotJumpstartReady,
			});
			setProfile(stored);
			form.reset(toFormValues(stored));
			setSaved(true);
		} catch (error) {
			const status =
				error instanceof Error && 'status' in error
					? (error as Error & { status?: number }).status
					: undefined;
			setSaveError(status === 401 ? t('sessionExpiredError') : t('saveError'));
		} finally {
			setSaving(false);
		}
	};

	// Validation failures otherwise fail SILENTLY at the sticky save bar — the
	// field errors render inside sections that may be scrolled off-screen (or,
	// for fields hidden by the current answers, not on screen at all). Name the
	// offending sections beside Save and bring the first invalid field into
	// view.
	const onInvalid = (errors: FieldErrors<ProfileFormValues>) => {
		const sectionByField: Record<keyof ProfileFormValues, string> = {
			partnerType: t('sectionPartnerType'),
			hasModernWorkOrSecurityDesignation: t('sectionPartnerType'),
			hasOver25Points: t('sectionPartnerType'),
			designations: t('sectionDesignations'),
			specializations: t('sectionSpecializations'),
			copilotJumpstartReady: t('sectionJumpstart'),
			companyLogoUrl: t('sectionLogo'),
			erpMarginPercent: t('sectionMargin'),
		};
		setSaved(false);
		setSubmitBlocked(true);
		setInvalidSections([
			...new Set(
				Object.keys(errors).map(
					(field) => sectionByField[field as keyof ProfileFormValues],
				),
			),
		]);
		// The section list can't say WHICH answer inside a section failed when
		// the field isn't rendered — keep the raw errors reachable.
		console.error('[partner-profile] validation blocked the save', errors);
		requestAnimationFrame(() => {
			document
				.querySelector('[data-slot="form-message"]')
				?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	};

	const handleLogoFile = async (file: File | undefined) => {
		if (!file) return;
		setLogoUploading(true);
		setLogoError(null);
		try {
			const url = await uploadLogo(file);
			form.setValue('companyLogoUrl', url, { shouldDirty: true });
			setLogoFileName(file.name);
		} catch {
			setLogoError(t('logoError'));
		} finally {
			setLogoUploading(false);
		}
	};

	const errorText = (key: string | undefined) =>
		key ? t(`errors.${key}`) : undefined;

	// A contradiction references the designations answered BELOW — don't show
	// it on the follow-up question while designations is still untouched (empty
	// and no save attempted), or the partner is scolded for a question they
	// haven't reached yet. The designations field itself still shows it.
	const followUpErrorKey = (key: string | undefined) =>
		(key === 'direct-follow-up-yes-without-designation' ||
			key === 'direct-follow-up-no-with-designation') &&
		designations.length === 0 &&
		!form.formState.isSubmitted
			? undefined
			: key;

	return (
		<div className="flex flex-col">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit, onInvalid)}
					className="flex flex-col divide-y divide-gray-200 px-8 pb-0"
					noValidate
				>
					{/* 1 — Partner type + branch follow-up, side by side */}
					<FormSection step={1} title={t('sectionPartnerType')}>
						<div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
							<FormField
								control={form.control}
								name="partnerType"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="font-ds-text text-sm font-medium">
											{t('partnerTypeQuestion')}
										</FormLabel>
										<FormControl>
											<RadioGroup
												value={field.value}
												onChange={(_e, data) => field.onChange(data.value)}
											>
												<Radio
													value="CSP Direct"
													label={t('partnerTypeDirect')}
												/>
												<Radio
													value="CSP Indirect"
													label={t('partnerTypeIndirect')}
												/>
											</RadioGroup>
										</FormControl>
										<p className="m-0 font-ds-text text-xs font-normal text-gray-500">
											{t('partnerTypeNote')}
										</p>
									</FormItem>
								)}
							/>

							<div className="border-gray-200 md:border-l md:pl-8">
								{/* Distinct keys force a clean remount when the branch swaps:
								    both branches render a FormField in the same tree position,
								    and letting React morph one Controller into the other (name
								    swap on a reused instance) leaves the radio group and RHF
								    registration carrying the old branch's state. */}
								{partnerType === 'CSP Direct' ? (
									<FormField
										key="direct-follow-up"
										control={form.control}
										name="hasModernWorkOrSecurityDesignation"
										render={({ field, fieldState }) => (
											<FormItem>
												<FormLabel className="font-ds-text text-sm font-medium">
													{t('directFollowUp')}
												</FormLabel>
												<FormControl>
													{/* Highlight follows the same gating as the message
													    below — followUpErrorKey suppresses contradiction
													    errors the partner hasn't reached yet. */}
													<FieldHighlight
														invalid={
															!!followUpErrorKey(fieldState.error?.message)
														}
														className="w-fit"
													>
														<YesNoRadio
															value={field.value}
															onChange={field.onChange}
														/>
													</FieldHighlight>
												</FormControl>
												{followUpErrorKey(fieldState.error?.message) ? (
													<FormMessage>
														{errorText(
															followUpErrorKey(fieldState.error?.message),
														)}
													</FormMessage>
												) : null}
											</FormItem>
										)}
									/>
								) : (
									<FormField
										key="indirect-follow-up"
										control={form.control}
										name="hasOver25Points"
										render={({ field, fieldState }) => (
											<FormItem>
												<FormLabel className="font-ds-text text-sm font-medium">
													{t('indirectFollowUp')}
												</FormLabel>
												<FormControl>
													<FieldHighlight
														invalid={!!fieldState.error}
														className="w-fit"
													>
														<YesNoRadio
															value={field.value}
															onChange={field.onChange}
														/>
													</FieldHighlight>
												</FormControl>
												<p className="m-0 font-ds-text text-xs font-normal text-gray-500">
													{t('revenueNote')}
												</p>
												<FormMessage>
													{errorText(fieldState.error?.message)}
												</FormMessage>
											</FormItem>
										)}
									/>
								)}
							</div>
						</div>
					</FormSection>

					{/* 2 — Designations. Hidden (with 3 & 4) when the eligibility
					    follow-up is answered No — the partner can't qualify for MCI
					    incentives, so only the logo and margin remain to ask. */}
					{eligibilityAnsweredNo ? null : (
						<FormSection step={2} title={t('sectionDesignations')}>
							<FormField
								control={form.control}
								name="designations"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="font-ds-text text-sm font-medium">
											{t('designationsQuestion')}
										</FormLabel>
										<FormControl>
											<FieldHighlight invalid={!!fieldState.error}>
												<div className="flex flex-wrap gap-x-8 gap-y-1">
													{PARTNER_DESIGNATIONS.map((designation) => (
														<Checkbox
															key={designation}
															label={PARTNER_DESIGNATION_LABELS[designation]}
															checked={field.value.includes(designation)}
															onChange={(_e, data) =>
																field.onChange(
																	data.checked
																		? [...field.value, designation]
																		: field.value.filter(
																				(d) => d !== designation,
																			),
																)
															}
														/>
													))}
												</div>
											</FieldHighlight>
										</FormControl>
										<FormMessage>
											{errorText(fieldState.error?.message)}
										</FormMessage>
									</FormItem>
								)}
							/>
						</FormSection>
					)}

					{/* 3 — Specializations grouped by solution area */}
					{eligibilityAnsweredNo ? null : (
						<FormSection step={3} title={t('sectionSpecializations')}>
							<FormField
								control={form.control}
								name="specializations"
								render={({ field, fieldState }) => (
									<FormItem>
										<FormLabel className="font-ds-text text-sm font-medium">
											{t('specializationsQuestion')}
										</FormLabel>
										<FormControl>
											{visibleSpecializationAreas.length === 0 ? (
												<p className="m-0 font-ds-text text-sm font-normal text-gray-500">
													{t('specializationsNoDesignationsHint')}
												</p>
											) : (
												<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
													{visibleSpecializationAreas.map((area) => (
														<div
															key={area}
															className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50/60 p-3"
														>
															<p className="m-0 mb-1 border-b border-gray-200 pb-1.5 font-ds-display text-xs font-semibold uppercase tracking-wide text-(--ds-color-violet-700)">
																{SPECIALIZATION_AREA_LABELS[area]}
															</p>
															{SPECIALIZATIONS_BY_AREA[area].map((spec) => (
																<Checkbox
																	key={spec.id}
																	label={
																		<span className="font-ds-text text-xs">
																			{spec.label}
																		</span>
																	}
																	checked={field.value.includes(spec.id)}
																	onChange={(_e, data) =>
																		field.onChange(
																			data.checked
																				? [...field.value, spec.id]
																				: field.value.filter(
																						(id) => id !== spec.id,
																					),
																		)
																	}
																/>
															))}
														</div>
													))}
												</div>
											)}
										</FormControl>
										<FormMessage>
											{errorText(fieldState.error?.message)}
										</FormMessage>
									</FormItem>
								)}
							/>
						</FormSection>
					)}

					{/* 4 — Copilot JumpStart */}
					{eligibilityAnsweredNo ? null : (
						<FormSection step={4} title={t('sectionJumpstart')}>
							<FormField
								control={form.control}
								name="copilotJumpstartReady"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="font-ds-text text-sm font-medium">
											{t('jumpstartQuestion')}
										</FormLabel>
										<FormControl>
											<YesNoRadio
												value={field.value}
												onChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</FormSection>
					)}

					{/* 5 — Company logo */}
					<FormSection
						step={eligibilityAnsweredNo ? 2 : 5}
						title={t('sectionLogo')}
					>
						<FormField
							control={form.control}
							name="companyLogoUrl"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="font-ds-text text-sm font-medium">
										{t('logoLabel')}{' '}
										<span className="font-normal text-gray-500">
											{t('logoOptionalHint')}
										</span>
									</FormLabel>
									<FormControl>
										<div>
											<input
												ref={logoInputRef}
												type="file"
												accept="image/png,image/jpeg,image/webp,image/svg+xml"
												className="hidden"
												onChange={(event) => {
													void handleLogoFile(event.target.files?.[0]);
													event.target.value = '';
												}}
											/>
											{/* The whole dashed area is the upload target: click,
											    keyboard, or drag & drop. */}
											<div
												role="button"
												tabIndex={0}
												aria-label={
													field.value ? t('logoReplace') : t('logoUpload')
												}
												onClick={() => {
													if (!logoUploading) logoInputRef.current?.click();
												}}
												onKeyDown={(event) => {
													if (event.key === 'Enter' || event.key === ' ') {
														event.preventDefault();
														logoInputRef.current?.click();
													}
												}}
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => {
													event.preventDefault();
													if (!logoUploading) {
														void handleLogoFile(event.dataTransfer.files?.[0]);
													}
												}}
												className="flex w-full max-w-md cursor-pointer items-center gap-4 rounded-lg border border-dashed border-gray-300 p-4 transition-colors hover:border-(--ds-color-violet-500) hover:bg-(--ds-color-violet-50)"
											>
												{logoUploading ? (
													<span className="flex h-14 w-14 shrink-0 items-center justify-center">
														<Spinner size="small" />
													</span>
												) : field.value ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img
														src={field.value}
														alt={t('logoPreviewAlt')}
														className="h-14 w-14 shrink-0 rounded border border-gray-200 bg-white object-contain p-1"
													/>
												) : (
													<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
														<ArrowUpload16Regular fontSize={20} />
													</span>
												)}
												<div className="flex min-w-0 flex-col gap-1">
													{field.value ? (
														<>
															<span className="truncate font-ds-text text-sm font-medium text-gray-900">
																{logoFileName ?? t('logoPreviewAlt')}
															</span>
															<span className="font-ds-text text-xs font-normal text-gray-500">
																{t('logoReplace')} · {t('logoConstraints')}
															</span>
														</>
													) : (
														<>
															<span className="font-ds-text text-sm font-medium text-gray-900">
																{t('logoUpload')}
															</span>
															<span className="font-ds-text text-xs font-normal text-gray-500">
																{t('logoConstraints')}
															</span>
														</>
													)}
												</div>
												{field.value ? (
													<Button
														appearance="subtle"
														size="small"
														className="ml-auto shrink-0"
														onClick={(event) => {
															event.stopPropagation();
															field.onChange(null);
															setLogoFileName(null);
														}}
													>
														{t('logoRemove')}
													</Button>
												) : null}
											</div>
											{logoError ? (
												<p className="m-0 mt-1.5 font-ds-text text-xs text-red-600">
													{logoError}
												</p>
											) : null}
										</div>
									</FormControl>
								</FormItem>
							)}
						/>
					</FormSection>

					{/* 6 — ERP margin */}
					<FormSection
						step={eligibilityAnsweredNo ? 3 : 6}
						title={t('sectionMargin')}
					>
						<FormField
							control={form.control}
							name="erpMarginPercent"
							render={({ field, fieldState }) => (
								<FormItem>
									<FormLabel className="font-ds-text text-sm font-medium">
										<span className="inline-flex items-center gap-1">
											{t('marginLabel')}
											<Tooltip
												content={t('marginInfoTooltip')}
												relationship="description"
												withArrow
											>
												<span
													className="inline-flex shrink-0 cursor-pointer items-center text-gray-500"
													aria-label={t('marginInfoTooltip')}
												>
													<Info16Regular />
												</span>
											</Tooltip>
										</span>
									</FormLabel>
									<FormControl>
										<FieldHighlight
											invalid={!!fieldState.error}
											className="w-fit"
										>
											<Input
												type="number"
												className="w-32"
												min={0}
												max={100}
												step={0.5}
												contentAfter="%"
												value={
													Number.isFinite(field.value)
														? String(field.value)
														: ''
												}
												onChange={(_e, data) =>
													field.onChange(
														data.value === '' ? Number.NaN : Number(data.value),
													)
												}
											/>
										</FieldHighlight>
									</FormControl>
									<p className="m-0 font-ds-text text-xs font-normal text-gray-500">
										{t('marginNote')}
									</p>
									<FormMessage>
										{errorText(fieldState.error?.message)}
									</FormMessage>
								</FormItem>
							)}
						/>
					</FormSection>

					{/* Squared footer strip spanning the containing card's full width. */}
					<div className="sticky bottom-0 z-10 -mx-8 flex items-center gap-3 border-t border-gray-200 bg-white/95 px-8 py-4 backdrop-blur-sm">
						<Button appearance="primary" type="submit" disabled={saving}>
							{saving ? <Spinner size="tiny" /> : t('save')}
						</Button>
						{saved && !form.formState.isDirty ? (
							<span className="flex items-center gap-1 font-ds-text text-sm text-(--ds-color-violet-700)">
								<CheckmarkCircle16Filled className="text-(--ds-color-violet-500)" />
								{t('savedConfirmation')}
							</span>
						) : null}
						{saveError || submitBlocked ? (
							<span className="font-ds-text text-sm text-red-600">
								{saveError ??
									(invalidSections.length > 0
										? `${t('errors.formInvalid')} (${invalidSections.join(', ')})`
										: t('errors.formInvalid'))}
							</span>
						) : null}
						{returnTo && profile ? (
							<Button
								appearance="outline"
								className="ml-auto"
								onClick={() => router.push(returnTo)}
							>
								{t('continueToProposal')}
							</Button>
						) : null}
					</div>
				</form>
			</Form>
		</div>
	);
}

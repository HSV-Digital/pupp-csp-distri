'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Button,
	Dialog,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	Spinner,
} from '@fluentui/react-components';
import { PersonSettingsRegular } from '@fluentui/react-icons';
import { useLocale, useTranslations } from 'next-intl';
import { localeHref, type Locale } from '@/i18n/config';
import { usePartnerProfile } from '@/lib/partner-profile-context';

/**
 * Gate for proposal pages. The page always renders (call sites substitute
 * EMPTY_PARTNER_PROFILE when needed); the blocking setup modal appears only
 * when the API confirmed no profile record exists for this org — never on a
 * failed load, so partners with an existing record are never blocked by a
 * transient error. Links to the profile page with the current path as
 * returnTo. Never mount this in the shared (protected) layout — the profile
 * page itself lives there.
 */
export function RequirePartnerProfile({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = useTranslations('partnerProfile');
	const { notFound, loading } = usePartnerProfile();
	const locale = useLocale() as Locale;
	const pathname = usePathname();

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center py-24">
				<Spinner size="large" />
			</div>
		);
	}

	const returnTo =
		pathname && pathname.startsWith('/') && !pathname.startsWith('//')
			? `?returnTo=${encodeURIComponent(pathname)}`
			: '';
	const profileHref = localeHref(locale, `/partner-profile${returnTo}`);

	return (
		<>
			{children}
			<Dialog open={notFound} modalType="alert">
				<DialogSurface className="max-w-[480px]!">
					<DialogBody>
						<DialogTitle>
							<span className="flex items-center gap-2">
								<PersonSettingsRegular
									className="shrink-0 text-(--ds-color-violet-500)"
									fontSize={22}
								/>
								{t('modalTitle')}
							</span>
						</DialogTitle>
						<DialogContent>
							<p className="mt-1 mb-4 font-ds-text text-sm leading-relaxed text-gray-600">
								{t('modalBody')}
							</p>
							<Link href={profileHref} className="no-underline">
								<Button appearance="primary">{t('modalCta')}</Button>
							</Link>
						</DialogContent>
					</DialogBody>
				</DialogSurface>
			</Dialog>
		</>
	);
}

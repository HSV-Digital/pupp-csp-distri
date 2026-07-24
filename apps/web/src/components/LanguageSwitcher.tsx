'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, Button } from '@fluentui/react-components';
import { Globe20Regular, ChevronDown16Regular } from '@fluentui/react-icons';
import {
	isLocale,
	LOCALE_BASE_PATH,
	localeHref,
	locales,
	localeLabels,
	type Locale,
} from '@/i18n/config';

export function LanguageSwitcher({
	className = '',
	variant = 'dark',
}: {
	className?: string;
	variant?: 'dark' | 'light';
}) {
	const t = useTranslations();
	const current = useLocale() as Locale;
	const pathname = usePathname();
	const [pending, setPending] = useState(false);

	// The locale lives in the URL (/csp-partners/{locale}/...). Switching swaps
	// the locale segment and does a real navigation: the NextIntlClientProvider
	// lives in the root layout (above the [locale] segment), so a soft client
	// navigation would not re-render it and the messages would stay in the old
	// language. A full navigation re-renders the server tree with the new locale.
	const select = (next: Locale) => {
		if (next === current) return;
		const segments = pathname.split('/'); // ['', 'csp-partners', '{locale}', ...]
		let target: string;
		if (segments[1] === LOCALE_BASE_PATH.slice(1) && isLocale(segments[2])) {
			segments[2] = next;
			target = segments.join('/');
		} else {
			// Not on a locale-prefixed path (defensive) — go to the landing page.
			target = localeHref(next);
		}
		const search = typeof window !== 'undefined' ? window.location.search : '';
		setPending(true);
		window.location.assign(`${target}${search}`);
	};

	const iconColor = variant === 'dark' ? 'white' : '#091f2c';
	const textColor = variant === 'dark' ? 'white' : '#091f2c';

	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<Button
					appearance="subtle"
					size="medium"
					icon={<Globe20Regular style={{ color: iconColor }} />}
					iconPosition="before"
					disabled={pending}
					className={className}
					aria-label={t('common.selectLanguage')}
					style={{ color: textColor, fontSize: '14px', padding: '6px 12px' }}
				>
					<span className="flex items-center gap-1.5">
						{localeLabels[current] ?? current.toUpperCase()}
						<ChevronDown16Regular style={{ color: iconColor }} />
					</span>
				</Button>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					{locales.map((l) => (
						<MenuItem key={l} onClick={() => select(l)} disabled={l === current}>
							{localeLabels[l]}
						</MenuItem>
					))}
				</MenuList>
			</MenuPopover>
		</Menu>
	);
}

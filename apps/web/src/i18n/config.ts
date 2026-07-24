export const locales = ['en', 'da', 'nl', 'ms', 'de', 'nb', 'sv', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// The app is mounted under /csp-partners (nginx only routes that prefix), so the
// locale lives nested under it: /csp-partners/{locale}/...
export const LOCALE_BASE_PATH = '/csp-partners';

// Request header set by middleware so the (non-routing) next-intl request config
// can read the URL locale without a cookie.
export const LOCALE_HEADER = 'x-next-locale';

/** Build a locale-prefixed app path, e.g. localeHref('fr', '/dashboard'). */
export function localeHref(locale: string, subpath = ''): string {
	return `${LOCALE_BASE_PATH}/${locale}${subpath}`;
}

export const localeLabels: Record<Locale, string> = {
	en: 'English',
	da: 'Danish',
	nl: 'Dutch',
	ms: 'Malay',
	de: 'German',
	nb: 'Norwegian',
	sv: 'Swedish',
	fr: 'French',
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

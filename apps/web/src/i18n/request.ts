import { headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { isLocale, LOCALE_HEADER } from './config';
import { pickLocaleFromAcceptLanguage } from './detect';

export default getRequestConfig(async () => {
	const headerStore = await headers();

	// Locale comes from the URL: middleware reads /csp-partners/{locale} and
	// forwards it via LOCALE_HEADER. Fall back to Accept-Language (e.g. routes
	// not matched by middleware) and finally the default locale.
	const fromUrl = headerStore.get(LOCALE_HEADER);
	const locale = isLocale(fromUrl)
		? fromUrl
		: pickLocaleFromAcceptLanguage(headerStore.get('accept-language'));

	const messages = (await import(`../../messages/${locale}.json`)).default;

	return { locale, messages };
});

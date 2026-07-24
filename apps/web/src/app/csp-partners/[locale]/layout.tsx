import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';

// The locale lives in the URL (/csp-partners/{locale}/...). Validate it here so
// an unknown segment 404s instead of loading the app with a fallback language.
// The shell, providers and <html lang> stay in the root layout, which reads the
// same locale from the request header set by middleware.
export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) {
		notFound();
	}

	return children;
}

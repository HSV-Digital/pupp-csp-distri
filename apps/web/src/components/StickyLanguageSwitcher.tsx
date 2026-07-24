'use client';

import { usePathname } from 'next/navigation';
import { isLocale, LOCALE_BASE_PATH } from '@/i18n/config';
import { LanguageSwitcher } from './LanguageSwitcher';

// Show only on the landing/hero page: /csp-partners or /csp-partners/{locale}.
function isLandingPath(pathname: string): boolean {
	if (pathname === '/' || pathname === LOCALE_BASE_PATH) return true;
	const segments = pathname.split('/'); // ['', 'csp-partners', '{locale}']
	return (
		segments.length === 3 &&
		segments[1] === LOCALE_BASE_PATH.slice(1) &&
		isLocale(segments[2])
	);
}

export function StickyLanguageSwitcher() {
	const pathname = usePathname();
	if (!isLandingPath(pathname)) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 rounded-md bg-black shadow-md transition-colors hover:bg-gray-800">
			<LanguageSwitcher className="!text-white hover:!bg-transparent" />
		</div>
	);
}

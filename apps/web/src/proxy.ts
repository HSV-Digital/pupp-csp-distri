import { NextResponse, type NextRequest } from 'next/server';
import {
	isLocale,
	LOCALE_BASE_PATH,
	LOCALE_HEADER,
	type Locale,
} from '@/i18n/config';
import { pickLocaleFromAcceptLanguage } from '@/i18n/detect';

const GEO_TIMEOUT_MS = 3000;

function extractIp(request: NextRequest): string | null {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		const first = forwardedFor.split(',')[0]?.trim();
		if (first) return first;
	}
	return request.headers.get('x-real-ip')?.trim() ?? null;
}

async function resolveQuebecLocale(ip: string): Promise<'fr' | null> {
	try {
		const apiKey = process.env.FREEIPAPI_KEY?.trim();
		const headers: Record<string, string> = {};
		const url = apiKey
			? `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`
			: `https://free.freeipapi.com/api/json/${encodeURIComponent(ip)}`;
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		const res = await fetch(url, {
			headers,
			signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			countryName?: string;
			regionName?: string;
		};
		if (data.countryName?.trim().toLowerCase() !== 'canada') return null;
		const region = data.regionName?.trim().toLowerCase();
		return region === 'quebec' || region === 'québec' ? 'fr' : null;
	} catch {
		return null;
	}
}

async function detectLocale(request: NextRequest): Promise<Locale> {
	const ip = extractIp(request);
	const geoLocale = ip ? await resolveQuebecLocale(ip) : null;
	return geoLocale ?? pickLocaleFromAcceptLanguage(request.headers.get('accept-language'));
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Path segments after the /csp-partners base, e.g. /csp-partners/fr/dashboard
	// -> ['fr', 'dashboard']. The matcher guarantees we are under the base path.
	const rest = pathname.slice(LOCALE_BASE_PATH.length).replace(/^\//, '');
	const segments = rest.length > 0 ? rest.split('/') : [];
	const first = segments[0];

	// API is surfaced under /csp-partners/api/* via a rewrite — never localize it.
	if (first === 'api') return NextResponse.next();

	// Already locale-prefixed: forward the locale to the app via a request header
	// so the (non-routing) next-intl request config can pick it up.
	if (isLocale(first)) {
		const requestHeaders = new Headers(request.headers);
		requestHeaders.set(LOCALE_HEADER, first);
		return NextResponse.next({ request: { headers: requestHeaders } });
	}

	// Bare /csp-partners or a legacy unprefixed deep link (e.g. /csp-partners/
	// dashboard): detect the locale and redirect to the prefixed URL, preserving
	// any remaining path and the query string.
	const locale = await detectLocale(request);
	const url = request.nextUrl.clone();
	url.pathname = `${LOCALE_BASE_PATH}/${locale}${rest ? `/${rest}` : ''}`;
	return NextResponse.redirect(url);
}

export const config = {
	// Match the /csp-partners surface but skip Next internals (_next, surfaced
	// under the asset prefix), the API rewrite, and any file with an extension.
	matcher: ['/csp-partners', '/csp-partners/((?!_next|api|.*\\..*).*)'],
};

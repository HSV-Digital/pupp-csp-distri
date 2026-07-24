import { describe, expect, it } from 'vitest';

import { config, proxy } from './proxy';

function makeRequest(url: string, headers: Record<string, string> = {}) {
	const nextUrl = new URL(url);
	return {
		nextUrl: Object.assign(nextUrl, { clone: () => new URL(nextUrl.href) }),
		headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
	} as never;
}

describe('proxy', () => {
	it('matches the /csp-partners surface', () => {
		expect(config.matcher).toContain('/csp-partners');
	});

	it('forwards an already locale-prefixed request with the locale header', async () => {
		const response = await proxy(
			makeRequest('https://partner.example.com/csp-partners/fr/dashboard'),
		);

		// NextResponse.next() -> 200, locale forwarded to the app.
		expect(response.status).toBe(200);
		expect(response.headers.get('x-middleware-request-x-next-locale')).toBe(
			'fr',
		);
	});

	it('redirects a bare path to the detected locale', async () => {
		const response = await proxy(
			makeRequest('https://partner.example.com/csp-partners', {
				'accept-language': 'fr-CA,fr;q=0.9',
			}),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toContain('/csp-partners/fr');
	});

	it('redirects a legacy unprefixed deep link, preserving the rest', async () => {
		const response = await proxy(
			makeRequest('https://partner.example.com/csp-partners/dashboard', {
				'accept-language': 'de-DE,de;q=0.9',
			}),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toContain(
			'/csp-partners/de/dashboard',
		);
	});

	it('passes API requests through untouched', async () => {
		const response = await proxy(
			makeRequest(
				'https://partner.example.com/csp-partners/api/reseller/proxy/x',
			),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
	});
});

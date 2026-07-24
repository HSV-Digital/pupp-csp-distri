import type { NextRequest } from 'next/server';
import { getResellerAccessToken } from '@/lib/auth-runtime';
import { proxyBackendRequest } from '@/lib/backend-proxy';

type RouteContext = {
	params: Promise<{
		path?: string[];
	}>;
};

// This route authenticates via the httpOnly session cookie, so cross-site
// requests must be rejected. Browsers always send an Origin header on
// cross-site (and same-origin non-GET) requests; compare it against Host
// rather than nextUrl.origin so TLS termination upstream doesn't break it.
function isCrossSiteRequest(request: NextRequest): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return false;

	try {
		return new URL(origin).host !== request.headers.get('host');
	} catch {
		return true;
	}
}

async function handleRequest(
	request: NextRequest,
	context: RouteContext,
): Promise<Response> {
	if (
		request.method !== 'GET' &&
		request.method !== 'HEAD' &&
		isCrossSiteRequest(request)
	) {
		return Response.json({ message: 'Cross-site request rejected' }, {
			status: 403,
		});
	}

	const accessToken = await getResellerAccessToken(request);
	if (!accessToken) {
		return Response.json({ message: 'Not authenticated' }, { status: 401 });
	}

	const { path = [] } = await context.params;
	return proxyBackendRequest({
		request,
		pathSegments: path,
		accessToken,
	});
}

export async function GET(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
	return handleRequest(request, context);
}

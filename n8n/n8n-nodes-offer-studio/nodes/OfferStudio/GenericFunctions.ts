import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { parseSpec, type ParsedSpec } from './spec';

export const CREDENTIAL = 'offerStudioApi';
export const DEFAULT_BASE_URL = 'http://offer-studio:3000';
export const CUSTOM_RESOURCE = '__custom';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions | ITriggerFunctions;

export function baseUrlOf(credentials: ICredentialDataDecryptedObject): string {
	const raw = String(credentials.baseUrl || '').trim() || DEFAULT_BASE_URL;
	return raw.replace(/\/+$/, '');
}

export interface RawResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: Buffer;
}

/** Request with the Offer Studio credential. Always returns the raw bytes and status (the caller handles HTTP errors). */
export async function studioRequest(
	ctx: Ctx,
	opts: {
		method: string;
		path: string;
		qs?: IDataObject;
		body?: unknown;
		rawBody?: Buffer;
		contentType?: string;
		timeout?: number;
	},
): Promise<RawResponse> {
	const credentials = await ctx.getCredentials(CREDENTIAL);
	const headers: IDataObject = { accept: 'application/json, */*' };
	let body: IHttpRequestOptions['body'];
	if (opts.rawBody) {
		body = opts.rawBody;
		headers['content-type'] = opts.contentType || 'application/octet-stream';
	} else if (opts.body !== undefined) {
		body = Buffer.from(JSON.stringify(opts.body), 'utf8');
		headers['content-type'] = 'application/json';
	}
	const request: IHttpRequestOptions = {
		method: opts.method as IHttpRequestMethods,
		url: `${baseUrlOf(credentials)}${opts.path}`,
		qs: opts.qs,
		headers,
		body,
		encoding: 'arraybuffer',
		json: false,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: opts.timeout ?? 300_000,
	};
	const res = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, CREDENTIAL, request)) as {
		statusCode: number;
		headers: Record<string, string>;
		body: Buffer | ArrayBuffer | string | undefined;
	};
	const buf = Buffer.isBuffer(res.body)
		? res.body
		: res.body instanceof ArrayBuffer
			? Buffer.from(res.body)
			: Buffer.from(res.body === undefined ? '' : typeof res.body === 'string' ? res.body : JSON.stringify(res.body));
	const lower: Record<string, string> = {};
	for (const [k, v] of Object.entries(res.headers || {})) lower[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
	return { statusCode: res.statusCode, headers: lower, body: buf };
}

export function isJson(res: RawResponse): boolean {
	return (res.headers['content-type'] || '').includes('json');
}

export function parseJsonBody(res: RawResponse): unknown {
	const text = res.body.toString('utf8');
	if (!text.trim()) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/** Throws a NodeApiError with Offer Studio's message ({"error": "..."}) for statuses >= 400. */
export function assertOk(ctx: Ctx, res: RawResponse, itemIndex?: number): void {
	if (res.statusCode < 400) return;
	const parsed = parseJsonBody(res);
	const message =
		(parsed && typeof parsed === 'object' && typeof (parsed as IDataObject).error === 'string'
			? ((parsed as IDataObject).error as string)
			: typeof parsed === 'string'
				? parsed.slice(0, 500)
				: '') || `HTTP ${res.statusCode}`;
	const hints: Record<number, string> = {
		401: 'Check the API token in the Offer Studio credential (STUDIO_API_TOKEN).',
		404: 'This record or endpoint does not exist in this version of Offer Studio.',
	};
	throw new NodeApiError(
		ctx.getNode(),
		{ message, statusCode: res.statusCode, body: (parsed ?? null) as JsonObject } as JsonObject,
		{ message, description: hints[res.statusCode], httpCode: String(res.statusCode), itemIndex },
	);
}

// The API description is cached briefly: in the editor that means one fetch for several lists, and during
// execution one fetch per run. New endpoints become visible after SPEC_TTL_MS at the latest.
const SPEC_TTL_MS = 30_000;
const specCache = new Map<string, { at: number; spec: ParsedSpec }>();

export async function loadSpec(ctx: Ctx, { fresh = false } = {}): Promise<ParsedSpec> {
	const credentials = await ctx.getCredentials(CREDENTIAL);
	const key = `${baseUrlOf(credentials)}|${String(credentials.token || '').slice(-6)}`;
	const hit = specCache.get(key);
	if (!fresh && hit && Date.now() - hit.at < SPEC_TTL_MS) return hit.spec;
	let res: RawResponse;
	try {
		res = await studioRequest(ctx, { method: 'GET', path: '/api/openapi.json', timeout: 20_000 });
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Could not connect to Offer Studio (${baseUrlOf(credentials)}): ${(error as Error).message}`,
		);
	}
	if (res.statusCode === 404) {
		throw new NodeOperationError(
			ctx.getNode(),
			'This version of Offer Studio does not serve /api/openapi.json. Update Offer Studio or use "Custom API Call".',
		);
	}
	assertOk(ctx, res);
	const spec = parseSpec(parseJsonBody(res) as Record<string, unknown>);
	specCache.set(key, { at: Date.now(), spec });
	return spec;
}

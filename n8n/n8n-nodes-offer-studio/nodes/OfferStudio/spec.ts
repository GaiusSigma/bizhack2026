// Parses Offer Studio's API description (OpenAPI 3.1 from /api/openapi.json) into the shape
// the n8n node builds its resources, operations and fields from. No dependency on n8n,
// so it can be tested with plain `node --test`.

export type FieldKind = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'options';

export interface Field {
	/** Key in the resource mapper: "path:id", "query:type", "body:title", "file:file", "raw:body" */
	id: string;
	name: string;
	location: 'path' | 'query' | 'body' | 'file' | 'raw';
	kind: FieldKind;
	required: boolean;
	description?: string;
	enum?: string[];
	defaultValue?: string | number | boolean;
	/** Path of the list to pick the id from (x-n8n-list extension) */
	list?: string;
}

export interface Operation {
	/** Value saved in the node: "GET /api/offers/{id}/pdf" */
	key: string;
	method: string;
	path: string;
	operationId: string;
	summary: string;
	description?: string;
	tag: string;
	fields: Field[];
	bodyType: 'none' | 'json' | 'multipart';
	/** Body is an array or arbitrary JSON given as a whole (x-raw-body) */
	rawBody: boolean;
	/** Response type from the description (binary: PDF, .figcraft) */
	response: 'json' | 'binary' | 'none' | 'stream';
	hidden: boolean;
	undocumented: boolean;
}

export interface ParsedSpec {
	version: string;
	tags: Array<{ name: string; description?: string }>;
	operations: Operation[];
	eventTables: string[];
}

type Json = Record<string, any>;

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function deref(spec: Json, schema: Json | undefined, depth = 0): Json {
	if (!schema || typeof schema !== 'object') return {};
	if (typeof schema.$ref === 'string' && depth < 10) {
		const parts = schema.$ref.replace(/^#\//, '').split('/');
		let target: any = spec;
		for (const p of parts) target = target?.[p];
		return deref(spec, target, depth + 1);
	}
	return schema;
}

function kindOf(schema: Json): FieldKind {
	if (Array.isArray(schema.enum) && schema.enum.length) return 'options';
	const t = Array.isArray(schema.type) ? schema.type.find((x: string) => x !== 'null') : schema.type;
	if (t === 'integer' || t === 'number') return 'number';
	if (t === 'boolean') return 'boolean';
	if (t === 'object') return 'object';
	if (t === 'array') return 'array';
	return 'string';
}

function responseKind(op: Json): Operation['response'] {
	const codes = Object.keys(op.responses || {}).filter((c) => c.startsWith('2'));
	if (!codes.length) return 'json';
	let sawEmpty = false;
	for (const code of codes) {
		const content = op.responses[code]?.content;
		if (!content) {
			sawEmpty = true;
			continue;
		}
		const types = Object.keys(content);
		if (types.some((t) => t.includes('json'))) return 'json';
		if (types.some((t) => t === 'text/event-stream')) return 'stream';
		if (types.length) return 'binary';
	}
	return sawEmpty ? 'none' : 'json';
}

export function parseSpec(spec: Json): ParsedSpec {
	if (!spec || typeof spec !== 'object' || !spec.paths) {
		throw new Error('The response does not look like an OpenAPI description (no "paths")');
	}
	const operations: Operation[] = [];
	for (const [path, item] of Object.entries<Json>(spec.paths)) {
		for (const method of METHODS) {
			const op = item?.[method];
			if (!op) continue;
			const fields: Field[] = [];
			const params = [...(item.parameters || []), ...(op.parameters || [])].map((p: Json) => deref(spec, p));
			for (const p of params) {
				if (p.in !== 'path' && p.in !== 'query') continue;
				const schema = deref(spec, p.schema);
				const kind = kindOf(schema);
				fields.push({
					id: `${p.in}:${p.name}`,
					name: p.name,
					location: p.in,
					kind,
					required: p.in === 'path' || Boolean(p.required),
					description: p.description,
					enum: kind === 'options' ? schema.enum.map(String) : undefined,
					defaultValue: schema.default,
					list: p['x-n8n-list'] ?? schema['x-n8n-list'],
				});
			}
			// path parameters the description does not list
			for (const m of path.matchAll(/\{([^}]+)\}/g)) {
				if (!fields.some((f) => f.location === 'path' && f.name === m[1])) {
					fields.push({ id: `path:${m[1]}`, name: m[1], location: 'path', kind: 'string', required: true });
				}
			}

			let bodyType: Operation['bodyType'] = 'none';
			let rawBody = false;
			const rb = deref(spec, op.requestBody);
			const content: Json = rb.content || {};
			const jsonType = Object.keys(content).find((t) => t.includes('json'));
			if (content['multipart/form-data']) {
				bodyType = 'multipart';
				const schema = deref(spec, content['multipart/form-data'].schema);
				const required: string[] = schema.required || [];
				for (const [name, raw] of Object.entries<Json>(schema.properties || {})) {
					const s = deref(spec, raw);
					const isFile = s.format === 'binary';
					fields.push({
						id: `${isFile ? 'file' : 'body'}:${name}`,
						name,
						location: isFile ? 'file' : 'body',
						kind: isFile ? 'string' : kindOf(s),
						required: required.includes(name),
						description: isFile ? `Name of the binary property holding the file (${s.description || name})` : s.description,
						defaultValue: isFile ? 'data' : s.default,
					});
				}
			} else if (jsonType) {
				bodyType = 'json';
				const schema = deref(spec, content[jsonType].schema);
				const props = schema.properties as Json | undefined;
				if (rb['x-raw-body'] || !props || !Object.keys(props).length || schema.type === 'array') {
					rawBody = true;
					fields.push({
						id: 'raw:body',
						name: 'body',
						location: 'raw',
						kind: schema.type === 'array' ? 'array' : 'object',
						required: Boolean(rb.required),
						description: 'Request body (JSON)',
					});
				} else {
					const required: string[] = schema.required || [];
					for (const [name, raw] of Object.entries<Json>(props)) {
						const s = deref(spec, raw);
						if (s.readOnly) continue;
						const kind = kindOf(s);
						fields.push({
							id: `body:${name}`,
							name,
							location: 'body',
							kind,
							required: required.includes(name),
							description: s.description,
							enum: kind === 'options' ? s.enum.map(String) : undefined,
							defaultValue: s.default,
							list: s['x-n8n-list'],
						});
					}
				}
			}

			operations.push({
				key: `${method.toUpperCase()} ${path}`,
				method: method.toUpperCase(),
				path,
				operationId: op.operationId || `${method}${path}`,
				summary: op.summary || `${method.toUpperCase()} ${path}`,
				description: op.description,
				tag: op.tags?.[0] || 'Other',
				fields,
				bodyType,
				rawBody,
				response: responseKind(op),
				hidden: Boolean(op['x-n8n-hidden']),
				undocumented: Boolean(op['x-undocumented']),
			});
		}
	}

	const declared: Array<{ name: string; description?: string }> = Array.isArray(spec.tags) ? spec.tags : [];
	const used = [...new Set(operations.filter((o) => !o.hidden).map((o) => o.tag))];
	const tags = [
		...declared.filter((t) => used.includes(t.name)),
		...used.filter((t) => !declared.some((d) => d.name === t)).map((name) => ({ name })),
	];
	const events = spec['x-offer-studio']?.events;
	return {
		version: String(spec.info?.version ?? ''),
		tags,
		operations,
		eventTables: Array.isArray(events?.tables) ? events.tables : ['offers', 'slides', 'blocks', 'templates', '*'],
	};
}

/** Fills in path parameters: "/api/offers/{id}/pdf" + {id: "x y"} -> "/api/offers/x%20y/pdf" */
export function fillPath(path: string, values: Record<string, unknown>): string {
	return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const v = values[name];
		if (v === undefined || v === null || v === '') {
			throw new Error(`Missing value for path parameter "${name}"`);
		}
		return encodeURIComponent(String(v));
	});
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

function parseJsonValue(field: Field, value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const text = value.trim();
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`Field "${field.name}" must be valid JSON (${field.kind})`);
	}
}

function coerce(field: Field, value: unknown): unknown {
	if (field.kind === 'object' || field.kind === 'array') return parseJsonValue(field, value);
	if (field.kind === 'number' && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
		return Number(value);
	}
	if (field.kind === 'boolean' && typeof value === 'string') {
		if (value === 'true') return true;
		if (value === 'false') return false;
	}
	return value;
}

export interface BuiltRequest {
	method: string;
	path: string;
	qs: Record<string, unknown>;
	/** JSON (object or array) or undefined */
	body?: unknown;
	/** multipart: plain text fields */
	formFields: Record<string, string>;
	/** multipart: form field -> name of the n8n item's binary property */
	files: Record<string, string>;
}

/**
 * Builds the request from the resource mapper values. Empty fields are skipped (so PATCH does not clear them);
 * `extraBody` (the "Body JSON" option) is merged with the fields or, if it is an array, replaces the body.
 */
export function buildRequest(op: Operation, values: Record<string, unknown>, extraBody?: unknown): BuiltRequest {
	const pathValues: Record<string, unknown> = {};
	const qs: Record<string, unknown> = {};
	const body: Record<string, unknown> = {};
	const formFields: Record<string, string> = {};
	const files: Record<string, string> = {};
	let raw: unknown;

	for (const field of op.fields) {
		let value = values[field.id];
		if (isEmpty(value)) {
			if (field.required && field.location !== 'raw' && field.location !== 'body') {
				throw new Error(`Fill in the required field "${field.name}"`);
			}
			continue;
		}
		value = coerce(field, value);
		if (isEmpty(value)) continue;
		switch (field.location) {
			case 'path':
				pathValues[field.name] = value;
				break;
			case 'query':
				qs[field.name] = typeof value === 'object' ? JSON.stringify(value) : value;
				break;
			case 'file':
				files[field.name] = String(value);
				break;
			case 'raw':
				raw = value;
				break;
			case 'body':
				if (op.bodyType === 'multipart') formFields[field.name] = typeof value === 'object' ? JSON.stringify(value) : String(value);
				else body[field.name] = value;
				break;
		}
	}

	let finalBody: unknown;
	if (op.bodyType === 'json') {
		finalBody = raw !== undefined ? raw : Object.keys(body).length ? body : undefined;
		if (extraBody !== undefined) {
			if (Array.isArray(extraBody) || Array.isArray(finalBody) || typeof extraBody !== 'object' || extraBody === null) {
				finalBody = extraBody;
			} else {
				finalBody = { ...((finalBody as object) || {}), ...(extraBody as object) };
			}
		}
		for (const f of op.fields) {
			if (f.location === 'body' && f.required && (finalBody === undefined || (!Array.isArray(finalBody) && isEmpty((finalBody as Record<string, unknown>)[f.name])))) {
				throw new Error(`Fill in the required field "${f.name}"`);
			}
		}
		if (finalBody === undefined && op.fields.some((f) => f.location === 'raw' && f.required)) {
			throw new Error('This operation requires a request body (JSON)');
		}
	}
	if (op.bodyType === 'multipart') {
		for (const f of op.fields) {
			if (f.required && f.location === 'file' && !files[f.name]) throw new Error(`Specify the binary property for "${f.name}"`);
		}
	}

	return { method: op.method, path: fillPath(op.path, pathValues), qs, body: finalBody, formFields, files };
}

/** Dependency-free multipart/form-data: text fields + files. */
export function buildMultipart(
	fields: Record<string, string>,
	files: Array<{ field: string; fileName: string; mimeType: string; data: Buffer }>,
): { body: Buffer; contentType: string } {
	const boundary = `----n8nOfferStudio${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
	const chunks: Buffer[] = [];
	const esc = (s: string) => s.replace(/"/g, '%22').replace(/\r|\n/g, ' ');
	for (const [name, value] of Object.entries(fields)) {
		chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${esc(name)}"\r\n\r\n${value}\r\n`, 'utf8'));
	}
	for (const f of files) {
		chunks.push(
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="${esc(f.field)}"; filename="${esc(f.fileName)}"\r\nContent-Type: ${f.mimeType}\r\n\r\n`,
				'utf8',
			),
		);
		chunks.push(f.data);
		chunks.push(Buffer.from('\r\n', 'utf8'));
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
	return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** File name from the Content-Disposition header. */
export function fileNameFromDisposition(header: unknown): string | undefined {
	if (typeof header !== 'string') return undefined;
	const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
	if (star) {
		try {
			return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
		} catch {
			/* fall back to the plain name below */
		}
	}
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain?.[1];
}

/** Path of a single record for an SSE event {table, id}. */
export function recordPath(table: string, id: string): string | undefined {
	const paths: Record<string, string> = {
		offers: '/api/offers/',
		slides: '/api/slides/',
		blocks: '/api/blocks/',
		templates: '/api/templates/',
	};
	return paths[table] ? `${paths[table]}${encodeURIComponent(id)}` : undefined;
}

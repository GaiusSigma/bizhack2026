// Czytanie opisu API Offer Studio (OpenAPI 3.1 z /api/openapi.json) do postaci,
// z której węzeł n8n buduje listę zasobów, operacji i pól. Bez zależności od n8n,
// żeby dało się to testować samym `node --test`.

export type FieldKind = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'options';

export interface Field {
	/** Klucz w resource mapperze: "path:id", "query:type", "body:title", "file:file", "raw:body" */
	id: string;
	name: string;
	location: 'path' | 'query' | 'body' | 'file' | 'raw';
	kind: FieldKind;
	required: boolean;
	description?: string;
	enum?: string[];
	defaultValue?: string | number | boolean;
	/** Ścieżka listy, z której można wybrać id (rozszerzenie x-n8n-list) */
	list?: string;
}

export interface Operation {
	/** Wartość zapisywana w węźle: "GET /api/offers/{id}/pdf" */
	key: string;
	method: string;
	path: string;
	operationId: string;
	summary: string;
	description?: string;
	tag: string;
	fields: Field[];
	bodyType: 'none' | 'json' | 'multipart';
	/** Body jest tablicą albo dowolnym JSON-em podanym w całości (x-raw-body) */
	rawBody: boolean;
	/** Typ odpowiedzi z opisu (binarna: PDF, .figcraft) */
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
		throw new Error('Odpowiedź nie wygląda na opis OpenAPI (brak "paths")');
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
			// parametry ścieżki, których opis nie wymienia
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
						description: isFile ? `Nazwa pola binarnego z pliku (${s.description || name})` : s.description,
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
						description: 'Treść żądania (JSON)',
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
				tag: op.tags?.[0] || 'Inne',
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

/** Podstawia parametry ścieżki: "/api/offers/{id}/pdf" + {id: "x y"} -> "/api/offers/x%20y/pdf" */
export function fillPath(path: string, values: Record<string, unknown>): string {
	return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const v = values[name];
		if (v === undefined || v === null || v === '') {
			throw new Error(`Brak wartości parametru ścieżki "${name}"`);
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
		throw new Error(`Pole "${field.name}" musi być poprawnym JSON-em (${field.kind})`);
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
	/** JSON (obiekt albo tablica) albo undefined */
	body?: unknown;
	/** multipart: zwykłe pola tekstowe */
	formFields: Record<string, string>;
	/** multipart: pole formularza -> nazwa pola binarnego elementu n8n */
	files: Record<string, string>;
}

/**
 * Składa żądanie z wartości resource mappera. Puste pola są pomijane (PATCH ich nie zeruje);
 * `extraBody` (opcja „Treść JSON”) jest scalane z polami albo, gdy to tablica, zastępuje body.
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
				throw new Error(`Uzupełnij wymagane pole "${field.name}"`);
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
				throw new Error(`Uzupełnij wymagane pole "${f.name}"`);
			}
		}
		if (finalBody === undefined && op.fields.some((f) => f.location === 'raw' && f.required)) {
			throw new Error('Ta operacja wymaga treści żądania (JSON)');
		}
	}
	if (op.bodyType === 'multipart') {
		for (const f of op.fields) {
			if (f.required && f.location === 'file' && !files[f.name]) throw new Error(`Wskaż pole binarne dla "${f.name}"`);
		}
	}

	return { method: op.method, path: fillPath(op.path, pathValues), qs, body: finalBody, formFields, files };
}

/** multipart/form-data bez zależności: pola tekstowe + pliki. */
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

/** Nazwa pliku z nagłówka Content-Disposition. */
export function fileNameFromDisposition(header: unknown): string | undefined {
	if (typeof header !== 'string') return undefined;
	const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
	if (star) {
		try {
			return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
		} catch {
			/* zwykła nazwa niżej */
		}
	}
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain?.[1];
}

/** Ścieżka pojedynczego rekordu dla zdarzenia SSE {table, id}. */
export function recordPath(table: string, id: string): string | undefined {
	const paths: Record<string, string> = {
		offers: '/api/offers/',
		slides: '/api/slides/',
		blocks: '/api/blocks/',
		templates: '/api/templates/',
	};
	return paths[table] ? `${paths[table]}${encodeURIComponent(id)}` : undefined;
}

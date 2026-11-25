import type {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	CUSTOM_RESOURCE,
	assertOk,
	isJson,
	loadSpec,
	parseJsonBody,
	studioRequest,
	type RawResponse,
} from './GenericFunctions';
import { buildMultipart, buildRequest, fileNameFromDisposition, type Field, type Operation } from './spec';

const FIELD_TYPES: Record<Field['kind'], FieldType> = {
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	object: 'object',
	array: 'array',
	options: 'options',
};

const LOCATION_LABEL: Record<Field['location'], string> = {
	path: '',
	query: ' (filtr / parametr)',
	body: '',
	file: ' (pole binarne)',
	raw: '',
};

function toMapperField(f: Field): ResourceMapperField {
	const hint = f.list ? ` – id z ${f.list}` : '';
	return {
		id: f.id,
		displayName: `${f.name}${LOCATION_LABEL[f.location]}${f.description ? `: ${f.description}` : ''}${hint}`,
		required: f.required,
		defaultMatch: false,
		canBeUsedToMatch: false,
		display: true,
		type: FIELD_TYPES[f.kind],
		options: f.enum?.map((v) => ({ name: v === '' ? '(puste)' : v, value: v })),
		defaultValue: f.defaultValue ?? (f.location === 'file' ? 'data' : undefined),
	};
}

function parseJsonParam(ctx: IExecuteFunctions, value: unknown, label: string, itemIndex: number): unknown {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') return value;
	if (!value.trim()) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		throw new NodeOperationError(ctx.getNode(), `${label}: niepoprawny JSON`, { itemIndex });
	}
}

export class OfferStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Offer Studio',
		name: 'offerStudio',
		icon: 'file:offerStudio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] === "__custom" ? $parameter["method"] + " " + $parameter["path"] : $parameter["operation"]}}',
		description:
			'Ofertownik: oferty, slajdy, bloki wiedzy, szablony, PDF. Operacje są czytane na żywo z API Offer Studio.',
		defaults: { name: 'Offer Studio' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'offerStudioApi', required: true }],
		properties: [
			{
				displayName:
					'Lista operacji i pól pochodzi z /api/openapi.json Offer Studio, więc nowe funkcje ofertownika pojawiają się tu same po jego aktualizacji.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Zasób',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				typeOptions: { loadOptionsMethod: 'getResources' },
				default: 'Oferty',
			},
			{
				displayName: 'Operacja',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				typeOptions: { loadOptionsMethod: 'getOperations', loadOptionsDependsOn: ['resource'] },
				default: '',
				displayOptions: { hide: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Pola',
				name: 'fields',
				type: 'resourceMapper',
				noDataExpression: true,
				default: { mappingMode: 'defineBelow', value: null },
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['resource', 'operation'],
					resourceMapper: {
						resourceMapperMethod: 'getFields',
						mode: 'add',
						fieldWords: { singular: 'pole', plural: 'pola' },
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						hideNoDataError: true,
						noFieldsError: 'Ta operacja nie ma parametrów.',
						refreshStaleSchemaOnOpen: true,
					},
				},
				displayOptions: { hide: { resource: [CUSTOM_RESOURCE] } },
			},

			// ------------------------------------------------ dowolne żądanie
			{
				displayName: 'Metoda',
				name: 'method',
				type: 'options',
				options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ name: m, value: m })),
				default: 'GET',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Ścieżka',
				name: 'path',
				type: 'string',
				default: '/api/offers',
				placeholder: '/api/offers/gaius-vault-bazowa',
				description: 'Ścieżka w Offer Studio, zaczyna się od /api/',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Parametry Zapytania (JSON)',
				name: 'query',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Treść (JSON)',
				name: 'body',
				type: 'json',
				default: '',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE], method: ['POST', 'PUT', 'PATCH', 'DELETE'] } },
			},

			// ------------------------------------------------ opcje
			{
				displayName: 'Opcje',
				name: 'options',
				type: 'collection',
				placeholder: 'Dodaj opcję',
				default: {},
				options: [
					{
						displayName: 'Treść JSON',
						name: 'bodyJson',
						type: 'json',
						default: '',
						description:
							'Scalana z polami powyżej; tablica (np. kilka bloków naraz) zastępuje całą treść żądania',
					},
					{
						displayName: 'Rozbij Listę Na Elementy',
						name: 'splitArray',
						type: 'boolean',
						default: true,
						description: 'Whether a list response becomes one n8n item per record',
					},
					{
						displayName: 'Pole Binarne Wyniku',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Gdzie zapisać plik z odpowiedzi (PDF, .figcraft)',
					},
					{
						displayName: 'Limit Czasu (s)',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 300,
						description: 'Render PDF dużej oferty może chwilę potrwać',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spec = await loadSpec(this, { fresh: true });
				return [
					...spec.tags.map((t) => ({ name: t.name, value: t.name, description: t.description })),
					{
						name: 'Dowolne Żądanie',
						value: CUSTOM_RESOURCE,
						description: 'Dowolna metoda i ścieżka API Offer Studio',
					},
				];
			},
			async getOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				const spec = await loadSpec(this);
				return spec.operations
					.filter((o) => o.tag === resource && !o.hidden)
					.map((o) => ({
						name: o.summary,
						value: o.key,
						action: o.summary,
						description: [o.description, o.key].filter(Boolean).join(' · '),
					}));
			},
		},
		resourceMapping: {
			async getFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const key = this.getCurrentNodeParameter('operation') as string;
				if (!key) return { fields: [], emptyFieldsNotice: 'Wybierz operację.' };
				const spec = await loadSpec(this);
				const op = spec.operations.find((o) => o.key === key);
				if (!op) return { fields: [], emptyFieldsNotice: `Offer Studio nie ma już operacji ${key}.` };
				return {
					fields: op.fields.map(toMapperField),
					emptyFieldsNotice: 'Ta operacja nie ma parametrów.',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const spec = resource === CUSTOM_RESOURCE ? undefined : await loadSpec(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const timeout = Number(options.timeout || 300) * 1000;
				let res: RawResponse;
				let op: Operation | undefined;

				if (resource === CUSTOM_RESOURCE) {
					const method = this.getNodeParameter('method', i) as string;
					let path = String(this.getNodeParameter('path', i) || '').trim();
					if (!path.startsWith('/')) path = `/${path}`;
					const qs = parseJsonParam(this, this.getNodeParameter('query', i, '{}'), 'Parametry zapytania', i) as IDataObject;
					const body = method === 'GET' ? undefined : parseJsonParam(this, this.getNodeParameter('body', i, ''), 'Treść', i);
					res = await studioRequest(this, { method, path, qs, body, timeout });
				} else {
					const key = this.getNodeParameter('operation', i) as string;
					op = spec!.operations.find((o) => o.key === key);
					if (!op) {
						throw new NodeOperationError(
							this.getNode(),
							`Offer Studio (wersja ${spec!.version}) nie ma operacji "${key}". Otwórz węzeł i wybierz operację ponownie.`,
							{ itemIndex: i },
						);
					}
					const values = (this.getNodeParameter('fields.value', i, {}) as IDataObject | null) ?? {};
					const extraBody = parseJsonParam(this, options.bodyJson, 'Treść JSON', i);
					let built;
					try {
						built = buildRequest(op, values, extraBody);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
					}
					if (op.bodyType === 'multipart') {
						const files = [];
						for (const [field, property] of Object.entries(built.files)) {
							const meta = this.helpers.assertBinaryData(i, property);
							files.push({
								field,
								fileName: meta.fileName || `${field}.bin`,
								mimeType: meta.mimeType || 'application/octet-stream',
								data: await this.helpers.getBinaryDataBuffer(i, property),
							});
						}
						const mp = buildMultipart(built.formFields, files);
						res = await studioRequest(this, {
							method: built.method,
							path: built.path,
							qs: built.qs as IDataObject,
							rawBody: mp.body,
							contentType: mp.contentType,
							timeout,
						});
					} else {
						res = await studioRequest(this, {
							method: built.method,
							path: built.path,
							qs: built.qs as IDataObject,
							body: built.body,
							timeout,
						});
					}
				}

				assertOk(this, res, i);
				out.push(...(await toItems(this, res, i, options, op)));
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}
		return [out];
	}
}

async function toItems(
	ctx: IExecuteFunctions,
	res: RawResponse,
	itemIndex: number,
	options: IDataObject,
	op?: Operation,
): Promise<INodeExecutionData[]> {
	const pairedItem = { item: itemIndex };
	const contentType = (res.headers['content-type'] || '').split(';')[0].trim();

	if (res.statusCode === 204 || res.body.length === 0) {
		return [{ json: { success: true, statusCode: res.statusCode }, pairedItem }];
	}
	if (isJson(res)) {
		const data = parseJsonBody(res);
		if (Array.isArray(data) && options.splitArray !== false) {
			return data.map((d) => ({ json: (d && typeof d === 'object' ? d : { value: d }) as IDataObject, pairedItem }));
		}
		return [{ json: (data && typeof data === 'object' && !Array.isArray(data) ? data : { data }) as IDataObject, pairedItem }];
	}
	if (contentType.startsWith('text/') && op?.response !== 'binary') {
		return [{ json: { data: res.body.toString('utf8') }, pairedItem }];
	}
	const property = String(options.binaryPropertyName || 'data');
	const fileName = fileNameFromDisposition(res.headers['content-disposition']);
	const binary = await ctx.helpers.prepareBinaryData(res.body, fileName, contentType || 'application/octet-stream');
	return [
		{
			json: { fileName: binary.fileName, mimeType: binary.mimeType, fileSize: res.body.length },
			binary: { [property]: binary },
			pairedItem,
		},
	];
}

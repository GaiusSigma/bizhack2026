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
	query: ' (filter / parameter)',
	body: '',
	file: ' (binary property)',
	raw: '',
};

function toMapperField(f: Field): ResourceMapperField {
	const hint = f.list ? ` – id from ${f.list}` : '';
	return {
		id: f.id,
		displayName: `${f.name}${LOCATION_LABEL[f.location]}${f.description ? `: ${f.description}` : ''}${hint}`,
		required: f.required,
		defaultMatch: false,
		canBeUsedToMatch: false,
		display: true,
		type: FIELD_TYPES[f.kind],
		options: f.enum?.map((v) => ({ name: v === '' ? '(empty)' : v, value: v })),
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
		throw new NodeOperationError(ctx.getNode(), `${label}: invalid JSON`, { itemIndex });
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
			'Offer Studio: offers, slides, knowledge blocks, templates, PDF. Operations are read live from the Offer Studio API.',
		defaults: { name: 'Offer Studio' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'offerStudioApi', required: true }],
		properties: [
			{
				displayName:
					"The operations and fields come from Offer Studio's /api/openapi.json, so new Offer Studio features appear here on their own once it is updated.",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				typeOptions: { loadOptionsMethod: 'getResources' },
				default: 'Offers',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				typeOptions: { loadOptionsMethod: 'getOperations', loadOptionsDependsOn: ['resource'] },
				default: '',
				displayOptions: { hide: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Fields',
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
						fieldWords: { singular: 'field', plural: 'fields' },
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						hideNoDataError: true,
						noFieldsError: 'This operation has no parameters.',
						refreshStaleSchemaOnOpen: true,
					},
				},
				displayOptions: { hide: { resource: [CUSTOM_RESOURCE] } },
			},

			// ------------------------------------------------ custom API call
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ name: m, value: m })),
				default: 'GET',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/api/offers',
				placeholder: '/api/offers/gaius-vault-base',
				description: 'Path in Offer Studio, starting with /api/',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Query Parameters (JSON)',
				name: 'query',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE] } },
			},
			{
				displayName: 'Body (JSON)',
				name: 'body',
				type: 'json',
				default: '',
				displayOptions: { show: { resource: [CUSTOM_RESOURCE], method: ['POST', 'PUT', 'PATCH', 'DELETE'] } },
			},

			// ------------------------------------------------ options
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Body JSON',
						name: 'bodyJson',
						type: 'json',
						default: '',
						description:
							'Merged with the fields above; an array (e.g. several blocks at once) replaces the whole request body',
					},
					{
						displayName: 'Split List Into Items',
						name: 'splitArray',
						type: 'boolean',
						default: true,
						description: 'Whether a list response becomes one n8n item per record',
					},
					{
						displayName: 'Output Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						description: 'Binary property to store the response file in (PDF, .figcraft)',
					},
					{
						displayName: 'Timeout (s)',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 300,
						description: 'Rendering the PDF of a large offer can take a while',
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
						name: 'Custom API Call',
						value: CUSTOM_RESOURCE,
						description: 'Any method and path of the Offer Studio API',
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
				if (!key) return { fields: [], emptyFieldsNotice: 'Select an operation.' };
				const spec = await loadSpec(this);
				const op = spec.operations.find((o) => o.key === key);
				if (!op) return { fields: [], emptyFieldsNotice: `Offer Studio no longer has the operation ${key}.` };
				return {
					fields: op.fields.map(toMapperField),
					emptyFieldsNotice: 'This operation has no parameters.',
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
					const qs = parseJsonParam(this, this.getNodeParameter('query', i, '{}'), 'Query Parameters', i) as IDataObject;
					const body = method === 'GET' ? undefined : parseJsonParam(this, this.getNodeParameter('body', i, ''), 'Body', i);
					res = await studioRequest(this, { method, path, qs, body, timeout });
				} else {
					const key = this.getNodeParameter('operation', i) as string;
					op = spec!.operations.find((o) => o.key === key);
					if (!op) {
						throw new NodeOperationError(
							this.getNode(),
							`Offer Studio (version ${spec!.version}) has no operation "${key}". Open the node and select the operation again.`,
							{ itemIndex: i },
						);
					}
					const values = (this.getNodeParameter('fields.value', i, {}) as IDataObject | null) ?? {};
					const extraBody = parseJsonParam(this, options.bodyJson, 'Body JSON', i);
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

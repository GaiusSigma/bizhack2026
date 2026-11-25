import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { CREDENTIAL, baseUrlOf, isJson, loadSpec, parseJsonBody, studioRequest } from './GenericFunctions';
import { recordPath } from './spec';

const TABLE_LABELS: Record<string, string> = {
	offers: 'Offers',
	slides: 'Slides',
	blocks: 'Knowledge blocks',
	templates: 'Templates',
	'*': 'Full database import',
};

interface StudioEvent {
	table: string;
	id: string | string[] | null;
	offer_id?: string;
}

export class OfferStudioTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Offer Studio Trigger',
		name: 'offerStudioTrigger',
		icon: 'file:offerStudio.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{"changes: " + ($parameter["tables"] || []).join(", ")}}',
		description: 'Starts the workflow when something changes in Offer Studio (offers, slides, blocks, templates)',
		defaults: { name: 'Offer Studio Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'offerStudioApi', required: true }],
		properties: [
			{
				displayName: 'Changes In',
				name: 'tables',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getEventTables' },
				default: ['offers', 'slides'],
				description: 'Which changes start the workflow',
			},
			{
				displayName: 'Only Offer (ID)',
				name: 'offerId',
				type: 'string',
				default: '',
				description: 'Empty = any offer. Applies to offer and slide changes.',
			},
			{
				displayName: 'Fetch Current Record',
				name: 'fetchRecord',
				type: 'boolean',
				default: true,
				description: 'Whether to attach the current record (offer, slide, block, template) to the event',
			},
			{
				displayName: 'Debounce (ms)',
				name: 'debounceMs',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 3000,
				description:
					'Editing in the dashboard sends a change on every save. Changes to the same record within this window produce a single run.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getEventTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let tables = Object.keys(TABLE_LABELS);
				try {
					tables = (await loadSpec(this, { fresh: true })).eventTables;
				} catch {
					/* older Offer Studio version: use the default list */
				}
				return tables.map((t) => ({ name: TABLE_LABELS[t] || t, value: t }));
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const tables = this.getNodeParameter('tables', []) as string[];
		const offerId = String(this.getNodeParameter('offerId', '') || '').trim();
		const fetchRecord = this.getNodeParameter('fetchRecord', true) as boolean;
		const debounceMs = Number(this.getNodeParameter('debounceMs', 3000));
		const credentials = await this.getCredentials(CREDENTIAL);
		const url = `${baseUrlOf(credentials)}/api/events`;
		const token = String(credentials.token || '');
		const isManual = this.getMode() === 'manual';

		const controller = new AbortController();
		let closed = false;
		let pending = new Map<string, StudioEvent>();
		let timer: NodeJS.Timeout | undefined;
		let resolveManual: (() => void) | undefined;

		const matches = (ev: StudioEvent) => {
			if (!tables.includes(ev.table)) return false;
			if (offerId && (ev.table === 'offers' || ev.table === 'slides')) {
				return ev.offer_id === offerId || (ev.table === 'offers' && ev.id === offerId);
			}
			return true;
		};

		const enrich = async (ev: StudioEvent): Promise<IDataObject> => {
			const item: IDataObject = { ...ev, receivedAt: new Date().toISOString() };
			if (!fetchRecord) return item;
			// slide: fetch the whole offer (so the context is visible); everything else: just the record
			const target =
				ev.table === 'slides' && ev.offer_id
					? recordPath('offers', ev.offer_id)
					: typeof ev.id === 'string'
						? recordPath(ev.table, ev.id)
						: undefined;
			if (!target) return item;
			try {
				const res = await studioRequest(this, { method: 'GET', path: target, timeout: 30_000 });
				if (res.statusCode === 404) item.deleted = true;
				else if (res.statusCode < 400 && isJson(res)) item.record = parseJsonBody(res) as IDataObject;
			} catch (error) {
				item.fetchError = (error as Error).message;
			}
			return item;
		};

		const flush = async () => {
			timer = undefined;
			const batch = [...pending.values()];
			pending = new Map();
			if (!batch.length || closed) return;
			const items: INodeExecutionData[] = [];
			for (const ev of batch) items.push({ json: await enrich(ev) });
			this.emit([items]);
			resolveManual?.();
		};

		const onEvent = (ev: StudioEvent) => {
			if (!ev || typeof ev !== 'object' || !('table' in ev) || !matches(ev)) return;
			// a POST with an array of blocks gives id: [...] — split it into separate events
			const ids = Array.isArray(ev.id) ? ev.id : [ev.id];
			for (const id of ids) {
				const one = { ...ev, id };
				pending.set(`${one.table}:${one.id ?? ''}:${one.offer_id ?? ''}`, one);
			}
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => void flush(), isManual ? Math.min(debounceMs, 500) : debounceMs);
		};

		const connect = async () => {
			let delay = 1000;
			while (!closed) {
				try {
					const res = await fetch(url, {
						headers: { accept: 'text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) },
						signal: controller.signal,
					});
					if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
					delay = 1000;
					const reader = res.body.getReader();
					const decoder = new TextDecoder();
					let buffer = '';
					while (!closed) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
						let sep: number;
						while ((sep = buffer.indexOf('\n\n')) !== -1) {
							const chunk = buffer.slice(0, sep);
							buffer = buffer.slice(sep + 2);
							let eventName = 'message';
							const data: string[] = [];
							for (const line of chunk.split('\n')) {
								if (line.startsWith('event:')) eventName = line.slice(6).trim();
								else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
							}
							if (eventName !== 'message' || !data.length) continue;
							try {
								onEvent(JSON.parse(data.join('\n')) as StudioEvent);
							} catch {
								/* not JSON: skip */
							}
						}
					}
				} catch (error) {
					if (closed) return;
					this.logger.warn(`Offer Studio Trigger: no connection to ${url} (${(error as Error).message}), retrying`);
				}
				if (closed) return;
				await new Promise((r) => setTimeout(r, delay));
				delay = Math.min(delay * 2, 30_000);
			}
		};

		const closeFunction = async () => {
			closed = true;
			if (timer) clearTimeout(timer);
			controller.abort();
		};

		if (isManual) {
			const manualTriggerFunction = async () => {
				const waiting = new Promise<void>((r) => (resolveManual = r));
				void connect();
				await waiting;
			};
			return { closeFunction, manualTriggerFunction };
		}

		void connect();
		return { closeFunction };
	}
}

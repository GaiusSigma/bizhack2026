import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

// In the docker-compose stack n8n fills in both fields itself (CREDENTIALS_OVERWRITE_DATA from n8n/entrypoint.sh),
// so you only need to create the credential and save it without typing anything.
export class OfferStudioApi implements ICredentialType {
	name = 'offerStudioApi';

	displayName = 'Offer Studio API';

	icon = 'file:../nodes/OfferStudio/offerStudio.svg' as const;

	documentationUrl = 'https://github.com/GaiusSigma/bizhack2026/tree/main/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'Offer Studio URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'http://offer-studio:3000',
			description: 'Empty = http://offer-studio:3000 (the service in the same docker-compose stack)',
		},
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'STUDIO_API_TOKEN from Offer Studio (in Coolify: SERVICE_PASSWORD_64_STUDIOAPI)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { Authorization: '=Bearer {{$credentials.token}}' },
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{($credentials.baseUrl || "http://offer-studio:3000").replace(/\/+$/, "")}}',
			url: '/api/meta',
		},
	};
}

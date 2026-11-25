import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

// W stacku docker-compose n8n wypełnia oba pola sam (CREDENTIALS_OVERWRITE_DATA z n8n/entrypoint.sh),
// więc wystarczy utworzyć poświadczenie i zapisać je bez wpisywania czegokolwiek.
export class OfferStudioApi implements ICredentialType {
	name = 'offerStudioApi';

	displayName = 'Offer Studio API';

	icon = 'file:../nodes/OfferStudio/offerStudio.svg' as const;

	documentationUrl = 'https://github.com/GaiusSigma/bizhack2026/tree/main/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'Adres Offer Studio',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'http://offer-studio:3000',
			description: 'Puste = http://offer-studio:3000 (usługa w tym samym docker-compose)',
		},
		{
			displayName: 'Token API',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'STUDIO_API_TOKEN z Offer Studio (w Coolify: SERVICE_PASSWORD_64_STUDIOAPI)',
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

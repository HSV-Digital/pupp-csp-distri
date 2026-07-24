import { Autosend } from 'autosendjs';
import {
	EmailProvider,
	EmailProviderName,
	SendEmailParams,
} from './email-provider.interface';

export class AutosendProvider implements EmailProvider {
	readonly name: EmailProviderName = 'autosend';
	private readonly client: Autosend | null;

	constructor(apiKey: string) {
		this.client = apiKey ? new Autosend(apiKey) : null;
	}

	get isConfigured(): boolean {
		return this.client !== null;
	}

	async send(params: SendEmailParams): Promise<void> {
		if (!this.client) {
			throw new Error('AUTOSEND_API_KEY is not configured');
		}

		const result = await this.client.emails.send({
			from: { email: params.from },
			to: { email: params.to },
			subject: params.subject,
			html: params.html,
		});

		if (!result.success) {
			throw new Error(result.error ?? 'AutoSend rejected the email');
		}
	}
}

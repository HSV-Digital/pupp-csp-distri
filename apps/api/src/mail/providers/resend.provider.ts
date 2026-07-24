import { Resend } from 'resend';
import {
	EmailProvider,
	EmailProviderName,
	SendEmailParams,
} from './email-provider.interface';

export class ResendProvider implements EmailProvider {
	readonly name: EmailProviderName = 'resend';
	private readonly client: Resend | null;

	constructor(apiKey: string) {
		this.client = apiKey ? new Resend(apiKey) : null;
	}

	get isConfigured(): boolean {
		return this.client !== null;
	}

	async send(params: SendEmailParams): Promise<void> {
		if (!this.client) {
			throw new Error('RESEND_API_KEY is not configured');
		}

		const { error } = await this.client.emails.send({
			from: params.from,
			to: params.to,
			subject: params.subject,
			html: params.html,
		});

		if (error) {
			throw new Error(error.message);
		}
	}
}

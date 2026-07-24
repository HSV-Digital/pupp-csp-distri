export type EmailProviderName = 'resend' | 'autosend';

export interface SendEmailParams {
	from: string;
	to: string;
	subject: string;
	html: string;
}

/**
 * Common contract every email backend must implement. The provider that is
 * actually used at runtime is selected by the EMAIL_PROVIDER feature flag (see
 * config/env.ts), letting us switch between Resend and AutoSend without
 * touching MailService or its callers.
 */
export interface EmailProvider {
	/** Human-readable provider name, used in log messages. */
	readonly name: EmailProviderName;
	/** Whether the provider has the credentials it needs to actually send. */
	readonly isConfigured: boolean;
	/** Send a single email. Throws on failure so MailService can log it. */
	send(params: SendEmailParams): Promise<void>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Dev/no-op provider. Swap for a real provider (SES, Postmark, Resend, SendGrid)
 * by implementing EmailProvider and changing the export below - callers never
 * import a concrete provider directly.
 */
class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:${message.to}] ${message.subject}\n${message.body}`);
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();

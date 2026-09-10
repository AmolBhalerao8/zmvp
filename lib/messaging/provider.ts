export type OutboundMessage = { to: string; body: string; channel: "SMS" | "EMAIL" };
export type MessageReceipt = { provider: string; providerId: string; status: "queued" | "sent" };

export interface MessagingProvider {
  send(message: OutboundMessage): Promise<MessageReceipt>;
}

class MockMessagingProvider implements MessagingProvider {
  async send() {
    return { provider: "mock", providerId: `mock_${crypto.randomUUID()}`, status: "sent" as const };
  }
}

export const messagingProvider: MessagingProvider = new MockMessagingProvider();

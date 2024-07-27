import 'dotenv/config';
import { Client } from 'pg';

export const pgHelper = {
  client: null as unknown as Client,
  async connect(address?: string, enableSsl = false,): Promise<void> {
    this.client = new Client({
      connectionString: address ?? process.env.DATABASE_URL,
      ssl: enableSsl ? {
        rejectUnauthorized: false,
      } : undefined
    });
    await this.client.connect();
  },
  async disconnect(): Promise<void> {
    if (this.client == null) return;
    await this.client.end();
    this.client = null as any;
  },
};

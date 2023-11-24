import 'dotenv/config';
import { Pool, Client } from 'pg';

export const pgHelper = {
  client: null as unknown as Client,
  async connect(): Promise<void> {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await this.client.connect();
  },
  async disconnect(): Promise<void> {
    await this.client.end();
    this.client = null as any;
  },
};

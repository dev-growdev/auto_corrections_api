import 'dotenv/config';

import path from 'path';
import utils from 'node:util';
import childProcess from 'node:child_process';

export class SQLJob {
  static async execute(): Promise<void> {
    console.log('SQL Rodando', Date());
  }
}

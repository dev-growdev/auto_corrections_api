import 'dotenv/config';

import path from 'path';
import utils from 'node:util';
import childProcess from 'node:child_process';

export class FlutterJob {
  static async execute(): Promise<void> {
    const run = utils.promisify(childProcess.exec);

    // Open Emulator
    run(path.join(__dirname, '../scripts/open_emulator.sh'));

    const growacademyApi = process.env.GROWACADEMY_API_URL as string;
    const subjectUid = 'e2cbc5ff-39ce-482c-987a-1e41fa331e97';
    const classUid = 'fe03967a-d555-4c86-9707-8d7d57e0cfa7';

    const scriptPath = path.join(__dirname, '../scripts/automacao_flutter.sh');

    await run(`${scriptPath} ${growacademyApi} ${subjectUid} ${classUid}`);
  }
}

import { DoneCallback, Job } from 'bull';
import { log } from 'console';
import { QueueType } from '../queue-controller';

import path from 'path';
import utils from 'node:util';
import childProcess from 'node:child_process';

async function _action(job: Job<any>, done: DoneCallback) {
  try {
    log('Flutter - Running', new Date());

    const run = utils.promisify(childProcess.exec);

    // Open Emulator
    run(path.join(__dirname, '../scripts/open_emulator.sh'));

    await run(path.join(__dirname, '../scripts/automacao_flutter.sh'));

    // Close Emulator
    await run(path.join(__dirname, '../scripts/close_emulator.sh'));

    log('Flutter - Done', new Date());
    done();
  } catch (error: any) {
    log('Flutter - Error', error);
    done(error);
  }
}

export const flutter: QueueType<{ message: string }> = {
  action: _action,
  name: 'flutter',
};

import { DoneCallback, Job } from 'bull';
import { log } from 'console';
import { QueueType } from '../queue-controller';

async function _action(job: Job<any>, done: DoneCallback) {
  try {
    log('SQL - Running', new Date());

    log('SQL - Done', new Date());
    done();
  } catch (error: any) {
    log('SQL - Error', error);
    done(error);
  }
}

export const sql: QueueType<{ message: string }> = {
  action: _action,
  name: 'sql',
};

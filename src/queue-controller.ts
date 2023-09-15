import Queue, { DoneCallback, Job, JobOptions } from 'bull';
import { flutter, sql } from './queues/';

export interface QueueType<T> {
  name: string;
  action: (job: Job<T>, done: DoneCallback) => void;
  queue?: Queue.Queue<T>;
}

export class QueueController {
  static readonly queues: QueueType<any>[] = [flutter, sql];

  static init() {
    this.registerQueues();

    this.initQueue('sql', {
      repeat: {
        cron: '*/5 * * * *', // At every 5th minute.
      },
    });

    this.initQueue('flutter', {
      repeat: {
        cron: '* * * * *', // At every minute
      },
    });
  }

  static getQueue(name: string): Queue.Queue | undefined {
    return this.queues.find((item) => item.name === name)?.queue;
  }

  static async initQueue(name: string, options: JobOptions) {
    const queue = this.getQueue(name);
    await queue?.clean(0);
    await queue?.empty();
    queue?.add({ name }, options);
  }

  private static registerQueues() {
    this.queues.forEach((queueType) => {
      const queue = new Queue(queueType.name, process.env.REDIS_URL as string);

      queue.process(queueType.action);

      queueType.queue = queue;
    });
  }
}

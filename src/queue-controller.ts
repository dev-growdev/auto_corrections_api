import Queue, { DoneCallback, Job, JobOptions } from 'bull';
import { FlutterJob } from './jobs/flutter.job';
import 'dotenv/config';

class MyQueue {
  name: string;
  action: () => Promise<void>;
  queue?: Queue.Queue;

  constructor(name: string, action: () => Promise<void>) {
    this.name = name;
    this.action = action;
    this.exec = this.exec.bind(this);
  }

  exec = async (_: Job, done: DoneCallback) => {
    try {
      console.log(`${this.name} - Running`, new Date());
      await this.action();
      console.log(`${this.name} - Done`, new Date());
      done();
    } catch (error: any) {
      console.log(`${this.name} - Error`, error);
      done(error);
    }
  };
}

export class QueueController {
  static readonly queues: MyQueue[] = [
    new MyQueue('flutter', FlutterJob.execute),
  ];

  static init() {
    this.registerQueues();

    this.initQueue('flutter', {
      repeat: {
        cron: '0 8 * * *', // every day 8am
        // limit: 1,
        // every: 1000 * 60,
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
    this.queues.forEach((myQueue) => {
      const queue = new Queue(myQueue.name, process.env.REDIS_URL as string);

      queue.process(myQueue.exec);

      myQueue.queue = queue;
    });
  }
}

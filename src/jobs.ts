import { scheduleJob } from 'node-schedule';
import { SQLJob } from './jobs/sql.job';

export class Jobs {
    init() {
        scheduleJob('* * * * *', () => new SQLJob().execute())
    }
}
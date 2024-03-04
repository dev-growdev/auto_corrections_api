import 'dotenv/config'
import { pgHelper } from './pg-helper';

(async () => {
    await pgHelper.connect(process.env.DATABASE_URL_ACADEMY_PROD, true);

    const resultQuery = await pgHelper.client.query(`SELECT * FROM auto_corrections WHERE uid = '1c229c91-462f-4690-a515-7cc1ea39232e';`)

    await pgHelper.disconnect();

    if (!resultQuery.rows) return;

    const result = resultQuery.rows[0];

    console.log(JSON.parse(result?.payload));
    console.log(JSON.parse(result?.results));

})();

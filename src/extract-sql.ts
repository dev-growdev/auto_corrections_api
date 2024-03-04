import 'dotenv/config'
import { pgHelper } from './pg-helper';

(async () => {
    await pgHelper.connect(process.env.DATABASE_URL_ACADEMY_PROD, true);

    const resultQuery = await pgHelper.client.query(`
        SELECT 
            * 
        FROM 
            auto_corrections 
        WHERE 
            uid = 'cb1a16b2-cfe4-4e04-bd2b-f190e3583a86';
    `)

    await pgHelper.disconnect();

    if (!resultQuery.rows) return;

    const result = resultQuery.rows[0];

    console.log(JSON.parse(result?.payload));
    console.log(JSON.parse(result?.results));

})();

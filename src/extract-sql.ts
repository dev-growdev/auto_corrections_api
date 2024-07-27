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
            uid = 'f2c50943-c975-4b77-937f-e1e2f04a9ec1';
    `)

    await pgHelper.disconnect();

    if (!resultQuery.rows) return;

    const result = resultQuery.rows[0];

    console.log(JSON.parse(result?.payload));
    console.log(JSON.parse(result?.results));

})();

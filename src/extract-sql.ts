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
            uid = '0376cd39-2a6f-483b-98f4-d5d8b71e4745';
    `)

    await pgHelper.disconnect();

    if (!resultQuery.rows) return;

    const result = resultQuery.rows[0];

    console.log(JSON.parse(result?.payload));
    console.log(JSON.parse(result?.results));

})();

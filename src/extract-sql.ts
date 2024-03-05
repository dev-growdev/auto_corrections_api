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
            uid = '724e91ba-d45c-441c-92cc-49e80db197a2';
    `)

    await pgHelper.disconnect();

    if (!resultQuery.rows) return;

    const result = resultQuery.rows[0];

    console.log(JSON.parse(result?.payload));
    console.log(JSON.parse(result?.results));

})();

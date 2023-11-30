import 'dotenv/config';

import path from 'path';
import utils from 'node:util';
import childProcess from 'node:child_process';

interface Subject {
  id: number;
  uid: string;
}

export class FlutterJob {
  static async execute(): Promise<void> {
    const run = utils.promisify(childProcess.exec);

    const growacademyApi = process.env.GROWACADEMY_API_URL as string;
    const classUid = 'fe03967a-d555-4c86-9707-8d7d57e0cfa7';
    const scriptPath = path.join(__dirname, '../scripts/automacao_flutter.sh');

    // Fase 1
    const subject1 = 'e2cbc5ff-39ce-482c-987a-1e41fa331e97';
    const folderName1 = 'fase_1';
    await run(
      `${scriptPath} ${growacademyApi} ${subject1} ${classUid} ${folderName1}`
    );

    // Fase 2
    const subject2 = '9deb143f-d338-47ae-9ad2-df8abc08af02';
    const folderName2 = 'fase_2';
    await run(
      `${scriptPath} ${growacademyApi} ${subject2} ${classUid} ${folderName2}`
    );

    // Fase 3
    const subject3 = '43de264c-7b85-4100-90a1-4bc2b2aef58b';
    const folderName3 = 'fase_3';
    await run(
      `${scriptPath} ${growacademyApi} ${subject3} ${classUid} ${folderName3}`
    );

    // Fase 4
    const subject4 = '25e98d6e-01ab-4e1c-a037-819247a9cf48';
    const folderName4 = 'fase_4';
    await run(
      `${scriptPath} ${growacademyApi} ${subject4} ${classUid} ${folderName4}`
    );

    // // Fase 5
    // const subject5 = '4412c4ac-8371-4451-91b1-f068e83a9653';
    // const folderName5 = 'fase_5';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject5} ${classUid} ${folderName5}`
    // );

    // // Fase 6
    // const subject6 = 'e10a1753-a774-4d43-a6ee-aa6c33e30945';
    // const folderName6 = 'fase_6';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject6} ${classUid} ${folderName6}`
    // );

    // // Fase 7
    // const subject7 = '73cc7823-7829-4f20-b674-082e341bb1c3';
    // const folderName7 = 'fase_7';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject7} ${classUid} ${folderName7}`
    // );

    // // Fase 8
    // const subject8 = '3daf5a2f-9cff-4e08-bbaa-5142b9c58cda';
    // const folderName8 = 'fase_8';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject8} ${classUid} ${folderName8}`
    // );

    // // Fase 9
    // const subject9 = 'da8c5542-2e42-4278-b41a-12606ce6ddfe';
    // const folderName9 = 'fase_9';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject9} ${classUid} ${folderName9}`
    // );

    // // Fase 10
    // const subject10 = '2a1d0699-b54a-4e3f-aa8d-6ac708f9dbd9';
    // const folderName10 = 'fase_10';
    // await run(
    //   `${scriptPath} ${growacademyApi} ${subject10} ${classUid} ${folderName10}`
    // );
  }
}

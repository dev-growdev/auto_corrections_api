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

    // Fases
    const subjects: Subject[] = [
      { id: 1, uid: 'e2cbc5ff-39ce-482c-987a-1e41fa331e97' },
      { id: 2, uid: '9deb143f-d338-47ae-9ad2-df8abc08af02' },
      { id: 3, uid: '43de264c-7b85-4100-90a1-4bc2b2aef58b' },
      { id: 4, uid: '25e98d6e-01ab-4e1c-a037-819247a9cf48' },
      // { id: 5, uid: '4412c4ac-8371-4451-91b1-f068e83a9653' },
      // { id: 6, uid: 'e10a1753-a774-4d43-a6ee-aa6c33e30945' },
      // { id: 7, uid: '73cc7823-7829-4f20-b674-082e341bb1c3' },
      // { id: 8, uid: '3daf5a2f-9cff-4e08-bbaa-5142b9c58cda' },
      // { id: 9, uid: 'da8c5542-2e42-4278-b41a-12606ce6ddfe' },
      // { id: 10, uid: '2a1d0699-b54a-4e3f-aa8d-6ac708f9dbd9' },
    ];

    for (const subject of subjects) {
      const folderName = `fase_${subject.id}`;
      await run(
        `${scriptPath} ${growacademyApi} ${subject.uid} ${classUid} ${folderName}`
      );
    }
  }
}

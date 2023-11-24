import 'dotenv/config';

import { pgHelper } from '../pg-helper';
import axios from 'axios';
import { QueryResult } from 'pg';

interface AutoCorrection {
  uid: string;
  student: string;
  payload: SQLPayload[];
}

interface SQLPayload {
  id: number;
  value: string;
}

interface AutoCorrectionResultDTO {
  title: string;
  approved: boolean;
}

interface RunScriptResult {
  autoCorrectionResult: AutoCorrectionResultDTO;
  queryResult?: QueryResult<any>;
}

export class SQLJob {
  static async execute(): Promise<void> {
    try {
      console.log('SQLJob - Iniciado');

      await pgHelper.connect();

      // const subjectUid = 'c94239ba-4be2-4f5b-a716-89dab2f6f091'; // Fase 01
      // const subjectUid = '3a231abf-d826-4e46-a2c0-e030822f11f8'; // Fase 02
      // const subjectUid = '9ad73459-d5a8-42ec-9d5f-b50c7a91b37e'; // Fase 03
      // const subjectUid = 'c524e2c7-eed1-42ef-9c6a-86a6fdee608b'; // Fase 04

      // Fase 02
      await this.getAutoCorrectionsPerStep(
        '3a231abf-d826-4e46-a2c0-e030822f11f8',
        (autoCorrection) => this.correctFirtStep(autoCorrection)
      );

      // // Fase 03
      // await this.getAutoCorrectionsPerStep(
      //   '9ad73459-d5a8-42ec-9d5f-b50c7a91b37e',
      //   async (autoCorrection) => {
      //     return [];
      //   }
      // );

      // // Fase 04
      // await this.getAutoCorrectionsPerStep(
      //   'c524e2c7-eed1-42ef-9c6a-86a6fdee608b',
      //   async (autoCorrection) => {
      //     return [];
      //   }
      // );
    } catch (e) {
      console.log('SQLJob - Erro', e);
    } finally {
      console.log('SQLJob - Finalizou ');
      await pgHelper.disconnect();
    }
  }

  private static async getAutoCorrectionsPerStep(
    subjectUid: string,
    execCorrection: (
      AutoCorrection: AutoCorrection
    ) => Promise<AutoCorrectionResultDTO[]>
  ): Promise<void> {
    try {
      const growacademyApi = process.env.GROWACADEMY_API_URL as string;
      const classUid = 'a89b386b-cfc1-429f-97e1-8dded6174d63';

      const response = await axios.get(`${growacademyApi}/auto-corrections`, {
        params: { subjectUid, classUid },
      });

      if (response.data.data.length) {
        for (const autoCorrection of response.data.data as AutoCorrection[]) {
          const results = await execCorrection(autoCorrection);
          console.log(`RESULTADOS ${subjectUid}`, results);
          await axios.put(
            `${growacademyApi}/auto-corrections/${autoCorrection.uid}`,
            { results }
          );
        }
      }
    } catch (error: any) {
      console.log('SQLJob - getAutoCorrectionsPerStep Error', error?.message);
    }
  }

  private static async correctFirtStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0];
    const script2 = autoCorrection.payload[1];
    const script3 = autoCorrection.payload[2];
    const results: AutoCorrectionResultDTO[] = [];

    try {
      const createTableResult = await this.runCreateTableScript(script1.value);
      results.push(createTableResult.autoCorrectionResult);

      const insertResult = await this.runInsertScript(script2.value);
      results.push(insertResult.autoCorrectionResult);

      const selectResult = await this.runSelectScript(
        script3.value,
        insertResult.queryResult?.rowCount ?? 0
      );
      results.push(selectResult.autoCorrectionResult);
    } catch (e) {
      console.log('Erro ao executar scripts:', e);
    }

    return results;
  }

  private static async runCreateTableScript(
    script: string
  ): Promise<RunScriptResult> {
    try {
      const tableName = this.extractTableName(script);
      if (tableName) {
        try {
          await pgHelper.client.query(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (error) {
          console.log(`Erro ao remover tabela ${tableName}:`, error);
        }
      }

      const queryResult = await pgHelper.client.query(script);

      const autoCorrectionResult = { title: 'Create Table', approved: true };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      console.log('Erro no script CREATE TABLE:', error);
      const autoCorrectionResult = { title: 'Create Table', approved: false };
      return { autoCorrectionResult };
    }
  }

  private static async runInsertScript(
    script: string
  ): Promise<RunScriptResult> {
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) > 0;

      const autoCorrectionResult = { title: 'Insert Data', approved: isValid };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      console.log('Erro no script INSERT:', error);
      const autoCorrectionResult = { title: 'Insert Data', approved: false };
      return { autoCorrectionResult };
    }
  }

  private static async runSelectScript(
    script: string,
    rowCountToValid: number
  ): Promise<RunScriptResult> {
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) >= rowCountToValid;

      const autoCorrectionResult = { title: 'Select Data', approved: isValid };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      console.log('Erro no script SELECT:', error);
      const autoCorrectionResult = { title: 'Select Data', approved: false };
      return { autoCorrectionResult };
    }
  }

  private static async runUpdateScript(
    script: string
  ): Promise<RunScriptResult> {
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) > 0;

      const autoCorrectionResult = { title: 'Update Table', approved: isValid };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      console.log('Erro no script UPDATE TABLE:', error);
      const autoCorrectionResult = { title: 'Update Table', approved: false };
      return { autoCorrectionResult };
    }
  }

  private static extractTableName(createTableScript: string): string | null {
    const match = createTableScript.match(/create\s+table\s+(\w+)/i);

    if (match && match.length > 1) return match[1];

    return null;
  }
}

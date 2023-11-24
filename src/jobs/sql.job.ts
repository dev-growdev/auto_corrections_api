import 'dotenv/config';

import { pgHelper } from '../pg-helper';
import axios from 'axios';
import { QueryResult } from 'pg';
import childProcess from 'node:child_process';
import { error } from 'node:console';

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
      this.log('SQLJob \t-\t Iniciando');

      await pgHelper.connect();

      // Fase 02
      this.log(`SQLJob \t-\t Inicia Fase 2`);
      await this.getAutoCorrectionsPerStep(
        '3a231abf-d826-4e46-a2c0-e030822f11f8',
        (autoCorrection) => this.correctFirtStep(autoCorrection)
      );

      // // Fase 03
      // this.log(`SQLJob \t-\t Inicia Fase 3`);
      // await this.getAutoCorrectionsPerStep(
      //   '9ad73459-d5a8-42ec-9d5f-b50c7a91b37e',
      //   async (autoCorrection) => {
      //     return [];
      //   }
      // );

      // // Fase 04
      // this.log(`SQLJob \t-\t Inicia Fase 4`);
      // await this.getAutoCorrectionsPerStep(
      //   'c524e2c7-eed1-42ef-9c6a-86a6fdee608b',
      //   async (autoCorrection) => {
      //     return [];
      //   }
      // );
    } catch (e) {
      this.log(`SQLJob \t-\t Error ao executar fases: ${error}`);
    } finally {
      await pgHelper.disconnect();
      this.log('SQLJob \t-\t Finalizou');
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

      // Busca as autoCorrections
      const response = await axios.get(`${growacademyApi}/auto-corrections`, {
        params: { subjectUid, classUid },
      });

      if (response.data.data.length) {
        // Percorre cada e executa a correção, ao final atualiza com o resultado
        for (const autoCorrection of response.data.data as AutoCorrection[]) {
          this.log(`SQLJob \t-\t ${autoCorrection.uid} \t-\t Inicia correção`);
          const results = await execCorrection(autoCorrection);
          console.log(`RESULTADOS ${subjectUid}`, results);

          await axios.put(
            `${growacademyApi}/auto-corrections/${autoCorrection.uid}`,
            { results }
          );
          this.log(
            `SQLJob \t-\t ${autoCorrection.uid} \t-\t Finaliza correção`
          );
        }
      }
    } catch (error: any) {
      this.log(
        `SQLJob \t-\t getAutoCorrectionsPerStep Error: ${error?.message}`
      );
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
    } catch (error) {
      this.log(`SQLJob \t-\t correctFirtStep Error: ${error}`);
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
        } catch (_) {}
      }

      const queryResult = await pgHelper.client.query(script);

      const autoCorrectionResult = { title: 'Create Table', approved: true };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      this.log(`SQLJob \t-\t runCreateTableScript Error: ${error}`);
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
      this.log(`SQLJob \t-\t runInsertScript Error: ${error}`);
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
      this.log(`SQLJob \t-\t runSelectScript Error: ${error}`);
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
      this.log(`SQLJob \t-\t runUpdateScript Error: ${error}`);
      const autoCorrectionResult = { title: 'Update Table', approved: false };
      return { autoCorrectionResult };
    }
  }

  private static extractTableName(createTableScript: string): string | null {
    const match = createTableScript.match(/create\s+table\s+(\w+)/i);

    if (match && match.length > 1) return match[1];

    return null;
  }

  private static log(message: string): void {
    try {
      const text = `${new Date()} \t-\t ${message}`;
      console.log(text);
      childProcess.exec(`echo ${text} >> logSQL.txt`);
    } catch (_) {}
  }
}

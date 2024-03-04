import 'dotenv/config';

import { pgHelper } from '../pg-helper';
import axios from 'axios';
import fs from 'node:fs';
import { QueryResult } from 'pg';
import path from 'node:path';

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

export class SQLJob {
  writeStream?: fs.WriteStream;

  async execute(): Promise<void> {
    try {
      this.startLog();

      this.log('SQLJob \t-\t Iniciando');

      await pgHelper.connect();

      // Fase 02
      this.log(`SQLJob \t-\t Inicia Fase 2`);
      await this.getAutoCorrectionsPerStep(
        '3a231abf-d826-4e46-a2c0-e030822f11f8',
        (autoCorrection) => this.correctSecondStep(autoCorrection)
      );

      // // Fase 03
      this.log(`SQLJob \t-\t Inicia Fase 3`);
      await this.getAutoCorrectionsPerStep(
        '9ad73459-d5a8-42ec-9d5f-b50c7a91b37e',
        (autoCorrection) => this.correctThirdStep(autoCorrection)
      );

      // // Fase 04
      this.log(`SQLJob \t-\t Inicia Fase 4`);
      await this.getAutoCorrectionsPerStep(
        'c524e2c7-eed1-42ef-9c6a-86a6fdee608b',
        (autoCorrection) => this.correctFourthStep(autoCorrection)
      );
    } catch (error) {
      this.log(`SQLJob \t-\t Error ao executar fases: ${error}`);
    } finally {
      await pgHelper.disconnect();
      this.log('SQLJob \t-\t Finalizou');
      this.finishLog();
    }
  }

  private async getAutoCorrectionsPerStep(
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

      const autoCorrections: AutoCorrection[] = response.data?.data;

      if (autoCorrections.length) {
        // Percorre cada e executa a correção, ao final atualiza com o resultado
        for (const autoCorrection of autoCorrections) {
          this.log(`SQLJob \t-\t ${autoCorrection.uid} \t-\t Inicia correção`);

          try {
            const results = await execCorrection(autoCorrection);

            await axios.put(
              `${growacademyApi}/auto-corrections/${autoCorrection.uid}`,
              { results }
            );
          } catch (error: any) {
            this.log(
              `SQLJob \t-\t Erro ao atualizar a nota na API - Error: ${error?.message}`
            );
          }

          this.log(
            `SQLJob \t-\t ${autoCorrection.uid} \t-\t Finaliza correção`
          );
        }
      }
    } catch (error: any) {
      this.log(
        `SQLJob \t-\t Erro ao buscar as correçoes da API - Error: ${error?.message}`
      );
    }
  }

  // Fase 2
  private async correctSecondStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0];
    const script2 = autoCorrection.payload[1];
    const script3 = autoCorrection.payload[2];
    const results: AutoCorrectionResultDTO[] = [];

    try {

      // apaga a tabela se existir
      try {
        await pgHelper.client.query(`DROP TABLE IF EXISTS perguntas_respostas;`);
      } catch (_) { }

      const validFirstScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script criar tabela PERGUNTAS_RESPOSTAS',
          approved: false,
        }
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(`SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'perguntas_respostas' ) as table_exist;`)
          autoCorrectionResult.approved = existResult.rows[0].table_exist as boolean;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult = {
          title: 'Validação script inserir dados PERGUNTAS_RESPOSTAS',
          approved: false,
        };

        let rowCountInsert = 0;
        try {
          const queryResult = await pgHelper.client.query(script);
          autoCorrectionResult.approved = ((queryResult.rowCount ?? 0) || (queryResult as any as QueryResult[]).length) > 0;
          rowCountInsert = (queryResult.rowCount ?? 0) || (queryResult as any as QueryResult[]).length
        } catch (error: any) {
          this.log(`SQLJob \t-\t Erro ao executar o segundo script - Error: ${error?.stack}`);
        }
        return { autoCorrectionResult, rowCountInsert };
      }

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript.autoCorrectionResult);

      const validThirdScript = async (script: string, rowCountInsert: number) => {
        const autoCorrectionResult = {
          title: 'Validação script selecionar dados PERGUNTAS_RESPOSTAS',
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);

          console.log(rowCountInsert);
          console.log(queryResult);

          if (rowCountInsert === 0) {
            autoCorrectionResult.approved = (queryResult.rowCount ?? 0) > 0
          } else {
            autoCorrectionResult.approved = queryResult.rowCount === rowCountInsert;
          }

        } catch (error) {
          this.log(`SQLJob \t-\t Error ao validar o terceiro script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultThirdScript = await validThirdScript(script3.value, resultSecondScript.rowCountInsert);
      results.push(resultThirdScript);

    } catch (error) {
      this.log(`SQLJob \t-\t Erro na correção do desafio da fase 2 - Error: ${error}`);
    }

    return results;
  }

  // Fase 3
  private async correctThirdStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0];
    const script2 = autoCorrection.payload[1];
    const script3 = autoCorrection.payload[2];
    const script4 = autoCorrection.payload[3];
    const results: AutoCorrectionResultDTO[] = [];

    try {
      await this.clearInitialData();
      await this.createInitialData();

      const validFirstScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script criar tabela MENSALIDADE',
          approved: false,
        }
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(`SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'mensalidade' ) as table_exist;`)
          autoCorrectionResult.approved = existResult.rows[0].table_exist as boolean;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script inserir dados na tabela MATRICULA',
          approved: false,
        }

        const resolveDBWithDatas = async () => {
          // deleta os dados populados no início da função e reseta o serial para 1
          await pgHelper.client.query(`DELETE FROM matricula; ALTER SEQUENCE matricula_id_seq RESTART WITH 1;`);

          // popula o banco com o homer e a marge
          try {
            await pgHelper.client.query(`INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2);`);
          } catch (error) {
            this.log(`SQLJob \t-\t Erro ao inserir dados na tabela matricula antes do script 2 da fase 3 - Error: ${error}`);
            throw error;
          }
        }

        const validWithList = async (queryResultList: QueryResult[]) => {
          if (queryResultList.length === 5) {
            autoCorrectionResult.approved = true;
          } else if (queryResultList.length === 3) {
            // significa que o aluno considerou que o homer e a marge já estariam cadastrados
            // pois durante o curso os mesmo são inseridos durante a aula

            await resolveDBWithDatas();

            // executa o script do aluno adicionando os últimos 3 integrantes da famlia
            const result = await pgHelper.client.query(script);

            autoCorrectionResult.approved = (result as any).length === 3;
          }
        }

        const validWithoutList = async (queryResult: QueryResult) => {
          // significa que o aluno criou o script já inserindo o homer e a marge
          if (queryResult.rowCount === 5) {
            autoCorrectionResult.approved = true;
          } else if (queryResult.rowCount === 3) {
            // significa que o aluno considerou que o homer e a marge já estariam cadastrados
            // pois durante o curso os mesmo são inseridos durante a aula
            await resolveDBWithDatas();

            // executa o script do aluno adicionando os últimos 3 integrantes da famlia
            const result = await pgHelper.client.query(script);
            autoCorrectionResult.approved = result.rowCount === 3;
          }
        }

        try {
          const queryResult = await pgHelper.client.query(script);

          if ((queryResult as any).length) {
            await validWithList(queryResult as any as QueryResult[])
          } else {
            await validWithoutList(queryResult)
          }
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o segundo script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript);

      const validThirdScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script inserir dados na tabela MENSALIDADE',
          approved: false,
        }
        try {
          const queryResult = await pgHelper.client.query(script);

          autoCorrectionResult.approved = ((queryResult.rowCount ?? 0) || (queryResult as any as QueryResult[]).length) > 0;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao inserir dados na tabela MENSALIDADE - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultThirdScript = await validThirdScript(script3.value);
      results.push(resultThirdScript);

      const validFourScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script selecionar dados na tabela MENSALIDADE',
          approved: false,
        }
        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 pessoas x 10 mensalidades para cada pessoa = 50
          autoCorrectionResult.approved = (queryResult.rowCount ?? 0) === 50;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao consultar os dados da tabela mensalidade - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultFourScript = await validFourScript(script4.value);
      results.push(resultFourScript);

      await this.clearInitialData();
    } catch (error) {
      this.log(`SQLJob \t-\t Erro na correção desafio da fase 3 - Error: ${error}`);
    }

    return results;
  }

  // Fase 4
  private async correctFourthStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0]; // script para inserir dados na tabela matricula
    const script2 = autoCorrection.payload[1]; // script para inserir dados na tabela reserva equipamento
    const script3 = autoCorrection.payload[2]; // scritp para criar a view
    const script4 = autoCorrection.payload[3]; // scritp para consultar a view
    const results: AutoCorrectionResultDTO[] = [];

    try {
      await this.clearInitialData();
      await this.createInitialData();

      // popula a tabela matricula com todos os integrantes das familia simpsoms
      try {
        await pgHelper.client.query(`INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2),
      ('10/10/2018',3), ('10/10/2018',4), ('10/10/2018',5);`);
      } catch (error) {
        this.log(`SQLJob \t-\t Erro ao inserir dados na tabela matricula - Error: ${error}`);
        throw error;
      }

      const validFirstScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script inserir dados na tabela MATRICULA',
          approved: false,
        }
        try {
          const queryResult = await pgHelper.client.query(script);
          autoCorrectionResult.approved = ((queryResult.rowCount ?? 0) || (queryResult as any as QueryResult[]).length) === 8;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script inserir dados na tabela RESERVA_EQUIPAMENTO',
          approved: false,
        }
        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 equipamentos x 12 pessoas = 60 
          autoCorrectionResult.approved = ((queryResult.rowCount ?? 0) || (queryResult as any as QueryResult[]).length) === 60;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o segundo script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript);

      const validThirdScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script criar view VW_RESERVA_EQUIPAMENTO',
          approved: false,
        }
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(`SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'vw_reserva_associado' ) as view_exist;`)
          autoCorrectionResult.approved = existResult.rows[0].view_exist as boolean;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o terceiro script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultThirdScript = await validThirdScript(script3.value);
      results.push(resultThirdScript);

      const validFourScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: 'Validação script selecionar dados na view VW_RESERVA_EQUIPAMENTO',
          approved: false,
        }
        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 equipamentos x 12 pessoas = 60 
          autoCorrectionResult.approved = (queryResult.rowCount ?? 0) === 60;
        } catch (error) {
          this.log(`SQLJob \t-\t Erro ao executar o quarto script - Error: ${error}`);
        }
        return autoCorrectionResult;
      }

      const resultFourScript = await validFourScript(script4.value);
      results.push(resultFourScript);

      await this.clearInitialData();
    } catch (error) {
      console.log(error);
      this.log(`SQLJob \t-\t Erro na correção do desafio da fase 4 - Error: ${error}`);
    }

    return results;
  }

  private async createInitialData(): Promise<void> {
    try {
      await pgHelper.client.query(`CREATE TABLE familia (
        id int primary key not null,
        nome varchar(40) not null
      );`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao criar tabela familia - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`CREATE TABLE pessoa (
        id int primary key not null,
        nome varchar(100) not null,
        idade int not null,
        renda real ,
        familia_id int references familia(id) not null
      );`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao criar tabela pessoa - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`INSERT INTO familia (id,nome) values (1,'Simpsons'), (2,'Adamms');`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao inserir dados na tabela familia - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`INSERT INTO pessoa (id ,nome,idade,renda,familia_id ) values 
      (1, 'Homer', 39, 4000.00, 1), (2, 'Marge', 36, 6000.00, 1), (3, 'Bart', 12, 200.00, 1), (4, 'Lisa', 10, 0, 1), (5, 'Maggie', 1, 0, 1),
      (6, 'Gomez', 38, 8000.00, 2), (7, 'Morticia', 35, 8000.00, 2), (8, 'Wandinha', 12, 0, 2), (9, 'Feioso', 10, 0, 2), 
      (10, 'Vovó Addams', 62, 10000.00, 2), (11, 'Tio Chico', 41, 6000.00, 2), (12, 'Tropeço', 29, 3500.00, 2), (13, 'Mãozinha', 2, 200, 2);`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao inserir dados na tabela pessoa - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`CREATE TABLE matricula(
        id SERIAL PRIMARY KEY NOT NULL,
        dt_associacao DATE NOT NULL,
        dt_encerramento DATE,
        pessoa_id INT NOT NULL REFERENCES pessoa(id)
      );`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao criar tabela matricula - Error: ${error}`);
      throw error;
    }

    // try {
    //   await pgHelper.client.query(`INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2),
    //   ('10/10/2018',3), ('10/10/2018',4), ('10/10/2018',5), ('10/10/2018',6), 
    //   ('10/10/2018',7), ('10/10/2018',8), ('10/10/2018',9), ('10/10/2018',10),
    //   ('10/10/2018',11), ('10/10/2018',12), ('10/10/2018',13);`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao inserir dados na tabela matricula - Error: ${error}`);
    //   throw error;
    // }

    try {
      await pgHelper.client.query(`CREATE TABLE equipamento(
        id serial primary key not null, 
        descricao varchar(200) not null	
      );`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao criar tabela equipamento - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`INSERT INTO equipamento (descricao) VALUES ('Kit Volei'), ('Kit Beach Tênis'), ('Prancha'), 
      ('Skate'), ('Bola de futebol');`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao inserir dados na tabela equipamento - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`CREATE TABLE reserva_equipamento(
        id serial primary key not null,
        dt_reserva date not null,
        dt_devolucao date,
        matricula_id int not null references matricula(id), 
        equipamento_id int not null references equipamento(id) 
      );`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao criar tabela reserva_equipamento - Error: ${error}`);
      throw error;
    }
  }

  private async clearInitialData(): Promise<void> {
    try {
      await pgHelper.client.query(`DROP VIEW IF EXISTS vw_reserva_associado;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir a view vw_reserva_associado - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS mensalidade;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela mensalidade - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS reserva_equipamento;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela reserva_equipamento - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS equipamento;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela equipamento - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS matricula;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela matricula - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS pessoa;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela pessoa - Error: ${error}`);
      throw error;
    }

    try {
      await pgHelper.client.query(`DROP TABLE IF EXISTS familia;`);
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao excluir tabela familia - Error: ${error}`);
      throw error;
    }
  }

  private getNowFormatted() {
    const now = new Date();
    return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`
  }

  private startLog() {
    const fileName = `${this.getNowFormatted()}-sql-log.txt`;
    const dirPath = path.join(__dirname, 'logs', 'sql');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    this.writeStream = fs.createWriteStream(`${dirPath}/` + fileName);
  }

  private finishLog() {
    this.writeStream?.close();
  }

  private log(message: string) {
    try {
      const text = `${this.getNowFormatted()} \t - \t ${message} \n`;
      console.log(text);
      this.writeStream?.write(text);
    } catch (_) { }
  }
}

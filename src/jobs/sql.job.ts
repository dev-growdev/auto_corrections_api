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
        (autoCorrection) => this.correctSecondStep(autoCorrection)
      );

      // Fase 03
      this.log(`SQLJob \t-\t Inicia Fase 3`);
      await this.getAutoCorrectionsPerStep(
        '9ad73459-d5a8-42ec-9d5f-b50c7a91b37e',
        (autoCorrection) => this.correctThirdStep(autoCorrection)
      );

      // Fase 04
      this.log(`SQLJob \t-\t Inicia Fase 4`);
      await this.getAutoCorrectionsPerStep(
        'c524e2c7-eed1-42ef-9c6a-86a6fdee608b',
        (autoCorrection) => this.correctFourthStep(autoCorrection)
      );
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

  // Fase 2
  private static async correctSecondStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0];
    const script2 = autoCorrection.payload[1];
    const script3 = autoCorrection.payload[2];
    const results: AutoCorrectionResultDTO[] = [];

    try {
      const createTableResult = await this.runCreateTableScript({
        title: 'Validação script criar tabela PERGUNTAS_RESPOSTAS',
        script: script1.value,
      });
      results.push(createTableResult.autoCorrectionResult);

      const insertResult = await this.runInsertScript({
        title: 'Validação script inserir dados PERGUNTAS_RESPOSTAS',
        script: script2.value,
      });
      results.push(insertResult.autoCorrectionResult);

      const selectResult = await this.runSelectScript({
        title: 'Validação script selecionar dados PERGUNTAS_RESPOSTAS',
        script: script3.value,
        rowCountToValid: insertResult.queryResult?.rowCount ?? 0,
      });

      results.push(selectResult.autoCorrectionResult);
    } catch (error) {
      this.log(`SQLJob \t-\t correctFirtStep Error: ${error}`);
    }

    return results;
  }

  // Fase 3
  private static async correctThirdStep(
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

      const createTableResult = await this.runCreateTableScript({
        title: 'Validação script criar tabela MENSALIDADE',
        script: script1.value,
      });
      results.push(createTableResult.autoCorrectionResult);

      const insertResult = await this.runInsertScript({
        title: 'Validação script inserir dados na tabela MATRICULA',
        script: script2.value,
      });
      results.push(insertResult.autoCorrectionResult);

      const insertResult2 = await this.runInsertScript({
        title: 'Validação script inserir dados na tabela MENSALIDADE',
        script: script3.value,
      });
      results.push(insertResult2.autoCorrectionResult);

      const selectResult = await this.runSelectScript({
        title: 'Validação script selecionar dados na tabela MENSALIDADE',
        script: script4.value,
        rowCountToValid: 50,
      });
      results.push(selectResult.autoCorrectionResult);
      await this.clearInitialData();
    } catch (error) {
      this.log(`SQLJob \t-\t correctFirtStep Error: ${error}`);
    }

    return results;
  }

  // Fase 4
  private static async correctFourthStep(
    autoCorrection: AutoCorrection
  ): Promise<AutoCorrectionResultDTO[]> {
    const script1 = autoCorrection.payload[0];
    const script2 = autoCorrection.payload[1];
    const script3 = autoCorrection.payload[2];
    const results: AutoCorrectionResultDTO[] = [];

    try {
      await this.clearInitialData();
      await this.createInitialData();

      const insertResult = await this.runInsertScript({
        title: 'Validação script inserir dados na tabela RESERVA_EQUIPAMENTO',
        script: script1.value,
      });
      results.push(insertResult.autoCorrectionResult);

      const createView = await this.runSelectScript({
        title: 'Validação script criar view VW_RESERVA_EQUIPAMENTO',
        script: script2.value,
        rowCountToValid: 0,
      });
      results.push(createView.autoCorrectionResult);

      const selectResult = await this.runSelectScript({
        title:
          'Validação script selecionar dados na view VW_RESERVA_EQUIPAMENTO',
        script: script3.value,
        rowCountToValid: insertResult.queryResult?.rowCount ?? 0,
      });
      results.push(selectResult.autoCorrectionResult);
      await this.clearInitialData();
    } catch (error) {
      this.log(`SQLJob \t-\t correctFirtStep Error: ${error}`);
    }

    return results;
  }

  private static async runCreateTableScript(params: {
    script: string;
    title: string;
  }): Promise<RunScriptResult> {
    const { script, title } = params;
    try {
      const tableName = this.extractTableName(script);
      if (tableName) {
        try {
          await pgHelper.client.query(`DROP TABLE IF EXISTS ${tableName};`);
        } catch (_) {}
      }

      const queryResult = await pgHelper.client.query(script);

      const autoCorrectionResult = {
        title: title,
        approved: true,
      };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      this.log(`SQLJob \t-\t runCreateTableScript Error: ${error}`);
      const autoCorrectionResult = {
        title: title,
        approved: false,
      };
      return { autoCorrectionResult };
    }
  }

  private static async runInsertScript(params: {
    script: string;
    title: string;
    rowCountToValid?: number;
  }): Promise<RunScriptResult> {
    const { script, title, rowCountToValid } = params;
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) > (rowCountToValid ?? 0);

      const autoCorrectionResult = {
        title: title,
        approved: isValid,
      };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      this.log(`SQLJob \t-\t runInsertScript Error: ${error}`);
      const autoCorrectionResult = {
        title: title,
        approved: false,
      };
      return { autoCorrectionResult };
    }
  }

  private static async runSelectScript(params: {
    script: string;
    title: string;
    rowCountToValid: number;
  }): Promise<RunScriptResult> {
    const { script, title, rowCountToValid } = params;
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) >= rowCountToValid;

      const autoCorrectionResult = {
        title: title,
        approved: isValid,
      };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      this.log(`SQLJob \t-\t runSelectScript Error: ${error}`);
      const autoCorrectionResult = {
        title: title,
        approved: false,
      };
      return { autoCorrectionResult };
    }
  }

  private static async runUpdateScript(params: {
    script: string;
    title: string;
  }): Promise<RunScriptResult> {
    const { script, title } = params;
    try {
      const queryResult = await pgHelper.client.query(script);

      const isValid = (queryResult.rowCount ?? 0) > 0;

      const autoCorrectionResult = {
        title: title,
        approved: isValid,
      };

      return { autoCorrectionResult, queryResult };
    } catch (error) {
      this.log(`SQLJob \t-\t runUpdateScript Error: ${error}`);
      const autoCorrectionResult = {
        title: title,
        approved: false,
      };
      return { autoCorrectionResult };
    }
  }

  private static async createInitialData(): Promise<void> {
    const createTableFamilyResult = await this.runCreateTableScript({
      title: 'Criar tabela familia',
      script: `CREATE TABLE familia (
          id int primary key not null,
          nome varchar(40) not null
        );`,
    });

    if (!createTableFamilyResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao criar tabela familia');
    }

    const createTablePersonResult = await this.runCreateTableScript({
      title: 'Criar tabela pessoa',
      script: `CREATE TABLE pessoa (
            id int primary key not null,
            nome varchar(100) not null,
            idade int not null,
            renda real ,
            familia_id int references familia(id) not null
          );`,
    });

    if (!createTablePersonResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao criar tabela pessoa');
    }

    const insertFamilyResult = await this.runInsertScript({
      title: 'Inserir dados na tabela familia',
      script: `INSERT INTO familia (id,nome) values (1,'Simpsons'), (2,'Adamms');`,
    });

    if (!insertFamilyResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao inserir dados na tabela familia');
    }

    const insertPersonResult = await this.runInsertScript({
      title: 'Inserir dados na tabela pessoa',
      script: `INSERT INTO pessoa (id ,nome,idade,renda,familia_id ) values (1 ,'Homer',39,4000.00 ,1 ),(2 ,'Marge',36,6000.00 ,1 ), 
        (3 ,'Bart',12,20.00 ,1 ),(4 ,'Lisa',10,0 ,1 ), (5 ,'Maggie',1,0 ,1 ),(6 ,'Gomez',38,8000.00 ,2 ),
        (7 ,'Morticia',35,8000.00 ,2 ), (8 ,'Wandinha',12,0 ,2 ), (9 ,'Feioso',10,0 ,2 ), 
        (10 ,'Vovó Addams',62,6200.00 ,2 ), (11 ,'Tio Chico',41,6000.00 ,2 ), 
        (12 ,'Tropeço',29,3500.00 ,2 ), (13 ,'Mãozinha',20,0 ,2 );`,
    });

    if (!insertPersonResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao inserir dados na tabela pessoa');
    }

    const createTableEnrollmentResult = await this.runCreateTableScript({
      title: 'Criar tabela matricula',
      script: `create table matricula(
            id SERIAL PRIMARY KEY NOT NULL,
            dt_associacao DATE NOT NULL,
            dt_encerramento DATE,
            pessoa_id INT NOT NULL REFERENCES pessoa(id)
          );`,
    });

    if (!createTableEnrollmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao criar tabela matricula');
    }

    const insertEnrollmentResult = await this.runInsertScript({
      title: 'Inserir dados na tabela matricula',
      script: `INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2),
        ('10/10/2018',3), ('10/10/2018',4), ('10/10/2018',5), ('10/10/2018',6), 
        ('10/10/2018',7), ('10/10/2018',8), ('10/10/2018',9), ('10/10/2018',10),
        ('10/10/2018',11), ('10/10/2018',12), ('10/10/2018',13);`,
    });

    if (!insertEnrollmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao inserir dados na tabela matricula');
    }

    const createTableEquipmentResult = await this.runCreateTableScript({
      title: 'Criar tabela equipamento',
      script: `create table equipamento(
          id serial primary key not null, 
          descricao varchar(200) not null	
        );`,
    });

    if (!createTableEquipmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao criar tabela equipamento');
    }

    const insertEquipmentResult = await this.runInsertScript({
      title: 'Inserir dados na tabela equipamento',
      script: `INSERT INTO equipamento (descricao) VALUES ('Kit Volei'), ('Kit Beach Tênis'), ('Prancha'), 
        ('Skate'), ('Bola de futebol');`,
    });

    if (!insertEquipmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao inserir dados na tabela equipamento');
    }

    const createTableEquipamentReservationResult =
      await this.runCreateTableScript({
        title: 'Criar tabela reserva_equipamento',
        script: `create table reserva_equipamento(
          id serial primary key not null,
          dt_reserva date not null,
          dt_devolucao date,
          matricula_id int not null references matricula(id), 
          equipamento_id int not null references equipamento(id) 
        );`,
      });

    if (!createTableEquipamentReservationResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao criar tabela reserva_equipamento');
    }
  }

  private static async clearInitialData(): Promise<void> {

    const dropTableViewAssociationReservationResult =
      await this.runCreateTableScript({
        title: 'Excluir view vw_reserva_associado',
        script: `DROP VIEW IF EXISTS vw_reserva_associado;`,
      });

    if (!dropTableViewAssociationReservationResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir a view vw_reserva_eassociado');
    }

    const dropTableEquipamentReservationResult =
      await this.runCreateTableScript({
        title: 'Excluir tabela reserva_equipamento',
        script: `DROP TABLE IF EXISTS reserva_equipamento;`,
      });

    if (!dropTableEquipamentReservationResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir tabela reserva_equipamento');
    }

    const dropTableEquipmentResult = await this.runCreateTableScript({
      title: 'Excluir tabela equipamento',
      script: `DROP TABLE IF EXISTS equipamento;`,
    });

    if (!dropTableEquipmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir tabela equipamento');
    }

    const dropTableEnrollmentResult = await this.runCreateTableScript({
      title: 'Excluir tabela matricula',
      script: `DROP TABLE IF EXISTS matricula;`,
    });

    if (!dropTableEnrollmentResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir tabela matricula');
    }

    const dropTablePersonResult = await this.runCreateTableScript({
      title: 'Excluir tabela pessoa',
      script: `DROP TABLE IF EXISTS pessoa;`,
    });

    if (!dropTablePersonResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir tabela pessoa');
    }

    const dropTableFamilyResult = await this.runCreateTableScript({
      title: 'Excluir tabela familia',
      script: `DROP TABLE IF EXISTS familia;`,
    });

    if (!dropTableFamilyResult.autoCorrectionResult.approved) {
      throw new Error('Erro ao excluir tabela familia');
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

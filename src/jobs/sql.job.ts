import "dotenv/config";

import { pgHelper } from "../pg-helper";
import axios from "axios";
import fs from "node:fs";
import { QueryResult } from "pg";
import path from "node:path";

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

      console.log(new Date() + " - SQL - Iniciando");

      this.log("SQLJob \t-\t Iniciando");

      await pgHelper.connect();

      // Fase 02
      this.log(`SQLJob \t-\t Inicia Fase 2`);
      await this.getAutoCorrectionsPerStep(
        "3a231abf-d826-4e46-a2c0-e030822f11f8",
        (autoCorrection) => this.correctSecondStep(autoCorrection)
      );

      // Fase 03
      this.log(`SQLJob \t-\t Inicia Fase 3`);
      await this.getAutoCorrectionsPerStep(
        "9ad73459-d5a8-42ec-9d5f-b50c7a91b37e",
        (autoCorrection) => this.correctThirdStep(autoCorrection)
      );

      // Fase 04
      this.log(`SQLJob \t-\t Inicia Fase 4`);
      await this.getAutoCorrectionsPerStep(
        "c524e2c7-eed1-42ef-9c6a-86a6fdee608b",
        (autoCorrection) => this.correctFourthStep(autoCorrection)
      );
    } catch (error) {
      this.log(`SQLJob \t-\t Error ao executar fases: ${error}`);
      console.log(new Date() + " - SQL - Erro");
    } finally {
      await pgHelper.disconnect();
      this.log("SQLJob \t-\t Finalizou");
      console.log(new Date() + " - SQL - Finalizou");
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
      const classUid = "a89b386b-cfc1-429f-97e1-8dded6174d63";

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
        await pgHelper.client.query(
          `DROP TABLE IF EXISTS perguntas_respostas;`
        );
        await pgHelper.client.query(`DROP TABLE IF EXISTS pergunta_resposta;`);
        await pgHelper.client.query(`DROP TABLE IF EXISTS perguntas_resposta;`);
        await pgHelper.client.query(`DROP TABLE IF EXISTS pergunta_respostas;`);
      } catch (_) {}

      const validFirstScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script criar tabela PERGUNTAS_RESPOSTAS",
          approved: false,
        };
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(
            `SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'perguntas_respostas' ) as table_exist;`
          );
          autoCorrectionResult.approved = existResult.rows[0]
            .table_exist as boolean;
        } catch (error) {
          try {
            // apaga a tabela se existir
            await pgHelper.client.query(
              `DROP TABLE IF EXISTS perguntas_respostas;`
            );

            await pgHelper.client.query(`CREATE TABLE perguntas_respostas(
              PERGUNTA varchar(5000),
              RESPOSTA varchar(5000)
            );`);
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao criar a tabela PERGUNTAS_RESPOSTAS para nao impactar os próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult = {
          title: "Validação script inserir dados PERGUNTAS_RESPOSTAS",
          approved: false,
        };

        let rowCountInsert = 0;
        try {
          const queryResult = await pgHelper.client.query(script);
          autoCorrectionResult.approved =
            ((queryResult.rowCount ?? 0) ||
              (queryResult as any as QueryResult[]).length) > 0;
          rowCountInsert =
            (queryResult.rowCount ?? 0) ||
            (queryResult as any as QueryResult[]).length;
        } catch (error: any) {
          try {
            // apaga qualquer registro se existir
            await pgHelper.client.query(`DELETE FROM perguntas_respostas;`);

            await pgHelper.client
              .query(`insert into perguntas_respostas(pergunta, resposta) values
            ('Qualquer pessoa tem direito ao certificado de Pós Graduação?', 'O Certificado de Pós-Graduação reconhecido pelo MEC será disponibilizado apenas para alunos que apresentarem Diploma de Graduação ou documento comprobatório de conclusão do Ensino Superior dentro do prazo e atingir os requisitos de aprovação da formação.'), 
            ('Não possuo Ensino Superior Completo mas quero fazer a Formação. Tenho direito a certificado?', 'Sim! Para não-graduados, a Formação também garante Certificado de Conclusão reconhecido pelo mercado, atestando seu empenho e aprendizado, desde que atinja os requisitos para aprovação.'),
            ('Qual é o período para conclusão da Formação?', 'Para cada Formação, você terá acesso às aulas e atividades por 12 meses a partir da data de contratação.'), 
            ('Não consegui concluir a Formação dentro de 12 meses. O que posso fazer?', 'Nós sabemos que imprevistos acontecem e que algumas pessoas podem precisar de mais do que 12 meses para concluir sua formação. Pensando nisso, nós disponibilizamos Pacotes Adicionais de Extensão de Período, com opções de 1, 3 ou 6 meses para terminar seu curso. Você pode consultar condições e solicitar a Extensão na Central de Ajuda da Plataforma Academy by Growdev.'), 
            ('A Growdev garante emprego após a Formação?', 'Não, a Growdev não garante emprego durante ou após a formação. Por ser empresa de tecnologia e por contar com o Núcleo de Empregabilidade, alguns dos alunos podem ser selecionados e indicados para processos seletivos na própria Growdev ou em empresas parceiras, desde que cumpram os pré-requisitos solicitados pela empresa contratante e tenham apresentado bom desempenho ao longo da Formação.'),
            ('É necessário atingir uma pontuação mínima para receber o certificado?', 'Sim, é necessário uma média mínima para recebimento dos certificados, conforme descrito em contrato.');`);

            rowCountInsert = 6;
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao inserir os dados na tabela PERGUNTAS_RESPOSTAS para nao impactar os próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o segundo script - Error: ${error?.stack}`
          );
        }
        return { autoCorrectionResult, rowCountInsert };
      };

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript.autoCorrectionResult);

      const validThirdScript = async (
        script: string,
        rowCountInsert: number
      ) => {
        const autoCorrectionResult = {
          title: "Validação script selecionar dados PERGUNTAS_RESPOSTAS",
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);

          if (rowCountInsert === 0) {
            autoCorrectionResult.approved = (queryResult.rowCount ?? 0) > 0;
          } else {
            autoCorrectionResult.approved =
              queryResult.rowCount === rowCountInsert;
          }
        } catch (error) {
          this.log(
            `SQLJob \t-\t Error ao validar o terceiro script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultThirdScript = await validThirdScript(
        script3.value,
        resultSecondScript.rowCountInsert
      );
      results.push(resultThirdScript);
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro na correção do desafio da fase 2 - Error: ${error}`
      );
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
          title: "Validação script criar tabela MENSALIDADE",
          approved: false,
        };
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(
            `SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'mensalidade' ) as table_exist;`
          );
          autoCorrectionResult.approved = existResult.rows[0]
            .table_exist as boolean;
        } catch (error) {
          // Cria a tabela mensalidade para não impactar os próximos scripts
          try {
            await pgHelper.client.query(`create table mensalidade(
              id serial primary key not null,
              dt_vencimento date not null,
              vlr_mensalidade real not null,
              dt_pagamento date not null,
              vlr_pago real not null,
              vlr_multa real not null,
              vlr_juros real not null,
              matricula_id int not null references matricula(id)
            );`);
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao criar a tabela mensalidade para nao impactar próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script inserir dados na tabela MATRICULA",
          approved: false,
        };

        const resolveDBWithDatas = async () => {
          // deleta os dados populados no início da função e reseta o serial para 1
          await pgHelper.client.query(
            `DELETE FROM matricula; ALTER SEQUENCE matricula_id_seq RESTART WITH 1;`
          );

          // popula o banco com o homer e a marge
          try {
            await pgHelper.client.query(
              `INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2);`
            );
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao inserir dados na tabela matricula antes do script 2 da fase 3 - Error: ${error}`
            );
            throw error;
          }
        };

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
        };

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
        };

        try {
          const queryResult = await pgHelper.client.query(script);

          if ((queryResult as any).length) {
            await validWithList(queryResult as any as QueryResult[]);
          } else {
            await validWithoutList(queryResult);
          }
        } catch (error) {
          // Popula a tabela matricula para não impactar os outros scripts
          try {
            // deleta os dados populados no início da função e reseta o serial para 1
            await pgHelper.client.query(
              `DELETE FROM matricula; ALTER SEQUENCE matricula_id_seq RESTART WITH 1;`
            );

            await pgHelper.client
              .query(`INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2),
            ('10/10/2018',3), ('10/10/2018',4), ('10/10/2018',5), ('10/10/2018',6), 
            ('10/10/2018',7), ('10/10/2018',8), ('10/10/2018',9), ('10/10/2018',10),
            ('10/10/2018',11), ('10/10/2018',12), ('10/10/2018',13);`);
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao popular dados na tabela matricula para nao impactar próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o segundo script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript);

      const validThirdScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script inserir dados na tabela MENSALIDADE",
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);

          autoCorrectionResult.approved =
            ((queryResult.rowCount ?? 0) ||
              (queryResult as any as QueryResult[]).length) > 0;
        } catch (error) {
          // Popula a tabela mensalidade para não impactar os próximos scripts
          try {
            await pgHelper.client
              .query(`insert into mensalidade(dt_vencimento,vlr_mensalidade,dt_pagamento,vlr_pago,vlr_multa,vlr_juros,matricula_id) values 
            ('04/04/2023','100.00','01/04/2023','100.00','0.00','0.00',1),
              ('04/05/2023','100.00','02/05/2023','100.00','0.00','0.00',1),
              ('04/06/2023','100.00','01/06/2023','100.00','0.00','0.00',1),
              ('04/07/2023','100.00','03/07/2023','100.00','0.00','0.00',1),
              ('04/08/2023','100.00','10/08/2023','110.00','7.00','3.00',1),
              ('04/09/2023','100.00','01/09/2023','100.00','0.00','0.00',1),
              ('04/10/2023','100.00','02/10/2023','100.00','0.00','0.00',1),
              ('04/11/2023','100.00','02/11/2023','100.00','0.00','0.00',1),
              ('04/12/2023','100.00','01/12/2023','100.00','0.00','0.00',1),
              ('04/01/2024','100.00','01/01/2024','100.00','0.00','0.00',1),
              ('04/04/2023','100.00','01/04/2023','100.00','0.00','0.00',2),
              ('04/05/2023','100.00','02/05/2023','100.00','0.00','0.00',2),
              ('04/06/2023','100.00','01/06/2023','100.00','0.00','0.00',2),
              ('04/07/2023','100.00','03/07/2023','100.00','0.00','0.00',2),
              ('04/08/2023','100.00','10/08/2023','110.00','7.00','3.00',2),
              ('04/09/2023','100.00','01/09/2023','100.00','0.00','0.00',2),
              ('04/10/2023','100.00','02/10/2023','100.00','0.00','0.00',2),
              ('04/11/2023','100.00','02/11/2023','100.00','0.00','0.00',2),
              ('04/12/2023','100.00','01/12/2023','100.00','0.00','0.00',2),
              ('04/01/2024','100.00','01/01/2024','100.00','0.00','0.00',2),
              ('04/04/2023','50.00','01/04/2023','50.00','0.00','0.00',3),
              ('04/05/2023','50.00','02/05/2023','50.00','0.00','0.00',3),
              ('04/06/2023','50.00','01/06/2023','50.00','0.00','0.00',3),
              ('04/07/2023','50.00','03/07/2023','50.00','0.00','0.00',3),
              ('04/08/2023','50.00','10/08/2023','60.00','7.00','3.00',3),
              ('04/09/2023','50.00','01/09/2023','50.00','0.00','0.00',3),
              ('04/10/2023','50.00','02/10/2023','50.00','0.00','0.00',3),
              ('04/11/2023','50.00','02/11/2023','50.00','0.00','0.00',3),
              ('04/12/2023','50.00','01/12/2023','50.00','0.00','0.00',3),
              ('04/01/2024','50.00','01/01/2024','50.00','0.00','0.00',3),
              ('04/04/2023','50.00','01/04/2023','50.00','0.00','0.00',4),
              ('04/05/2023','50.00','02/05/2023','50.00','0.00','0.00',4),
              ('04/06/2023','50.00','01/06/2023','50.00','0.00','0.00',4),
              ('04/07/2023','50.00','03/07/2023','50.00','0.00','0.00',4),
              ('04/08/2023','50.00','10/08/2023','60.00','7.00','3.00',4),
              ('04/09/2023','50.00','01/09/2023','50.00','0.00','0.00',4),
              ('04/10/2023','50.00','02/10/2023','50.00','0.00','0.00',4),
              ('04/11/2023','50.00','02/11/2023','50.00','0.00','0.00',4),
              ('04/12/2023','50.00','01/12/2023','50.00','0.00','0.00',4),
              ('04/01/2024','50.00','01/01/2024','50.00','0.00','0.00',4),
              ('04/04/2023','20.00','01/04/2023','20.00','0.00','0.00',5),
              ('04/05/2023','20.00','02/05/2023','20.00','0.00','0.00',5),
              ('04/06/2023','20.00','01/06/2023','20.00','0.00','0.00',5),
              ('04/07/2023','20.00','03/07/2023','20.00','0.00','0.00',5),
              ('04/08/2023','20.00','10/08/2023','30.00','7.00','3.00',5),
              ('04/09/2023','20.00','01/09/2023','20.00','0.00','0.00',5),
              ('04/10/2023','20.00','02/10/2023','20.00','0.00','0.00',5),
              ('04/11/2023','20.00','02/11/2023','20.00','0.00','0.00',5),
              ('04/12/2023','20.00','01/12/2023','20.00','0.00','0.00',5),
              ('04/01/2024','20.00','01/01/2024','20.00','0.00','0.00',5);`);
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao popular dados na tabela mensalidade para nao impactar próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao inserir dados na tabela MENSALIDADE - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultThirdScript = await validThirdScript(script3.value);
      results.push(resultThirdScript);

      const validFourScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script selecionar dados na tabela MENSALIDADE",
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 pessoas x 10 mensalidades para cada pessoa = 50
          autoCorrectionResult.approved = (queryResult.rowCount ?? 0) === 50;
        } catch (error) {
          this.log(
            `SQLJob \t-\t Erro ao consultar os dados da tabela mensalidade - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultFourScript = await validFourScript(script4.value);
      results.push(resultFourScript);

      await this.clearInitialData();
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro na correção desafio da fase 3 - Error: ${error}`
      );
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
        await pgHelper.client
          .query(`INSERT INTO matricula (dt_associacao,pessoa_id ) VALUES ('10/10/2018',1), ('10/10/2018',2),
      ('10/10/2018',3), ('10/10/2018',4), ('10/10/2018',5);`);
      } catch (error) {
        this.log(
          `SQLJob \t-\t Erro ao inserir dados na tabela matricula - Error: ${error}`
        );
        throw error;
      }

      const validFirstScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script inserir dados na tabela MATRICULA",
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);
          autoCorrectionResult.approved =
            ((queryResult.rowCount ?? 0) ||
              (queryResult as any as QueryResult[]).length) >= 7;
        } catch (error) {
          // popula a tabela matricula com os registros dos integrantes da familia addams,
          // para não impactar os próximos scripts
          try {
            await pgHelper.client.query(
              `INSERT INTO matricula(dt_associacao, pessoa_id) values ('2024-3-1', 6),('2024-3-1', 7),('2024-3-1', 8),('2024-3-1', 9),('2024-3-1', 10),('2024-3-1',11),('2024-3-1', 12),('2024-3-1', 13);`
            );
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao inserir dados na tabela matricula para nao impactar próximos scripts - Error: ${error}`
            );
            throw error;
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o primeiro script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultFirstScript = await validFirstScript(script1.value);
      results.push(resultFirstScript);

      const validSecondScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script inserir dados na tabela RESERVA_EQUIPAMENTO",
          approved: false,
        };
        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 equipamentos x 12 pessoas = 60
          autoCorrectionResult.approved =
            ((queryResult.rowCount ?? 0) ||
              (queryResult as any as QueryResult[]).length) === 60;
        } catch (error) {
          // popula a tabela reserva_equipamento com os registros de reservas,
          // para não impactar os próximos scripts
          try {
            await pgHelper.client
              .query(`INSERT INTO reserva_equipamento(dt_reserva,dt_devolucao,equipamento_id,matricula_id) values
            ('2023-07-01','2023-07-01',1,1),
            ('2023-07-02','2023-07-02',2,1),
            ('2023-07-03','2023-07-03',3,1),
            ('2023-07-03','2023-07-03',4,1),
            ('2023-07-10','2023-07-10',5,1),
            ('2023-07-11','2023-07-11',1,2),
            ('2023-07-12','2023-07-12',2,2),
            ('2023-07-13','2023-07-13',3,2),
            ('2023-07-13','2023-07-13',4,2),
            ('2023-07-18','2023-07-18',5,2),
            ('2023-07-14','2023-07-14',1,3),
            ('2023-07-14','2023-07-14',2,3),
            ('2023-07-15','2023-07-15',3,3),
            ('2023-07-15','2023-07-15',4,3),
            ('2023-07-17','2023-07-17',5,3),
            ('2023-07-16','2023-07-16',1,4),
            ('2023-07-16','2023-07-16',2,4),
            ('2023-07-19','2023-07-19',3,4),
            ('2023-07-19','2023-07-19',4,4),
            ('2023-07-20','2023-07-20',5,4),
            ('2023-07-21','2023-07-21',1,5),
            ('2023-07-21','2023-07-21',2,5),
            ('2023-07-22','2023-07-22',3,5),
            ('2023-07-22','2023-07-22',4,5),
            ('2023-07-24','2023-07-24',5,5),
            ('2023-08-01','2023-08-01',1,6),
            ('2023-08-01','2023-08-01',2,6),
            ('2023-08-02','2023-08-02',3,6),
            ('2023-08-02','2023-08-02',4,6),
            ('2023-08-04','2023-08-04',5,6),
            ('2023-08-03','2023-08-03',1,7),
            ('2023-08-03','2023-08-03',2,7),
            ('2023-08-05','2023-08-05',3,7),
            ('2023-08-05','2023-08-05',4,7),
            ('2023-08-06','2023-08-06',5,7),
            ('2023-08-07','2023-08-07',1,8),
            ('2023-08-07','2023-08-07',2,8),
            ('2023-08-09','2023-08-09',3,8),
            ('2023-08-09','2023-08-09',4,8),
            ('2023-08-10','2023-08-10',5,8),
            ('2023-08-08','2023-08-08',1,9),
            ('2023-08-08','2023-08-08',2,9),
            ('2023-08-11','2023-08-11',3,9),
            ('2023-08-11','2023-08-11',4,9),
            ('2023-08-12','2023-08-12',5,9),
            ('2023-08-13','2023-08-13',1,10),
            ('2023-08-13','2023-08-13',2,10),
            ('2023-08-15','2023-08-15',3,10),
            ('2023-08-15','2023-08-15',4,10),
            ('2023-08-16','2023-08-16',5,10),
            ('2023-08-14','2023-08-14',1,11),
            ('2023-08-14','2023-08-14',2,11),
            ('2023-08-17','2023-08-17',3,11),
            ('2023-08-17','2023-08-17',4,11),
            ('2023-08-19','2023-08-19',5,11),
            ('2023-08-18','2023-08-18',1,12),
            ('2023-08-18','2023-08-18',2,12),
            ('2023-08-20','2023-08-20',3,12),
            ('2023-08-21','2023-08-21',4,12),
            ('2023-08-24','2023-08-24',5,12);`);
          } catch (error) {
            this.log(
              `SQLJob \t-\t Erro ao inserir dados na tabela reserva_equipamento para nao impactar próximos scripts - Error: ${error}`
            );
          }

          this.log(
            `SQLJob \t-\t Erro ao executar o segundo script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultSecondScript = await validSecondScript(script2.value);
      results.push(resultSecondScript);

      const validThirdScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title: "Validação script criar view VW_RESERVA_EQUIPAMENTO",
          approved: false,
        };
        try {
          await pgHelper.client.query(script);
          const existResult = await pgHelper.client.query(
            `SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'vw_reserva_associado' ) as view_exist;`
          );
          autoCorrectionResult.approved = existResult.rows[0]
            .view_exist as boolean;
        } catch (error) {
          this.log(
            `SQLJob \t-\t Erro ao executar o terceiro script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultThirdScript = await validThirdScript(script3.value);
      results.push(resultThirdScript);

      const validFourScript = async (script: string) => {
        const autoCorrectionResult: AutoCorrectionResultDTO = {
          title:
            "Validação script selecionar dados na view VW_RESERVA_EQUIPAMENTO",
          approved: false,
        };

        if (!script) return autoCorrectionResult;

        try {
          const queryResult = await pgHelper.client.query(script);
          // 5 equipamentos x 12 pessoas = 60
          autoCorrectionResult.approved = (queryResult.rowCount ?? 0) === 60;
        } catch (error) {
          this.log(
            `SQLJob \t-\t Erro ao executar o quarto script - Error: ${error}`
          );
        }
        return autoCorrectionResult;
      };

      const resultFourScript = await validFourScript(script4?.value);
      results.push(resultFourScript);

      await this.clearInitialData();
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro na correção do desafio da fase 4 - Error: ${error}`
      );
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
      await pgHelper.client.query(
        `INSERT INTO familia (id,nome) values (1,'Simpsons'), (2,'Adamms');`
      );
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro ao inserir dados na tabela familia - Error: ${error}`
      );
      throw error;
    }

    try {
      await pgHelper.client
        .query(`INSERT INTO pessoa (id ,nome,idade,renda,familia_id ) values 
      (1, 'Homer', 39, 4000.00, 1), (2, 'Marge', 36, 6000.00, 1), (3, 'Bart', 12, 200.00, 1), (4, 'Lisa', 10, 0, 1), (5, 'Maggie', 1, 0, 1),
      (6, 'Gomez', 38, 8000.00, 2), (7, 'Morticia', 35, 8000.00, 2), (8, 'Wandinha', 12, 0, 2), (9, 'Feioso', 10, 0, 2), 
      (10, 'Vovó Addams', 62, 10000.00, 2), (11, 'Tio Chico', 41, 6000.00, 2), (12, 'Tropeço', 29, 3500.00, 2), (13, 'Mãozinha', 2, 200, 2);`);
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro ao inserir dados na tabela pessoa - Error: ${error}`
      );
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
      this.log(
        `SQLJob \t-\t Erro ao criar tabela equipamento - Error: ${error}`
      );
      throw error;
    }

    try {
      await pgHelper.client
        .query(`INSERT INTO equipamento (descricao) VALUES ('Kit Volei'), ('Kit Beach Tênis'), ('Prancha'), 
      ('Skate'), ('Bola de futebol');`);
    } catch (error) {
      this.log(
        `SQLJob \t-\t Erro ao inserir dados na tabela equipamento - Error: ${error}`
      );
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
      this.log(
        `SQLJob \t-\t Erro ao criar tabela reserva_equipamento - Error: ${error}`
      );
      throw error;
    }
  }

  private async clearInitialData(): Promise<void> {
    try {
      // remove view criada como table
      const tableViewNames = (
        await pgHelper.client.query(
          `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ilike 'vw%';`
        )
      ).rows;

      if (tableViewNames.length) {
        const tableViews = tableViewNames
          .map(({ tablename }) => `"public"."${tablename}"`)
          .join(", ");

        const queryDropTableViews = `DROP TABLE IF EXISTS ${tableViews};`;
        console.log(queryDropTableViews);

        await pgHelper.client.query(queryDropTableViews);
      }

      // remove as views
      const viewsNames = (
        await pgHelper.client.query(
          `SELECT viewname FROM pg_views WHERE schemaname='public' and viewname not ilike 'pg%';`
        )
      ).rows;

      if (viewsNames.length) {
        const views = viewsNames
          .map(({ viewname }) => `"public"."${viewname}"`)
          .join(", ");

        const queryDropViews = `DROP VIEW IF EXISTS ${views};`;

        await pgHelper.client.query(queryDropViews);
      }
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao limpar as views - Error: ${error}`);
    }

    try {
      const tableNames = (
        await pgHelper.client.query(
          `SELECT tablename FROM pg_tables WHERE schemaname='public'`
        )
      ).rows;

      if (tableNames.length) {
        const tables = tableNames
          .map(({ tablename }) => `"public"."${tablename}"`)
          .join(", ");

        const queryDropTables = `DROP TABLE IF EXISTS ${tables};`;

        await pgHelper.client.query(queryDropTables);
      }
    } catch (error) {
      this.log(`SQLJob \t-\t Erro ao limpar as tables - Error: ${error}`);
    }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS vw_reserva_associado;`);
    // } catch (error: any) {
    //   this.log(`SQLJob \t-\t Erro ao excluir a tabela (view) vw_reserva_associado - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP VIEW IF EXISTS vw_reserva_associado;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir a view vw_reserva_associado - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS mensalidade;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela mensalidade - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS reserva_equipamento;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela reserva_equipamento - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS equipamento;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela equipamento - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS matricula;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela matricula - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS pessoa;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela pessoa - Error: ${error}`);
    // }

    // try {
    //   await pgHelper.client.query(`DROP TABLE IF EXISTS familia;`);
    // } catch (error) {
    //   this.log(`SQLJob \t-\t Erro ao excluir tabela familia - Error: ${error}`);
    // }
  }

  private getNowFormatted() {
    const now = new Date();
    return `${now.getDate()}-${
      now.getMonth() + 1
    }-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
  }

  private startLog() {
    const fileName = `${this.getNowFormatted()}-sql-log.txt`;
    const dirPath = path.join(__dirname, "logs", "sql");
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
      // console.log(text);
      this.writeStream?.write(text);
    } catch (_) {}
  }
}

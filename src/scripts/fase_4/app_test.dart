import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:hive/hive.dart';
import 'package:integration_test/integration_test.dart';

import '../lib/main.dart' as app;
import 'send_test_result.dart';

void main() {
  final List<TestResult> results = [];

  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() async {
    await Future.delayed(const Duration(seconds: 1));
    await GetIt.instance.reset();
    await Hive.deleteFromDisk();
    Hive.resetAdapters();
  });

  tearDownAll(() => enviaResultados(results));

  group('end-to-end test', () {
    testWidgets('Validação da tela principal sem decks cadastrados',
        (tester) async {
      results.add(TestResult(
        title: 'Validação da tela principal sem decks cadastrados',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('emptyDeckImage')), findsOneWidget);
      expect(find.byKey(const Key('addNewDeckOutlineBtn')), findsOneWidget);
      expect(find.byKey(const Key('addNewDeckFloatingBtn')), findsOneWidget);
      expect(find.text('Decks'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Criando o primeiro deck pelo botão da página', (tester) async {
      results.add(TestResult(
        title: 'Validação da criação do deck pelo botão da página',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela de criar novo deck pelo botão da página
      await tester.tap(find.byKey(const Key('addNewDeckOutlineBtn')));
      await tester.pumpAndSettle();

      // cria o deck informando o nome do memso
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));

      await tester.pumpAndSettle();

      final deckCard = find.byKey(const Key('deckCard'));

      expect(deckCard, findsOneWidget);
      expect(
        find.descendant(
          of: deckCard,
          matching: find.text('deck 1'),
        ),
        findsOneWidget,
      );

      results.last.approved = true;
    });

    testWidgets('Criando o primeiro deck pelo floating action button',
        (tester) async {
      results.add(TestResult(
        title: 'Validação da criação do deck pelo floating action button',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela de criar novo deck pelo floatin action button
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck informando o nome do memso
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));

      await tester.pumpAndSettle();

      final deckCard = find.byKey(const Key('deckCard'));

      expect(deckCard, findsOneWidget);
      expect(
        find.descendant(
          of: deckCard,
          matching: find.text('deck 1'),
        ),
        findsOneWidget,
      );

      results.last.approved = true;
    });

    testWidgets('Excluindo o deck', (tester) async {
      results.add(TestResult(
        title: 'Validação da exclusão do deck',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela de criar novo deck pelo floatin action button
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck informando o nome do memso
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('deckCard')), findsOneWidget);

      // remove o deck
      await tester.longPress(find.byKey(const Key('deckCard')));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('deckCard')), findsNothing);

      results.last.approved = true;
    });

    testWidgets('Validando a página de detalhe do deck', (tester) async {
      results.add(TestResult(
        title: 'Validação da página de detalhe deck',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // acessa a página de criar deck
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));

      await tester.pumpAndSettle();

      // acessa o detalhe do deck
      await tester.tap(find.byKey(const Key('deckCard')));
      await tester.pumpAndSettle();

      expect(find.text('deck 1'), findsNWidgets(2));
      expect(find.text('0 cartões'), findsOneWidget);
      expect(find.byKey(const Key('addNewQuestionBtn')), findsOneWidget);
      expect(find.byKey(const Key('startQuizBtn')), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do fluxo de adicionar questão', (tester) async {
      results.add(TestResult(
        title: 'Validação do fluxo de adicionar cartões',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // acessa a página de criar deck
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));
      await tester.pumpAndSettle();

      // acessa o detalhe do deck
      await tester.tap(find.byKey(const Key('deckCard')));
      await tester.pumpAndSettle();

      expect(find.text('0 cartões'), findsOneWidget);

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o primeiro cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'isso é um teste automatizado?',
      );
      await tester.enterText(find.byKey(const Key('inputAnswer')), 'Sim');
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('1 cartões'), findsOneWidget);

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o segundo cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'Que formação é essa?',
      );
      await tester.enterText(
        find.byKey(const Key('inputAnswer')),
        'De flutter',
      );
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('2 cartões'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Jogando o quiz com 2 acertos', (tester) async {
      results.add(TestResult(
        title: 'Validando o quiz com 2 acertos',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // acessa a página de criar deck
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));
      await tester.pumpAndSettle();

      // acessa o detalhe do deck
      await tester.tap(find.byKey(const Key('deckCard')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o primeiro cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'isso é um teste automatizado?',
      );
      await tester.enterText(find.byKey(const Key('inputAnswer')), 'Sim');
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o segundo cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'Que formação é essa?',
      );
      await tester.enterText(
        find.byKey(const Key('inputAnswer')),
        'De flutter',
      );
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('2 cartões'), findsOneWidget);

      // inicia o quiz
      await tester.tap(find.byKey(const Key('startQuizBtn')));
      await tester.pumpAndSettle();

      expect(find.text('1/2'), findsOneWidget);
      expect(find.text('isso é um teste automatizado?'), findsOneWidget);
      expect(find.text('Visualizar resposta'), findsOneWidget);

      // altera para visualizar a resposta
      await tester.tap(find.byKey(const Key('switchBetweenAnswerQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('Sim'), findsOneWidget);
      expect(find.text('Visualizar pergunta'), findsOneWidget);

      // altera para visualizar a pergunta
      await tester.tap(find.byKey(const Key('switchBetweenAnswerQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('isso é um teste automatizado?'), findsOneWidget);
      expect(find.text('Visualizar resposta'), findsOneWidget);

      // marca que acertou
      await tester.tap(find.byKey(const Key('correctAnswerBtn')));
      await tester.pumpAndSettle();

      expect(find.text('2/2'), findsOneWidget);
      expect(find.text('Que formação é essa?'), findsOneWidget);

      // altera para visualizar a resposta
      await tester.tap(find.byKey(const Key('switchBetweenAnswerQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('De flutter'), findsOneWidget);

      // marca que acertou
      await tester.tap(find.byKey(const Key('correctAnswerBtn')));
      await tester.pumpAndSettle();

      expect(find.text('O quiz acabou.\nVocê fez 2 ponto(s)'), findsWidgets);

      // volta para o detalhe do deck
      await tester.tap(find.byKey(const Key('returnBtn')));
      await tester.pumpAndSettle();

      expect(find.text('deck 1'), findsNWidgets(2));

      results.last.approved = true;
    });

    testWidgets('Jogando o quiz com 1 acerto e 1 erro', (tester) async {
      results.add(TestResult(
        title: 'Validando o quiz com 1 acerto e 1 erro',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // acessa a página de criar deck
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));
      await tester.pumpAndSettle();

      // acessa o detalhe do deck
      await tester.tap(find.byKey(const Key('deckCard')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o primeiro cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'isso é um teste automatizado?',
      );
      await tester.enterText(find.byKey(const Key('inputAnswer')), 'Sim');
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o segundo cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'Que formação é essa?',
      );
      await tester.enterText(
        find.byKey(const Key('inputAnswer')),
        'De flutter',
      );
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('2 cartões'), findsOneWidget);

      // inicia o quiz
      await tester.tap(find.byKey(const Key('startQuizBtn')));
      await tester.pumpAndSettle();

      // marca que acertou
      await tester.tap(find.byKey(const Key('correctAnswerBtn')));
      await tester.pumpAndSettle();

      // marca que errou
      await tester.tap(find.byKey(const Key('wrongAnswerBtn')));
      await tester.pumpAndSettle();

      expect(find.text('O quiz acabou.\nVocê fez 1 ponto(s)'), findsWidgets);

      results.last.approved = true;
    });

    testWidgets('Jogando o quiz 2 erros', (tester) async {
      results.add(TestResult(
        title: 'Validando o quiz com 2 erros',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // acessa a página de criar deck
      await tester.tap(find.byKey(const Key('addNewDeckFloatingBtn')));
      await tester.pumpAndSettle();

      // cria o deck
      await tester.enterText(find.byKey(const Key('deckTitle')), 'deck 1');
      await tester.tap(find.byKey(const Key('addDeckBtn')));
      await tester.pumpAndSettle();

      // acessa o detalhe do deck
      await tester.tap(find.byKey(const Key('deckCard')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o primeiro cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'isso é um teste automatizado?',
      );
      await tester.enterText(find.byKey(const Key('inputAnswer')), 'Sim');
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      // acessa a página de criar pergunta
      await tester.tap(find.byKey(const Key('addNewQuestionBtn')));
      await tester.pumpAndSettle();

      // cria o segundo cartão
      await tester.enterText(
        find.byKey(const Key('inputQuestion')),
        'Que formação é essa?',
      );
      await tester.enterText(
        find.byKey(const Key('inputAnswer')),
        'De flutter',
      );
      await tester.tap(find.byKey(const Key('addQuestionBtn')));
      await tester.pumpAndSettle();

      expect(find.text('2 cartões'), findsOneWidget);

      // inicia o quiz
      await tester.tap(find.byKey(const Key('startQuizBtn')));
      await tester.pumpAndSettle();

      // marca que acertou
      await tester.tap(find.byKey(const Key('wrongAnswerBtn')));
      await tester.pumpAndSettle();

      // marca que errou
      await tester.tap(find.byKey(const Key('wrongAnswerBtn')));
      await tester.pumpAndSettle();

      expect(find.text('O quiz acabou.\nVocê fez 0 ponto(s)'), findsWidgets);

      results.last.approved = true;
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../lib/main.dart' as app;
import 'send_test_result.dart';

void main() {
  final List<TestResult> results = [];

  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() async => await Future.delayed(const Duration(seconds: 1)));

  tearDownAll(() => enviaResultados(results));

  group('end-to-end test', () {
    testWidgets('Validação do título da tela inicial', (tester) async {
      results.add(TestResult(
        title: 'Validação do título da tela inicial (App Bar)',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key("appbar_title")), findsOneWidget);
      expect(find.text('Minhas listas'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do icone da tela inicial', (tester) async {
      results.add(TestResult(
        title: 'Validação do botão com ícone da tela inicial (App Bar)',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.diamond), findsOneWidget);
      await tester.tap(find.byIcon(Icons.diamond));

      results.last.approved = true;
    });

    testWidgets('Validação da imagem da tela inicial', (tester) async {
      results.add(TestResult(
        title: 'Validação da imagem da tela inicial (Sem listas cadastradas)',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key("image_empty_list")), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação dos textos da tela inicial', (tester) async {
      results.add(TestResult(
        title: 'Validação dos textos da tela inicial (Sem listas cadastradas)',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.text('Crie sua primeira lista'), findsOneWidget);
      expect(find.text('Toque no botao azul'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do botão para adicionar uma lista na tela inicial',
        (tester) async {
      results.add(TestResult(
        title: 'Validação do botão para adicionar lista na tela inicial',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key("btn_add_list")), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da tela para criar uma lista', (tester) async {
      results.add(TestResult(
        title: 'Validação da tela de criação de lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key("btn_add_list")), findsOneWidget);
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key("input_list_name")), findsOneWidget);
      expect(find.byKey(const Key("btn_back_to_lists")), findsOneWidget);
      expect(find.byKey(const Key("btn_create_list")), findsOneWidget);

      await tester.tap(find.byKey(const Key("btn_back_to_lists")));

      await tester.pumpAndSettle();

      expect(find.text('Crie sua primeira lista'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da criação de lista', (tester) async {
      results.add(TestResult(
        title: 'Validação da criação de lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key("btn_add_list")), findsOneWidget);
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key("input_list_name")), findsOneWidget);

      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key("card_shopping_list")), findsOneWidget);
      expect(find.text('teste'), findsWidgets);
      expect(find.text('0/0'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação de modal de adiciona item', (tester) async {
      results.add(TestResult(
        title: 'Validação do modal de adicionar item',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela para adicioanr uma lista
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      // cria a lista com um nome
      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      // // entra na lista
      await tester.tap(find.byKey(const Key("card_shopping_list")));

      await tester.pumpAndSettle();

      // // Abre o modal
      await tester.tap(find.text('Adicionar'));

      await tester.pumpAndSettle();

      expect(find.text('Adicionar Item'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      expect(find.text('Adicionar Item'), findsNothing);

      results.last.approved = true;
    });

    testWidgets('Validação de criação de item na lista', (tester) async {
      results.add(TestResult(
        title: 'Validação de criação de item dentro de uma lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela de criar lista
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      // cria a lista com um nome
      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      // navega para a lista criada
      await tester.tap(find.byKey(const Key("card_shopping_list")));

      await tester.pumpAndSettle();

      // entra no modal para criar um item
      await tester.tap(find.text('Adicionar'));

      await tester.pumpAndSettle();

      // adiciona as info nos campos e cria o item
      await tester.enterText(
          find.byKey(const Key("input_item_name")), ('itemteste'));
      await tester.enterText(
          find.byKey(const Key("input_item_value")), ('555'));
      await tester.tap(find.byKey(const Key("btn_add_item")));

      await tester.pumpAndSettle();

      expect(find.text('itemteste'), findsOneWidget);
      expect(find.textContaining("R\$ 5.55"), findsWidgets);

      results.last.approved = true;
    });

    testWidgets('Validação de campos obrigatorios do item da lista',
        (tester) async {
      results.add(TestResult(
        title: 'Validação de campos obrigatório de um item',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela de criar lista
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      // cria a lista com um nome
      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      // navega para a lista criada
      await tester.tap(find.byKey(const Key("card_shopping_list")));

      await tester.pumpAndSettle();

      // entra no modal para criar um item
      await tester.tap(find.text('Adicionar'));

      await tester.pumpAndSettle();

      // clica no botao para add sem adicionar as infos
      await tester.tap(find.byKey(const Key("btn_add_item")));

      await tester.pumpAndSettle();

      expect(find.text("Campo obrigatório"), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação funcional do checkbox', (tester) async {
      results.add(TestResult(
        title: 'Validação funcional do checkbox e da atualização da lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela para criar lista
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      // cria uma lista com um nome
      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      // entra dentro da lista
      await tester.tap(find.byKey(const Key("card_shopping_list")));

      await tester.pumpAndSettle();

      // abre o modal para adicionar um item
      await tester.tap(find.text('Adicionar'));

      await tester.pumpAndSettle();

      // cria um item com as infos
      await tester.enterText(
          find.byKey(const Key("input_item_name")), ('itemteste'));
      await tester.enterText(
          find.byKey(const Key("input_item_value")), ('555'));
      await tester.tap(find.byKey(const Key("btn_add_item")));

      await tester.pumpAndSettle();

      expect(find.text('itemteste'), findsOneWidget);
      expect(find.textContaining("R\$ 5.55"), findsWidgets);

      // clica no checkbox
      await tester.tap(find.byKey(const Key("checkbox_product")));

      // atualiza a lista
      await tester.tap(find.byKey(const Key("btn_update_list")));

      await tester.pumpAndSettle();

      expect(find.text('1/1'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Deletando lista', (tester) async {
      results.add(TestResult(
        title: 'Validação da exclusão de uma lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // entra na tela para criar lista
      await tester.tap(find.byKey(const Key("btn_add_list")));

      await tester.pumpAndSettle();

      // cria uma lista com um nome
      await tester.enterText(
          find.byKey(const Key("input_list_name")), ('teste'));
      await tester.tap(find.byKey(const Key("btn_create_list")));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key("card_shopping_list")), findsOneWidget);

      // exclui a lista
      await tester.longPress(find.byKey(const Key("card_shopping_list")));

      await tester.pumpAndSettle();

      expect(find.byKey(const Key("card_shopping_list")), findsNothing);

      results.last.approved = true;
    });
  });
}

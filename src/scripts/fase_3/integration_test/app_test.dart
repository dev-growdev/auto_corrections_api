import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:integration_test/integration_test.dart';

import '../lib/main.dart' as app;
import 'send_test_result.dart';

void main() {
  final List<TestResult> results = [];

  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() async {
    await Future.delayed(const Duration(seconds: 1));
    GetIt.I.reset();
  });

  // tearDownAll(() => enviaResultados(results));

  group('end-to-end test', () {
    testWidgets('Validação da lupa da barra de pesquisa', (tester) async {
      results.add(TestResult(
        title: 'Validação do ícone da lupa da barra de pesquisa',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.search), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da barra de pesquisa', (tester) async {
      results.add(TestResult(
        title: 'Validação do input da barra de pesquisa',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('inputSearch')), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do carrinho de compras', (tester) async {
      results.add(TestResult(
        title: 'Validação do ícone de carrinho de compras',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.shopping_cart_outlined), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do icone do cep', (tester) async {
      results.add(TestResult(
        title: 'Validação do icone do cep',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.pin_drop_outlined), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do texto do cep', (tester) async {
      results.add(TestResult(
        title: 'Validação do texto do cep',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.text('Informe o seu cep'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da seta ao lado do cep', (tester) async {
      results.add(TestResult(
        title: 'Validação do ícone ao lado do texto do cep',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.arrow_forward_ios), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do texto de resultados', (tester) async {
      results.add(TestResult(
        title: 'Validação do texto de resultados',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // No arquivo do desafio é informado para o aluno criar uma lista de 15 elementos
      expect(find.text('15 resultados'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do botão filtrar', (tester) async {
      results.add(TestResult(
        title: 'Validação do botão filtrar',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.text('Filtrar (2)'), findsOneWidget);
      await tester.tap(find.text('Filtrar (2)'));

      results.last.approved = true;
    });

    testWidgets("Validação do produto na lista", (tester) async {
      results.add(TestResult(
        title: 'Validação das informações do produto na lista',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      final firstProductItem = find.byKey(const Key("productItem")).first;

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.byKey(const Key("productImage")),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.text('Apple Iphone 11 Pro (128gb) - Preto'),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.text('R\$ 599.99'),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.text('em 10x R\$ ${599.99 / 10} sem juros'),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.text('Frete grátis'),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.text('Disponível em 6 cores'),
        ),
        findsOneWidget,
      );

      expect(
        find.descendant(
          of: firstProductItem,
          matching: find.byIcon(Icons.star),
        ),
        findsNWidgets(5),
      );

      await tester.tap(
        find
            .descendant(
              of: firstProductItem,
              matching: find.byIcon(Icons.star),
            )
            .first,
      );
    });

    testWidgets('Validação do fluxo de adicionar produto no carrinho',
        (tester) async {
      results.add(TestResult(
        title: 'Validação para adicionar produto no carrinho e notificação',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      final cardFinder = find.byKey(const Key('addProductToCart')).first;
      await tester.tap(cardFinder);

      await tester.pumpAndSettle();

      expect(find.text('Produto adicionado!'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do fluxo de adicionar produto repetido no carrinho',
        (tester) async {
      results.add(TestResult(
        title:
            'Validação para adicionar produto repetido no carrinho e notificação',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      final cardFinder = find.byKey(const Key('addProductToCart')).first;
      await tester.tap(cardFinder);

      await tester.pumpAndSettle();

      expect(find.text('Produto adicionado!'), findsOneWidget);

      // espera 3 segundos para a notificação anterior sumir
      await Future.delayed(const Duration(seconds: 3));

      await tester.tap(cardFinder);
      await tester.pumpAndSettle();

      expect(find.text('Produto não adicionado!'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da tela do carrinho', (tester) async {
      results.add(TestResult(
        title: 'Validação da tela do carrinho de compras vazio',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.shopping_cart_outlined));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('imageCart')), findsOneWidget);
      expect(find.text('Carrinho de compras'), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação dos produtos no carrinho de compras',
        (tester) async {
      results.add(TestResult(
        title: 'Validação dos produtos no carrinho de compras',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      // adiciona o produto no carrinho
      final cardFinder = find.byKey(const Key('addProductToCart')).first;
      await tester.tap(cardFinder);

      // navega para o carrinho de compras
      await tester.tap(find.byIcon(Icons.shopping_cart_outlined));

      await tester.pumpAndSettle();

      // se nao tiver a imagem na tela é pq ta mostrando os produtos
      expect(find.byKey(const Key('imageCart')), findsNothing);

      results.last.approved = true;
    });
  });
}

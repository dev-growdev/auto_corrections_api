import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../lib/main.dart' as app;
import 'send_test_result.dart';

void main() {
  final List<TestResult> results = [];

  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() async => await Future.delayed(const Duration(seconds: 1)));

  // tearDownAll(() => enviaResultados(results));
  tearDownAll(() => print(results));

  group('end-to-end test', () {
    testWidgets('Validação do componente imagem', (tester) async {
      results.add(TestResult(
        title: 'Validação da imagem do logo Medium',
        approved: false,
      ));

      app.main();

      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('imageMedium')), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do título', (tester) async {
      results.add(TestResult(
        title: 'Validação do título principal Join Medium',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('textTitle')), findsOneWidget);
      expect(find.text("Join Medium."), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do botão signup Google', (tester) async {
      results.add(TestResult(
        title: 'Validação do botão signup Google',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('signupGoogle')), findsOneWidget);
      expect(find.text("Sign up with Google"), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('signupGoogle')));

      results.last.approved = true;
    });

    testWidgets('Validação do botão signup Email', (tester) async {
      results.add(TestResult(
        title: 'Validação do botão signup Email',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('signupEmail')), findsOneWidget);
      expect(find.text("Sign up with Email"), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('signupEmail')));

      results.last.approved = true;
    });

    testWidgets('Validação da linha central esquerda', (tester) async {
      results.add(TestResult(
        title: 'Validação da linha central esquerda',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('dividerLeft')), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do texto entre as linhas', (tester) async {
      results.add(TestResult(
        title: 'Validação do texto entre as linhas',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.text("Or, sign up with"), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação da linha central direita', (tester) async {
      results.add(TestResult(
        title: 'Validação da linha central direita',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('dividerRight')), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do botão do Facebook', (tester) async {
      results.add(TestResult(
        title: 'Validação do botão do Facebook',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('buttonFacebook')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('buttonFacebook')));

      results.last.approved = true;
    });

    testWidgets('Validação do texto de sign in', (tester) async {
      results.add(TestResult(
        title: 'Validação do texto de sign in',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      expect(find.text("Already have an account? Sign in"), findsOneWidget);

      results.last.approved = true;
    });

    testWidgets('Validação do texto de termos e políticas', (tester) async {
      results.add(TestResult(
        title: 'Validação do texto de termos e políticas',
        approved: false,
      ));

      app.main();
      await tester.pumpAndSettle();

      const text =
          "By signing up, you agree to our Terms of Service and acknowledge that our Privacy Policy applies to you.";
      expect(find.text(text), findsOneWidget);

      results.last.approved = true;
    });
  });
}

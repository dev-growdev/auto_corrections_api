import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;


var uid = "TROCANOSHUID";

void main() {
  sendPost();
}

class TestResult{
   String title;
   bool aproved;

  TestResult({
    required this.title,
    required this.aproved,
  });

  Map<String, dynamic> toMap() => {
    'title': title,
    'aproved': aproved,
  };
}


void enviarDadosComoJson(List<TestResult> testResults) async {

var url = Uri.parse('https://growacademy-api-dev.herokuapp.com/api/auto-corrections/${uid}');

  Map<String, dynamic> data = {
    'results': testResults.map((e) => e.toMap()).toList(),
  };

  String jsonData = jsonEncode(data);
  var response = await http.put(url,
      headers: {'Content-Type': 'application/json'},
      body: jsonData);
  if (response.statusCode == 200) {
    print('Put enviado com sucesso!');
    print(jsonData);
  } else {
    print('Falha ao enviar o put. Código de status: ${response.statusCode}');
  }
}

void sendPost() async {

  var url = Uri.parse('https://growacademy-api-dev.herokuapp.com/api/auto-corrections/${uid}');
  final testPercentage = readLcovFile();

  // Dados do post
  var postData = {
    "score": testPercentage
  };

  var body = json.encode(postData);

  var response = await http.put(url,
      headers: {'Content-Type': 'application/json'},
      body: body);

  if (response.statusCode == 200) {
    print('Score enviado com sucesso!');
  } else {
    print('Falha ao enviar o score. Código de status: ${response.statusCode}');
  }
}


double readLcovFile() {
  String nomeProjeto = obterNomeProjeto();
  final lcovFile = File('C:/teste/projetos/${nomeProjeto}/coverage/lcov.info');

  final lcovContent = lcovFile.readAsStringSync();

  final lfRegExp = RegExp(r'^LF:(\d+)$', multiLine: true);
  final lhRegExp = RegExp(r'^LH:(\d+)$', multiLine: true);

  var lfTotal = 0;
  var lhTotal = 0;

  for (final match in lfRegExp.allMatches(lcovContent)) {
    lfTotal += int.parse(match.group(1)!);
  }

  for (final match in lhRegExp.allMatches(lcovContent)) {
    lhTotal += int.parse(match.group(1)!);
  }

  final percentage = lhTotal / lfTotal * 100;

  return percentage;
  //stdout.write('LF total: $lfTotal');
  //stdout.write('LH total: $lhTotal');
  //stdout.write('Coverage percentage: $percentage%');
}

String obterNomeProjeto() {
  String caminhoProjeto = Directory.current.path;
  List<String> partesCaminho = caminhoProjeto.split(Platform.pathSeparator);
  return partesCaminho.last;
}
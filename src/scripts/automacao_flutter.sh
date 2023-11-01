#!/bin/bash

# JSON 

echo "Aguardando Emulador $(date)" >> log.txt

sleep 200 # Aguarda iniciar o emulador

echo "Iniciado Script $(date)" >> log.txt

growacademyApi=$1
subjectUid=$2
classUid=$3

contador=0
url="$growacademyApi/auto-corrections?subjectUid=$subjectUid&classUid=$classUid"
api=$(curl -s "$url")
num_objects=$(curl -s "$url" | jq '.data | length')


if [ "$num_objects" != 0 ]; then
	total_objects=$((num_objects-1))
	while [ $contador -le $total_objects ]
	do
	data=$(echo "$api" | jq -r '.data['$contador'] | {uid:.uid, github:.github, classSubjectAssessmentUid:.classSubjectAssessmentUid, studentUid:.studentUid, flutterVersion:.flutterVersion}')
		for item in "$data"
		do

			uid=$(echo "$item" | jq -r '.uid')
			github=$(echo "$item" | jq -r '.github')
			classUid=$(echo "$item" | jq -r '.classSubjectAssessmentUid')
			student=$(echo "$item" | jq -r '.studentUid')
			flutterVersion=$(echo "$item" | jq -r '.flutterVersion')
		
			#validação da url do github 
			response=$(curl -sL -o /dev/null -w "%{http_code}" "$github")

			# Verifica o código de resposta
			if [ "$response" -eq 200 ]; then

				#criar uma pasta projeto
				mkdir projetos

				#entrar na pasta do projeto
				cd projetos		
				
				#clonar repositorio
				git clone $github

				#entrar na pasta do repositorio clonado
				cd */

				#comandos para adicionar a pasta dos testes
				cp -r ../../src/scripts/fase-1/* ./ #definir o caminho na maquina local


				#comandos para adicionar as dependencias no pubspec
				sed -i '/^dependencies:/a \ \ \http: ^0.13.6' pubspec.yaml 
				sed -i '/dev_dependencies:/a \ \ \integration_test:' pubspec.yaml 
				sed -i '/integration_test:/a \ \ \ \ sdk: flutter' pubspec.yaml 
				
				#comandos para trocar o uid da correcao e url do academy no json.dart
				sed -i "s/TROCANOSHUID/$uid/g" integration_test/json.dart
				sed -i "s/GROWACADEMYAPIURL/$growacademyApi/g" integration_test/json.dart

				#comando para instalar as dependencias
				# Windows
				# c:/src/$flutterVersion/bin/flutter pub get
				# Linux
				~/src/$flutterVersion/bin/flutter pub get

				#comandos para rodar o teste
				# Windows
				# c:/src/$flutterVersion/bin/flutter test integration_test/app_test.dart
				# Linux
				~/src/$flutterVersion/bin/flutter test integration_test/app_test.dart
				sleep 2

				#deletar a pasta clonada
				cd ../../
				rm -rf projetos

				#Fecha o emulador
				adb emu kill
			else
				echo "A URL do GitHub está incorreta." >> log.txt
				# url="$growacademyApi/auto-corrections/$uid"

				# json='{"score": "0"}' #valor 0 pois o github não está correto

				# curl -X PUT -H "Content-Type: application/json" -d "$json" "$url"
			fi
			
		done
		contador=$((contador+1))
	done

else 
	echo "Nenhum Registro Encontrado $(date)" >> log.txt
fi

echo "Fim Script $(date)" >> log.txt


#!/bin/bash

echo -e "$(date) \t-\t Iniciado Script" >> log.txt

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
	data=$(echo "$api" | jq -r '.data['$contador'] | {uid:.uid, github:.payload.github, classSubjectAssessmentUid:.classSubjectAssessmentUid, studentUid:.studentUid, flutterVersion:.payload.flutterVersion}')
		for item in "$data"
		do

			uid=$(echo "$item" | jq -r '.uid')
			github=$(echo "$item" | jq -r '.github')
			classUid=$(echo "$item" | jq -r '.classSubjectAssessmentUid')
			student=$(echo "$item" | jq -r '.studentUid')
			flutterVersion=$(echo "$item" | jq -r '.flutterVersion')
			# Pega somente os primeiros digitos da versão
			flutterVersion=$(echo "$flutterVersion" | cut -d'.' -f1,2)

			echo -e "$(date) \t-\t $uid \t-\t Inicia Correção" >> log.txt
		
			#validação da url do github 
			response=$(curl -sL -o /dev/null -w "%{http_code}" "$github")

			# Verifica o código de resposta
			if [ "$response" -eq 200 ]; then
				
				echo -e "$(date) \t-\t $uid \t-\t Aguardando Emulator" >> log.txt
			
				# sh ./src/scripts/open_emulator.sh &
				# Abre o emulador
				# Windows
				# cd ~/AppData/Local/Android/sdk/emulator; ./emulator -avd Pixel_4_XL_API_31 -wipe-data -no-cache -no-boot-anim -no-snapshot -logcat '*:s' &

				# Linux
				~/Android/Sdk/emulator/emulator -avd Pixel_6a_API_31 -wipe-data -no-cache -no-boot-anim -no-snapshot -logcat '*:s' &

				sleep 90 #Aguarda iniciar o emulador

				echo -e "$(date) \t-\t $uid \t-\t Emulador Iniciado" >> log.txt

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
				
				#comandos para trocar o uid da correcao e url do academy no send_test_result.dart
				sed -i "s/TROCANOSHUID/$uid/g" integration_test/send_test_result.dart
				sed -i "s;GROWACADEMYAPIURL;$growacademyApi;g" integration_test/send_test_result.dart

				~/src/$flutterVersion/bin/cache/dart-sdk/bin/dart pub cache clean -f

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
				#Aguarda fechar o emulador
				sleep 25
			else
				echo -e "$(date) \t-\t $uid \t-\t A URL do Github está inválida" >> log.txt
				# url="$growacademyApi/auto-corrections/$uid"

				# json='{"score": "0"}' #valor 0 pois o github não está correto

				# curl -X PUT -H "Content-Type: application/json" -d "$json" "$url"
			fi
			echo -e "$(date) \t-\t $uid \t-\t Correção Finalizada" >> log.txt
			
		done
		contador=$((contador+1))
	done

else 
	echo -e "$(date) \t-\t Nenhuma correção encontrada" >> log.txt
fi

echo -e "$(date) \t-\t $uid \t-\t Script Finalizado" >> log.txt


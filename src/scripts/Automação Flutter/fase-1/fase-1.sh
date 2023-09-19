#!/bin/bash

# JSON 

subjectUid=$1
classUid=$2

contador=0
url="https://growacademy-api-dev.herokuapp.com/api/auto-corrections?subjectUid=$subjectUid&classUid=$classUid"
api=$(curl -s "$url")
num_objects=$(curl -s "$url" | jq '.data | length')


if [ "$num_objects" != 0 ]; then
	total_objects=$((num_objects-1))
	while [ $contador -le $total_objects ]
	do
	data=$(echo "$api" | jq -r '.data['$contador'] | {uid:.uid, github:.github, classSubjectAssessmentUid:.classSubjectAssessmentUid, studentUid:.studentUid}')
		for item in "$data"
		do

			uid=$(echo "$item" | jq -r '.uid')
			github=$(echo "$item" | jq -r '.github')
			classUid=$(echo "$item" | jq -r '.classSubjectAssessmentUid')
			student=$(echo "$item" | jq -r '.studentUid')
		
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
				cp -r C:/teste/integration_test/* C:/teste/projetos/* #definir o caminho na maquina local

				#comandos para adicionar as dependencias no pubspec
				sed -i '/^dependencies:/a \ \ \http: ^0.13.6' pubspec.yaml 
				sed -i '/dev_dependencies:/a \ \ \integration_test:' pubspec.yaml 
				sed -i '/integration_test:/a \ \ \ \ sdk: flutter' pubspec.yaml 
				sed -i "s/TROCANOSHUID/$uid/g" integration_test/json.dart

				#comando para instalar as dependencias
				flutter pub get

				#comandos para rodar o teste
				flutter test integration_test/app_test.dart --coverage
				sleep 10
				dart run integration_test/json.dart 

				#deletar a pasta clonada
				cd ../../
				rm -rf projetos
			else
				echo "A URL do GitHub está incorreta."
				url="https://growacademy-api-dev.herokuapp.com/api/auto-corrections/$uid"

				json='{"score": "0"}' #valor 0 pois o github não está correto

				curl -X PUT -H "Content-Type: application/json" -d "$json" "$url"
			fi
			
		done
		contador=$((contador+1))
	done

else 
	echo 'Nenhum Registro Encontrado'
fi


#!/bin/sh


google-chrome --new-window "http://localhost:8080?username=codexhere&stream=true" &

docker run --name MIDICtrl --rm -it -u $(id -u) -p 8080:8080 -w /npx -v "$(pwd):/npx" $DOCKER_NODE_IMAGE npm start




#!/bin/bash

trap quit SIGINT
quit() {
    pkill -SIGINT -P $$
    exit
}

CWD=$PWD

if [ -z "${SKIP_INSTALLS}" ]; then
    echo "Installing server dependencies..."
    cd $CWD/server && npm install
    
    echo "Installing Web GUI dependencies..."
    cd $CWD/web && npm install && npx vite build
fi

cd $CWD/server && npm start &
wait

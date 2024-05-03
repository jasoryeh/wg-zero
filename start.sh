#!/bin/bash

trap quit SIGINT
quit() {
    pkill -SIGINT -P $$
    exit
}

CWD=$PWD

if [ -z "${SKIP_INSTALLS}" ]; then
    if [ ! -d $CWD/server/node_modules ]; then
        echo "Installing server dependencies..."
        cd $CWD/server && npm install
    fi
    if [ ! -d $CWD/web/node_modules ]; then
        echo "Installing Web GUI dependencies..."
        cd $CWD/web && npm install && npx vite build
    fi
fi

cd $CWD/server && npm start &
wait

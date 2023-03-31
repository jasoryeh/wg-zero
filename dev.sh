#!/bin/bash

trap quit SIGINT
quit() {
    pkill -SIGINT -P $$
    exit
}

CWD=$PWD

cd $CWD/server && npx nodemon &
cd $CWD/web && npx vite --host &
wait
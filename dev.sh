#!/bin/bash

CWD=$PWD

cd $CWD/server && npx nodemon &
cd $CWD/web && npx vite --host

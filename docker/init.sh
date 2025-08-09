#!/bin/bash

# Default production initialization script.

quit() {
    pkill -SIGINT -P $$
    exit
}
trap quit SIGINT

if [ ! -d /app ]; then
    echo "Your machine does not appear to have a /app directory indicating this is not running inside of the container."
    echo "    This script is intended to run inside a container, please see the README."
    echo "    Terminating..."
    exit 1
fi


if [[ ! -d /app/server/node_modules || -n "${INSTALL_ALL}" || -n "${INSTALL_SERVER}" ]]; then
    echo "Looks like node_modules is not found in /app/server, running npm install"
    cd /app/server && npm install
fi
if [[ ! -d /app/web/node_modules || -n "${INSTALL_ALL}" || -n "${INSTALL_SERVER}" ]]; then
    echo "Looks like node_modules is not found in /app/web, running npm install"
    cd /app/web && npm install && npx vite build
fi

if [ -z "${DEV_MODE}" ]; then
    echo "Running wg-zero..."
    cd /app/server && node server.js
else
    echo "Development mode..."
    cd /app/server && npx nodemon &
    cd /app/web && npx vite --host &
    wait
fi
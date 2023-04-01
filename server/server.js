'use strict';

const Server = require('./src/Server');
const WireGuard = require('./src/WireGuard');
const debug = require('debug')('Server');

(async function() {
  const wg = new WireGuard();
  try {
    wg.import();
  } catch(error) {
    console.warn(`Failure to import! The error follows (we will assume this is a first startup):`);
    console.warn(`    Error message:` + error.message);
    debug(error);
  }
  const sv = new Server(wg);
})();

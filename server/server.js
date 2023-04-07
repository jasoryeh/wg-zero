'use strict';

const Server = require('./src/Server');
const WireGuard = require('./src/WireGuard');
const debug = require('debug')('wgeasy:Init');

(async function() {
  try {
    const wg = new WireGuard();
    if (!wg.configExists()) {
      debug(`Info: This looks like a new installation! A configuration will not be loaded.`);
    } else {
      wg.import();
    }
    const sv = new Server(wg);
    // server is up
  } catch(error) {
    debug(`Error: Failure to import! The error follows:`);
    debug(`    Error message:` + error.message);
    debug(error);
  }
})();

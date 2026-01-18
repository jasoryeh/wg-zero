'use strict';

// always enable logging (todo: replace this)
process.env.DEBUG = process.env.DEBUG ?? "wgeasy:*";

const Server = require('./src/Server');
const WireGuard = require('./src/WireGuard');
const debug = require('debug')('wgeasy:Init');

debug('Starting...');

(async function() {
  try {
    const wg = new WireGuard();
    if (!wg.os_hasWireGuard()) {
      debug(`Warning: This system does not appear to have WireGuard installed!`)
      debug(`\tPlease ensure you properly installed WireGuard and that the 'wg' command exists!!`)

      if (!process.env.WG_BYPASS_WIREGUARD_CHECK) {
        throw new Error("'wg' is not found! If you believe this is an error, set the environment variable 'WG_BYPASS_WIREGUARD_CHECK'");
      }
    }

    if (!wg.config.configExists()) {
      debug(`Info: This looks like a new installation! A configuration will not be loaded.`);
    } else {
      debug("Loading existing...")
      wg.import();
    }

    if (wg.config.shouldStartAtBoot()) {
      debug("Auto-start is enabled, starting WireGuard interface...");
      await wg.up();
      debug("WireGuard interface started.");
    }

    // start server
    const sv = new Server(wg);
    // server is up
  } catch(error) {
    debug(`Error: Failed to start WireGuard Zero!:`);
    debug(`    Error message:` + error.message);
    debug(error);
  }
})();

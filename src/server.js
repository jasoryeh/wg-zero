'use strict';

const Server = require('./lib/Server');
const WireGuard = require('./lib/WireGuard');

(async function() {
  const wg = new WireGuard();
  await wg.getConfig();
  await wg.writeConfig();
  await wg.writeWireguardConfig();
  await wg.restartWireguard();
  await wg.reloadWireguard();
  const sv = new Server(wg);
})();

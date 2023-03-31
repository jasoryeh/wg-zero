'use strict';

const Server = require('./src/Server');
const WireGuard = require('./src/WireGuard');

(async function() {
  const wg = new WireGuard();
  wg.import();
  const sv = new Server(wg);
})();

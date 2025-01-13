'use strict';

const path = require('path');

const express = require('express');
require('express-async-errors');
const expressSession = require('express-session');
const debug = require('debug')('wgeasy:Server');

const Util = require('./Util');

const {
  PORT,
  HOST,
  RELEASE,
  PASSWORD,
  WG_WEBUI,
  WG_READONLY,
  WG_ALLOW_BACKUP,
  WG_DEFAULT_DNS,
  WG_DEFAULT_PERSISTENT_KEEPALIVE,
  WG_DEFAULT_MTU,
  WG_DEFAULT_ALLOWED_IPS,
} = require('../config');

const {
  generatePrivateKey,
  generatePublicKey,
  generatePreSharedKey
} = require('./WireGuardUtils');
const { IniSection } = require('./WireGuardConfig');
const { assertNotReadOnly } = require('./WireGuard');

module.exports = class Server {
  constructor(WireGuard) {
    this.app = express();
    this.wireguard = WireGuard;
    
    this.app.disable('etag');
    this.app.use(express.json());
    this.app.use(expressSession({
      secret: String(Math.random()),
      resave: true,
      saveUninitialized: true,
    }));
    this.app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader('Access-Control-Allow-Methods', "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (req.method.toUpperCase() == "OPTIONS") {
        res.sendStatus(200).end();
        return;
      }
      next();
    });

    if (WG_WEBUI) {
      // Path to the web vite project: ../../web/dist
      let path_webDirInProject = path.join(__dirname, '..', '..', 'web', 'dist');
      this.app.use('/', express.static(path_webDirInProject));
      debug("UI enabled.");
    }

    this.routes();
    this.app.listen
    this.app.listen(PORT, HOST, () => {
      debug(`wg-zero is listening on port ${HOST}:${PORT}`);
    });
 }

 routes() {
  // unauthorized routes
  this.app.get('/api/release', (req, res) => {
    res.status(200).send({
      release: RELEASE
    });
  })
  .get('/api/meta', (req, res) => {
    res.status(200).send({
      auth: !!PASSWORD,
      needsSetup: !this.wireguard.config || !this.wireguard.config.wgInterface,
    })
  })
  .get('/api/auth', (req, res) => {
    res.status(200).send({
      success: (!PASSWORD || PASSWORD == req.query.key)
    });
  })
  .get('/api/status', (req, res) => {
    res.status(200).send({
      wg: this.wireguard.os_hasWireGuard(),
      readonly: WG_READONLY,
    });
  });

  // WireGuard
  this.app.use((req, res, next) => {
    if (!PASSWORD) {
      return next();
    }

    if (req.query.key && req.query.key == PASSWORD) {
      return next();
    }

    return res.status(401).json({
      error: 'Not Logged In',
    });
  })
  .get('/api/wireguard/clients', (req, res) => {
    res.status(200).send([...this.wireguard.getClients().map((peer) => peer.toJson())]);
  })
  .get('/api/wireguard/stats', async (req, res) => {
    try {
      let stats = await this.wireguard.getStats();
      res.status(200).send(stats.reduce((accumulator, obj) => Object.assign(accumulator, {[obj.public]: obj}), {}));
    } catch (err) {
      // server offline
      res.status(200).send([]);
    }
  })
  .get('/api/wireguard/server', async (req, res) => {
    if (!this.wireguard.config || !this.wireguard.config.getInterface()) {
      throw new Error("The server is not initialized yet!");
    }
    let intf = this.wireguard.config.getInterface().iniSection.toJson();

    if (intf.entries && intf.entries.PrivateKey) {
      delete intf.entries['PrivateKey'];
    }

    // append data
    intf._stats = {};
    intf._stats.up = await this.wireguard.isUp();
    
    res.status(200).send(intf);
  })
  .get('/api/wireguard/clients/defaults', (req, res) => {
    res.status(200).send({
      DNS: WG_DEFAULT_DNS,
      PersistentKeepalive: WG_DEFAULT_PERSISTENT_KEEPALIVE,
      MTU: WG_DEFAULT_MTU,
      AllowedIPs: WG_DEFAULT_ALLOWED_IPS,
    });
  })
  .get('/api/wireguard/save', async (req, res) => {
    try {
      // back up
      await this.wireguard.backup();
      await this.wireguard.export();
      if (this.wireguard.isUp()) {
        debug("Rebooting: WireGuard was running when a save was executed.")
        await this.wireguard.reboot();
      } else {
        debug("Not rebooting: WireGuard was not running.")
      }
      res.status(200).send({});
    } catch(err) {
      debug("wireguard/save: Failed to save configuration in: ");
      debug(err);
      try {
        await this.wireguard.revert();
        await this.wireguard.reboot();
      } catch(err1) {
        debug("wireguard/save: Failure recovery: Failed to revert!");
        debug(err);
      }
      res.status(500).send({
        error: err
      });
    }
  })
  .post('/api/wireguard/reload', async (req, res) => {
    await this.wireguard.import();
    res.status(200).send({});
  })
  .post('/api/wireguard/down', async (req, res) => {
    await this.wireguard.down();
    res.status(200).send({});
  })
  .post('/api/wireguard/up', async (req, res) => {
    await this.wireguard.up();
    res.status(200).send({});
  })
  .post('/api/wireguard/server/regenerate', async (req, res) => {
    this.wireguard.config.getInterface().setPrivateKey(await generatePrivateKey());
    res.status(200).send({});
  })
  .post('/api/wireguard/server/host', async (req, res) => {
    // update the Wireguard hostname that is sent with configuration files
    const { host } = req.body;
    this.wireguard.setServerHost(host);
    res.status(200).send({host: this.wireguard.getServerHost()});
  })
  .put('/api/wireguard/server/addresses', async (req, res) => {
    const { addresses } = req.body;
    this.wireguard.config.getInterface().setHostAddress(addresses);
    res.status(200).send({});
  })
  .put('/api/wireguard/server/port', async (req, res) => {
    // set the VPN server's port
    const { port } = req.body;
    this.wireguard.setServerPort(port);
    res.status(200).send({port: this.wireguard.getServerPort()});
  })
  .post('/api/wireguard/server/new', async (req, res) => {
    debug("wireguard/server/new: Setting up a new WireGuard configuration...");
    try { await this.wireguard.backup(); } catch(_) {
      debug('wireguard/server/new: Ignoring backup error.');
    }
    await this.wireguard.init();
    await this.wireguard.export();
    debug("wireguard/server/new: Done creating WireGuard configuration.");
    res.status(200).send({});
  })
  .put('/api/wireguard/server/name', async (req, res) => {
    const { name } = req.body;
    
    let wgInterface = this.wireguard.config.getInterface();
    debug(`wireguard/server/name: Updating name for server - ${wgInterface.getName()} -> ${name}`);
    this.wireguard.assertNotReadOnly('Cannot update name in read-only mode!');
    wgInterface.setName(name);

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/new', async (req, res) => {
    const { privateKey, publicKey, addresses, presharedKey, persistPrivateKey } = req.body;
    res.status(200).send(await this.wireguard.addClient(publicKey, addresses, presharedKey, privateKey, persistPrivateKey).iniSection.toJson());
  })
  .put('/api/wireguard/clients/:clientRef/name', async (req, res) => {
    const { clientRef } = req.params;
    const { name } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');
    console.log("pubKey");
    console.log(pubKey);
    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }
    
    debug(`wireguard/clients/${clientRef}/name: Updating name for ${pubKey} - ${client.getName()} -> ${name}`);
    this.wireguard.assertNotReadOnly('Cannot update name in read-only mode!');
    client.setName(name);

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/:clientRef/addresses', async (req, res) => {
    const { clientRef } = req.params;
    const { addresses } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireugard/${clientRef}/addresses: Updating AllowedIPs for ${pubKey} - ${client.getAllowedIPs()} -> ${addresses}`);
    this.wireguard.assertNotReadOnly('Cannot update address in read-only mode!');
    client.setAllowedIPs(...addresses);

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/:clientRef/publickey', async (req, res) => {
    const { clientRef } = req.params;
    const { publicKey } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireguard/clients/${clientRef}/publicKey: Updating PublicKey for ${pubKey} - ${pubKey} -> ${publicKey}`);
    this.wireguard.assertNotReadOnly('Cannot public key in read-only mode!');
    client.getPublicKey();

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/:clientRef/presharedkey', async (req, res) => {
    const { clientRef } = req.params;
    const { preSharedKey } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireguard/clients/${clientRef}/presharedkey: Updating PreSharedKey for ${pubKey} - ${client.getPresharedKey()} -> ${preSharedKey}`);
    this.wireguard.assertNotReadOnly('Cannot update pre-shared key in read-only mode!');
    client.setPresharedKey(preSharedKey);

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/:clientRef/disable', async (req, res) => {
    const { clientRef } = req.params;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireguard/clients/${clientRef}/disable: Disabling ${pubKey} - ${pubKey}`);
    this.wireguard.assertNotReadOnly('Cannot update client in read-only mode!');
    client.setEnabled(false);

    res.status(200).send({});
  })
  .put('/api/wireguard/clients/:clientRef/enable', async (req, res) => {
    const { clientRef } = req.params;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireguard/clients/${clientRef}/enable: Enabling ${pubKey} - ${pubKey}`);
    this.wireguard.assertNotReadOnly('Cannot update client in read-only mode!');
    client.setEnabled(true);

    res.status(200).send({});
  })
  .delete('/api/wireguard/clients/:publicKey/delete', async (req, res) => {
    var publicKey = req.params.publicKey;
    res.status(200).send({
      result: await this.wireguard.deleteClient(publicKey),
    });
  })
  .post('/api/wireguard/generate/key/private', async (req, res) => {
    res.status(200).send({
      result: await generatePrivateKey(),
    });
  })
  .post('/api/wireguard/generate/key/preshared', async (req, res) => {
    res.status(200).send({
      result: await generatePreSharedKey(),
    });
  })
  .post('/api/wireguard/generate/key/public', async (req, res) => {
    const { privateKey } = req.body;
    if (!privateKey) {
      res.status(404).send({ error: true });
      return;
    }
    try {
      res.status(200).send({
        result: await generatePublicKey(privateKey),
      });
    } catch(err) {
      debug("wireuguard/generate/key/public: Error generating public key for a key: ");
      debug(err);
      res.status(400).send({ error: true });
    }
  })
  .get('/api/wireguard/server/backup', async (req, res) => {
    if (!WG_ALLOW_BACKUP) {
      throw new Error("Backups are not allowed! Please set WG_ALLOW_BACKUP or disable read-only mode (backups are disabled by default when read-only is enabled).");
    }
    res.header('Content-Disposition', 'inline');
    res.header('Content-Type', 'text/plain');
    res.status(200).send(this.wireguard.config.toLines().join('\n'));
  })
  .put('/api/wireguard/server/host', async (req, res) => {
    const { host } = req.body;
    assertNotReadOnly("Cannot update host when read-only");
    this.wireguard.setServerHost(host);
    res.status(200).send({
      host: this.wireguard.getServerHost(),
    });
  });

  // errors
  this.app.use((err, req, res, next) => {
    debug("An error has occurred in the Server route: " + err);
    debug(err);
    res.status(500).send({
      error: err.message,
    });
  });
 }
};

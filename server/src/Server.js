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
} = require('../config');

const {
  generatePrivateKey,
  generatePublicKey,
  generatePreSharedKey
} = require('./WireGuardUtils');
const { IniSection } = require('./WireGuardConfig');

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
      debug(`wg-easy is listening on port ${HOST}:${PORT}`);
    });
 }

 routes() {
  this.app.get('/api/release', (req, res) => {
    res.status(200).send({
      release: RELEASE
    });
  });
  this.app.get('/api/meta', (req, res) => {
    res.status(200).send({
      auth: !!PASSWORD,
      needsSetup: !this.wireguard.config || !this.wireguard.config.wgInterface,
    })
  });
  this.app.get('/api/auth', (req, res) => {
    res.status(200).send({
      success: (!PASSWORD || PASSWORD == req.query.key)
    });
  })

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
    let json_res = [];
    let clients = this.wireguard.getClients();
    for (let client of clients) {
      let jsoned = client.toJson();
      let json = {};
      Object.assign(json, jsoned.entries);
      Object.keys(jsoned.entries).forEach((k) => json[k] = json[k][0] ? json[k][0].value : null);
      json._meta = jsoned.metadata;
      Object.keys(json._meta).forEach((k) => json._meta[k] = json._meta[k][0] ? json._meta[k][0].value : null);

      // formatting
      json['AllowedIPs'] = IniSection.unCommaSeparated(json['AllowedIPs']);
      
      json_res.push(json);
    }

    res.status(200).send(json_res);
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
    let jsoned = this.wireguard.config.getInterface().toJson();
    let json = {};
    Object.assign(json, jsoned.entries);
    Object.keys(jsoned.entries).forEach((k) => json[k] = json[k][0] ? json[k][0].value : null);
    json._meta = jsoned.metadata;
    Object.keys(json._meta).forEach((k) => json._meta[k] = json._meta[k][0] ? json._meta[k][0].value : null);

    let intf = json;
    // formatting
    intf['Address'] = IniSection.unCommaSeparated(intf['Address']);
    intf['DNS'] = IniSection.unCommaSeparated(intf['DNS']);
    // information, but should not be stored i guess
    intf.PublicKey = intf['PrivateKey'] ? await generatePublicKey(intf['PrivateKey'], {log: false}) : null;
    intf.Interface = this.wireguard.getInterfaceName();
    // hide sensitive?
    intf['PrivateKey'] = undefined;
    intf['PreUp'] = undefined;
    intf['PostUp'] = undefined;
    intf['PreDown'] = undefined;
    intf['PostDown'] = undefined;
    // append data
    intf._stats = {};
    intf._stats.up = await this.wireguard.isUp();
    
    res.status(200).send(intf);
  })
  .get('/api/wireguard/save', async (req, res) => {
    try {
      // back up
      await this.wireguard.backup();
      await this.wireguard.export();
      await this.wireguard.reboot();
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
  .get('/api/readonly', async (req, res) => {
    res.status(200).send({
      readonly: WG_READONLY,
    });
  })
  .post('/api/wireguard/server/regenerate', async (req, res) => {
    this.wireguard.
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
  .put('/api/wireguard/clients/new', async (req, res) => {
    const { privateKey, publicKey, addresses, presharedKey, persistPrivateKey } = req.body;
    res.status(200).send({
      client: await this.wireguard.addClient(publicKey, addresses, presharedKey, privateKey, persistPrivateKey),
    });
  })
  .put('/api/wireguard/clients/:clientRef/name', async (req, res) => {
    const { clientRef } = req.params;
    const { name } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    debug(`wireguard/clients/${clientRef}/name: Updating name for ${pubKey} - ${client._meta.Name} -> ${name}`);
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
  .all('/api/wireguard/server/backup', async (req, res) => {
    res.header('Content-Disposition', 'inline');
    res.header('Content-Type', 'text/plain');
    res.status(200).send(this.wireguard.config.toLines().join('\n'));
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

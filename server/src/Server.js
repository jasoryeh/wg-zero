'use strict';

const path = require('path');

const express = require('express');
const expressSession = require('express-session');
const debug = require('debug')('Server');

const Util = require('./Util');
const ServerError = require('./ServerError');

const {
  PORT,
  RELEASE,
  PASSWORD,
  WG_WEBUI,
} = require('../config');

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
      console.log("Web GUI enabled.");
      this.app.use('/', express.static(path.join(__dirname, '..', '..', 'web', 'dist')));
    }

    this.routes();

    this.app.listen(PORT, () => {
      console.log(`wg-easy is listening on ${PORT}`);
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
    res.status(200).send(this.wireguard.getClients());
  })
  .get('/api/wireguard/stats', async (req, res) => {
    try {
      let stats = await this.wireguard.getStats();
      res.status(200).send(stats);
    } catch (err) {
      res.status(500).send({
        "error": JSON.stringify(err)
      });
    }
  })
  .get('/api/wireguard/server', async (req, res) => {
    let intf = JSON.parse(JSON.stringify(this.wireguard.config.interface));
    // hide sensitive?
    intf['PrivateKey'] = undefined;
    intf['PreUp'] = undefined;
    intf['PostUp'] = undefined;
    intf['PreDown'] = undefined;
    intf['PostDown'] = undefined;
    res.status(200).send(intf);
  })
  .get('/api/wireguard/save', async (req, res) => {
    await this.wireguard.export();
    await this.wireguard.reboot();
  })
  .get('/api/wireguard/reload', async (req, res) => {
    this.wireguard.import();
  })
  .put('/api/wireguard/client/:clientRef/name', async (req, res) => {
    const { clientRef } = req.params;
    const { name } = req.body;
    const pubKey = Buffer.from(clientRef, 'hex').toString('utf8');

    let client = this.wireguard.getClient(pubKey);
    if (!client) {
      res.status(404).send({});
    }

    console.log(`Updating name for ${pubKey} - ${client._meta.Name} -> ${name}`);
    client._meta.Name = name;

    res.status(200).send({});
  });
 }
};

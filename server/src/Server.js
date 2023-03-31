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

    this.routes();

    this.app.listen(PORT, () => {
      debug(`Listening on http://0.0.0.0:${PORT}`);
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
    let intf = {...this.wireguard.config.interface};
    // hide sensitive?
    intf['PrivateKey'] = undefined;
    intf['PreUp'] = undefined;
    intf['PostUp'] = undefined;
    intf['PreDown'] = undefined;
    intf['PostDown'] = undefined;
    res.status(200).send(intf);
  });
 }
};

'use strict';

const fs = require('fs');
const path = require('path');

const debug = require('debug')('WireGuard');
const uuid = require('uuid');
const QRCode = require('qrcode');

const Util = require('./Util');
const ServerError = require('./ServerError');

const {
  WG_INTERFACE,
  WG_PATH,
  WG_OVERWRITE_ON_FAIL,
  WG_HOST,
  WG_PORT,
  WG_MTU,
  WG_DEFAULT_DNS,
  WG_DEFAULT_ADDRESS,
  WG_PERSISTENT_KEEPALIVE,
  WG_ALLOWED_IPS,
  WG_PRE_UP,
  WG_POST_UP,
  WG_PRE_DOWN,
  WG_POST_DOWN,
} = require('../config');

const {
  generatePrivateKey,
  generatePublicKey,
  generatePreSharedKey
} = require('./WireGuardUtils');

const DUMP_COLUMNS = ['public', 'preshared', 'lastEndpoint', 'allowedIPs', 'lastHandshake', 'rx', 'tx', 'persistentKeepalive'];
/**
 * Reads `wg show <interface> dump`
 * @returns Array of peers from the dump (ignores the interface result)
 */
async function readDump() {
  // read-in wireguard status from wg show <interface> dump
  const dump = await Util.exec(`wg show ${WG_INTERFACE} dump`, {
    log: false,
  }); // capture dump data
  debug("Client data updated.");
  const data = dump.trim().split('\n').slice(1).map((line) => line.split('\t')).map((data) => {
    let ret = {};
    for (let i = 0; i < data.length; i++) {
      ret[DUMP_COLUMNS[i]] = data[i];
    }
    ret['lastHandshake'] = Number(ret['lastHandshake']);
    ret['lastHandshake'] = (ret['lastHandshake'] == 0) ? null : new Date(ret['lastHandshake'] * 1000);
    ret['rx'] = Number(ret['rx']);
    ret['tx'] = Number(ret['tx']);
    ret['persistentKeepalive'] = ret['persistentKeepalive'] == 'on'
    return ret;
  });
  return data;
}

function writeRawConfig(cfg) {
  var lines = [];
  lines.push(`[Interface]`);
  for (let key in cfg.interface) {
    if (key == 'type') continue;
    let value = cfg.interface[key];
    if (key == '_meta') {
      for (let metaKey in value) {
        let metaValue = value[metaKey];
        let finalValue = (metaValue instanceof Array) ? metalValue.join(",") : metaValue;
        lines.push(`#!${metaKey} = ${finalValue}`);
      }
    } else {
      if ((value instanceof Array) && (key.startsWith('Pre') || key.startsWith("Post"))) {
        for (let cmd of value) {
          lines.push(`${key} = ${cmd}`);
        }
      } else {
        let finalValue = (value instanceof Array) ? value.join(",") : value;
        lines.push(`${key} = ${finalValue}`);
      }
    }
  }
  lines.push('');

  for (let peer of cfg.peers) {
    lines.push(`[Peer]`);
    for (let key in peer) {
      if (key == 'type') continue;
      let value = peer[key];
      if (key == '_meta') {
        for (let metaKey in value) {
          let metaValue = value[metaKey];
          let finalValue = (metaValue instanceof Array) ? metalValue.join(",") : metaValue;
          lines.push(`#!${metaKey} = ${finalValue}`);
        }
      } else {
        if ((value instanceof Array) && (key.startsWith('Pre') || key.startsWith("Post"))) {
          for (let cmd of value) {
            lines.push(`${key} = ${cmd}`);
          }
        } else {
          let finalValue = (value instanceof Array) ? value.join(",") : value;
          lines.push(`${key} = ${finalValue}`);
        }
      }
    }
    lines.push('');
  }
  return lines;
}

/**
 * Read the raw config.
 */
function readRawConfig() {
  let config_path = path.join(WG_PATH, `${WG_INTERFACE}.conf`);
  let cfg_unparsed = (fs.readFileSync(config_path, 'utf8')).split('\n');
  let parsed = {
    interface: {},
    peers: []
  };

  var currentSection = {};
  function _newSection() {
    if (currentSection.type) {
      if (currentSection.type == 'Interface') {
        parsed.interface = currentSection;
      } else if (currentSection.type == 'Peer') {
        parsed.peers.push(currentSection);
      } else {
        console.warn(`Unknown section type ${currentSection.type}, will be discarded: \n${JSON.stringify(currentSection, null, 4)}\n`);
      }
      currentSection = {};
    }
  }

  for (let i = 0; i < cfg_unparsed.length; i++) {
    var line = cfg_unparsed[i].trim();
    if ((line.startsWith("#") && !line.startsWith("#!")) || line.length == 0) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      _newSection();
      line = line.replace("[", "").replace("]", "");
      currentSection.type = line;
    } else {
      var [key, value] = line.split(" = ", 2).map((item) => item.trim());
      let dataTo = currentSection;
      if (key.startsWith("#!")) {
        key = key.replace("#!", "");
        currentSection._meta = currentSection._meta || {};
        dataTo = currentSection._meta;
      }
      if (dataTo[key]) {
        if (!(dataTo[key] instanceof Array)) {
          dataTo[key] = [ dataTo[key] ];
        }
        dataTo[key].push(value);
      } else {
        dataTo[key] = value;
      }
    }
  }
  _newSection();

  return parsed;
}

class WireGuard {
  constructor() {
    this.config = null;
  }

  load() {
    /*let raw_read = fs.readFileSync(`${WG_INTERFACE}.json`, 'utf8');
    this.config = JSON.parse(raw_read);

    if (!this.config.interface || !this.config.peers) {
      throw new Error("Invalid config loaaded!");
    }*/
    this.import();
  }

  import() {
    let parsed = readRawConfig();

    let intf = parsed.interface;
    let peers = parsed.peers;
    
    intf['Address'] = intf['Address'].split(',').map((item) => item.trim());
    intf['ListenPort'] = Number(intf['ListenPort']);
    if (intf['MTU']) {
      intf['MTU'] = Number(intf['MTU']);
    }
    if (intf['DNS']) {
      intf['DNS'] = intf['DNS'].split(',').map((item) => item.trim());
    }

    for (let peer of peers) {
      peer['AllowedIPs'] = peer['AllowedIPs'].split(',').map((item) => item.trim());
      if(peer['PersistentKeepalive']) {
        peer['PersistentKeepalive'] = Number(peer['PersistentKeepalive']);
      }
    }

    this.config = parsed;
  }
  
  export() {
  }

  getClients() {
    return this.config.peers;
  }

  getClient(publicKey) {
    for (let peer of this.config.peers) {
      if (peer.PublicKey == publicKey) {}
      return peer;
    }
    return null;
  }

  async getStats() {
    return await readDump()
  }
}

module.exports = WireGuard;

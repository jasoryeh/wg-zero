'use strict';

const fs = require('fs');
const path = require('path');

const debug = require('debug')('WireGuard');

const Util = require('./Util');

const {
  WG_INTERFACE,
  WG_PATH,
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

const BACKUP_DIR = 'wg-easy-backups';
const DUMP_COLUMNS = ['public', 'preshared', 'lastEndpoint', 'allowedIPs', 'lastHandshake', 'rx', 'tx', 'persistentKeepalive'];

/**
 * Reads `wg show <interface> dump`
 * @returns Array of peers from the dump (ignores the interface result)
 */
async function readDump(interfaceName) {
  // read-in wireguard status from wg show <interface> dump
  const dump = await Util.exec(`wg show ${interfaceName} dump`, {
    log: false,
  }); // capture dump data
  //debug("Client data updated.");
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

function getWireguardConfigPath(base, interfaceName) {
  return path.join(base, `${interfaceName}.conf`);
}

function writeRawConfig(base, interfaceName, cfg) {
  var lines = [];
  lines.push(`[Interface]`);
  for (let key in cfg.interface) {
    if (key == 'type') continue;
    let value = cfg.interface[key];
    if (key == '_meta') {
      for (let metaKey in value) {
        let metaValue = value[metaKey];
        if (metaValue instanceof Array) {
          for (let cmd of value) {
            lines.push(`#!${metaKey} = ${cmd}`);
          }
        } else {
          lines.push(`#!${metaKey} = ${metaValue}`);
        }
      }
    } else {
      if (value instanceof Array) {
        for (let cmd of value) {
          lines.push(`${key} = ${cmd}`);
        }
      } else {
        lines.push(`${key} = ${value}`);
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
          if (metaValue instanceof Array) {
            for (let cmd of value) {
              lines.push(`#!${metaKey} = ${cmd}`);
            }
          } else {
            lines.push(`#!${metaKey} = ${metaValue}`);
          }
        }
      } else {
        if (value instanceof Array) {
          for (let cmd of value) {
            lines.push(`${key} = ${cmd}`);
          }
        } else {
          lines.push(`${key} = ${value}`);
        }
      }
    }
    lines.push('');
  }

  fs.writeFileSync(getWireguardConfigPath(base, interfaceName), lines.join('\n'), {
    encoding: "utf8"
  });
  return lines;
}

/**
 * Read the raw config.
 */
function readRawConfig(base, interfaceName) {
  let cfg_unparsed = (fs.readFileSync(getWireguardConfigPath(base, interfaceName), 'utf8')).split('\n');
  let parsed = {
    interface: {},
    peers: []
  };

  var currentSection = {
    _meta: {}
  };
  function _newSection() {
    if (currentSection.type) {
      if (currentSection.type == 'Interface') {
        parsed.interface = currentSection;
      } else if (currentSection.type == 'Peer') {
        parsed.peers.push(currentSection);
      } else {
        console.warn(`Unknown section type ${currentSection.type}, will be discarded: \n${JSON.stringify(currentSection, null, 4)}\n`);
      }
      currentSection = {
        _meta: {}
      };
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

function backupSuffix() {
  let d = new Date();
  return (d.toLocaleDateString('en-US') + '_' + d.toLocaleTimeString('en-US')).replaceAll('/', '_').replaceAll(':', '_').replaceAll(' ', '_');
}

class WireGuard {
  constructor() {
    this.config = null;
  }

  async init() {
    this.config = {
      interface: {
        // optional?: type: 'Interface'
        ListenPort: WG_PORT,
        Address: ['10.1.3.1/24'],
        PrivateKey: await generatePrivateKey()
      },
      peers: []
    };
  }

  getBackupDirName() {
    return BACKUP_DIR;
  }

  async backup() {
    console.log("Making a backup...");
    const backupDirectory = `${this.getConfigDirectory()}/${this.getBackupDirName()}`;
    const interfaceFile = `${this.getConfigDirectory()}/${this.getInterfaceName()}.conf`;
    await Util.exec(`mkdir -p ${backupDirectory}`);
    await Util.exec(`cp ${interfaceFile} ${backupDirectory}/${this.getInterfaceName()}_${backupSuffix()}.conf`);
    await Util.exec(`cp -f ${interfaceFile} ${backupDirectory}/${this.getInterfaceName()}_latest.conf`);
    console.log("Backup complete.");
  }

  async revert() {
    console.log("Reverting to last backup...");
    await Util.exec(`cp -f ${this.getConfigDirectory()}/${this.getBackupDirName()}/${this.getInterfaceName()}_latest.conf ${this.getConfigDirectory()}/${this.getInterfaceName()}.conf`);
    console.log("Reverted.");
  }

  async down() {
    return Util.exec(`wg-quick down ${this.getInterfaceName()}`);
  }

  async up() {
    return Util.exec(`wg-quick up ${this.getInterfaceName()}`);
  }

  async reboot() {
    console.log("Rebooting/reloading WireGuard...");
    try {
      await this.down();
    } catch(ex) {
      console.warn("A problem occurred while pulling the interface down: ");
      console.warn(ex);
    }
    await this.up();
    console.log("Rebooted.");
  }

  validate() {
    // currently validates interfaces only

  }

  import() {
    console.log("Importing...");
    // no deep copy here since readRawConfig just regenerates every time
    let parsed = readRawConfig(this.getConfigDirectory(), this.getInterfaceName());

    let intf = parsed.interface;
    let peers = parsed.peers;

    // apply modifications to items, this should be reversed (if necessary before exporting)
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
    console.log("Import complete.");
  }
  
  async export() {
    console.log("Exporting...");
    // deep copy
    let parsed = JSON.parse(JSON.stringify(this.config));
    
    let intf = parsed.interface;
    let peers = parsed.peers;

    intf['Address'] = intf['Address'].join(',');
    // ListenPort - number
    // MTU - number
    if (intf['DNS']) {
      intf['DNS'] = intf['DNS'].join(',');
    }

    for (let peer of peers) {
      peer['AllowedIPs'] = peer['AllowedIPs'].join(',');
      // PersistentKeepalive - number
    }

    writeRawConfig(this.getConfigDirectory(), this.getInterfaceName(), parsed);
    console.log("Export complete.");
  }

  getInterface() {
    return this.config.interface;
  }

  getClients() {
    return this.config.peers;
  }

  getClient(publicKey) {
    for (let peer of this.config.peers) {
      if (peer.PublicKey == publicKey) {
        return peer;
      }
    }
    return null;
  }

  addClient(publicKey, addresses, presharedKey = null) {
    let peer = {
      type: "Peer",
      PublicKey: publicKey,
      AllowedIPs: addresses,
      _meta: {},
    };
    if (!!presharedKey) {
      peer.PresharedKey = presharedKey;
    }
    this.config.peers.push(peer);

    return this.getClient(publicKey);
  }

  deleteClient(publicKey) {
    let client = this.getClient(publicKey);
    let idx = this.config.peers.indexOf(client);
    delete this.config.peers[idx];
  }

  getInterfaceName() {
    return WG_INTERFACE;
  }

  getConfigDirectory() {
    return WG_PATH;
  }

  async getStats() {
    return await readDump(this.getInterfaceName());
  }

  async isUp() {
    let wgshow = await Util.exec('wg show', {log: false});
    return wgshow.split('\n').includes(`interface: ${this.getInterfaceName()}`);
  }

  getServerPort() {
    return this.getInterface().ListenPort;
  }

  setServerPort(port) {
    if (!Number.isInteger(port) && port <= 65535 && port >= 0) {
      throw new Error("Invalid port: " + port);
    }
    this.getInterface().ListenPort = port;
  }

  getServerHost() {
    if (!this.getInterface()._meta.Host) {
      this.getInterface()._meta.Host = WG_HOST;
    }
    return this.getInterface()._meta.Host;
  }

  setServerHost(host) {
    this.getInterface()._meta.Host = host;
  }
}

module.exports = WireGuard;

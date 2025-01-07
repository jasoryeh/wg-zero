'use strict';

const fs = require('fs');
const path = require('path');

const debug = require('debug')('wgeasy:WireGuard');

const Util = require('./Util');

const {
  WG_READONLY,
  WG_INTERFACE,
  WG_PATH,
  WG_HOST,
  WG_PORT,
  WG_MTU,
  WG_DEFAULT_DNS,
  WG_ADDRESS_SPACE,
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

function writeRawConfig(lines, base, interfaceName) {
  fs.writeFileSync(getWireguardConfigPath(base, interfaceName), lines.join('\n'), {
    encoding: "utf8"
  });
  return lines;
}
function generateRawConfig(cfg) {
  var lines = [];
  lines.push(`[Interface]`);
  for (let key in cfg.interface) {
    if (key == 'type') continue;
    let value = cfg.interface[key];
    if (key == '_meta') {
      for (let metaKey in value) {
        if (metaKey.startsWith('___')) {
          // temporary data is discarded
          continue;
        }
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
          if (metaKey.startsWith('___')) {
            // temporary data is discarded
            continue;
          }
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
        debug(`Unknown section type ${currentSection.type}...`);
        debug(`    ...will be discarded: \n${JSON.stringify(currentSection, null, 4)}\n`);
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

function exists(file) {

}

class WireGuard {
  constructor() {
    this.config = null;
  }
  
  configExists() {
    const interfaceFile = `${this.getConfigDirectory()}/${this.getInterfaceName()}.conf`;
    try {
      fs.statSync(interfaceFile);
      return true;
    } catch(_) {
      return false;
    }
  }

  async init() {
    this.config = {
      interface: {
        // optional?: type: 'Interface'
        ListenPort: WG_PORT,
        Address: [ WG_ADDRESS_SPACE ],
        PrivateKey: await generatePrivateKey(),
        PreUp: WG_PRE_UP,
        PostUp: WG_POST_UP,
        PreDown: WG_PRE_DOWN,
        PostDown: WG_POST_DOWN,
        _meta: {
          ___unsaved: true
        },
      },
      peers: []
    };
  }

  getBackupDirName() {
    return BACKUP_DIR;
  }

  async backup() {
    debug("Making a backup...");
    if (WG_READONLY) {
      throw new Error("No backups can be made in read only mode!");
    }
    const backupDirectory = `${this.getConfigDirectory()}/${this.getBackupDirName()}`;
    const interfaceFile = `${this.getConfigDirectory()}/${this.getInterfaceName()}.conf`;
    await Util.exec(`mkdir -p ${backupDirectory}`);
    await Util.exec(`cp ${interfaceFile} ${backupDirectory}/${this.getInterfaceName()}_${backupSuffix()}.conf`);
    await Util.exec(`cp -f ${interfaceFile} ${backupDirectory}/${this.getInterfaceName()}_latest.conf`);
    debug("Backup complete.");
  }

  async revert() {
    debug("Reverting to last backup...");
    if (WG_READONLY) {
      throw new Error("No reverts can be made in read only mode!");
    }
    await Util.exec(`cp -f ${this.getConfigDirectory()}/${this.getBackupDirName()}/${this.getInterfaceName()}_latest.conf ${this.getConfigDirectory()}/${this.getInterfaceName()}.conf`);
    debug("Reverted.");
  }

  async down() {
    if (WG_READONLY) {
      throw new Error("No power actions can be made in read only mode!");
    }
    return Util.exec(`wg-quick down ${this.getInterfaceName()}`);
  }

  async up() {
    if (WG_READONLY) {
      throw new Error("No power actions can be made in read only mode!");
    }
    return Util.exec(`wg-quick up ${this.getInterfaceName()}`);
  }

  async reboot() {
    debug("Rebooting/reloading WireGuard...");
    try {
      await this.down();
    } catch(ex) {
      debug("A problem occurred while pulling the interface down: ");
      debug(ex);
    }
    await this.up();
    debug("Rebooted.");
  }

  validate() {
    // currently validates interfaces only

  }

  import() {
    debug("Importing...");
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
    debug("Import complete.");
  }
  
  async export() {
    debug("Exporting...");
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

    var configLines = generateRawConfig(parsed);

    if (WG_READONLY) {
      console.error("Export results: ");
      console.error(configLines.join("\n"));
      throw new Error("Cannot export, this instance is in read only mode!");
    }

    writeRawConfig(configLines, this.getConfigDirectory(), this.getInterfaceName());
    debug("Export complete.");
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

  /**
   * Add a client to the in-memory configuration.
   * @param {*} publicKey The public key for the client.
   * @param {*} addresses Addresses this client is allowed to use.
   * @param {*} presharedKey The optional preshared key.
   * @param {*} privateKey A optional private key if the user wishes to store the private key on the server.
   * @returns 
   */
  addClient(publicKey, addresses, presharedKey = null, privateKey = null) {
    let peer = {
      type: "Peer",
      PublicKey: publicKey,
      AllowedIPs: addresses,
      _meta: {
        ___unsaved: true,
        privateKey: privateKey
      },
    };
    if (!!presharedKey) {
      peer.PresharedKey = presharedKey;
    }
    this.config.peers.push(peer);

    return this.getClient(publicKey);
  }

  deleteClient(publicKey) {
    let client = this.getClient(publicKey);
    this.config.peers = this.config.peers.filter((peer) => peer != client);
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

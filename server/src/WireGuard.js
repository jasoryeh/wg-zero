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
const { WireGuardConfig, WireGuardInterface, IniSection, WireGuardPeer } = require('./WireGuardConfig');
const commandExists = require('command-exists');

const DUMP_COLUMNS = ['public', 'preshared', 'lastEndpoint', 'allowedIPs', 'lastHandshake', 'rx', 'tx', 'persistentKeepalive'];

function assertNotReadOnly(msg) {
  if (WG_READONLY) {
    throw new Error("The application is in Read Only mode, could not perform action: " + msg ?? "...");
  }
}

class WireGuard {
  constructor() {
    this.wg_check = null;
    this.wg_check_last = null;

    this.config = new WireGuardConfig(WG_INTERFACE + ".conf"); // use defaults
    debug('Read Only: ' + WG_READONLY);
  }

  os_hasWireGuard() {
    const WG_CHECK_EXPIRES_SEC = 1;
    if ((this.wg_check === null) || (this.wg_check !== null && (new Date() - this.wg_check_last) > (1000 * WG_CHECK_EXPIRES_SEC))) {
      this.wg_check = commandExists.sync('wg') && commandExists('wg-quick');
      this.wg_check_last = new Date();
    }
    return this.wg_check;
  }

  async init() {
    let newInterface = WireGuardInterface.create();
    this.config.wgInterface = newInterface;
    newInterface.setListenPort(WG_PORT);
    newInterface.setAddresses(...WG_ADDRESS_SPACE.split(','))
    newInterface.setPrivateKey(await generatePrivateKey());
    if (WG_PRE_UP) newInterface.setPreUp(...WG_PRE_UP.filter((l) => l.trim().length > 0));
    if (WG_POST_UP) newInterface.setPostUp(...WG_POST_UP.filter((l) => l.trim().length > 0));
    if (WG_PRE_DOWN) newInterface.setPreDown(...WG_PRE_DOWN.filter((l) => l.trim().length > 0));
    if (WG_POST_DOWN) newInterface.setPostDown(...WG_POST_DOWN.filter((l) => l.trim().length > 0));
    this.export(false);
  }

  async backup() {
    debug("Making a backup...");
    assertNotReadOnly("No backups can be made in read only mode!");
    this.config.backupFSCopy();
    debug("Backup complete.");
  }

  async revert() {
    debug("Reverting to last backup...");
    assertNotReadOnly("No reverts can be made in read only mode!");
    this.config.revert();
    debug("Reverted.");
  }

  async down() {
    assertNotReadOnly("No power actions can be made in read only mode!");
    return Util.exec(`wg-quick down ${this.getInterfaceName()}`);
  }

  async up() {
    assertNotReadOnly("No power actions can be made in read only mode!");
    return Util.exec(`wg-quick up ${this.getInterfaceName()}`);
  }

  async reboot() {
    assertNotReadOnly("No power actions can be made in read only mode!");
    try {
      await this.down();
    } catch(ex) {
      debug("A problem occurred while pulling the interface down, not necessarily an error: ");
      debug(ex);
    }
    await this.up();
    debug("Rebooted.");
  }

  async sync() {
    debug(`Synchronizing WireGuard on '${WG_INTERFACE}'...`);
    Util.exec(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    debug('\t...sync done.');
  }

  import() {
    debug("Importing...");
    this.config.loadExisting();
    debug("Import complete.");
  }
  
  async export(backup = true) {
    debug("Exporting...");
    var configLines = this.config.toLines();

    debug("Export results: ");
    debug(configLines.join("\n"));

    assertNotReadOnly("No exports allowed in read only mode!");

    if (backup) {
      this.backup();
    } else { debug("Skipping backup!"); }
    this.config.save();
    debug("Export complete.");
  }

  getInterface() {
    return this.config.interface;
  }

  getClients() {
    return this.config.peers;
  }

  getClient(publicKey) {
    return this.config.peers.find((peer) => peer.getPublicKey() == publicKey);
  }

  /**
   * Add a client to the in-memory configuration.
   * @param {*} publicKey The public key for the client.
   * @param {*} addresses Addresses this client is allowed to use.
   * @param {*} presharedKey The optional preshared key.
   * @param {*} privateKey A optional private key if the user wishes to store the private key on the server.
   * @returns 
   */
  addClient(publicKey, addresses, presharedKey = null, privateKey = null, persistPrivateKey = true) {
    assertNotReadOnly("Cannot add clients in read-only mode!");
    let peer = WireGuardPeer.create();
    peer.setPublicKey(publicKey);
    peer.setAllowedIPs(...addresses);
    if (!!presharedKey) {
      peer.setPresharedKey(presharedKey);
    }
    if (privateKey && persistPrivateKey) {
      peer.setPrivateKey(privateKey);
    }
    this.config.peers.push(peer);

    return this.getClient(publicKey);
  }

  deleteClient(publicKey) {
    assertNotReadOnly("Cannot delete clients in read-only mode!");
    this.config.peers = this.config.peers.filter((peer) => peer.getPublicKey() != publicKey);
  }

  getInterfaceName() {
    return WG_INTERFACE;
  }

  /**
   * Reads `wg show <interface> dump`
   * @returns Array of peers from the dump (ignores the interface result)
   */
  async _readDump(interfaceName) {
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

  async readDump() {
    return this._readDump(this.getInterfaceName());
  }

  async getStats() {
    return await this.readDump();
  }

  async isUp() {
    let wgshow = await Util.exec('wg show', {log: false});
    return wgshow.split('\n').includes(`interface: ${this.getInterfaceName()}`);
  }

  getServerPort() {
    return this.config.getInterface().getListenPort();
  }

  setServerPort(port) {
    if (!Number.isInteger(port) && port <= 65535 && port >= 0) {
      throw new Error("Invalid port: " + port);
    }
    this.config.getInterface().setListenPort(port);
  }

  getServerHost() {
    let intf = this.config.getInterface();
    if (!intf.getHostAddress()) {
      intf.setHostAddress(WG_HOST);
    }
    return intf.getHostAddress();
  }

  setServerHost(host) {
    this.config.getInterface().setHostAddress(host);
  }

  assertNotReadOnly(msg) {
    assertNotReadOnly(msg);
  }
}

WireGuard.assertNotReadOnly = assertNotReadOnly;

module.exports = WireGuard;

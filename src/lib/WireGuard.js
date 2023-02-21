'use strict';

const fs = require('fs').promises;
const path = require('path');

const debug = require('debug')('WireGuard');
const uuid = require('uuid');
const QRCode = require('qrcode');

const Util = require('./Util');
const ServerError = require('./ServerError');

const WireguardModels = require('./WireGuardModels');

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

class WG2 {
  
  constructor() {
    this.config = null;
  }

  /**
   * Loads an existing configuration
   * @returns {WireguardTemplates.WGInterfaceConfig}
   */
  async loadConfig() {
    if (!WG_HOST) {
      throw new Error("WG_HOST not set!");
    }

    debug("Loading configuration...");
    let cfg_unparsed = await fs.readFile(path.join(WG_PATH, `${WG_INTERFACE}.json`), 'utf8');

    return WireguardModels.Converter.deserialize(cfg_unparsed);
  }
  
  /** Generates a brand new configuration
   * @returns {WireguardTemplates.WGInterfaceConfig}
   */
  async generateNewConfig() {
    let privateKey = await generatePrivateKey();
    //let publicKey = await generatePublicKey(privateKey);

    var cfg = new WireguardModels.WGInterfaceConfig();
    
    var server = new WireguardModels.WGServer();
    server.interfaceName = WG_INTERFACE;
    server.endpointAddress = `${WG_HOST}:${WG_PORT}`;
    // todo: generate public key once?
    server.addListenAddress(WG_DEFAULT_ADDRESS.replace('x', '1'), 24);
    server.listenPort = WG_PORT;
    server.privateKey = privateKey;
    for (let ip of WG_ALLOWED_IPS.split(" ").join("").split(",")) {
      let [ipaddr, ipsub] = ip.split("/", 2);
      server.addAllowedIP(ipaddr, ipsub);
    }
    server.PreUp = WG_PRE_UP.split("\n").join("").split(";");
    server.PostUp = WG_POST_UP.split("\n").join("").split(";");
    server.PreDown = WG_PRE_DOWN.split("\n").join("").split(";");
    server.PostDown = WG_POST_DOWN.split("\n").join("").split(";");
    cfg.server = server;

    debug('Configuration generated.');
    return cfg;
  }

  assertConfigLoaded() {
    if (this.config === null) {
      throw new Error("Configuration is not loaded!");
    }
    return true;
  }

  /**
   * Tries to load an existing configuration, otherwise fail or overwrite
   * depending on use preferences.
   * @param {boolean} reload 
   * @returns 
   */
  async getConfig(reload = false) {
    if (this.config === null || reload) {
      try {
        this.config = await this.loadConfig();
      } catch(ex) {
        if (!WG_OVERWRITE_ON_FAIL) {
          throw new Error("Unable to load config, should we regenerate one?");
        }
        console.log("Regenerating config due to failed load...");
        this.config = await this.generateNewConfig();
      }
    }
    await this.writeConfig();
    return this.config;
  }

  /**
   * Write the currently loaded configuration to the Wireguard
   * configuration path.
   */
  async writeWireguardConfig() {
    debug('Wireguard config saving...');
    this.assertConfigLoaded();
    await fs.writeFile(
      path.join(WG_PATH, `${WG_INTERFACE}.conf`), 
      await this.config.build(), 
      {
        mode: 0o600,
      }
    );
    debug('Wireguard config saved.');
  }

  /**
   * Restart Wireguard
   */
  async restartWireguard() {
    debug("Restarting Wireguard...");
    await Util.exec(`wg-quick down ${WG_INTERFACE}`).catch(() => { });
    await Util.exec(`wg-quick up ${WG_INTERFACE}`).catch(err => {
      if (err && err.message && err.message.includes(`Cannot find device "${WG_INTERFACE}"`)) {
        throw new Error(`WireGuard exited with the error: Cannot find device "${WG_INTERFACE}"\nThis usually means that your host\'s kernel does not support WireGuard!`);
      }
      
      throw err;
    });
    debug("Restarted Wireguard.");
    // todo: ???
    // await Util.exec(`iptables -t nat -A POSTROUTING -s ${WG_DEFAULT_ADDRESS.replace('x', '0')}/24 -o eth0 -j MASQUERADE`);
    // await Util.exec('iptables -A INPUT -p udp -m udp --dport 51820 -j ACCEPT');
    // await Util.exec(`iptables -A FORWARD -i ${WG_INTERFACE} -j ACCEPT`);
    // await Util.exec(`iptables -A FORWARD -o ${WG_INTERFACE} -j ACCEPT`);
  }

  /**
   * Reload Wireguard
   */
  async reloadWireguard() {
    debug('Syncing Wireguard...');
    await Util.exec(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    debug('Wireguard synced.');
  }

  /**
   * Write our current config.
   */
  async writeConfig() {
    debug('wg-easy config saving...');
    this.assertConfigLoaded();
    await fs.writeFile(
      path.join(WG_PATH, `${WG_INTERFACE}.json`), 
      JSON.stringify(WireguardModels.Converter.serialize(this.config), false, 2), 
      {
        mode: 0o660,
      }
    );
    debug('wg-easy config saved');
  }

  createClientAddress() {
    let numMax = 2;
    let clients = this.config.clients;
    for (let client of clients) {
      let curr_addr = client.addresses[0]; // we only have one for now
      let currClientNum = parseInt(curr_addr.replace(WG_DEFAULT_ADDRESS.replace("x", ""), ""));
      if (currClientNum > numMax) {
        numMax = currClientNum;
      }
    }
    // todo: create address in subnet space
    return WG_DEFAULT_ADDRESS.replace("x", "") + (numMax + 1);
  }

  /**
   * Create Client/Peer
   */
  async createClient({ name }) {
    if (!name) {
      throw new Error("Missing: Name");
    }
    let privateKey = await generatePrivateKey();
    //let publicKey = await generatePublicKey(privateKey);
    let psKey = await generatePreSharedKey();
    let address = await this.createClientAddress();

    // todo:
    let client = new WireguardModels.WGClient();
    client.id = name;
    client.name = name;
    client.privateKey = privateKey;
    client.preSharedKey = psKey;
    for (let allowedip of WG_ALLOWED_IPS.split(" ").join("").split(",")) {
      let [allowedipaddr, allowedsubnet] = allowedip.split("/", 2);
      client.addAllowedIP(allowedipaddr, allowedsubnet);
    }
    client.addAddress(address, 24);
    client.settings.enabled = true;
    this.config.clients.push(client);
  }

  async getClients() {
    return [...this.config.clients];
  }
  
  async getClientByPublicKey(publicKey) {
    for (let client of this.config.clients) {
      if ((await client.getPublicKey()) == publicKey) {
        return client;
      }
    }
    return null;
  }

  async updateClients() {
    // read-in wireguard status from wg show <interface> dump
    debug("Updating client data...");
    const dump = await Util.exec(`wg show ${WG_INTERFACE} dump`, {
      log: false,
    }); // capture dump data
    dump
      .trim()
      .split('\n')
      .slice(1)
      .forEach(async (line) => {
        console.log(line);
        const [
          publicKey,
          preSharedKey, // eslint-disable-line no-unused-vars
          endpoint, // eslint-disable-line no-unused-vars
          allowedIps, // eslint-disable-line no-unused-vars
          latestHandshakeAt,
          transferRx,
          transferTx,
          persistentKeepalive,
        ] = line.split('\t');
        let client = await this.getClientByPublicKey(publicKey);
        if (!client) {
          console.log(`Unknown client with public key: ${client.publicKey}`)
          return;
        }

        client.stats.latestHandshakeAt = latestHandshakeAt === '0'
          ? null
          : new Date(Number(`${latestHandshakeAt}000`));
        client.stats.transferRx = Number(transferRx);
        client.stats.transferTx = Number(transferTx);
        //todo: client.settings.persistentKeepalive = persistentKeepalive;
      });
      debug("Updated client data.");
  }

  async deleteClient({ clientId }) {
    var name = clientId;
    for (var i = 0; i < this.config.clients.length; i++) {
      if (this.config.clients[i].name == name) {
        delete this.config.clients[i];
      }
    }
  }

  async getClient({ clientId }) {
    for (let client of this.config.clients) {
      if (client.id == clientId) {
        return client;
      }
    }
    throw new Error(`Could not find client by ID ${clientId}`);
  }

  async getClientConfiguration({ clientId }) {
    let client = await this.getClient({ clientId });
    let config = new WireguardModels.WGInterfaceConfig();
    config.server = client;
    config.clients.push(this.config.server);
    return await config.build();
  }

  async getClientQRCodeSVG({ clientId }) {
    const config = await this.getClientConfiguration({ clientId });
    return QRCode.toString(config, {
      type: 'svg',
      width: 512,
    });
  }

  async enableClient({ clientId }) {
    (await this.getClient({ clientId })).settings.enabled = true;
  }

  async disableClient({ clientId }) {
    (await this.getClient({ clientId })).settings.enabled = false;
  }

  async updateClientName({ clientId, name }) {
    var newName = name;
    (await this.getClient({ clientId })).name = newName;
  }

  async updateClientAddress({ clientId, address }) {
    let client = await this.getClient({ clientId });
    client.addresses = [];

    let [newAddr, newSubnet] = address.split("/");
    client.addAddress(newAddr, newSubnet)
  }
}

module.exports = WG2;

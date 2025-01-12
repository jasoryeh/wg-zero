const debug = require('debug')('wgeasy:ConfigModels');
const { WG_INTERFACE, WG_HOST, WG_PORT } = require('../../config');
const { generatePublicKey } = require('../WireGuardUtils');
const {IniSection, IniEntry} = require('./Ini');

const INTERFACE_ADDRESS = 'Address';
const INTERFACE_LISTENPORT = 'ListenPort';
const INTERFACE_PRIVATEKEY = 'PrivateKey';
const INTERFACE_DNS = 'DNS';
const INTERFACE_TABLE = 'Table';
const INTERFACE_MTU = 'MTU';
const INTERFACE_PREUP = 'PreUp';
const INTERFACE_POSTUP = 'PostUp';
const INTERFACE_PREDOWN = 'PreDown';
const INTERFACE_POSTDOWN = 'PostDown';
const INTERFACE_SAVECONFIG = 'SaveConfig';
const INTERFACE_SECTION = 'Interface';
/**
 * The Interface is the current computer's configuration.
 * - The interface section can contain the following information:
 *   - Address: In CIDR notation, and can be a list (comma separated)
 *     - The subnet indicated can be a single address(/32) or a variety(<=/31)
 *   - ListenPort: integer
 *     - Clients should not set this
 *     - Servers should set this to the port they are listening on
 *   - PrivateKey: string
 *   - DNS: comma-separated list of DNS IPs
 *     - Servers announce this to clients over DHCP
 *     - Clients can use this to set their own preference
 *   - Table: 'off', 'auto', or a custom table
 *   - MTU: int
 *   - PreUp: commands to run at the specified times, multiple entries are permitted
 *   - PostUp: ^
 *   - PreDown: ^
 *   - PostDown: ^
 *   - SaveConfig: true or false and optional
*/
class WireGuardInterface {
    /**
     * @param {IniSection} iniSection 
     */
    constructor(iniSection, enforce = true) {
        this.iniSection = iniSection;
        enforce && this.enforceFields();
    }

    static create() {
        return new WireGuardInterface(new IniSection(INTERFACE_SECTION), false);
    }

    toJson() {
        return this.iniSection.toJson();
    }

    toOldJson() {
        return this.iniSection.toOldJson();
    }

    enforceFields() {
        var existingPort = this.getListenPort();
        if (WG_PORT != existingPort) {
            debug(`Enforcing WireGuard port from ${existingPort} -> ${WG_PORT}`)
            this.setListenPort(WG_PORT);
        }
        this.setInterface(WG_INTERFACE);
        if (!this.getHostAddress()) {
            this.setHostAddress(WG_HOST);
        }
        this.setPublicKey(generatePublicKey(this.getPrivateKey()));
        let name = this.getName();
        if (!this.iniSection.hasMetadata('Name')) {
            debug("Enforcing name property to public key on server.");
            this.setName("Server");
            name = this.getName();
            debug("\t name set to: '" + name + "'")
        }
    }

    /**
     * WireGuard Settings
     */

    /**
     * @returns {String[]}
     */
    getAddresses() {
        return this.iniSection.has(INTERFACE_ADDRESS) ? IniSection.unCommaSeparated(this.iniSection.getOne(INTERFACE_ADDRESS).value) : null;
    }
    setAddresses(...addresses) {
        this.iniSection.set(INTERFACE_ADDRESS, IniSection.commaSeparated(addresses));
    }
    
    /**
     * @returns {Number}
     */
    getListenPort() {
        return this.iniSection.has(INTERFACE_LISTENPORT) ? parseInt(this.iniSection.getOne(INTERFACE_LISTENPORT).value) : null;
    }
    setListenPort(port) {
        this.iniSection.set(INTERFACE_LISTENPORT, port);
    }

    /**
     * 
     * @returns {String}
     */
    getPrivateKey() {
        return this.iniSection.has(INTERFACE_PRIVATEKEY) ? this.iniSection.getOne(INTERFACE_PRIVATEKEY).value : null;
    }
    setPrivateKey(pk) {
        this.iniSection.set(INTERFACE_PRIVATEKEY, pk);
    }

    /**
     * @returns {String[]}
     */
    getDNS() {
        return this.iniSection.has(INTERFACE_DNS) ? IniSection.unCommaSeparated(this.iniSection.getOne(INTERFACE_DNS).value) : null;
    }
    setDNS(...dnss) {
        this.iniSection.set(INTERFACE_DNS, IniSection.commaSeparated(dnss));
    }

    getTable() {
        return this.iniSection.has(INTERFACE_TABLE) ? this.iniSection.getOne(INTERFACE_TABLE).value : null;
    }
    setTable(table) {
        this.iniSection.set(INTERFACE_TABLE, table);
    }

    /**
     * @returns {Number}
     */
    getMTU() {
        return this.iniSection.has(INTERFACE_MTU) ? parseInt(this.iniSection.getOne(INTERFACE_MTU)).value : null;
    }
    setMTU(mtu) {
        this.iniSection.set(INTERFACE_MTU, mtu);
    }

    /**
     * @returns {String[]}
     */
    getPreUp() {
        return this.iniSection.has(INTERFACE_PREUP) ? this.iniSection.get(INTERFACE_PREUP).map((entry => entry.value)) : null;
    }
    setPreUp(...cmds) {
        this.iniSection.set(INTERFACE_PREUP, ...cmds);
    }
    /**
     * @returns {String[]}
     */
    getPostUp() {
        return tthis.iniSection.has(INTERFACE_POSTUP) ? his.iniSection.get(INTERFACE_POSTUP).map((entry) => entry.value) : null;
    }
    setPostUp(...cmds) {
        this.iniSection.set(INTERFACE_POSTUP, ...cmds);
    }
    /**
     * @returns {String[]}
     */
    getPreDown() {
        return this.iniSection.has(INTERFACE_PREDOWN) ? this.iniSection.get(INTERFACE_PREDOWN).map((entry => entry.value)) : null;
    }
    setPreDown(...cmds) {
        this.iniSection.set(INTERFACE_PREDOWN, ...cmds);
    }
    /**
     * @returns {String[]}
     */
    getPostDown() {
        return this.iniSection.has(INTERFACE_POSTDOWN) ? this.iniSection.get(INTERFACE_POSTDOWN).map((entry) => entry.value) : null;
    }
    setPostDown(...cmds) {
        this.iniSection.set(INTERFACE_POSTDOWN, ...cmds);
    }

    /**
     * @returns {Boolean}
     */
    getSaveConfig() {
        return this.iniSection.has(INTERFACE_SAVECONFIG) ? this.iniSection.getOne(INTERFACE_SAVECONFIG).value == 'true' : null;
    }
    /**
     * @param {Boolean} what 
     */
    setSaveConfig(what) {
        this.iniSection.set(INTERFACE_SAVECONFIG, what ? 'true' : 'false');
    }

    /**
     * Application Settings
     */

    /**
     * The address that peers will connect to (FQDN or IP)
     * @returns {String}
     */
    getHostAddress() {
        return this.iniSection.hasMetadata('Host') ? this.iniSection.getOneMetadata('Host').value : null;
    }
    setHostAddress(host) {
        this.iniSection.setMetadata('Host', host);
    }

    getInterface() {
        return this.iniSection.hasMetadata('Interface') ? this.iniSection.getOneMetadata('Interface').value : null;
    }
    setInterface(val) {
        this.iniSection.setMetadata('Interface', val);
    }

    getPublicKey() {
        return this.iniSection.hasMetadata('PublicKey') ? this.iniSection.getOneMetadata('PublicKey').value : null;
    }
    setPublicKey(val) {
        this.iniSection.setMetadata('PublicKey', val);
    }

    getConfigVersion() {
        return this.iniSection.hasMetadata('WGZERO_Version') ? parseInt(this.iniSection.getOneMetadata('WGZERO_Version').value) : 0;
    }
    setConfigVersion(ver) {
        this.iniSection.setMetadata('WGZERO_Version', ver);
    }

    getName() {
        return this.iniSection.hasMetadata('Name') ? this.iniSection.getOneMetadata('Name').value : null;
    }
    setName(name) {
        this.iniSection.setMetadata('Name', name);
    }
}
WireGuardInterface.SECTION_NAME = INTERFACE_SECTION;

const PEER_ENDPOINT = 'Endpoint';
const PEER_ALLOWEDIPS = 'AllowedIPs';
const PEER_PUBLICKEY = 'PublicKey';
const PEER_PERSISTENTKEEPALIVE = 'PersistentKeepalive';
const PEER_PRESHAREDKEY = 'PresharedKey';
const PEER_SECTION = 'Peer';
/**
 * Peers are other computers that can connect to us or that we can connect to
 * - Peers can have the following config:
 *   - Endpoint: DNS or IP address
 *   - AllowedIPs: CIDR for traffic this peer will route for us
 *   - PublicKey: public key for this peer derived from it's private key
 *   - PersistentKeepalive: how often this peer will be pinged
 *   - PresharedKey: The preshared key is identical between peers, and is unique between the peers
 * 
 */
class WireGuardPeer {
    constructor(iniSection, enforce = true) {
        this.iniSection = iniSection;
        enforce && this.enforceFields();
    }

    static create() {
        return new WireGuardPeer(new IniSection(PEER_SECTION));
    }

    toJson() {
        return this.iniSection.toJson();
    }

    toOldJson() {
        return this.iniSection.toOldJson();
    }


    enforceFields() {
        let pubKey = this.getPublicKey();
        let name = this.getName();
        if (!this.iniSection.hasMetadata('Name')) {
            debug("Enforcing name property to public key on peer: " + pubKey);
            this.setName("Unnamed Peer: '" + pubKey + "'");
            name = this.getName();
            debug("\t name set to: '" + name + "'")
        }
        if (this.getEnabled() === null) {
            debug("Enforcing enabled property presence on peer: " + name)
            this.setEnabled(true);
        }
    }

    /**
     * WireGuard Settings
     */

    getEndpoint() {
        return this.iniSection.has(PEER_ENDPOINT) ? this.iniSection.getOne(PEER_ENDPOINT).value : null;
    }
    setEndpoint(ep) {
        this.iniSection.set(PEER_ENDPOINT, ep);
    }

    getAllowedIPs() {
        return this.iniSection.has(PEER_ALLOWEDIPS) ? IniSection.unCommaSeparated(this.iniSection.getOne(PEER_ALLOWEDIPS).value) : null;
    }
    setAllowedIPs(...ips) {
        this.iniSection.set(PEER_ALLOWEDIPS, IniSection.commaSeparated(ips));
    }

    getPublicKey() {
        return this.iniSection.has(PEER_PUBLICKEY) ? this.iniSection.getOne(PEER_PUBLICKEY).value : null;
    }
    setPublicKey(pk) {
        this.iniSection.set(PEER_PUBLICKEY, pk);
    }

    /**
     * 
     * @returns {Number}
     */
    getPersistentKeepalive() {
        return this.iniSection.has(PEER_PERSISTENTKEEPALIVE) ? parseInt(this.iniSection.getOne(PEER_PERSISTENTKEEPALIVE).value) : null;
    }
    /**
     * @param {Number} pka 
     */
    setPersistentKeepalive(pka) {
        this.iniSection.set(PEER_PERSISTENTKEEPALIVE, pka);
    }


    getPresharedKey() {
        return this.iniSection.has(PEER_PRESHAREDKEY) ? this.iniSection.getOne(PEER_PRESHAREDKEY).value : null;
    }
    setPresharedKey(psk) {
        this.iniSection.set(PEER_PRESHAREDKEY, psk);
    }

    /**
     * Application Settings
     */

    getPrivateKey() {
        return this.iniSection.hasMetadata('PrivateKey') ? this.iniSection.getOneMetadata('PrivateKey').value : null;
    }
    setPrivateKey(key) {
        this.iniSection.setMetadata('PrivateKey', key);
    }

    getName() {
        return this.iniSection.hasMetadata('Name') ? this.iniSection.getOneMetadata('Name').value : null;
    }
    setName(name) {
        this.iniSection.setMetadata('Name', name);
    }

    getEnabled() {
        return this.iniSection.hasMetadata('Enabled') ? this.iniSection.getOneMetadata('Enabled').value == 'true' : null;
    }
    setEnabled(enabled) {
        this.iniSection.setMetadata('Enabled', enabled);
        this.enforceEnabled();
    }
    enforceEnabled() {
        let newEnabled = this.getEnabled();
        this.iniSection.get(PEER_ALLOWEDIPS).map((entry) => {
            debug("Updating AllowedIPs in setEnabled to: " + newEnabled, entry);
            let old = entry.enabled;
            entry.enabled = newEnabled;
            return old == entry.enabled;
        });
    }
}
WireGuardPeer.SECTION_NAME = PEER_SECTION;

module.exports.WireGuardInterface = WireGuardInterface;
module.exports.WireGuardPeer = WireGuardPeer;
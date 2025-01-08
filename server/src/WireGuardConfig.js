const path = require('path');
const fs = require('fs');
const debug = require('debug')('wgeasy:Init');

const INI_KEY_COMMENT = '_comment_';
const INI_KEY_META = '_meta_';
const INI_KEY_ENTRY = '_entry_';

class IniEntry {
    constructor(type, key, value) {
        this.type = IniEntry.assertIsType(type);
        this.key = key;
        this.value = value;
    }

    static assertIsType(type) {
        if (!([INI_KEY_COMMENT, INI_KEY_META, INI_KEY_ENTRY].includes(type))) {
            throw new Error("Invalid IniEntry type: '" + type + "'");
        }
        return type;
    }

    isComment() {
        return this.type == INI_KEY_COMMENT;
    }

    isMeta() {
        return this.type == INI_KEY_META;
    }

    isEntry() {
        return this.type == INI_KEY_ENTRY;
    }
}

/**
 * Represents a section in the WireGuard configuration
 */
class IniSection {
    constructor(sectionName) {
        this.sectionName = sectionName;
        this.config = []
    }

    getName() {
        return this.sectionName;
    }
    setName(name) {
        this.sectionName = name;
    }

    /**
     * @param {String} key 
     * @returns {String}
     */
    get(key) {
        return this.config.filter((entry) => entry.isEntry() && entry.key == key);
    }

    /**
     * @param {String} key 
     * @returns {String}
     */
    getOne(key) {
        return this.config.find((entry) => entry.isEntry() && entry.key == key);
    }

    has(key) {
        return this.getOne(key) != null;
    }

    add(key, value) {
        this.config.push(new IniEntry(INI_KEY_ENTRY, key, value));
    }

    set(key, ...value) {
        this.config = this.config.filter((entry) => !(entry.isEntry() && entry.key == key));
        value.forEach((v) => this.add(key, v));
    }

    hasMetadata(key) {
        return this.getOneMetadata(key) != null;
    }

    getMetadata(key) {
        return this.config.filter((entry) => entry.isMeta() && entry.key == key);
    }

    getOneMetadata(key) {
        return this.config.find((entry) => entry.isMeta() && entry.key == key);
    }

    addMetadata(key, value) {
        this.config.push(new IniEntry(INI_KEY_META, key, value));
    }

    setMetadata(key, ...value) {
        this.config = this.config.filter((entry) => !(entry.isMeta() && entry.key == key));
        value.forEach((val) => this.addMetadata(key, val));
    }

    addComment(comment) {
        if (comment.startsWith('!') && comment.includes('=')) {
            let eq = comment.indexOf('=');
            let key = comment.slice(1, eq).trim();
            let val = comment.slice(eq + 1, comment.length).trim();
            this.config.push(new IniEntry(INI_KEY_META, key, val));
        } else {
            this.config.push(new IniEntry(INI_KEY_COMMENT, null, comment));
        }
    }

    /**
     * @returns {String}
     */
    getComments() {
        return this.config.filter((entry) => entry.isComment());
    }

    isEmpty() {
        return this.name == null && this.config.length == 0;
    }

    toLines() {
        let lines = [`[${this.sectionName}]`];
        this.config.forEach((entry) => {
            if (entry.isComment()) {
                lines.push(`#${entry.value}`);
            } else if (entry.isMeta()) {
                lines.push(`#!${entry.key} = ${entry.value}`);
            } else if (entry.isEntry()) {
                lines.push(`${entry.key} = ${entry.value}`);
            } else {
                throw new Error(`Unknown Ini entry type: '` + entry.type + `'`);
            }
        });
        return lines;
    }

    toJson() {
        function group(collection, keyFN) {
            let res = {};
            for (let item of collection) {
                let key = keyFN(item);
                res[key] = res[key] ?? [];
                res[key].push(item);
            }
            return res;
        }
        return {
            entries: group(this.config.filter((entry) => entry.isEntry()), (entry) => entry.key),
            comments: this.config.filter((entry) => entry.isComment()),
            metadata: group(this.config.filter((entry) => entry.isMeta()), (entry) => entry.key),
        };
    }

    /**
     * @param {String} value 
     * @return {String[]}
     */
    static unCommaSeparated(value) {
        return value.split(',').map(i => i.trim());
    }

    /**
     * @param {String[]} values 
     * @returns {String}
     */
    static commaSeparated(values) {
        return values.join(',');
    }

}

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
    constructor(iniSection) {
        this.iniSection = iniSection;
        this.enforceFields();
    }

    static create() {
        return new WireGuardInterface(new IniSection(INTERFACE_SECTION));
    }

    toJson() {
        return this.iniSection.toJson();
    }

    enforceFields() {

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
}

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
    constructor(iniSection) {
        this.iniSection = iniSection;
        this.enforceFields();
    }

    static create() {
        return new WireGuardPeer(new IniSection(PEER_SECTION));
    }

    toJson() {
        return this.iniSection.toJson();
    }

    enforceFields() {
        let pubKey = this.getPublicKey();
        var name = this.getName();
        if (name != null) {
            debug("Enforcing name property to public key on peer: " + pubKey);
            this.setName("Unnamed Peer: '" + pubKey + "'");
            name = this.getName();
            debug("\t name set to: '" + name + "'")
        }
        if (this.getEnabled() === null) {
            debug("Enforcing enabled property on peer: " + name)
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
        return this.iniSection.hasMetadata('privateKey') ? this.iniSection.getOneMetadata('privateKey').value : null;
    }
    setPrivateKey(key) {
        this.iniSection.setMetadata('privateKey', key);
    }

    getName() {
        return this.iniSection.hasMetadata('Name') ? this.iniSection.getOneMetadata('Name').value : null;
    }
    setName(name) {
        this.iniSection.setMetadata('Name', name);
    }

    getEnabled() {
        return this.iniSection.hasMetadata('enabled') ? this.iniSection.getOneMetadata('enabled').value == 'true' : null;
    }
    setEnabled(enabled) {
        this.iniSection.setMetadata('enabled', enabled);
    }
}

/**
 * Configuration file parser and handler
 */
class WireGuardConfig {
    constructor(fileName = 'wg0.conf', folder = '/etc/wireguard', backups = 'wg-easy-backups') {
        this.fileName = fileName;
        this.folder = folder;
        this.backupsFolder = backups;

        this.sections = [];
        this.wgInterface = null;
        this.peers = [];
    }

    loadExisting() {
        debug("Using WireGuard Configuration: " + this.getPath())
        this.sections = this.parseSections();
        debug("Loaded " + this.sections.length + " sections");

        this.wgInterface = this.parseInterface();
        debug("Loaded WireGuard Interface " + this.wgInterface.getAddresses() + " on port " + this.wgInterface.getListenPort())
        this.peers = this.parsePeers();
        debug("Loaded " + this.peers.length + " peers: " + this.peers.map((peer) => peer.getName() ?? peer.getPublicKey()).join(', '));
    }

    /**
     * @returns {WireGuardInterface}
     */
    getInterface() {
        return this.wgInterface;
    }

    /**
     * @returns {WireGuardPeer[]}
     */
    getPeers() {
        return this.peers;
    }

    /**
     * @param {String} publicKey 
     * @returns {WireGuardPeer}
     */
    getPeer(publicKey) {
        return this.peers.find((peer) => peer.getPublicKey() == publicKey);
    }

    /**
     * @returns {String}
     */
    getPath() {
        return path.join(this.folder, this.fileName);
    }

    configExists() {
        const interfaceFile = this.getPath();
        debug("WireGuard Configuration File: " + interfaceFile);
        try {
          fs.statSync(interfaceFile);
          return true;
        } catch(_) {
          return false;
        }
    }

    /**
     * @returns {String}
     */
    getBackupPath() {
        return path.join(this.folder, this.backupsFolder);
    }

    /**
     * @returns {String[]}
     */
    readFile() {
        return fs.readFileSync(this.getPath(), 'utf8').split('\n');
    }

    /**
     * @returns {IniSection[]}
     */
    parseSections() {
        let configSections = [];
        var lines = this.readFile();
        var currentSection = new IniSection(null);
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.length == 0) {
                continue;
            }
            if (line.startsWith('#')) {
                currentSection.addComment(line.replace('#', ''));
            } else if (line.startsWith('[') && line.endsWith(']')) {
                var sectionName = line.substring(1, line.length-1);
                if (!currentSection.isEmpty()) {
                    configSections.push(currentSection);
                }
                currentSection = new IniSection(sectionName)
            } else {
                if (!line.includes('=')) {
                    throw new Error("Invalid configuration line (" + i + "): '" + line + "', no '='");
                }
                var separatorIndex = line.indexOf('=');
                var key = line.slice(0, separatorIndex).trim();
                var value = line.slice(separatorIndex + 1, line.length).trim();
                currentSection.add(key, value);
            }
        }
        if (!currentSection.isEmpty()) {
            configSections.push(currentSection);
        }

        return configSections;
    }

    /**
     * @returns {IniSection}
     */
    getInterfaceSection() {
        return this.sections.find((section) => section.getName() && section.getName().toUpperCase() == INTERFACE_SECTION.toUpperCase());
    }

    /**
     * @returns {WireGuardInterface}
     */
    parseInterface() {
        let section = this.getInterfaceSection();
        let wgi = new WireGuardInterface(section);
        return wgi;
    }

    /**
     * @returns {IniSection[]}
     */
    getPeerSections() {
        return this.sections.filter((section) => section.getName() && section.getName().toUpperCase() == PEER_SECTION.toUpperCase());
    }

    /**
     * @returns {WireGuardPeer[]}
     */
    parsePeers() {
        let sections = this.getPeerSections();
        let peers = [];
        for (let section of sections) {
            let peer = new WireGuardPeer(section);
            peers.push(peer);
        }
        return peers;
    }

    /**
     * @returns {String[]}
     */
    toLines() {
        let lines = [];
        this.sections.forEach((section) => {
            section.toLines().forEach((line) => lines.push(line));
            lines.push('');
        });
        lines.push('');
        return lines;
    }
    
    /**
     * @param {Stringp[]} lines 
     */
    writeToConfig(lines) {
        const FS_LINESEPARATOR = '\n';
        fs.writeFileSync(this.getPath(), lines.join(FS_LINESEPARATOR), 'utf8');
    }

    save() {
        this.writeToConfig(this.toLines());
    }

    /**
     * @returns {String}
     */
    generateBackupTag() {
        let d = new Date();
        return (d.toLocaleDateString('en-US') + '_' + d.toLocaleTimeString('en-US')).replaceAll('/', '_').replaceAll(':', '_').replaceAll(' ', '_');
    }

    getLatestBackupPath() {
        return path.join(this.getBackupPath(), this.fileName + '_latest');
    }

    /**
     * @returns {String} File path
     */
    backupFSCopy() {
        let currentFileOnFilesystem = this.readFile();
        fs.mkdirSync(this.getBackupPath(), {
            recursive: true,
        });
        let latestFile =  this.getLatestBackupPath();
        let backupFile =  path.join(this.getBackupPath(), this.fileName + '_' + this.generateBackupTag());
        fs.writeFileSync(backupFile, currentFileOnFilesystem.join('\n'), 'utf8');
        fs.writeFileSync(latestFile, currentFileOnFilesystem.join('\n'), 'utf8');
        return backupFile;
    }

    readLatestBackup() {
        let latestFile = this.getLatestBackupPath();
        return fs.readFileSync(latestFile, 'utf8');
    }

    revert() {
        let lastContents = this.readLatestBackup();
        fs.writeFileSync(this.getPath(), latestBackupContents, 'utf8');
    }
}


module.exports.WireGuardConfig = WireGuardConfig;
module.exports.WireGuardInterface = WireGuardInterface;
module.exports.WireGuardPeer = WireGuardPeer;
module.exports.IniSection = IniSection;
module.exports.IniEntry = IniEntry;

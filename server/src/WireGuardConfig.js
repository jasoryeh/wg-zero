const path = require('path');
const fs = require('fs');
const { WG_INTERFACE, WG_HOST } = require('../config');
const { generatePublicKey } = require('./WireGuardUtils');
const debug = require('debug')('wgeasy:Init');

const INI_KEY_COMMENT = '_comment_';
const INI_KEY_META = '_meta_';
const INI_KEY_ENTRY = '_entry_';

class IniEntry {
    constructor(type, key, value) {
        this.type = IniEntry.assertIsType(type);
        this.key = key;
        this.value = value;
        this.enabled = true;
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

    toLine() {
        if (this.isComment()) {
            return `#${this.value}`;
        } else {
            var line = `${this.key} = ${this.value}`;

            if (this.isMeta()) {
                line = '#!' + line;
            } else if (this.isEntry()) {
                // already entry
            } else {
                throw new Error(`Unknown Ini entry type: '` + this.type + `'`);
            }

            if (!this.enabled) {
                line = '#$' + line;
            }

            return line;
        }
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

    /**
     * @returns {IniEntry}
     */
    addRaw(type, key, val) {
        let entry = new IniEntry(type, key, String(val));
        this.config.push(entry);
        return entry;
    }

    /**
     * @returns {IniEntry}
     */
    add(key, value) {
        return this.addRaw(INI_KEY_ENTRY, key, value);
    }

    /**
     * @returns {IniEntry[]}
     */
    set(key, ...value) {
        this.config = this.config.filter((entry) => !(entry.isEntry() && entry.key == key));
        return value.map((v) => this.add(key, v));
    }

    /**
     * @returns {Boolean}
     */
    hasMetadata(key) {
        return this.getOneMetadata(key) != null;
    }

    /**
     * @returns {IniEntry[]}
     */
    getMetadata(key) {
        return this.config.filter((entry) => entry.isMeta() && entry.key == key);
    }

    /**
     * @returns {IniEntry}
     */
    getOneMetadata(key) {
        return this.config.find((entry) => entry.isMeta() && entry.key == key);
    }

    /**
     * @returns {IniEntry}
     */
    addMetadata(key, value) {
        return this.addRaw(INI_KEY_META, key, value);
    }

    /**
     * @returns {IniEntry[]} 
     */
    setMetadata(key, ...value) {
        this.config = this.config.filter((entry) => !(entry.isMeta() && entry.key == key));
        return value.map((val) => this.addMetadata(key, val));
    }

    /**
     * Parse the line.
     * @param {String} line 
     * @returns {key, value}
     */
    getKV(line) {
        let eq = line.indexOf('=');
        if (eq == -1) {
            throw new Error('IniSection: Invalid KV line: \'' + line + '\'')
        }
        let key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        return {key, value};
    }

    parseLine(line) {
        let isComment = line.startsWith('#');
        
        if (isComment) {
            this.addComment(line.slice(1));
        } else {
            let {key, value} = this.getKV(line);
            return this.add(key, value);
        }
    }

    addComment(comment) {
        if (comment.startsWith('$') && comment.includes('=')) {
            // for helping with disabling peers
            debug("IniSection: Detected disabled property: " + comment);
            this.parseLine(comment.slice(1)).enabled = false;
        } else if (comment.startsWith('!') && comment.includes('=')) {
            let {key, value} = this.getKV(comment.slice(1));
            return this.addMetadata(key, value);
        } else {
            return this.addRaw(INI_KEY_COMMENT, null, comment);
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
        this.config.forEach((entry) => lines.push(entry.toLine()));
        return lines;
    }

    toJson() {
        function group(collection, keyFN) {
            let res = {};
            for (let item of collection) {
                let key = keyFN(item);
                res[key] = res[key] ?? [];
                res[key].push(item.value);
            }
            return res;
        }
        return {
            entries: group(this.config.filter((entry) => entry.isEntry()), (entry) => entry.key),
            comments: this.config.filter((entry) => entry.isComment()),
            metadata: group(this.config.filter((entry) => entry.isMeta()), (entry) => entry.key),
        };
    }

    toOldJson() {
        let res = {_meta: {}};
        for (let entry of this.config) {
            let key = (entry.isEntry() ? '' : (entry.isMeta() ? '!' : (entry.isComment() ? '#' : '?'))) + (entry.key ?? 'comment');
            
            res[key] = res[key] ?? [];
            res[key].push(entry.value);

            if (entry.isMeta()) {
                res._meta[key] = res._meta[key] ?? [];
                res._meta[key].push(entry.value);
            }
        }
        return res;
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
        this.setInterface(WG_INTERFACE);
        this.setHostAddress(WG_HOST);
        this.setPublicKey(generatePublicKey(this.getPrivateKey()));
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
        this.iniSection.get(PEER_ALLOWEDIPS).forEach((entry) => {
            debug("Updating AllowedIPs in setEnabled to: " + enabled, entry);
            entry.enabled = enabled
        });
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
            if (line.startsWith('[') && line.endsWith(']')) {
                var sectionName = line.substring(1, line.length-1);
                if (!currentSection.isEmpty()) {
                    configSections.push(currentSection);
                }
                currentSection = new IniSection(sectionName)
            } else {
                try {
                    currentSection.parseLine(line);
                } catch(err) {
                    console.error("Failed to parse configuration line (" + i + "): '" + line + "', error: " + err);
                    console.error(err);
                    throw new Error("Failed to parse configuration line (" + i + "): '" + line + "', error: " + err);
                }
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
        this.wgInterface.iniSection.toLines().forEach((line) => lines.push(line));
        lines.push('');
        this.peers.forEach((peer) => {
            peer.iniSection.toLines().forEach((line) => lines.push(line));
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
        this.enforceFields();
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

    enforceFields() {
        this.wgInterface.enforceFields();
        this.peers.forEach((peer) => peer.enforceFields());
    }
}


module.exports.WireGuardConfig = WireGuardConfig;
module.exports.WireGuardInterface = WireGuardInterface;
module.exports.WireGuardPeer = WireGuardPeer;
module.exports.IniSection = IniSection;
module.exports.IniEntry = IniEntry;

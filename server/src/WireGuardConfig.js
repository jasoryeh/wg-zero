const path = require('path');
const fs = require('fs');
const debug = require('debug')('wgeasy:Config');
const {IniSection, IniEntry} = require('./config/Ini');
const {WireGuardInterface, WireGuardPeer} = require('./config/WireGuardModels');
const {WireGuardZeroConfigMigrations} = require('./config/WireGuardZeroConfigMigrations');
const { WG_BACKUP_TRIM_KEEP, WG_BACKUP_TRIM } = require('../config');

/**
 * Configuration file parser and handler
 */
class WireGuardConfig {
    constructor(fileName = 'wg0.conf', folder = '/etc/wireguard', backups = 'wg-zero-backups') {
        this.fileName = fileName;
        this.folder = folder;
        this.backupsFolder = backups;

        this.sections = [];
        this.wgInterface = null;
        this.peers = [];
    }

    migrate() {
        if (!this.wgInterface) {
            throw new Error('Interface was not loaded before migrations are run.');
        }
        WireGuardZeroConfigMigrations.execute(this);
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
                    debug("Failed to parse configuration line (" + i + "): '" + line + "', error: " + err);
                    debug(err);
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
        return this.sections.find((section) => section.getName() && section.getName().toUpperCase() == WireGuardInterface.SECTION_NAME.toUpperCase());
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
        return this.sections.filter((section) => section.getName() && section.getName().toUpperCase() == WireGuardPeer.SECTION_NAME.toUpperCase());
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
        this.trimBackups();
        return backupFile;
    }

    trimBackups() {
        debug("Trimming backups...");
        if (!WG_BACKUP_TRIM) {
            debug("\t...backup trim is not allowed.");
            return false;
        }
        let backups = fs.readdirSync(this.getBackupPath())
            .map((file) => {
                let backupPath = path.join(this.getBackupPath(), file);
                return [backupPath, fs.statSync(backupPath)]
            })
            .sort()
            .reverse();
        debug(`Found ${backups.length} backups, will keep ${WG_BACKUP_TRIM_KEEP}`);
        var kept = 0;
        for (let backup of backups) {
            if (kept < WG_BACKUP_TRIM_KEEP || backup[0].endsWith("_latest")) {
                debug("Keeping backup: " + backup[0]);
                kept++;
                continue;
            } else {
                debug("Trim backup: " + backup[0]);
                fs.unlinkSync(backup[0]);
            }
        }
        debug("\t...trim complete.");
    }

    readLatestBackup() {
        let latestFile = this.getLatestBackupPath();
        return fs.readFileSync(latestFile, 'utf8');
    }

    revert() {
        debug('Reverting configuration...');
        let lastContents = this.readLatestBackup();
        debug('\tto last contents. Length: ' + lastContents.length);
        fs.writeFileSync(this.getPath(), lastContents, 'utf8');
        debug('\t...done.');
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

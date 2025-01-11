const debug = require('debug')('wgeasy:IniConfiguration');

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

    delete(key) {
        this.set(key);
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

    deleteMetadata(key) {
        return this.setMetadata(key);
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

module.exports.IniEntry = IniEntry;
module.exports.IniSection = IniSection;
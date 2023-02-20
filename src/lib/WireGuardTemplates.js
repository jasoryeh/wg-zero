class WGConfigBuilder {
    constructor(initial = '') {
        this.progress = [initial];
    }

    line(line = '') {
        this.progress.push(line);
    }

    lineAt(idx, line = '') {
        this.progress.splice(idx, 0, line);
    }

    comment(cmt) {
        this.line(`#${cmt}`);
    }
    
    beginSection(section) {
        this.line(`[${section}]`);
    }

    vari(key, val) {
        this.line(`${key} = ${val}`);
    }

    build() {
        return this.progress.join('\n') + '\n';
    }
}

class WGAddress {
    constructor() {
        this._address = null;
        this._subnet = null;
    }

    read(raw) {
        if (!(raw.includes('/'))) {
            throw new Error("WGAddress must have a subnet!");
        }
        [this.address, this.subnet] = raw.split("/", 2);
    }

    get subnet() {
        return this._subnet;
    }

    set subnet(sn) {
        this._subnet = parseInt(sn);
    }

    get address() {
        return this._address;
    }

    set address(ad) {
        if (ad.includes("/")) {
            this.read(ad);
        } else {
            this._address = ad;
        }
    }
}

class WGInterfaceClientConfig {

    constructor() {
        // global
        this.clientName = null;
        this.publicKey = null;
        this.preSharedKey = null;
        this.allowedIPs = [];
        // client
        this.persistentKeepAlive = null;
        this.endpoint = null;
        // server
    }
    
    addAllowedIP(addr, sub) {
        let addressObj = new WGAddress();
        addressObj.address = addr;
        addressObj.subnet = sub;
        this.allowedIPs.push(addressObj);
        return addressObj;
    }

    validate() {
        if (this.publicKey === null) {
            console.warn("Invalid public key!");
            return false;
        }
        if (this.preSharedKey === null) {
            console.warn("Invalid PreShared Key!")
            return false;
        }
        if (this.allowedIPs === null || !(this.allowedIPs instanceof Array) || this.allowedIPs.length <= 0) {
            console.warn("Invalid Allowed IPs!");
            return false;
        }
        return true;
    }

    buildTo(conf) {
        if (!this.validate()) {
            throw new Error(`Failed to validate client '${this.interfaceName}' configuration!`)
        }

        
        conf.beginSection("Peer");
        conf.vari('PublicKey', this.publicKey);
        conf.vari('PresharedKey', this.preSharedKey);
        
        var addrs = [];
        this.allowedIPs.forEach((addressObject) => {
            addrs.push(`${addressObject.address}/${addressObject.subnet}`);
        });
        conf.vari('AllowedIPs', addrs.join(','));
        // for clients
        if (this.persistentKeepAlive !== null) {
            conf.vari("PersistentKeepalive", this.persistentKeepAlive);
        }
        if (this.endpoint !== null) {
            conf.vari("Endpoint", this.endpoint);
        }
        conf.comment(`!!Client = ${this.clientName}`);
        conf.comment("!!End");
        conf.line();

        return conf;
    }

}

class WGInterfaceServerConfig {
    constructor() {
        /**
         * Configurable values:
         */
        // always used
        this.interfaceName = null;
        this.privateKey = null;
        this.addresses = [];
        // client
        this.dns = [];
        this.mtu = null;
        // server
        this.port = null;
        this.PreUp = [];
        this.PostUp = [];
        this.PreDown = [];
        this.PostDown = [];
    }

    addAddress(addr, sub) {
        let addressObj = new WGAddress();
        addressObj.address = addr;
        addressObj.subnet = sub;
        this.addresses.push(addressObj);
        return addressObj;
    }

    validate() {
        if (this.privateKey === null) {
            console.warn("PrivateKey is invalid!");
            return false;
        }
        if (this.addresses === null || !(this.addresses instanceof Array) || this.addresses.length <= 0) {
            console.warn("Addresses are invalid!");
            return false;
        }
        return true;
    }

    /**
     * @param {WGConfigBUilder} conf Build to a parent's configuration builder
     */
    buildTo(conf) {
        if (!this.validate()) {
            throw new Error(`Failed to validate interface '${this.interfaceName}' configuration!`)
        }

        conf.beginSection("Interface");
        conf.vari('PrivateKey', this.privateKey);
        
        var addrs = [];
        this.addresses.forEach((addressObject) => {
            addrs.push(`${addressObject.address}/${addressObject.subnet}`);
        });
        conf.vari('Address', addrs.join(','));
        
        // server
        if (this.port !== null) {
            conf.vari('ListenPort', this.port);
        }
        this.PreUp.forEach((cmd) => {
            if (cmd.trim() == "") { return; }
            conf.vari('PreUp', cmd);
        });
        this.PostUp.forEach((cmd) => {
            if (cmd.trim() == "") { return; }
            conf.vari('PostUp', cmd);
        });
        this.PreDown.forEach((cmd) => {
            if (cmd.trim() == "") { return; }
            conf.vari('PreDown', cmd);
        });
        this.PostDown.forEach((cmd) => {
            if (cmd.trim() == "") { return; }
            conf.vari('PostDown', cmd);
        });

        // client
        if (this.dns !== null && this.dns.length > 0) {
            conf.vari('DNS', this.dns.join(','));
        }
        if (this.mtu !== null) {
            conf.vari('MTU', this.mtu);
        }


        conf.comment(`!!Interface = ${this.interfaceName}`);
        conf.comment("!!End");
        conf.line();

        return conf;
    }
}

class WGInterfaceConfig {

    constructor() {
        this.interface = null;
        this.clients = [];
    }

    build() {
        let builder = new WGConfigBuilder();
        this.interface.buildTo(builder);
        this.clients.forEach((client) => {
            client.buildTo(builder);
        });
        return builder.build();
    }
}

module.exports = {
    WGInterfaceConfig,
    WGAddress,
    WGInterfaceServerConfig,
    WGInterfaceClientConfig
}
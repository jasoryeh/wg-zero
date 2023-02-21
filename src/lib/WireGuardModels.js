const Serializer = require("./Serializer");

const {
    generatePrivateKey,
    generatePublicKey,
    generatePreSharedKey
} = require('./WireGuardUtils');

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

class WGPeer {

    constructor() {
        // metadata
        // client
        this.clientName = null;

        // non-meta
        // global
        this.publicKey = null;
        this.preSharedKey = null;
        this.allowedIPs = [];
        // client
        this.persistentKeepAlive = null;
        this.endpoint = null;
        // server
    }

    buildTo(conf) {
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

class WGInterface {
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

    /**
     * @param {WGConfigBUilder} conf Build to a parent's configuration builder
     */
    buildTo(conf) {
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

class WGServer {
    constructor() {
        this.interfaceName = null;
        this.endpointAddress = null;
        this.listenAddresses = [];
        this.listenPort = null;
        this.privateKey = null;
        this.allowedIPs = [];

        this.PreUp = [];
        this.PostUp = [];
        this.PreDown = [];
        this.PostDown = [];
    }

    async getPublicKey() {
        return await generatePublicKey(this.privateKey);
    }

    addListenAddress(address, subnet) {
        var addrObject = new WGAddress();
        addrObject.address = address;
        addrObject.subnet = subnet;
        this.listenAddresses.push(
            addrObject
        );
        return addrObject;
    }

    addAllowedIP(address, subnet) {
        var addrObject = new WGAddress();
        addrObject.address = address;
        addrObject.subnet = subnet;
        this.allowedIPs.push(
            addrObject
        );
        return addrObject;
    }

    async asInterface() {
        var config = new WGInterface();
        config.interfaceName = this.interfaceName;
        config.privateKey = this.privateKey;
        config.port = this.listenPort;
        config.addresses = [...this.listenAddresses];
        config.PreUp = [...this.PreUp];
        config.PostUp = [...this.PostUp];
        config.PreDown = [...this.PreDown];
        config.PostDown = [...this.PostDown];
        return config;
    }

    async asPeer(preSharedKey) {
        var config = new WGPeer();
        config.clientName = this.interfaceName;
        config.publicKey = await this.getPublicKey();
        config.preSharedKey = this.preSharedKey;
        config.allowedIPs = [...this.allowedIPs];
        config.endpoint = this.endpointAddress;
        // todo: persistent keepalive, and other configurable stuff
        return config;
    }
}

class WGClient {
    constructor() {
        this.id = null;
        this.name = null;
        this.privateKey = null;
        this.preSharedKey = null;
        this.allowedIPs = [];
        this.addresses = [];
        // metadata
        this.settings = {
            enabled: true,
            createdAt: new Date()
        };
        this.stats = {
            latestHandShakeAt: null,
            transferRx: null,
            transferTx: null
        }
    }

    addAddress(address, subnet) {
        var addrObject = new WGAddress();
        addrObject.address = address;
        addrObject.subnet = subnet;
        this.addresses.push(
            addrObject
        );
        return addrObject;
    }

    addAllowedIP(address, subnet) {
        var addrObject = new WGAddress();
        addrObject.address = address;
        addrObject.subnet = subnet;
        this.allowedIPs.push(
            addrObject
        );
        return addrObject;
    }

    async getPublicKey() {
        return await generatePublicKey(this.privateKey);
    }

    async asInterface() {
        var config = new WGInterface();
        config.interfaceName = this.name;
        config.privateKey = this.privateKey;
        config.addresses = [...this.addresses];
        // todo: dns, other configurable stuff
        return config;
    }

    async asPeer() {
        var config = new WGPeer();
        //todo: discard private key after generating and giving to user for security?
        config.publicKey = await this.getPublicKey();
        config.clientName = this.name;
        config.preSharedKey = this.preSharedKey;
        config.allowedIPs = [...this.allowedIPs];
        // todo: configurables
        return config;
    }
}

class WGInterfaceConfig {
    constructor() {
        this.server = null;
        this.clients = [];
    }

    async build() {
        let builder = new WGConfigBuilder();
        (await this.server.asInterface()).buildTo(builder);
        for (let client of this.clients) {
            (await client.asPeer()).buildTo(builder);
        }
        return builder.build();
    }
}

const Converter = new Serializer([WGInterfaceConfig, WGAddress, WGServer, WGClient]);

module.exports = {
    WGInterfaceConfig,
    WGAddress,
    WGInterface,
    WGPeer,
    WGServer,
    WGClient,
    Converter
}
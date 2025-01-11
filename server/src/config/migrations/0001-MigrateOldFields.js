const { WireGuardInterface, WireGuardPeer } = require("../WireGuardModels");

/**
 * @param {WireGuardInterface} Interface 
 * @param {WireGuardPeer[]} Peers 
 */
module.exports.Perform = function (logger, Interface, Peers) {
    for (let peer of Peers) {
        if (peer.iniSection.hasMetadata('privateKey')) {
            logger(`Migrating Peer with old style private key: ${peer.getName()}`);
            let oldPK = peer.iniSection.getOneMetadata('privateKey');
            peer.iniSection.setMetadata('PrivateKey', oldPK.value);
            peer.iniSection.deleteMetadata('privateKey'); // delete old entry
        }
        if (peer.iniSection.hasMetadata('enabled')) {
            logger(`Migrating peer with old style enabled: ${peer.getName()}`);
            let oldEnabled = peer.iniSection.getOneMetadata('enabled');
            if (oldEnabled.value !== 'true' && oldEnabled.value !== 'false') {
                logger(`\t...using true because old enabled value was '${oldEnabled.value}' and not [true|false]`);
                oldEnabled = true;
            } else {
                oldEnabled = oldEnabled.value == 'true';
            }
            peer.iniSection.setMetadata('Enabled', oldEnabled);
            peer.iniSection.deleteMetadata('enabled'); // delete old entry
            peer.enforceEnabled();
        }
    }
}

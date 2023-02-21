const Util = require("./Util")
async function generatePrivateKey() {
    return await Util.exec('wg genkey');
}
  
async function generatePublicKey(privateKey) {
    return await Util.exec(`echo ${privateKey} | wg pubkey`, {
      log: 'echo ***hidden*** | wg pubkey',
    });
}
  
async function generatePreSharedKey() {
    return await Util.exec('wg genpsk');
}

module.exports = {
    generatePrivateKey,
    generatePublicKey,
    generatePreSharedKey
};
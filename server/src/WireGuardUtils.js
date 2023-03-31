const Util = require("./Util")
async function generatePrivateKey(opts = {}) {
    return await Util.exec('wg genkey', opts);
}
  
async function generatePublicKey(privateKey, opts = {}) {
    return await Util.exec(`echo ${privateKey} | wg pubkey`, {
      log: opts.log ?? 'echo ***hidden*** | wg pubkey',
    });
}
  
async function generatePreSharedKey(opts = {}) {
    return await Util.exec('wg genpsk', opts);
}

module.exports = {
    generatePrivateKey,
    generatePublicKey,
    generatePreSharedKey
};
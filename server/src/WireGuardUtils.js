const Util = require("./Util")
function generatePrivateKey(opts = {}) {
    return Util.exec('wg genkey', opts);
}
  
function generatePublicKey(privateKey, opts = {}) {
    return Util.exec(`echo "${privateKey}" | wg pubkey`, {
      log: opts.log ?? 'echo ***hidden*** | wg pubkey',
    });
}
  
function generatePreSharedKey(opts = {}) {
    return Util.exec('wg genpsk', opts);
}

module.exports = {
    generatePrivateKey,
    generatePublicKey,
    generatePreSharedKey
};
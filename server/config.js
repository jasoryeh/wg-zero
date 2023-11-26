'use strict';

const { release } = require('./package.json');

module.exports.RELEASE = release;
module.exports.PORT = process.env.PORT || 51821;
module.exports.PASSWORD = process.env.PASSWORD;
module.exports.WG_WEBUI = process.env.WG_WEBUI || true;

module.exports.WG_INTERFACE = process.env.WG_INTERFACE || "wg0";
module.exports.WG_INTERNET_INTERFACE = process.env.WG_INTERNET_INTERFACE || "eth0"; //todo: autodetect from container
module.exports.WG_PATH = process.env.WG_PATH || '/etc/wireguard/';
module.exports.WG_OVERWRITE_ON_FAIL = process.env.WG_OVERWRITE_ON_FAIL || true;
module.exports.WG_HOST = process.env.WG_HOST || "127.0.0.1";
module.exports.WG_PORT = process.env.WG_PORT || 51820;
module.exports.WG_MTU = process.env.WG_MTU || null;
module.exports.WG_PERSISTENT_KEEPALIVE = process.env.WG_PERSISTENT_KEEPALIVE || 0;
module.exports.WG_ADDRESS_SPACE = process.env.WG_ADDRESS_SPACE || '10.1.3.1/24';
module.exports.WG_DEFAULT_DNS = typeof process.env.WG_DEFAULT_DNS === 'string'
  ? process.env.WG_DEFAULT_DNS
  : '1.1.1.1';
module.exports.WG_ALLOWED_IPS = process.env.WG_ALLOWED_IPS || '0.0.0.0/0, ::/0';

module.exports.WG_PRE_UP = process.env.WG_PRE_UP || '';
module.exports.WG_POST_UP = process.env.WG_POST_UP || `
iptables -I INPUT -p udp --dport ${module.exports.WG_PORT} -j ACCEPT;
iptables -I FORWARD -i ${module.exports.WG_INTERNET_INTERFACE} -o ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -I FORWARD -i ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -t nat -A POSTROUTING -o ${module.exports.WG_INTERNET_INTERFACE} -j MASQUERADE;
`;

module.exports.WG_PRE_DOWN = process.env.WG_PRE_DOWN || '';
module.exports.WG_POST_DOWN = process.env.WG_POST_DOWN || `
iptables -D INPUT -p udp --dport ${module.exports.WG_PORT} -j ACCEPT;
iptables -D FORWARD -i ${module.exports.WG_INTERNET_INTERFACE} -o ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -D FORWARD -i ${module.exports.WG_INTERFACE} -j ACCEPT;
iptables -t nat -D POSTROUTING -o ${module.exports.WG_INTERNET_INTERFACE} -j MASQUERADE;
`;

module.exports.WG_PRE_UP = module.exports.WG_PRE_UP.split('\n').map(each => each.trim());
module.exports.WG_POST_UP = module.exports.WG_POST_UP.split('\n').map(each => each.trim());
module.exports.WG_PRE_DOWN = module.exports.WG_PRE_DOWN.split('\n').map(each => each.trim());
module.exports.WG_POST_DOWN = module.exports.WG_POST_DOWN.split('\n').map(each => each.trim());

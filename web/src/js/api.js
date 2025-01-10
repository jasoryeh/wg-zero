/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

'use strict';


function getEndpoint() {
  let endpoint = new URLSearchParams(window.location.search).get("endpoint");
  return endpoint ?? new URL(location.href).origin;
}

function attachPassword(url, password) {
  var url = new URL(url);
  if (password) {
    url.searchParams.append("key", password);
  }
  return url.toString();
}

class API {
  constructor() {
    this.password = null;
  }

  getEndpoint() {
    return getEndpoint();
  }

  async call({ method, path, body }) {
    let to = attachPassword(`${getEndpoint()}/api${path}`, this.password);
    const res = await fetch(to, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || res.statusText);
    }

    return json;
  }

  async getRelease() {
    return this.call({
      method: 'get',
      path: '/release',
    });
  }

  async getMeta() {
    return this.call({
      method: 'get',
      path: '/meta'
    });
  }

  async tryAuth() {
    return (await this.call({
      method: 'get',
      path: '/auth'
    })).success;
  }

  async getStatus() {
    return (await this.call({
      method: 'get',
      path: '/status'
    }));
  }

  async deleteSession() {
    return this.call({
      method: 'delete',
      path: '/session',
    });
  }

  async getClients() {
    return this.call({
      method: 'get',
      path: '/wireguard/clients',
    });
  }

  async createClient(pub, addrs, psk, prk, persistPK) {
    return this.call({
      method: 'put',
      path: '/wireguard/clients/new',
      body: {
        publicKey: pub,
        addresses: addrs,
        presharedKey: psk,
        privateKey: prk,
        persistPrivateKey: persistPK,
      }
    });
  }

  async deleteClient(publicKey) {
    return this.call({
      method: 'delete',
      path: `/wireguard/clients/${publicKey}/delete`,
      body: {
        publicKey,
      }
    });
  }

  async getStats() {
    return this.call({
      method: 'get',
      path: '/wireguard/stats',
    });
  }

  async get() {
    return this.call({
      method: 'get',
      path: '/wireguard/stats',
    });
  }

  async getServer() {
    return this.call({
      method: 'get',
      path: '/wireguard/server',
    });
  }

  async save() {
    return this.call({
      method: 'get',
      path: '/wireguard/save',
    });
  }

  async reload() {
    return this.call({
      method: 'post',
      path: '/wireguard/reload',
    });
  }

  async up() {
    return this.call({
      method: 'post',
      path: '/wireguard/up',
    });
  }

  async down() {
    return this.call({
      method: 'post',
      path: '/wireguard/down',
    });
  }

  async setup() {
    return this.call({
      method: 'post',
      path: '/wireguard/server/new',
    });
  }

  async setHost(host) {
    return this.call({
      method: 'put',
      path: '/wireguard/server/host',
      body: {
        host: host,
      },
    });
  }

  async updateName(clientRef, name) {
    return this.call({
      method: 'put',
      path: `/wireguard/clients/${clientRef}/name/`,
      body: { name: name },
    });
  }

  async disable(clientRef) {
    return this.call({
      method: 'put',
      path: `/wireguard/clients/${clientRef}/disable`,
      body: { },
    });
  }

  async enable(clientRef) {
    return this.call({
      method: 'put',
      path: `/wireguard/clients/${clientRef}/enable`,
      body: { },
    });
  }

  async generatePrivateKey() {
    return await this.call({
      method: 'post',
      path: '/wireguard/generate/key/private',
    });
  }

  async generatePresharedKey() {
    return await this.call({
      method: 'post',
      path: '/wireguard/generate/key/preshared',
    });
  }

  async generatePublicKey(privateKey) {
    let result = await (this.call({
      method: 'post',
      path: '/wireguard/generate/key/public',
      body: {
        privateKey: privateKey,
      }
    }));
    if (!result.result) {
      throw new Error("Could not generate public key from private!")
    }
    return result;
  }

  async isReadonly() {
    return await this.getStatus().readonly;
  }

}

export default API;
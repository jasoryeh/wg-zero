<script setup>
import Loading from './components/Loading.vue'
import Credits from './components/Credits.vue'
import QRCode from './components/QRCode.vue'
import CreateClient from './components/CreateClient.vue'
import DeleteClient from './components/DeleteClient.vue'
import Update from './components/Update.vue'
import Login from './components/Login.vue'

import API from './js/api.js';

import { Icon } from '@iconify/vue';
import CryptoJS from 'crypto-js';
import { format as timeagoFormat } from 'timeago.js';
import { Buffer } from 'buffer/';
</script>

<template>
  <div v-cloak class="container mx-auto max-w-3xl">
    <div v-if="authenticated === true">
      <!-- Logout button -->
      <span v-if="meta && meta.auth"
        class="text-sm text-gray-400 mb-10 mr-2 mt-3 cursor-pointer hover:underline float-right" @click="logout">
        Logout
        <Icon icon="heroicons:arrow-right-on-rectangle-20-solid" class="h-3 inline" />
      </span>
      <!-- Title and Icon -->
      <h1 class="text-4xl font-medium mt-10 mb-2">
        <img src="/img/logo.png" width="32" class="inline align-middle" />
        <span class="align-middle">WireGuard</span>
      </h1>
      <h2 class="text-sm text-gray-400 mb-10"></h2>

      <!-- Update notification -->
      <Update v-if="latestRelease" :currentRelease="currentRelease" :latestRelease="latestRelease.version" :changelog="latestRelease.changelog" />

      <!-- Server -->
      <div class="shadow-md rounded-lg bg-white overflow-hidden mb-8">
        <!-- Server card header -->
        <div class="flex flex-row flex-auto items-center p-3 px-5 border border-b-2 border-gray-100">
          <div class="flex-grow">
            <p class="text-2xl font-medium">Server</p>
            <p class="text-sm text-gray-500">Server details and controls.</p>
          </div>
          <div class="flex-shrink-0">
            <button @click="serverUp()" v-if="!isServerUp()" 
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="heroicons:play" class="w-4 mr-2" />
              <span class="text-sm">Start</span>
            </button>
            <button @click="serverDown()" v-else
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="heroicons:stop" class="w-4 mr-2" />
              <span class="text-sm">Stop</span>
            </button>
            <button @click="reloadServer()"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="material-symbols:refresh-rounded" class="w-4 mr-2" />
              <span class="text-sm">Reload</span>
            </button>
          </div>
        </div>

        <!-- Server info -->
        <div>
          <!-- Server -->
          <div v-if="server"
            class="relative overflow-hidden border-b border-gray-100 border-solid">

            <!-- Information -->
            <div class="relative p-5 z-10 flex flex-row">
              <!-- Icon -->
              <div class="h-10 w-10 mr-5 rounded-full bg-gray-50 relative">
                <Icon icon="heroicons:server-stack" class="w-6 h-6 m-2 text-gray-300" />
                <div v-if="isServerUp()">
                  <!-- Ping radar animation -->
                  <div class="animate-ping w-4 h-4 p-1 bg-green-100 rounded-full absolute -bottom-1 -right-1"></div>
                  <!-- Active dot -->
                  <div class="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0"></div>
                </div>
                <div v-else>
                  <!-- Active dot -->
                  <div class="w-2 h-2 bg-red-500 rounded-full absolute bottom-0 right-0"></div>
                </div>
              </div>

              <!-- Left side -->
              <div class="flex-grow">
                <!-- Name -->
                <div class="text-gray-700 group" :title="`Interface ${server.Interface}`">
                  <span class="inline-block border-t-2 border-b-2 border-transparent">Server</span>
                </div>

                <!-- Info -->
                <div class="text-gray-400 text-xs">

                  <!-- Address -->
                  <span class="group">
                    <span 
                      class="inline-block border-t-2 border-b-2 border-transparent"
                      v-for="address in server.Address">
                      <Icon icon="heroicons-solid:globe-alt" class="align-middle h-3 inline" />
                      {{`${address}`}}&nbsp;
                    </span>
                  </span>

                  <!-- Interface -->
                  <span :title="`Interface: ${server.Interface}`" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:arrow-right-circle" class="align-middle h-3 inline" />
                    {{server.Interface}}
                  </span>

                  <!-- Port -->
                  <span :title="`Port: ${server.ListenPort}`" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:map-pin" class="align-middle h-3 inline" />
                    {{server.ListenPort}}
                  </span>

                  <br />
                  
                  <!-- Port -->
                  <span :title="`Port: ${server.ListenPort}`" style="cursor: default;">
                    <Icon icon="heroicons-solid:key" class="align-middle h-3 inline" />
                    {{server.PublicKey}}
                  </span>
                </div>
              </div>

              <!-- Right side -->
              <div class="text-right">
                <div class="text-gray-400">
                </div>
              </div>

            </div>

          </div>

          <!-- Loading server still -->
          <div v-if="server === null && isServerConfigured()" class="text-gray-200 p-5">
            <Loading class="" />
          </div>

          <!-- Needs setup -->
          <div v-if="!isServerConfigured()">
            <p class="text-center m-10 text-gray-400 text-sm">
            This server is not set up yet, click initialize to get started.
            <br /><br />
            <button @click="initializeServer()" v-if="!state_settingUp"
              class="bg-red-800 text-white hover:bg-red-700 border-2 border-none py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="heroicons-solid:bolt" class="w-4 mr-2" />
              <span class="text-sm">Initialize</span>
            </button>
            <button v-else
              class="bg-gray-800 text-white hover:bg-gray-700 border-2 border-none py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="heroicons-solid:bolt" class="w-4 mr-2" />
              <span class="text-sm">Initialize</span>
            </button>
            </p>
          </div>
        </div>
      </div>

      <!-- Clients -->
      <div v-if="isServerConfigured()" class="shadow-md rounded-lg bg-white overflow-hidden">
        <!-- Clients card header -->
        <div class="flex flex-row flex-auto items-center p-3 px-5 border border-b-2 border-gray-100">
          <div class="flex-grow">
            <p class="text-2xl font-medium">Clients</p>
            <p class="text-sm text-gray-500">Changes made here do not persist until saved.</p>
          </div>
          <div class="flex-shrink-0">
            <button @click="commitServer()"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="material-symbols:save" class="w-4 mr-2" />
              <span class="text-sm">Save</span>
            </button>
            <button @click="clientCreate = true; clientCreateName = '';"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="material-symbols:add" class="w-4 mr-2" />
              <span class="text-sm">New</span>
            </button>
          </div>
        </div>

        <!-- Clients list -->
        <div>
          <!-- Client if there are any -->
          <div v-if="clients && clients.length > 0" v-for="client in clients" :key="client.PublicKey"
            class="relative overflow-hidden border-b border-gray-100 border-solid">

            <!-- Chart -->
            <div v-if="isServerUp()" class="absolute z-0 bottom-0 left-0 right-0" style="width: 100%; height: 20%;">
              <!-- Bar -->
              <div v-for="(_, index) in client.transferTxHistory" :style="{
                    display: 'inline-flex',
                    alignItems: 'flex-end',
                    width: '2%', // 1/100th of client.transferTxHistory.length
                    height: '100%',
                    boxSizing: 'border-box',
                    fontSize: 0,
                  }">

                <!-- TX -->
                <div :style="{
                    minHeight: '0px',
                    minWidth: '2px',
                    maxWidth: '4px',
                    width: '50%',
                    marginRight: '1px',
                    height: Math.round((client.transferTxHistory[index]/client.transferMax)*100) + '%',
                    background: client.hoverTx
                      ? '#992922'
                      : '#F3F4F6',
                    transition: 'all 0.2s',
                    borderRadius: '2px 2px 0 0',
                  }"></div>

                <!-- RX -->
                <div :style="{
                    minHeight: '0px',
                    minWidth: '2px',
                    maxWidth: '4px',
                    width: '50%',
                    height: Math.round((client.transferRxHistory[index]/client.transferMax)*100) + '%',
                    background: client.hoverRx
                    ? '#992922'
                    : '#F0F1F3',
                    transition: 'all 0.2s',
                    borderRadius: '2px 2px 0 0',
                  }"></div>
              </div>
            </div>

            <!-- Information -->
            <div class="relative p-5 z-10 flex flex-row">
              <!-- Icon -->
              <div class="h-10 w-10 mr-5 rounded-full bg-gray-50 relative">
                <Icon icon="heroicons-solid:user" class="w-6 h-6 m-2 text-gray-300" />
                <!--<img v-if="client._meta.Name && client._meta.Name.includes('@')" :src="`https://www.gravatar.com/avatar/${CryptoJS.MD5(client._meta.Name)}?d=404`" class="w-10 rounded-full absolute top-0 left-0" />-->

                <div>
                  <div v-if="isServerUp() && client.stats.lastHandshake && ((new Date() - new Date(client.stats.lastHandshake) < 1000 * 60 * 10))">
                    <!-- Ping radar animation -->
                    <div class="animate-ping w-4 h-4 p-1 bg-green-100 rounded-full absolute -bottom-1 -right-1"></div>
                    <!-- Active dot -->
                    <div class="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0"></div>
                  </div>
                  <div v-else>
                    <!-- Active dot -->
                    <div class="w-2 h-2 bg-red-500 rounded-full absolute bottom-0 right-0"></div>
                  </div>
                </div>
              </div>

              <!-- Left side -->
              <div class="flex-grow">

                <!-- Name -->
                <div class="text-gray-700 group" :title="`Public Key: ${client.PublicKey}`">

                  <!-- Show -->
                  <input v-show="clientEditNameId === client.Reference" v-model="clientEditName"
                    v-on:keyup.enter="updateClientName(client, clientEditName); clientEditName = null; clientEditNameId = null;"
                    v-on:keyup.escape="clientEditName = null; clientEditNameId = null;"
                    :ref="'client-' + client.Reference + '-name'"
                    class="rounded px-1 border-2 border-gray-100 focus:border-gray-200 outline-none w-30" />
                  <span v-show="clientEditNameId !== client.Reference"
                    class="inline-block border-t-2 border-b-2 border-transparent">{{client.name}}</span>

                  <!-- Edit -->
                  <span v-show="clientEditNameId !== client.Reference"
                    @click="clientEditName = client.name; clientEditNameId = client.Reference;"
                    class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon icon="heroicons:pencil-square" class="h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100" />
                  </span>
                </div>

                <!-- Info -->
                <div class="text-gray-400 text-xs">

                  <!-- Address -->
                  <span class="group">

                    <!-- Show -->
                    <input v-show="clientEditAddressId === client.Reference" v-model="clientEditAddress"
                      v-on:keyup.enter="updateClientAddress(client, clientEditAddress); clientEditAddress = null; clientEditAddressId = null;"
                      v-on:keyup.escape="clientEditAddress = null; clientEditAddressId = null;"
                      :ref="'client-' + client.Reference + '-address'"
                      class="rounded border-2 border-gray-100 focus:border-gray-200 outline-none w-fit text-black" />
                    <span v-show="clientEditAddressId !== client.Reference"
                      class="inline-block border-t-2 border-b-2 border-transparent"
                      v-for="address in client.addresses">{{`${address}`}}&nbsp;</span>

                    <!-- Edit -->
                    <span v-show="clientEditAddressId !== client.Reference"
                      @click="clientEditAddress = client.addresses.join(','); clientEditAddressId = client.Reference; setTimeout(() => $refs['client-' + client.Reference + '-address'][0].select(), 1);"
                      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon icon="heroicons:pencil-square" class="h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100" />
                    </span>
                  </span>

                  <!-- Transfer TX -->
                  <span v-if="isServerUp() && client.stats.tx" :title="'Total Download: ' + bytes(client.stats.tx)"
                    @mouseover="client.hoverTx = clientsPersist[client.PublicKey].hoverTx = true;"
                    @mouseleave="client.hoverTx = clientsPersist[client.PublicKey].hoverTx = false;" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:arrow-down" class="align-middle h-3 inline" />
                    {{bytes(client.transferTxCurrent)}}/s
                  </span>

                  <!-- Transfer RX -->
                  <span v-if="isServerUp() && client.stats.rx" :title="'Total Upload: ' + bytes(client.stats.rx)"
                    @mouseover="client.hoverRx = clientsPersist[client.PublicKey].hoverRx = true;"
                    @mouseleave="client.hoverRx = clientsPersist[client.PublicKey].hoverRx = false;" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:arrow-up" class="align-middle h-3 inline" />
                    {{bytes(client.transferRxCurrent)}}/s
                  </span>

                  <!-- Last seen -->
                  <span v-if="isServerUp() && client.stats.lastHandshake"
                    :title="'Last seen on ' + dateTime(new Date(client.stats.lastHandshake))">
                    · {{timeFormat(new Date(client.stats.lastHandshake))}}
                  </span>
                </div>
              </div>

              <!-- Right side -->
              <div class="text-right">
                <div class="text-gray-400">

                  <!-- Enable/Disable -->
                  <div @click="disableClient(client)" v-if="client.enabled === true" title="Disable Client"
                    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all mx-1">
                    <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white"></div>
                  </div>
                  <div @click="enableClient(client)" v-if="client.enabled === false" title="Enable Client"
                    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-all mx-1">
                    <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
                  </div>

                  <!-- Show QR-->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Show QR Code" @click="qrcode = `${getEndpoint()}/api/wireguard/client/${client.Reference}/qrcode.svg`">
                    <Icon icon="heroicons-outline:qrcode" class="w-5 h-5" />
                  </button>

                  <!-- Download Config -->
                  <a :href="`${getEndpoint()}/api/wireguard/client/${client.Reference}/configuration`" download
                    class="align-middle inline-block bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Download Configuration">
                    <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
                  </a>

                  <!-- Delete -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Delete Client" @click="clientDelete = client">
                    <Icon icon="heroicons:trash" class="w-5 h-5" />
                  </button>
                </div>
              </div>

            </div>

          </div>

          <!-- No Clients -->
          <div v-if="clients && clients.length === 0">
            <p class="text-center m-10 text-gray-400 text-sm">There are no clients yet.<br /><br />
              <button @click="clientCreate = true; clientCreateName = '';"
                class="bg-red-800 text-white hover:bg-red-700 border-2 border-none py-2 px-4 rounded inline-flex items-center transition">
                <Icon icon="material-symbols:add" class="w-4 mr-2" />
                <span class="text-sm">New Client</span>
              </button>
            </p>
          </div>

          <!-- Loading clients still -->
          <div v-if="clients === null" class="text-gray-200 p-5">
            <Loading class="" />
          </div>
        </div>
      </div>

      <!-- QR Code-->
      <QRCode v-if="qrcode" :qrcode="qrcode" @close="qrcode = null" />

      <!-- Create Dialog -->
      <CreateClient v-if="clientCreate" @cancel="clientCreate = null" @submitted="(name) => { newClient(name); clientCreate = null}" />

      <!-- Delete Dialog -->
      <DeleteClient v-if="clientDelete" :name="clientDelete.name" @cancel="clientDelete = null" @confirm="clientDelete = null" />
    </div>

    <!-- Authentication -->
    <Login v-if="authenticated === false" @try="(pass) => { password = pass; login() }" />

    <Loading v-if="authenticated === null" class="pt-24 pb-12" />

  </div>
  <Credits />
</template>

<script>
function bytes(bytes, decimals, kib, maxunit) {
  kib = kib || false;
  if (bytes === 0) return '0 B';
  if (Number.isNaN(parseFloat(bytes)) && !Number.isFinite(bytes)) return 'NaN';
  const k = kib ? 1024 : 1000;
  const dm = decimals != null && !Number.isNaN(decimals) && decimals >= 0 ? decimals : 2;
  const sizes = kib
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB', 'BiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'BB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  if (maxunit !== undefined) {
    const index = sizes.indexOf(maxunit);
    if (index !== -1) i = index;
  }
  // eslint-disable-next-line no-restricted-properties
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default {
  data() {
    return {
      api: null,
      meta: null,
      authenticated: null,
      authenticating: false,
      password: null,
      clients: null,
      clientsPersist: {},
      server: null,

      /* state */
      state_settingUp: false,

      /* unchanged */
      clientDelete: null,
      clientCreate: null,
      clientCreateName: '',
      clientEditName: null,
      clientEditNameId: null,
      clientEditAddress: null,
      clientEditAddressId: null,
      qrcode: null,

      currentRelease: null,
      latestRelease: null,
    }
  },
  methods: {
    bytes,
    setTimeout,
    setInterval,
    log(stuff) {
      console.log(stuff);
    },
    getEndpoint() {
      return this.api.getEndpoint();
    },
    timeFormat(date) {
      return timeagoFormat(date);
    },
    dateTime(value) {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(value);
    },
    isServerConfigured() {
      return !this.meta.needsSetup;
    },
    isServerUp() {
      return this.server && this.server._stats.up;
    },
    async checkForUpdates() {
      const currentRelease = (await this.api.getRelease()).release;
      const latestRelease = await fetch('https://weejewel.github.io/wg-easy/changelog.json')
        .then(res => res.json())
        .then(releases => {
          const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
            version: parseInt(version, 10),
            changelog,
          }));
          releasesArray.sort((a, b) => {
            return b.version - a.version;
          });

          return releasesArray[0];
        });

      console.log(`Current Release: ${currentRelease}`);
      console.log(`Latest Release: ${latestRelease.version}`);

      if (currentRelease >= latestRelease.version) return;

      this.currentRelease = currentRelease;
      this.latestRelease = latestRelease;
    },
    async refresh({ updateCharts = false } = {}) {
      if (!this.authenticated) return;

      // request, and format data
      this.meta = await this.api.getMeta();
      if (!this.isServerConfigured()) {
        return;
      }
      this.server = await this.api.getServer();
      let clients = await this.api.getClients();
      let stats = await this.api.getStats();

      // handle data history
      // stats are only available when the interface is up
      for (let client of clients) {
        let cid = client.PublicKey;
        if (this.isServerUp()) {
          let cstats = stats[cid];
          //console.log(cid, cstats);

          /// initialize client data persistence if we dont have any historical data yet
          if (!this.clientsPersist[cid]) {
            this.clientsPersist[cid] = {};
            // history
            this.clientsPersist[cid].transferRxHistory = Array(50).fill(0);
            this.clientsPersist[cid].transferTxHistory = Array(50).fill(0);
            // last measurement (to find how much changed)
            this.clientsPersist[cid].transferRxPrevious = cstats.rx;
            this.clientsPersist[cid].transferTxPrevious = cstats.tx;
          }

          // Debug
          // client.transferRx = this.clientsPersist[cid].transferRxPrevious + Math.random() * 1000;
          // client.transferTx = this.clientsPersist[cid].transferTxPrevious + Math.random() * 1000;

          // should we be updating the data in the history?
          if (updateCharts) {
            // how much is being transferred currently
            this.clientsPersist[cid].transferRxCurrent = cstats.rx - this.clientsPersist[cid].transferRxPrevious;
            this.clientsPersist[cid].transferTxCurrent = cstats.tx - this.clientsPersist[cid].transferTxPrevious;
            // update last transfer amount
            this.clientsPersist[cid].transferRxPrevious = cstats.rx;
            this.clientsPersist[cid].transferTxPrevious = cstats.tx;
            // store how much transferred over time
            this.clientsPersist[cid].transferRxHistory.push(this.clientsPersist[cid].transferRxCurrent);
            this.clientsPersist[cid].transferTxHistory.push(this.clientsPersist[cid].transferTxCurrent);
            // shift the data so that the graph shifts
            this.clientsPersist[cid].transferRxHistory.shift();
            this.clientsPersist[cid].transferTxHistory.shift();
          }

          // update transfer and receive on client object
          client.transferTxCurrent = this.clientsPersist[cid].transferTxCurrent;
          client.transferRxCurrent = this.clientsPersist[cid].transferRxCurrent;
          // update history on client object
          client.transferTxHistory = this.clientsPersist[cid].transferTxHistory;
          client.transferRxHistory = this.clientsPersist[cid].transferRxHistory;
          // max transfer on client object
          client.transferMax = Math.max(...client.transferTxHistory, ...client.transferRxHistory);
          // hover on client object
          client.hoverTx = this.clientsPersist[cid].hoverTx;
          client.hoverRx = this.clientsPersist[cid].hoverRx;

          client.stats = cstats;
        }

        // until replaced
        client._meta = client._meta ?? {};
        client.Reference = Buffer.from(cid).toString('hex');
        client.name = client._meta.Name || cid;
        client.addresses = client.AllowedIPs;
      }

      // make it available at the end.
      this.clients = clients;
    },
    async login(e) {
      if (e) {
        e.preventDefault();
      }

      if (this.authenticating) return;

      this.authenticating = true;

      console.log("Logging in...");
      this.api.password = this.password;
      try {
        this.authenticated = await this.api.tryAuth();
      } catch(err) {
        console.error("Authentication failed...");
        console.error(err.message || err.toString());
      }
      console.log(`Login: ${this.authenticated}`);
      this.authenticating = false;
      this.password = null;
      return this.refresh();
    },
    logout(e) {
      e.preventDefault();

      this.api.password = null;
      this.authenticated = false;
      this.clients = null;
    },
    async newClient(name) {
      // unimplemented
    },
    async updateClientName(client, name) {
      await this.api.updateName(client.Reference, name);
    },
    async reloadServer() {
      await this.api.reload();
    },
    async commitServer() {
      await this.api.save();
    },
    async serverUp() {
      await this.api.up();
    },
    async serverDown() {
      await this.api.down();
    },
    async initializeServer() {
      this.state_settingUp = true;
      try {
        await this.api.setup();
      } catch(err) {
        console.error("Error while requesting setup...");
        console.error(err);
      } finally {
        setTimeout(() => { this.state_settingUp = false; }, 5000);
      }
    },
  },
  filters: {
    bytes,
    timeFormat: value => {
      return timeagoFormat(value);
    },
  },
  async mounted() {
    this.api = new API();
    window.wg_api = this.api;

    // get session
    this.meta = await this.api.getMeta();
    await this.login();

    // start refreshing
    setInterval(() => {
      this.refresh({
        updateCharts: true,
      }).catch((error) => {
        console.error("Unable to update refresh data!");
        console.error(error);
      });
    }, 1000);
    this.checkForUpdates().then(() => {
      console.log("Updates check done.");
    });
  },
};
</script>

<style scoped>
</style>
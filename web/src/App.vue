<script setup>
import Credits from './components/Credits.vue'
import QRCode from './components/QRCode.vue'
import CreateClient from './components/CreateClient.vue'
import DeleteClient from './components/DeleteClient.vue'
import Loading from './components/Loading.vue'
</script>

<template>
  <div v-cloak class="container mx-auto max-w-3xl">
    <div v-if="authenticated === true">
      <span v-if="this.meta.auth"
        class="text-sm text-gray-400 mb-10 mr-2 mt-3 cursor-pointer hover:underline float-right" @click="logout">
        Logout
        <svg class="h-3 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </span>
      <h1 class="text-4xl font-medium mt-10 mb-2">
        <img src="/img/logo.png" width="32" class="inline align-middle" />
        <span class="align-middle">WireGuard</span>
      </h1>
      <h2 class="text-sm text-gray-400 mb-10"></h2>

      <div v-if="latestRelease" class="bg-red-800 p-4 text-white text-sm font-small mb-10 rounded-md shadow-lg"
        :title="`v${currentRelease} → v${latestRelease.version}`">
        <div class="container mx-auto flex flex-row flex-auto items-center">
          <div class="flex-grow">
            <p class="font-bold">There is an update available!</p>
            <p>{{latestRelease.changelog}}</p>
          </div>

          <a href="https://github.com/WeeJeWel/wg-easy#updating" target="_blank"
            class="p-3 rounded-md bg-white float-right font-sm font-semibold text-red-800 flex-shrink-0 border-2 border-red-800 hover:border-white hover:text-white hover:bg-red-800 transition-all">
            Update →
          </a>
        </div>
      </div>

      <div class="shadow-md rounded-lg bg-white overflow-hidden">
        <div class="flex flex-row flex-auto items-center p-3 px-5 border border-b-2 border-gray-100">
          <div class="flex-grow">
            <p class="text-2xl font-medium">Clients</p>
          </div>
          <div class="flex-shrink-0">
            <button @click="clientCreate = true; clientCreateName = '';"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <svg class="w-4 mr-2" inline xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span class="text-sm">New</span>
            </button>
          </div>
        </div>

        <div>
          <!-- Client -->
          <div v-if="clients && clients.length > 0" v-for="client in clients" :key="client.PublicKey"
            class="relative overflow-hidden border-b border-gray-100 border-solid">

            <!-- Chart -->
            <div class="absolute z-0 bottom-0 left-0 right-0" style="width: 100%; height: 20%;">
              <!-- Bar -->
              <div v-for="(_, index) in client.transferTxHistory" :style="{
                    display: 'inline-flex',
                    alignItems: 'flex-end',
                    width: '2%', // 1/100th of client.transferTxHistory.length
                    height: '100%',
                    padding: '0 3px',
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

            <div class="relative p-5 z-10 flex flex-row">
              <div class="h-10 w-10 mr-5 rounded-full bg-gray-50 relative">
                <svg class="w-6 m-2 text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                  fill="currentColor">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clip-rule="evenodd" />
                </svg>
                <img v-if="client.avatar" :src="client.avatar" class="w-10 rounded-full absolute top-0 left-0" />

                <div
                  v-if="client.stats.lastHandshake && ((new Date() - new Date(client.stats.lastHandshake) < 1000 * 60 * 10))">
                  <div class="animate-ping w-4 h-4 p-1 bg-red-100 rounded-full absolute -bottom-1 -right-1"></div>
                  <div class="w-2 h-2 bg-red-800 rounded-full absolute bottom-0 right-0"></div>
                </div>
              </div>

              <div class="flex-grow">

                <!-- Name -->
                <div class="text-gray-700 group" :title="'Created on <not implemented>' + 'dateTime(new Date(client.settings.createdAt))'">

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
                    @click="clientEditName = client.name; clientEditNameId = client.Reference; setTimeout(() => $refs['client-' + client.Reference + '-name'][0].select(), 1);"
                    class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
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
                      class="rounded border-2 border-gray-100 focus:border-gray-200 outline-none w-20 text-black" />
                    <span v-show="clientEditAddressId !== client.Reference"
                      class="inline-block border-t-2 border-b-2 border-transparent"
                      v-for="address in client.addresses">{{`${address._address}/${address._subnet}`}}&nbsp;</span>

                    <!-- Edit -->
                    <span v-show="clientEditAddressId !== client.Reference"
                      @click="clientEditAddress = client.address; clientEditAddressId = client.Reference; setTimeout(() => $refs['client-' + client.Reference + '-address'][0].select(), 1);"
                      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 inline align-middle opacity-25 hover:opacity-100" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </span>
                  </span>

                  <!-- Transfer TX -->
                  <span v-if="client.stats.tx" :title="'Total Download: ' + bytes(client.stats.tx)"
                    @mouseover="client.hoverTx = clientsPersist[client.PublicKey].hoverTx = true;"
                    @mouseleave="client.hoverTx = clientsPersist[client.PublicKey].hoverTx = false;" style="cursor: default;">
                    ·
                    <svg class="align-middle h-3 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                      fill="currentColor">
                      <path fill-rule="evenodd"
                        d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                    </svg>
                    {{this.bytes(client.transferTxCurrent)}}/s
                  </span>

                  <!-- Transfer RX -->
                  <span v-if="client.stats.rx" :title="'Total Upload: ' + bytes(client.stats.rx)"
                    @mouseover="client.hoverRx = clientsPersist[client.PublicKey].hoverRx = true;"
                    @mouseleave="client.hoverRx = clientsPersist[client.PublicKey].hoverRx = false;" style="cursor: default;">
                    ·
                    <svg class="align-middle h-3 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                      fill="currentColor">
                      <path fill-rule="evenodd"
                        d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                    </svg>
                    {{this.bytes(client.transferRxCurrent)}}/s
                  </span>

                  <!-- Last seen -->
                  <span v-if="client.stats.lastHandshake"
                    :title="'Last seen on ' + dateTime(new Date(client.stats.lastHandshake))">
                    · {{this.timeago(new Date(client.stats.lastHandshake))}}
                  </span>
                </div>
              </div>

              <div class="text-right">
                <div class="text-gray-400">

                  <!-- Enable/Disable -->
                  <div @click="disableClient(client)" v-if="client.enabled === true" title="Disable Client"
                    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all">
                    <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white"></div>
                  </div>
                  <div @click="enableClient(client)" v-if="client.enabled === false" title="Enable Client"
                    class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-all">
                    <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
                  </div>

                  <!-- Show QR-->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition"
                    title="Show QR Code" @click="qrcode = `${this.getEndpoint()}/api/wireguard/client/${client.Reference}/qrcode.svg`">
                    <svg class="w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>

                  <!-- Download Config -->
                  <a :href="`${this.getEndpoint()}/api/wireguard/client/${client.Reference}/configuration`" download
                    class="align-middle inline-block bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition"
                    title="Download Configuration">
                    <svg class="w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>

                  <!-- Delete -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition"
                    title="Delete Client" @click="clientDelete = client">
                    <svg class="w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

            </div>

          </div>
          <div v-if="clients && clients.length === 0">
            <p class="text-center m-10 text-gray-400 text-sm">There are no clients yet.<br /><br />
              <button @click="clientCreate = true; clientCreateName = '';"
                class="bg-red-800 text-white hover:bg-red-700 border-2 border-none py-2 px-4 rounded inline-flex items-center transition">
                <svg class="w-4 mr-2" inline xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span class="text-sm">New Client</span>
              </button>
            </p>
          </div>
          <div v-if="clients === null" class="text-gray-200 p-5">
            <svg class="w-5 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="currentColor">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
          </div>
        </div>
      </div>

      <!-- QR Code-->
      <QRCode v-if="qrcode" :qrcode="qrcode" @close="qrcode = null" />

      <!-- Create Dialog -->
      <CreateClient v-if="clientCreate" @cancel="clientCreate = null" @submitted="(name) => { this.newClient(name); clientCreate = null}" />

      <!-- Delete Dialog -->
      <DeleteClient v-if="clientDelete" :name="clientDelete.name" @cancel="clientDelete = null" @confirm="clientDelete = null" />
    </div>

    <!-- Authentication -->
    <div v-if="authenticated === false">
      <h1 class="text-4xl font-medium my-16 text-gray-700 text-center">WireGuard</h1>

      <form @submit="login" class="shadow rounded-md bg-white mx-auto w-64 p-5 overflow-hidden mt-10">
        <!-- Avatar -->
        <div class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 relative overflow-hidden">
          <svg class="w-10 h-10 m-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
        </div>

        <input type="password" name="password" placeholder="Password" v-model="password"
          class="px-3 py-2 text-sm text-gray-500 mb-5 border-2 border-gray-100 rounded-lg w-full focus:border-red-800 outline-none" />

        <button v-if="authenticating"
          class="bg-red-800 w-full rounded shadow py-2 text-sm text-white cursor-not-allowed">
          <svg class="w-5 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
        </button>
        <input v-if="!authenticating && password" type="submit"
          class="bg-red-800 w-full rounded shadow py-2 text-sm text-white hover:bg-red-700 transition cursor-pointer"
          value="Sign In">
        <input v-if="!authenticating && !password" type="submit"
          class="bg-gray-200 w-full rounded shadow py-2 text-sm text-white cursor-not-allowed" value="Sign In">
      </form>
    </div>

    <Loading v-if="authenticated === null" />

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
    log(stuff) {
      console.log(stuff);
    },
    getEndpoint() {
      return this.api.getEndpoint();
    },
    timeago(date) {
      return timeago().format(date);
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
      let clients = await this.api.getClients();
      let _stats = await this.api.getStats();
      let stats = {};
      for (let clientStat of _stats) {
        stats[clientStat.public] = clientStat;
      }

      // handle data history
      for (let client of clients) {
        let cid = client.PublicKey;
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

        // until replaced
        client.Reference = buffer.Buffer.from(cid).toString('hex');
        client.name = cid;
        client.addresses = [];
        for (let address of client.AllowedIPs) {
          let [_address, _subnet] = address.split("/");
          client.addresses.push({
            _address,
            _subnet,
          })
        }
      }
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
      console.log(`Login: ${this.authenticate}`);
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
  },
  filters: {
    bytes,
    timeago: value => {
      return timeago().format(value);
    },
  },
  async mounted() {
    this.api = new API();

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
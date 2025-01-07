<script setup>
import Loading from './components/Loading.vue'
import Credits from './components/Credits.vue'
import ClientConfigModal from './components/QRCode.vue'
import CreateClient from './components/CreateClient.vue'
import DeleteClient from './components/DeleteClient.vue'
import Update from './components/Update.vue'
import Login from './components/Login.vue'
import ViewClientConfig from './components/ViewClientConfig.vue'

import API from './js/api.js';
import { IP6, IP4, IPPool, ofIPString } from './js/ip.js';

import { Icon } from '@iconify/vue';
import CryptoJS from 'crypto-js';
import { format as timeagoFormat } from 'timeago.js';
import { Buffer } from 'buffer/';
import QRCode from 'qrcode';
</script>

<template>
  <div v-cloak class="container mx-auto max-w-3xl">
    <!-- Alerts -->
    <div class="shadow-md rounded-lg mb-8 mt-8">
      <!-- Server card header -->
      <div :class="['flex flex-row flex-auto items-center p-3 px-5 mb-1', 
                    (alert.color ? 'border-'+alert.color : 'border-red-500'), 
                    (alert.color ? 'bg-'+alert.color : 'bg-red-500'), 
                    (alert.textColor ? 'text-'+alert.textColor : 'text-white'),
                    ((alert.expires && (new Date(alert.expires) > new Date())) ? '' : 'hidden')]" 
                    v-for="alert of alerts.filter((alert) => (alert.expires && (new Date(alert.expires) > new Date())))" :key="alert.__hash">
        <div class="flex-grow">
          <Icon :icon="alert.icon ?? 'heroicons:bell-alert'" class="inline mr-2" />
          <span class="font-medium" v-html="alert.text ?? 'An unknown error has occurred.'"></span>
        </div>
        <div class="flex-shrink p-2" v-on:click="alert.expires = new Date()">
          <span class="mr-1 opacity-20">
            <small v-if="alert.expires">{{ Math.floor((new Date(alert.expires) - new Date()) / 100) / 10 }}</small>
            <small v-else>...</small>
          </span>
          <Icon :icon="'heroicons:trash'" class="inline" />
        </div>
      </div>
    </div>
    <!--end-->

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
      <h2 class="text-sm text-gray-400 mb-10"><!-- Subtitle --></h2>

      <!-- Update notification -->
      <Update v-if="latestRelease" :currentRelease="currentRelease" :latestRelease="latestRelease.version" :changelog="latestRelease.changelog" />

      <!-- Server -->
      <div class="shadow-md rounded-lg bg-white overflow-hidden mb-8">
        <!-- Server card header -->
        <div class="flex flex-row flex-auto items-center p-3 px-5 border border-b-2 border-gray-100">
          <div class="flex-grow">
            <p class="text-2xl font-medium">Server</p>
            <p class="text-sm text-gray-500"><span class="text-[8px] bg-amber-300 p-1 rounded font-light mr-1" v-if="readonly">READ ONLY</span>Server details and controls.</p>
          </div>
          <div class="flex-shrink-0" v-if="isServerConfigured()">
            <button @click="serverUp()" v-if="!isServerUp()" 
              :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="heroicons:play" class="w-4 mr-2" />
              <span class="text-sm">Start</span>
            </button>
            <button @click="serverDown()" v-else
              :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
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
                <div>
                  <div v-if="server && server._meta && server._meta.___unsaved && server._meta.___unsaved === true">
                    <!-- New (server) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-yellow-300 absolute top-0 right-0">NEW</div>
                  </div>
                  <!-- Ping radar animation -->
                  <div v-if="isServerUp()" class="animate-ping w-4 h-4 p-1 bg-green-100 rounded-full absolute -bottom-1 -right-1"></div>
                  <!-- Active dot -->
                  <div v-if="isServerUp()" class="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0"></div>
                  <div v-else>
                    <!-- Active dot -->
                    <div class="w-2 h-2 bg-red-500 rounded-full absolute bottom-0 right-0"></div>
                  </div>
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
                  
                  <!-- Host -->
                  <span :title="`Host: ${server._meta.Host}`" style="cursor: default;">
                    <Icon icon="heroicons-solid:globe-alt" class="align-middle h-3 inline" />
                    {{server._meta.Host}}
                  </span>

                  <!-- Port -->
                  <span :title="`Port: ${server.ListenPort}`" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:map-pin" class="align-middle h-3 inline" />
                    {{server.ListenPort}}
                  </span>

                  <br />

                  <!-- Address -->
                  <span class="group">
                    <span 
                      class="inline-block border-t-2 border-b-2 border-transparent"
                      v-for="address in server.Address">
                      <Icon icon="heroicons-solid:funnel" class="align-middle h-3 inline" />
                      {{`${address}`}}&nbsp;
                    </span>
                  </span>

                  <!-- Interface -->
                  <span :title="`Interface: ${server.Interface}`" style="cursor: default;">
                    ·
                    <Icon icon="heroicons-solid:arrow-right-circle" class="align-middle h-3 inline" />
                    {{server.Interface}}
                  </span>

                  <br />
                  
                  <!-- Public Key -->
                  <span :title="`Public Key: ${server.PublicKey}`" style="cursor: default;">
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
              <span v-if="!readonly">This server is not set up yet, click initialize to get started.</span>
              <span v-else>This server is in Read-Only mode, an existing server may be monitored in this mode, however, the creation of a server is not allowed.</span>
              <br /><br />
              <button @click="initializeServer()" v-if="!state_settingUp"
                :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
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
              :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="material-symbols:save" class="w-4 mr-2" />
              <span class="text-sm">Save</span>
            </button>
            <button @click="clientCreate = true; clientCreateName = '';"
              :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
              class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 border-2 border-gray-100 py-2 px-4 rounded inline-flex items-center transition">
              <Icon icon="material-symbols:add" class="w-4 mr-2" />
              <span class="text-sm">New</span>
            </button>
          </div>
        </div>

        <!-- Clients list -->
        <div class="clients-list">
          <!-- Client if there are any -->
          <div v-if="clients && clients.length > 0" v-for="client in clients" :key="client.PublicKey"
            class="relative overflow-hidden border-b border-gray-100 border-solid" :id="['client-' + btoa(client.PublicKey)]">

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
                  <div v-show="clientsPersist && clientsPersist[client.PublicKey] && clientsPersist[client.PublicKey].isNew">
                    <!-- New (this session) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-blue-300 absolute top-0 right-0">NEW</div>
                  </div>
                  <div v-show="client._meta && client._meta.___unsaved && client._meta.___unsaved === true">
                    <!-- New (in server session) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-yellow-300 absolute top-0 right-0">NEW</div>
                  </div>
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
                    class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null">
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
                      v-for="address in client.addresses">
                      <Icon icon="heroicons-solid:funnel" class="align-middle h-3 inline" />
                      {{`${address}`}}&nbsp;
                    </span>

                    <!-- Edit -->
                    <span v-show="clientEditAddressId !== client.Reference"
                      @click="clientEditAddress = client.addresses.join(','); clientEditAddressId = client.Reference; setTimeout(() => $refs['client-' + client.Reference + '-address'][0].select(), 1);"
                      class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null">
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

                  <!-- Show QR -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Show QR Code" @click="showQR(client)" v-show="clientsPersist[client.PublicKey] && clientsPersist[client.PublicKey].PrivateKey">
                    <Icon icon="heroicons-outline:qrcode" class="w-5 h-5" />
                  </button>

                  <!-- View Config -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Show Client Config" @click="showClientConfig(client)" v-show="clientsPersist[client.PublicKey] && clientsPersist[client.PublicKey].PrivateKey">
                    <Icon icon="heroicons-outline:code-bracket-square" class="w-5 h-5" />
                  </button>

                  <!-- Download Config -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Download Configuration" @click="downloadConfig(client)" v-show="clientsPersist[client.PublicKey] && clientsPersist[client.PublicKey].PrivateKey">
                    <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
                  </button>

                  <!-- Info for no configuration -->
                  <button class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
                    title="Configuration download/viewing is unavailable because the private key was not saved at creation."
                    v-if="!(clientsPersist[client.PublicKey] && clientsPersist[client.PublicKey].PrivateKey)" 
                    @click="alert('Configuration download/viewing is unavailable because the private key was not saved at creation.', 15, 'heroicons:information-circle', 'blue-500')">
                    <Icon icon="heroicons:no-symbol" class="w-5 h-5" />
                  </button>

                  <!-- Delete -->
                  <button 
                    :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
                    class="align-middle bg-gray-100 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
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
      <ClientConfigModal v-if="qrcode" :qrSVG="qrcode" @close="qrcode = null" />

      <!-- Client Configuration Viewer -->
      <ViewClientConfig v-if="viewClientConfig" :config="viewClientConfig" @close="viewClientConfig = null" />

      <!-- Create Dialog -->
      <CreateClient v-if="clientCreate" @cancel="clientCreate = null" @submitted="({name, addresses, privateKey, publicKey, presharedKey, persistPrivateKey }) => { newClient(name, addresses, privateKey, publicKey, presharedKey, persistPrivateKey); clientCreate = null; scrollToClient(publicKey); }" />

      <!-- Delete Dialog -->
      <DeleteClient v-if="clientDelete" :name="clientDelete.name" @cancel="clientDelete = null" @confirm="console.log(clientDelete); deleteClient(clientDelete.PublicKey); clientDelete = null" />
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
      alerts: [
        {
          "color": "red-500",
          "textColor": "white",
          "text": "An alert here.",
          "icon": null,
          "expires": null,
        }
      ],

      /* unchanged */
      clientDelete: null,
      clientCreate: null,
      clientCreateName: '',
      clientEditName: null,
      clientEditNameId: null,
      clientEditAddress: null,
      clientEditAddressId: null,
      qrcode: null,
      viewClientConfig: null,

      currentRelease: null,
      latestRelease: null,

      readonly: null,
    }
  },
  methods: {
    bytes,
    setTimeout,
    setInterval,
    alert(msg, time = 5, icon = null, color = null, textColor = null) {
      let after = new Date();
      after.setSeconds(after.getSeconds() + time);
      var build = {
        color,
        textColor,
        "text": msg,
        icon,
        expires: after,
      };
      this.alerts.push(build);
      console.log(this.alerts);
      return build;
    },
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
      const latestRelease = await fetch('https://raw.githubusercontent.com/jasoryeh/wg-easy/ca4f65287f15bbabce0bf7052d0ceedf401c6795/docs/changelog.json')
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

      // readonly?
      this.readonly = (await this.api.isReadonly()).readonly;

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

        // persistent data
        /// initialize client data persistence if we dont have any historical data yet
        if (!this.clientsPersist[cid]) {
          this.clientsPersist[cid] = {};
        }
        var cpersist = this.clientsPersist[cid];
        
        // in case of saved private keys, repopulate the private key
        if (client._meta.privateKey) {
          cpersist.PrivateKey = client._meta.privateKey;
        }

        if (this.isServerUp()) {
          let cstats = stats[cid];

          if (!cstats) {
            // no stats for client with pubkey cid
            cstats = {
              rx: 0,
              tx: 0,
            };
          }

          // ensure history trackers exist
          cpersist.transferRxHistory = cpersist.transferRxHistory ?? Array(50).fill(0);
          cpersist.transferTxHistory = cpersist.transferTxHistory ?? Array(50).fill(0);
          // last measurement (to find how much changed)
          cpersist.transferRxPrevious = cpersist.transferRxPrevious ?? cstats.rx;
          cpersist.transferTxPrevious = cpersist.transferTxPrevious ?? cstats.tx;

          // should we be updating the data in the history?
          if (updateCharts) {
            // how much is being transferred currently
            cpersist.transferRxCurrent = cstats.rx - cpersist.transferRxPrevious;
            cpersist.transferTxCurrent = cstats.tx - cpersist.transferTxPrevious;
            // update last transfer amount
            cpersist.transferRxPrevious = cstats.rx;
            cpersist.transferTxPrevious = cstats.tx;
            // store how much transferred over time
            cpersist.transferRxHistory.push(cpersist.transferRxCurrent);
            cpersist.transferTxHistory.push(cpersist.transferTxCurrent);
            // shift the data so that the graph shifts
            cpersist.transferRxHistory.shift();
            cpersist.transferTxHistory.shift();
          }

          // update transfer and receive on client object
          client.transferTxCurrent = cpersist.transferTxCurrent;
          client.transferRxCurrent = cpersist.transferRxCurrent;
          // update history on client object
          client.transferTxHistory = cpersist.transferTxHistory;
          client.transferRxHistory = cpersist.transferRxHistory;
          // max transfer on client object
          client.transferMax = Math.max(...client.transferTxHistory, ...client.transferRxHistory);
          // hover on client object
          client.hoverTx = cpersist.hoverTx;
          client.hoverRx = cpersist.hoverRx;

          client.stats = cstats;
        }

        // until replaced
        client._meta = client._meta ?? {};
        client.Reference = Buffer.from(cid).toString('hex');
        client.name = client._meta.Name || cid;
        client.addresses = client.AllowedIPs;
        
        // if private key is saved
        if (client._meta.PrivateKey) {
          client.PrivateKey = client._meta.PrivateKey;
        }
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
        this.alert('Authentication Failed! ' + err.message || err.toString());
      }
      console.log(`Login: ${this.authenticated}`);
      this.alert(this.authenticated ? 'Login Succeeded.' : 'Login Failed.', 5, null, this.authenticated ? 'green-500' : 'red-500', 'white');
      this.authenticating = false;
      this.password = null;
      return this.refresh();
    },
    logout(e) {
      e.preventDefault();

      this.api.password = null;
      this.authenticated = false;
      this.clients = null;
      this.alert('Logged out.', 5, null, 'blue-500');
    },
    async newClient(name, addresses, privateKey, publicKey, presharedKey, persistPrivateKey) {
      try {
        let res = await this.api.createClient(publicKey, addresses, presharedKey, privateKey, persistPrivateKey);
        let client = res.client;
        // todo: if not res.client fail
        // ?? await this.refresh();
        await this.api.updateName(Buffer.from(client.PublicKey).toString('hex'), name);
        if (!this.clientsPersist[publicKey]) {
          this.clientsPersist[publicKey] = {};
        }
        this.clientsPersist[publicKey].isNew = true;
        this.clientsPersist[publicKey].PrivateKey = privateKey;
        this.alert(`Client '${name}'' at <b>${addresses}</b> was created, but <b>not</b> committed. <br />Click 'Save' to commit this client to the server.`, 15, null, 'orange-700');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async updateClientName(client, name) {
      try {
        await this.api.updateName(client.Reference, name);
        this.alert('The client name was updated!', 5, null, 'green-600');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async reloadServer() {
      try {
        await this.api.reload();
        this.alert('The server configuration has been reloaded.', 5, null, 'blue-700');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async commitServer() {
      try {
        await this.api.save();
        this.alert('The settings were saved to the server.', 5, null, 'green-600');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async serverUp() {
      try {
        await this.api.up();
        this.alert('The server was started.', 5, null, 'green-700');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async serverDown() {
      try {
        await this.api.down();
        this.alert('The server was stopped.', 5, null, 'orange-700');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async deleteClient(publicKey) {
      try {
        await this.api.deleteClient(publicKey);
        this.alert(`The client with public key '${publicKey}' was deleted.`, 15, null, 'red-600');
      } catch(err) {
        console.error(err);
        this.alert('An error occurred while processing that request.');
      }
    },
    async initializeServer() {
      this.state_settingUp = true;
      try {
        await this.api.setup();
        this.alert("Server is set up! Please verify your settings and press 'Start' to start it!", 5, null, "green-500");
      } catch(err) {
        console.error("Error while requesting setup...");
        console.error(err);
        this.alert("There was an error setting up your server!");
      } finally {
        setTimeout(() => { this.state_settingUp = false; }, 5000);
      }
    },
    generateClientConfig(privateKey, addresses, server, presharedKey = null) {
      let config = [
        `[Interface]`,
        `PrivateKey = ${privateKey}`,
        `Address = ${addresses.join(',')}`,
        `DNS = 1.1.1.1,1.0.0.1`,
        '',
        `[Peer]`,
        `PublicKey = ${server.PublicKey}`,
        `AllowedIPs = 0.0.0.0/0, ::/0`,
        `Endpoint = ${server._meta.Host}:${server.ListenPort}`,
      ];
      if (presharedKey) {
        config.push(`PresharedKey = ${presharedKey}`);
      }
      return config.join('\n');
    },
    clientConfig(client) {
      if (!this.clientsPersist[client.PublicKey]) {
        throw Error("Client config can only be created when the client was created recently!");
      }
      return this.generateClientConfig(
        this.clientsPersist[client.PublicKey].PrivateKey, 
        client.AllowedIPs, 
        this.server, 
        client.PresharedKey);
    },
    async showQR(client) {
      let config = this.clientConfig(client);
      this.qrcode = await QRCode.toString(config, {type: 'svg', width: 512});
    },
    async showClientConfig(client) {
      this.viewClientConfig = this.clientConfig(client);
    },
    async downloadConfig(client) {
      let blob = new Blob([this.clientConfig(client)], { type: 'text/plain' });
      let dummy = document.createElement('a');
      dummy.href = URL.createObjectURL(blob);
      dummy.download = `${client._meta.Name || client.PublicKey}.conf`;
      document.body.appendChild(dummy);
      dummy.click();
      document.body.removeChild(dummy);
      this.alert(`Downloaded configuration for client '<b>${client._meta.Name || client.PublicKey}</b>'`, 15, null, 'purple-700');
    },
    getNextIPs() {
      let taken = [];
      for (let client of this.clients) {
        for (let addr of client.AllowedIPs) {
          taken.push(addr.split("/")[0]);
        }
      }
      let addrs = [];
      for (let space of this.server.Address) {
        let spaceStartAddress = space.split("/")[0];
        let spaceStart = ofIPString(spaceStartAddress);
        let pool = new IPPool(spaceStart);
        for (let e of taken) {
          pool.add(ofIPString(e));
        }
        let nextAddress = pool.next();
        addrs.push(`${nextAddress.toString()}/${nextAddress.addressType() == 4 ? 32 : 128}`);
      }
      return addrs;
    },
    scrollToClient(pubKey) {
      document.getElementById(`client-${btoa(pubKey)}`).scrollIntoView();
    },
    btoa(t) {
      return window.btoa(t);
    },
  },
  filters: {
    bytes,
    timeFormat: value => {
      return timeagoFormat(value);
    },
  },
  async mounted() {
    // modify alerts
    setInterval(() => { this.alerts.forEach((a) => a.__hash = Math.random()); }, 100);

    this.api = new API();
    window.wg_api = this.api;
    window.wg_api.getNextIPs = this.getNextIPs;

    // get session
    this.meta = await this.api.getMeta();
    await this.login();

    // start refreshing
    let refreshTask = async function() {
      try {
        await this.refresh({
          updateCharts: true,
        })
        setTimeout(async () => {
          await refreshTask();
        }, 1000);
      } catch(error) {
        console.error("Unable to update refresh data!");
        console.error(error);
        setTimeout(async () => {
          await refreshTask();
        }, 5000);
      }
    }.bind(this);
    await refreshTask();
    this.checkForUpdates().then(() => {
      console.log("Updates check done.");
    });
  },
};
</script>

<style scoped>
</style>
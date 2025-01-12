<script setup>
import Loading from './components/Loading.vue'
import Credits from './components/Credits.vue'
import CreateClient from './components/CreateClient.vue'
import DeleteClient from './components/DeleteClient.vue'
import Update from './components/Update.vue'
import Login from './components/Login.vue'

import API from './js/api.js';
import { IP6, IP4, IPPool, ofIPString } from './js/ip.js';

import { Icon } from '@iconify/vue';
import CryptoJS from 'crypto-js';
import { format as timeagoFormat } from 'timeago.js';
import { Buffer } from 'buffer/';
import EditableText from './components/EditableText.vue'
import HeaderButton from './components/HeaderButton.vue'
import EntryButton from './components/EntryButton.vue'
import Toggle from './components/Toggle.vue'
import EntryDetail from './components/EntryDetail.vue'
import TopButton from './components/TopButton.vue'
import Card from './components/Card.vue'
import ClientConfigViewer from './components/ClientConfigViewer.vue'
import ServerCommandViewer from './components/ServerCommandViewer.vue'
</script>

<template>
  <div v-cloak class="container mx-auto max-w-3xl overflow-hidden">
    <!-- Alerts -->
    <div class="alerts rounded-lg mb-8 mt-8">
      <!-- Server card header -->
      <div :class="['flex flex-row flex-auto items-center p-3 px-5 mb-1 rounded-lg shadow-xl', 
                    (alert.color ? 'border-'+alert.color : 'border-red-500'), 
                    (alert.color ? 'bg-'+alert.color : 'bg-red-500'), 
                    (alert.textColor ? 'text-'+alert.textColor : 'text-white'),
                    (alertIsValid(alert) ? '' : 'hidden')]" 
                    v-for="alert of alerts.filter((a) => alertIsValid(a))">
        <div class="flex-shrink pr-2">
          <Icon :icon="alert.icon ?? 'heroicons:bell-alert'" class="inline mr-2" />
        </div>
        <div class="flex-grow">
          <span class="font-medium" v-html="alert.text ?? 'An unknown error has occurred.'"></span>
        </div>
        <div class="flex-shrink mr-1 opacity-20">
          <small v-if="alert.expires" :key="alert.__hash">{{ Math.floor((new Date(alert.expires) - new Date()) / 100) / 10 }}</small>
          <small v-else>...</small>
        </div>
        <div class="flex-shrink px-2" v-on:click="console.log('ae', alert); alert.expires = new Date()">
          <Icon :icon="'heroicons:trash'" class="inline" />
        </div>
      </div>
    </div>
    <!--end-->

    <div v-if="authenticated === true">
      <!-- Logout button -->
      <TopButton v-if="meta && meta.auth" text="Logout" icon="heroicons:arrow-right-on-rectangle-20-solid" @click="logout" />
      <!-- Theme -->
      <TopButton text="Theme" :icon="getTheme() == 'light' ? 'heroicons:sun' : 'heroicons:moon'" @click="toggleTheme" />
      
      <!-- Title and Icon -->
      <h1 class="text-4xl font-medium mt-10 mb-2 dark:text-white">
        <img src="/img/logo.png" width="32" class="inline align-middle" />
        <span class="align-middle">WireGuard</span>
      </h1>
      <h2 class="text-sm text-gray-400 mb-10"><!-- Subtitle --></h2>

      <!-- Update notification -->
      <Update v-if="latestRelease" :currentRelease="currentRelease" :latestRelease="latestRelease.version" :changelog="latestRelease.changelog" />

      <!-- Server -->
      <Card>
        <template v-slot:title>
          Server
        </template>
        <template v-slot:description>
          <span class="text-[8px] bg-amber-300 p-1 rounded font-light mr-1" v-if="readonly">READ ONLY</span>
          <span>Server details and controls.</span>
        </template>
        <template v-slot:buttons>
            <HeaderButton buttonText="Backup" buttonIcon="material-symbols:download" @click="backupServer()" />
            <HeaderButton buttonText="Start" buttonIcon="heroicons:play" :disabled="readonly" @click="serverUp()" v-if="!isServerUp()" />
            <HeaderButton buttonText="Stop" buttonIcon="heroicons:stop" :disabled="readonly" @click="serverDown()" v-else />
            <HeaderButton buttonText="Reload" buttonIcon="material-symbols:refresh-rounded" @click="reloadServer()" />
        </template>
        <template v-slot:body>
          <!-- Server -->
          <div v-if="server"
            class="relative overflow-hidden border-b border-gray-100 dark:border-neutral-700 border-solid">

            <!-- Information -->
            <div class="relative p-5 z-10 flex flex-row">
              <!-- Icon -->
              <div class="h-10 w-10 mr-5 mt-1 rounded-full bg-gray-50 dark:bg-gray-950 relative">
                <Icon icon="heroicons:server-stack" class="w-6 h-6 m-2 text-gray-300 dark:text-gray-100" />
                <div>
                  <div v-if="server && server._meta && server._meta.___unsaved && server._meta.___unsaved === true">
                    <!-- New (server) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-yellow-300 absolute top-0 right-0">NEW</div>
                  </div>
                  <!-- Ping radar animation -->
                  <div v-if="isServerUp()" class="animate-ping w-4 h-4 p-1 bg-green-100 dark:bg-green-900 rounded-full absolute -bottom-1 -right-1"></div>
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
                <div class="text-gray-700 dark:text-gray-200 group" :title="`Interface ${server.metadata.Interface}`">
                  <span class="inline-block border-t-0 border-b-2 border-transparent">Server</span>
                </div>

                <!-- Info -->
                <div class="text-gray-400 dark:text-gray-300 text-xs">
                  
                  <!-- Host -->
                  <EntryDetail :type="'host'" :id="'server'" 
                    icon="heroicons-solid:globe-alt" :text="server.metadata.Host[0]"
                    :editable="true" :readonly="readonly" 
                    :title="`Host: ${server.metadata.Host}`"
                    @modify="(text) => updateHost(text)" />

                  <!-- Port -->
                  <EntryDetail :type="'port'" :id="'server'"
                    icon="heroicons-solid:map-pin" :text="server.entries.ListenPort[0]" 
                    :title="`Port: ${server.entries.ListenPort[0]}`"/>

                  <br />

                  <!-- Address -->
                  <EntryDetail :type="'address'" :id="'server'"
                    icon="heroicons-solid:funnel" :text="server.entries.Address.join(',')" 
                    :title="`Address of Interface: ${server.entries.Address.join(',')}`" />

                  <!-- Interface -->
                  <EntryDetail :type="'interface'" :id="'server'"
                    icon="heroicons-solid:arrow-right-circle" :text="server.metadata.Interface[0]" 
                    :title="`Interface: ${server.metadata.Interface[0]}`" />

                  <br />
                  
                  <!-- Public Key -->
                  <EntryDetail :type="'publickey'" :id="'server'"
                    icon="heroicons-solid:key" :text="server.metadata.PublicKey[0]" 
                    :title="`Server Public Key: ${server.metadata.PublicKey[0]}`" />
                </div>
              </div>

              <!-- Right side -->
              <div class="text-right">
                <div class="text-gray-400 dark:text-gray-200">
                  <EntryButton buttonText="Show Commands" buttonIcon="heroicons:command-line" :disabled="false" @click="showServerCommands = true" />
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
            <p class="text-center m-10 text-gray-400 dark:bg-neutral-800 dark:text-white text-sm">
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
                class="cursor-not-allowed pointer-events-none opacity-25
                     bg-gray-800 text-white hover:bg-gray-700 border-2 border-none py-2 px-4 rounded inline-flex items-center transition">
                <Icon icon="heroicons-solid:arrow-path" class="w-4 mr-2 animate-spin" />
                <span class="text-sm">Initialize</span>
              </button>
            </p>
          </div>
        </template>
      </Card>

      <!-- Clients -->
      <Card v-if="isServerConfigured()">
        <template v-slot:title>
          Clients
        </template>
        <template v-slot:description>
          Changes made here do not persist until saved.
        </template>
        <template v-slot:buttons>
            <HeaderButton buttonText="Save" buttonIcon="material-symbols:save" :disabled="readonly" @click="commitServer()" />
            <HeaderButton buttonText="New" buttonIcon="material-symbols:add" :disabled="readonly" @click="clientCreate = true; clientCreateName = '';" />
        </template>
        <template v-slot:body>
          <!-- Client if there are any -->
          <div v-if="clients && clients.length > 0" v-for="client in clients" :key="client.entries.PublicKey[0]"
            class="relative overflow-hidden border-b border-gray-100 dark:border-neutral-700 border-solid" :id="['client-' + btoa(client.entries.PublicKey[0])]">

            <!-- Chart TX -->
            <div v-if="isServerUp()" class="absolute z-0 top-0 left-0 right-0" style="width: 100%; height: 20%;">
              <!-- TX -->
               <div v-for="(_, index) in client.transferTxHistory" class="relative h-full inline-block" :style="{
                  width: 'calc(1% - 4px)',
                  marginRight: '2px',
                  marginLeft: '2px',
               }">
                <div class="absolute top-0 w-full rounded-b-full"
                    :style="{
                      minHeight: '0px',
                      minWidth: '2px',
                      height: Math.round((client.transferTxHistory[index]/client.transferMaxTx)*100) + '%',
                      background: client.hoverTx
                        ? '#992922'
                        : '#F3F4F6',
                      transition: 'all 0.2s',
                      //borderRadius: '2px 2px 0 0',
                  }"></div>
                </div>
            </div>
            
            <!-- Chart RX -->
            <div v-if="isServerUp()" class="absolute z-0 bottom-0 left-0 right-0" style="width: 100%; height: 20%;">
              <!-- RX -->
               <div v-for="(_, index) in client.transferRxHistory" class="relative h-full inline-block" :style="{
                  width: 'calc(1% - 4px)',
                  marginRight: '2px',
                  marginLeft: '2px',
               }">
                <div class="absolute bottom-0 w-full rounded-t-full"
                    :style="{
                      minHeight: '0px',
                      minWidth: '2px',
                      height: Math.round((client.transferRxHistory[index]/client.transferMaxRx)*100) + '%',
                      background: client.hoverRx
                        ? '#992922'
                        : '#F3F4F6',
                      transition: 'all 0.2s',
                      //borderRadius: '2px 2px 0 0',
                  }"></div>
                </div>
            </div>

            <!-- Information -->
            <div class="relative p-5 z-10 flex flex-row">
              <!-- Icon -->
              <div class="flex-shrink h-10 w-10 mr-5 mt-0 rounded-full bg-gray-50 dark:bg-gray-950 relative">
                <img class="w-full h-full rounded-full absolute top-0 left-0" v-if="client.metadata.Name[0] && client.metadata.Name[0].includes('@')" :src="`https://www.gravatar.com/avatar/${sha256(client.metadata.Name[0])}`" />
                <Icon icon="heroicons-solid:user" class="w-6 h-6 m-2 text-gray-300 dark:text-gray-200" v-else />

                <div>
                  <div v-show="clientsPersist && clientsPersist[client.entries.PublicKey[0]] && clientsPersist[client.entries.PublicKey[0]].isNew">
                    <!-- New (this session) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-blue-300 absolute top-0 right-0">NEW</div>
                  </div>
                  <div v-show="client._meta && client._meta.___unsaved && client._meta.___unsaved === true">
                    <!-- New (in server session) -->
                    <div class="text-[6px] translate-x-1 text-white px-1 rounded-full bg-yellow-300 absolute top-0 right-0">NEW</div>
                  </div>
                  <div v-if="isServerUp() && client.stats && client.stats.lastHandshake && ((new Date() - new Date(client.stats.lastHandshake) < 1000 * 60 * 10))">
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
                <div class="text-gray-700 dark:text-gray-200 group" :title="`Public Key: ${client.entries.PublicKey[0]}`">
                  <EditableText :fieldID="'name-' + client.Reference" :fieldText="client.metadata.Name[0]" :readonly="readonly" @cancel="" @submit="({_, text}) => updateClientName(client, text)" />
                </div>

                <!-- Info -->
                <div class="text-gray-400 dark:text-gray-300 text-xs">

                  <!-- Address -->
                  <EntryDetail type="address" :id="client.Reference" 
                    icon="heroicons-solid:funnel" :text="client.entries.AllowedIPs.join(',')"
                    :editable="true" :readonly="readonly" 
                    :title="`Client Addresses: ${client.entries.AllowedIPs.join(',')}`"
                    @modify="(text) => updateClientAddress(client, text)" />

                  <!-- Transfer TX -->
                  <EntryDetail type="statstx" :id="client.Reference" 
                    icon="heroicons-solid:arrow-down" :text="bytes(client.transferTxCurrent) + '/s'"
                    @mouseover="client.hoverTx = clientsPersist[client.entries.PublicKey[0]].hoverTx = true;"
                    @mouseleave="client.hoverTx = clientsPersist[client.entries.PublicKey[0]].hoverTx = false;"
                    :title="`Transfer TX: ${client.stats.tx}`"
                    v-if="isServerUp() && client.stats && client.stats.tx"/>

                  <!-- Transfer RX -->
                  <EntryDetail type="statsrx" :id="client.Reference" 
                    icon="heroicons-solid:arrow-up" :text="bytes(client.transferRxCurrent) + '/s'"
                    @mouseover="client.hoverRx = clientsPersist[client.entries.PublicKey[0]].hoverRx = true;"
                    @mouseleave="client.hoverRx = clientsPersist[client.entries.PublicKey[0]].hoverRx = false;"
                    :title="`Transfer RX: ${client.stats.rx}`"
                    v-if="isServerUp() && client.stats && client.stats.rx"/>

                  <!-- Last Handshake -->
                  <EntryDetail type="seen" :id="client.Reference" 
                    icon="heroicons-solid:clock" :text="timeFormat(new Date(client.stats.lastHandshake))"
                    :title="'Last Handshake ' + dateTime(new Date(client.stats.lastHandshake))"
                    v-if="isServerUp() && client.stats && client.stats.lastHandshake"/>

                  <br />

                  <span class="inline-block border-t-2 border-b-2 border-transparent">
                    <Icon icon="heroicons-solid:key" class="align-middle h-3 inline" />
                    {{ client.entries.PublicKey[0] }}&nbsp;
                  </span>
                </div>
              </div>

              <!-- Right side -->
              <div class="flex-grow text-right min-w-fit">
                <div class="text-gray-400">
                  <!-- Enable/Disable -->
                  <Toggle :switchStatus="client.metadata.Enabled[0] == 'true'" switchName="Client" :disabled="readonly" @toggle_off="disableClient(client)" @toggle_on="enableClient(client)" />

                  <!-- Delete -->
                  <EntryButton buttonText="Delete Client" buttonIcon="heroicons:trash" :disabled="readonly" @click="clientDelete = client" />
                  
                  <div class="mb-1"></div>
                  
                  <!-- Show QR -->
                  <EntryButton buttonText="Show QR Code" buttonIcon="heroicons-outline:qrcode" :disabled="false" @click="clientToConfigTab = 1; clientToConfig = client;" v-show="clientHasPrivateKey(client)" />
                  
                  <!-- View Config -->
                  <EntryButton buttonText="Show Client Configuration" buttonIcon="heroicons-outline:code-bracket-square" :disabled="false" @click="clientToConfigTab = 0; clientToConfig = client;" v-show="clientHasPrivateKey(client)" />
                  
                  <!-- Download Config -->
                  <EntryButton buttonText="Download Client Configuration" buttonIcon="heroicons:arrow-down-tray" :disabled="false" @click="clientToConfigTab = 2; clientToConfig = client;" v-show="clientHasPrivateKey(client)" />
                  
                  <!-- Info for no configuration -->
                  <EntryButton buttonText="Configuration download/viewing is unavailable because the private key was not saved at creation." buttonIcon="heroicons:no-symbol" :disabled="false" @click="alert('Configuration download/viewing is unavailable because the private key was not saved at creation.', 15, 'heroicons:information-circle', 'blue-500')" v-show="!clientHasPrivateKey(client)" />
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
        </template>
      </Card>

      <!-- Create Dialog -->
      <ServerCommandViewer v-if="showServerCommands" @cancel="showServerCommands = false" :PreUp="server.entries.PreUp" :PostUp="server.entries.PostUp" :PreDown="server.entries.PreDown" :PostDown="server.entries.PostDown" />

      <!-- Create Dialog -->
      <CreateClient v-if="clientCreate" @cancel="clientCreate = null" @submitted="({name, addresses, privateKey, publicKey, presharedKey, persistPrivateKey }) => { newClient(name, addresses, privateKey, publicKey, presharedKey, persistPrivateKey); clientCreate = null; scrollToClient(publicKey); }" />

      <!-- Delete Dialog -->
      <DeleteClient v-if="clientDelete" :name="clientDelete.metadata.Name[0]" @cancel="clientDelete = null" @confirm="console.log(clientDelete); deleteClient(clientDelete.entries.PublicKey); clientDelete = null" />

      <!-- Client Configuration Editor and Viewer -->
      <ClientConfigViewer v-if="clientToConfig" @close="clientToConfig = null;" :client="clientToConfig" :server="server" :alert="alert" :tab="clientToConfigTab" :defaults="clientDefaults" />
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
        /*{
          "color": "red-500",
          "textColor": "white",
          "text": "An alert here. Lots of messages blah blah blah.<br />Test<br/><pre>asdfasdf lorem ipsum somethin  somethias jsadjfsidfja j aos jo ijoii iijaosdfjoasdfjoasdjfdsiojjaj  jas ijdoifjsojoo jeiorj2r32j039r0 089 j*((JJ()))</pre>",
          "icon": null,
          "expires": (function() { let n = new Date(); n.setSeconds(n.getSeconds() + 9999); return n; })(),
        }*/
      ],

      /* unchanged */
      clientDelete: null,
      clientCreate: null,
      clientCreateName: '',
      viewClientConfig: null,
      clientToConfig: null,
      clientToConfigTab: null,
      clientDefaults: null,
      showServerCommands: false,

      currentRelease: null,
      latestRelease: null,

      readonly: null,
      status: null,
    }
  },
  methods: {
    bytes,
    setTimeout,
    setInterval,
    alertIsValid(alert) {
      return (alert.expires == null) || (new Date(alert.expires) > new Date())
    },
    alertError(msg, err, ...args) {
        console.error("AlertError: " + msg + ":");
        console.error(err);
      return this.alert(msg + ": <br/><pre class=\"text-xs\">" + err + "</pre>", ...args);
    },
    alert(msg, time = 5, icon = null, color = null, textColor = null) {
      var after = new Date();
      if (time == null) {
        after = null;
      } else {
        after.setSeconds(after.getSeconds() + time);
      }
      var build = {
        color,
        textColor,
        text: msg,
        icon,
        expires: after,
      };
      this.alerts.push(build);
      return build;
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
      const latestRelease = await fetch('https://raw.githubusercontent.com/jasoryeh/wg-zero/ca4f65287f15bbabce0bf7052d0ceedf401c6795/docs/changelog.json')
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
    async refresh_total() {
      await this.refresh_infrequent();
      await this._refresh();
    },
    async refresh_infrequent() {
      if (!this.authenticated) return;
      try {
        this.meta = await this.api.getMeta();

        // readonly?
        await this.checkStatus();

        this.clientDefaults = await this.api.getDefaults();

        let server = await this.api.getServer();
        let clients = await this.api.getClients();
        for (let client of clients) {
          let cid = client.entries.PublicKey[0];

          // persistent data
          /// initialize client data persistence if we dont have any historical data yet
          if (!this.clientsPersist[cid]) {
            this.clientsPersist[cid] = {};
          }
          var cpersist = this.clientsPersist[cid];
          
          // in case of saved private keys, repopulate the private key
          if (client.metadata.PrivateKey) {
            cpersist.PrivateKey = client.metadata.PrivateKey[0];
          }

          // until replaced
          client._meta = client._meta ?? {}; // for ui metadata
          client.Reference = Buffer.from(cid).toString('hex');
          client.name = client.metadata.Name[0] || cid;
          client.addresses = client.entries.AllowedIPs;
          
          // if private key is saved
          if (client.metadata.PrivateKey) {
            client.PrivateKey = client.metadata.PrivateKey[0];
          }
        }
        this.clients = clients;
        this.server = server;
      } catch(err) {
        this.alertError("An error occurred while refreshing metadata", err, 1);
      }
    },
    async refresh(...args) {
      try {
        return await this._refresh(...args);
      } catch(err) {
        this.alertError("An error occurred while refreshing", err, 1);
      }
    },
    async _refresh({ updateCharts = false } = {}) {
      if (!this.authenticated) return;

      // request, and format data
      if (!this.isServerConfigured()) {
        return;
      }
      if (!this.clients) {
        return;
      }
      let stats = await this.api.getStats();

      // handle data history
      // stats are only available when the interface is up
      for (let client of this.clients) {
        let cid = client.entries.PublicKey[0];

        // persistent data
        /// initialize client data persistence if we dont have any historical data yet
        if (!this.clientsPersist[cid]) {
          this.clientsPersist[cid] = {};
        }
        var cpersist = this.clientsPersist[cid];

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
          cpersist.transferRxHistory = cpersist.transferRxHistory ?? Array(100).fill(0);
          cpersist.transferTxHistory = cpersist.transferTxHistory ?? Array(100).fill(0);
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
          client.transferMaxTx = Math.max(...client.transferTxHistory);
          client.transferMaxRx = Math.max(...client.transferRxHistory);
          // hover on client object
          client.hoverTx = cpersist.hoverTx;
          client.hoverRx = cpersist.hoverRx;

          client.stats = cstats;
        }
      }
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
        this.alertError("Authentication Failed!", err);
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
        let client = res;
        client.Reference = Buffer.from(client.entries.PublicKey[0]).toString('hex');

        await this.api.updateName(client.Reference, name);
        if (!this.clientsPersist[publicKey]) {
          this.clientsPersist[publicKey] = {};
        }
        this.clientsPersist[publicKey].isNew = true;
        this.clientsPersist[publicKey].PrivateKey = privateKey;
        this.alert(`Client '${name}'' at <b>${addresses}</b> was created, but <b>not</b> committed. <br />Click 'Save' to commit this client to the server.`, 15, null, 'orange-700');
      } catch(err) {
        this.alertError("An error occurred while creating the new client", err);
      }
    },
    async updateHost(text) {
      console.log('updatehost', text);
      try {
        await this.api.setHost(text);
        this.alert('The server host was updated to \'' + text + '\'!', 5, null, 'green-600');
      } catch(err) {
        this.alertError("An error occurred while updating the server host", err);
      }
    },
    async updateClientAddress() {
      this.alert("Address updates are not yet supported.", 5, null, "yellow-400");
    },
    async updateClientName(client, name) {
      try {
        console.log(client);
        console.log(JSON.stringify(client, null, 4));
        client.metadata.Name = [name];
        await this.api.updateName(client.Reference, name);
        this.alert('The client name was updated to \'' + name + '\'!', 5, null, 'green-600');
      } catch(err) {
        this.alertError("An error occurred while updating the client name", err);
      }
    },
    async reloadServer() {
      try {
        await this.api.reload();
        this.alert('The server configuration has been reloaded.', 5, null, 'blue-700');
      } catch(err) {
        this.alertError("An error occurred while reloading settings", err);
      }
    },
    async commitServer() {
      try {
        await this.api.save();
        this.alert('The settings were saved to the server.', 5, null, 'green-600');
      } catch(err) {
        this.alertError("An error occurred while saving the server changes", err);
      }
    },
    async backupServer() {
      try {
        let server = this.server;
        let blob = new Blob([await this.api.getServerBackup()], { type: 'text/plain' });
        let dummy = document.createElement('a');
        dummy.href = URL.createObjectURL(blob);
        dummy.download = `${server.metadata.Host[0] || server.metadata.Interface[0]}.conf`;
        document.body.appendChild(dummy);
        dummy.click();
        document.body.removeChild(dummy);
        this.alert(`Downloaded configuration for server '<b>${server.metadata.Host[0] || server.metadata.Interface[0]}</b>'`, 15, null, 'purple-700');
      } catch(err) {
        this.alertError("Cannot download a WireGuard backup!", err);
      }
    },
    async serverUp() {
      try {
        await this.api.up();
        this.alert('The server was started.', 5, null, 'green-700');
      } catch(err) {
        this.alertError("An error occurred while creating starting the server", err);
      }
    },
    async serverDown() {
      try {
        await this.api.down();
        this.alert('The server was stopped.', 5, null, 'orange-700');
      } catch(err) {
        this.alertError("An error occurred while stopping the server", err);
      }
    },
    async deleteClient(publicKey) {
      try {
        await this.api.deleteClient(publicKey);
        this.alert(`The client with public key '${publicKey}' was deleted.`, 15, null, 'red-600');
      } catch(err) {
        this.alertError("An error occurred while deleting the client '" + publicKey + "''", err);
      }
    },
    async disableClient(client) {
      try {
        await this.api.disable(client.Reference);
        client.metadata.Enabled = ['false'];
        this.alert("Disabled Peer '" + client.metadata.Name[0] + "''", 5, null, "blue-400");
      } catch(err) {
        this.alertError("An error occurred while disabling the client '" + client.entries.PublicKey[0] + "''", err);
      }
    },
    async enableClient(client) {
      try {
        await this.api.enable(client.Reference);
        client.metadata.Enabled = ['true'];
        this.alert("Enabled Peer '" + client.metadata.Name[0] + "''", 5, null, "blue-400");
      } catch(err) {
        this.alertError("An error occurred while enabling the client '" + client.entries.PublicKey[0] + "''", err);
      }
    },
    async initializeServer() {
      this.state_settingUp = true;
      try {
        await this.api.setup();
        this.alert("Server is set up! Please verify your settings and press 'Start' to start it!", 5, null, "green-500");
      } catch(err) {
        this.alertError("An error occurred while setting up the server!", err, 15);
      } finally {
        setTimeout(() => { this.state_settingUp = false; }, 1000);
      }
    },
    getNextIPs() {
      let taken = [];
      for (let client of this.clients) {
        for (let addr of client.entries.AllowedIPs) {
          taken.push(addr.split("/")[0]);
        }
      }
      let addrs = [];
      for (let space of this.server.entries.Address) {
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
      var client = document.getElementById(`client-${btoa(pubKey)}`);
      if (client) client.scrollIntoView();
    },
    btoa(t) {
      return window.btoa(t);
    },
    sha256(msg) {
      return CryptoJS.SHA256(msg);
    },
    async checkStatus(time = 1) {
      this.status = await this.api.getStatus();
      if (!this.status.wg) {
        this.alert("We could not detect a WireGuard installation on this system!<br />" 
          + "<small>Please verify that WireGuard is installed correctly and that the 'wg' command is available on the system!</small>", time, null, "yellow-500")
      }
      this.readonly = this.status.readonly;
    },
    initAPI() {
      this.api = new API();
      window.wg_api = this.api;
      window.wg_api.getNextIPs = this.getNextIPs;
    },
    async initAndLogin() {
      this.meta = await this.api.getMeta();
      await this.login();
    },
    getTheme() {
      return window.getTheme();
    },
    toggleTheme() {
      return window.toggleTheme();
    },
    clientHasPrivateKey(c) {
      return this.clientsPersist[c.entries.PublicKey[0]] && this.clientsPersist[c.entries.PublicKey[0]].PrivateKey;
    }
  },
  filters: {
    bytes,
    timeFormat: value => {
      return timeagoFormat(value);
    },
  },
  async mounted() {
    // modify alerts so vue rerenders them
    setInterval(() => { 
      this.alerts.filter((alert) => this.alertIsValid(alert)).forEach((a) => a.__hash = Math.random());
    }, 100);
    // trim alerts
    setInterval(() => {
      this.alerts = this.alerts.filter((alert) => this.alertIsValid(alert));
    }, 5000);

    // get session
    await new Promise(async function(resolve, reject) {
      (async function init() {
        try {
          await this.initAPI();
          await this.checkStatus(5);
          await this.initAndLogin();
          resolve();
        } catch(err) {
          this.alertError("An error occurred while connecting to the backend service. Did the service start correctly?", err, 5);
          console.warn("Continuing to retry later...");
          setTimeout(init.bind(this), 5000);
        }
      }.bind(this))();
    }.bind(this));


    // start refreshing
    await (async function _refresh_task_infrequent() {
      await this.refresh_infrequent();
      setTimeout(_refresh_task_infrequent.bind(this), 30 * 1000);
    }.bind(this))();
    await (async function _refresh_task() {
      await this.refresh({
        updateCharts: true,
      });
      setTimeout(_refresh_task.bind(this), 1000);
    }.bind(this))();

    this.checkForUpdates().then(() => {
      console.log("Updates check done.");
    });
  },
};
</script>

<style scoped>
.alerts {
  /* Width of the scrollbar */
  ::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }

  /* Track of the scrollbar */
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  /* Handle of the scrollbar */
  ::-webkit-scrollbar-thumb {
    background: #888;
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

}
</style>

<style>
pre {
  white-space: pre-wrap;       /* Since CSS 2.1 */
  white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
  white-space: -pre-wrap;      /* Opera 4-6 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
}
</style>

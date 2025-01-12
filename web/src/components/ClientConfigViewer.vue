<script setup>
import { Icon } from '@iconify/vue';
import QRCode from 'qrcode';
import Toggle from './Toggle.vue';
import Modal from './Modal.vue';
</script>

<template>
    <Modal>
        <div class="dark:text-neutral-200 p-8">
            <div>
                <h3 class="text-lg font-bold">Client Configuration</h3>
                <p>Download or configure additional settings for the client <pre class="inline">{{ client.metadata.Name[0] }}</pre>.</p>
            </div>
            <div>
                <div class="w-full">
                    <div class="w-full my-2">
                        <!-- Configuration -->
                        <div id="wg-file" class="overflow-hidden relative" :class="viewerIndex == 0 ? 'h-auto' : 'h-0'">
                            <pre class="text-black dark:text-white bg-neutral-100 dark:bg-black p-8 rounded-md" v-html="config"></pre>
                            <button @click="copy()" class="absolute right-4 bottom-4 text-gray-600 hover:text-gray-800">
                                <Icon icon="heroicons:clipboard" class="w-8 h-8" />
                            </button>
                            <textarea id="wg-file-text" v-html="config" style="display: none;" class="background-color: black; color: white;"></textarea>
                        </div>
                        <!-- QR Code -->
                        <div class="overflow-hidden bg-neutral-100 dark:bg-neutral-900 rounded-md " :class="viewerIndex == 1 ? 'h-auto py-2' : 'h-0'">
                            <div class="dark:invert rounded-md w-[50vh] h-[50vh] m-auto" v-html="qr"></div>
                        </div>
                        <!-- Download -->
                        <div class="overflow-hidden" :class="viewerIndex == 2 ? 'h-auto' : 'h-0'">
                            <div class="text-center py-24 bg-neutral-100 dark:bg-neutral-900 p-8 rounded-md">
                                <a @click="download()" class="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer">
                                    <Icon icon="heroicons:arrow-down-tray" class="inline mr-2"></Icon>
                                    <span>Download WireGuard Configuration for Peer {{ client.metadata.Name[0] }}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                    <!-- Selector -->
                    <div class="w-full my-2">
                        <div class="color-white dark:color-black bg-neutral-100 dark:bg-neutral-700 p-1 w-fit m-auto rounded-md cursor-pointer">
                            <div class="inline-block rounded-md px-2 py-1 mx-1 hover:bg-neutral-50 hover:dark:bg-neutral-500" :class="viewerIndex == 0 ? 'bg-neutral-200 dark:bg-neutral-600' : null" @click="viewerIndex = 0">Configuration</div>
                            <div class="inline-block rounded-md px-2 py-1 mx-1 hover:bg-neutral-50 hover:dark:bg-neutral-500" :class="viewerIndex == 1 ? 'bg-neutral-200 dark:bg-neutral-600' : null" @click="viewerIndex = 1">QR Code</div>
                            <div class="inline-block rounded-md px-2 py-1 mx-1 hover:bg-neutral-50 hover:dark:bg-neutral-500" :class="viewerIndex == 2 ? 'bg-neutral-200 dark:bg-neutral-600' : null" @click="viewerIndex = 2">Download</div>
                        </div>
                    </div>
                </div>
                <div class="text-black dark:text-white bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-md">
                    <div class="mt-4">
                        <div class="flex">
                            <div class="h-full mr-2">
                                <Toggle :switchStatus="true" switchName="ips" @toggle="(_) => {}" :disabled="true" class="m-auto"/>
                            </div>
                            <div>
                                <p class="font-bold text-md">Allowed IPs</p>
                                <p class="text-sm">The IPs that will be tunneled through the VPN.</p>
                                <p class="text-neutral-600 font-extralight text-xs">Default: <pre class="inline">{{ defaults.AllowedIPs }}</pre></p>
                                <p class="text-neutral-600 font-extralight text-xs">All Traffic: <pre class="inline">0.0.0.0/0, ::/0</pre></p>
                                <input type="text" class="mt-2 text-black dark:text-white bg-white dark:bg-black w-fit px-4 py-2" v-model="allowedIPs"/>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="flex">
                            <div class="h-full mr-2">
                                <Toggle :switchStatus="dns[0]" switchName="dns" @toggle="(val) => dns[0] = val" class="m-auto"/>
                            </div>
                            <div>
                                <p class="font-bold text-md">DNS</p>
                                <p class="text-sm">The DNS resolution servers this client should use.</p>
                                <p class="text-neutral-600 font-extralight text-xs">Default: <pre class="inline">{{ defaults.DNS }}</pre></p>
                                <input v-if="dns[0]" type="text" class="mt-2 text-black dark:text-white bg-white dark:bg-black w-fit px-4 py-2" v-model="dns[1]"/>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="flex">
                            <div class="h-full mr-2">
                                <Toggle :switchStatus="persistentKeepalive[0]" switchName="pka" @toggle="(val) => persistentKeepalive[0] = val" class="m-auto"/>
                            </div>
                            <div>
                                <p class="font-bold text-md">Persistent Keepalive</p>
                                <p class="text-sm">Should the client ping the server every <b>n</b> seconds? Useful for clients that must be accessible.</p>
                                <p class="text-neutral-600 font-extralight text-xs">Default: <pre class="inline">{{ defaults.PersistentKeepalive }}</pre></p>
                                <input v-if="persistentKeepalive[0]" type="text" class="mt-2 text-black dark:text-white bg-white dark:bg-black w-fit px-4 py-2" v-model="persistentKeepalive[1]"/>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="flex">
                            <div class="h-full mr-2">
                                <Toggle :switchStatus="mtu[0]" switchName="pka" @toggle="(val) => mtu[0] = val" class="m-auto"/>
                            </div>
                            <div>
                                <p class="font-bold text-md">MTU</p>
                                <p class="text-sm">The maximum transmission unit.</p>
                                <p class="text-neutral-600 font-extralight text-xs">Default: <pre class="inline">{{ defaults.MTU }}</pre></p>
                                <input v-if="mtu[0]" type="text" class="mt-2 text-black dark:text-white bg-white dark:bg-black w-fit px-4 py-2" v-model="mtu[1]"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Modal>
</template>


<script>
export default {
    data() {
        return {
            viewerIndex: 0,
            config: null,
            qr: null,
            // configurable
            dns: [true, '1.1.1.1,1.0.0.1'],
            persistentKeepalive: [false, 25],
            mtu: [false, 25],
            allowedIPs: '0.0.0.0/0, ::/0',
        }
    },
    methods: {
        async generateQRSVG() {
            this.qr = await QRCode.toString(this.config, {type: 'svg'});
            return this.qr;
        },
        async generateConfig() {
            let configInterface = [
                `[Interface]`,
                `PrivateKey = ${this.client.metadata.PrivateKey[0]}`,
                `Address = ${this.client.entries.AllowedIPs.join(',')}`,
            ];
            let configPeer = [
                `[Peer]`,
                `PublicKey = ${this.server.metadata.PublicKey[0]}`,
                `AllowedIPs = ${this.allowedIPs}`,
                `Endpoint = ${this.server.metadata.Host[0]}:${this.server.entries.ListenPort[0]}`,
            ];

            if (this.dns[0]) {
                configInterface.push(`DNS = ${this.dns[1]}`);
            }
            if (this.client.entries.PresharedKey && this.client.entries.PresharedKey[0]) {
                configPeer.push(`PresharedKey = ${this.client.entries.PresharedKey}`);
            }
            if (this.persistentKeepalive[0]) {
                configPeer.push(`PersistentKeepalive = ${this.persistentKeepalive[1]}`);
            }
            if (this.mtu[0]) {
                configInterface.push(`MTU = ${this.mtu[1]}`)
            }

            this.config = [...configInterface, '', ...configPeer].join('\n');
            return this.config;
        },
        download() {
            let blob = new Blob([this.config], { type: 'text/plain' });
            let dummy = document.createElement('a');
            dummy.href = URL.createObjectURL(blob);
            dummy.download = `${this.client.metadata.Name[0] || this.client.entries.PublicKey[0]}.conf`;
            document.body.appendChild(dummy);
            dummy.click();
            document.body.removeChild(dummy);
            this.alert(`Downloaded configuration for client '<b>${this.client.metadata.Name[0] || this.client.entries.PublicKey[0]}</b>'`, 15, null, 'purple-700');
        },
        copy() {
            let configElement = document.getElementById('wg-file-text');
            configElement.style.display = 'block';
            configElement.focus();
            configElement.select();
            configElement.setSelectionRange(0, this.config.length * 2);
            document.execCommand('copy');
            configElement.style.display = 'none';

            // Alert the copied text
            console.log("Copied the text: \n" + this.config);
            this.alert(`Copied client <b>${this.client.metadata.Name[0]}</b>'s configuration to the clipboard!`, 5, null, 'blue-500')
        },
    },
    props: {
        client: Object,
        server: Object,
        alert: Function,
        tab: Number,
        defaults: Object,
    },
    async mounted() {
        setTimeout((async function update() {
            await this.generateConfig();
            await this.generateQRSVG();
            setTimeout(update.bind(this), 100);
        }.bind(this)))
        if (this.tab) {
            this.viewerIndex = this.tab;
        }
        if (this.viewerIndex == 2) { // download tab on mount
            await this.generateConfig();
            this.download();
        }
        if (this.defaults) {
            this.dns[1] = this.defaults.DNS;
            this.persistentKeepalive[1] = this.defaults.PersistentKeepalive;
            this.mtu[1] = this.defaults.MTU;
            this.allowedIPs = this.defaults.AllowedIPs;
        }
    },
};
</script>

<style scoped>
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
</style>
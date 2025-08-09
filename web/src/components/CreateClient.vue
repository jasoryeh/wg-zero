<script setup>
import { Icon } from '@iconify/vue';
import Modal from './Modal.vue';
</script>

<template>
    <Modal>
        <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
                <div
                    class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-800 sm:mx-0 sm:h-10 sm:w-10">
                    <Icon icon="material-symbols:add" class="h-6 w-6 text-white dark:text-white-300" />
                </div>
                <div class="flex-grow mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-headline">
                        New Client
                    </h3>
                    <div class="mt-2">
                        <p class="text-md text-gray-500 dark:text-neutral-300 mb-1">Client Name</p>
                        <p class="text-sm text-gray-500">
                            <input
                                v-on:keydown="gen_public = '';"
                                v-on:blur="genPublic();"
                                class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none w-full"
                                type="text" v-model.trim="clientName" placeholder="Name" />
                        </p>
                        <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">The client IP addresses the server will expect you to connect from.</p>
                    </div>
                    <div class="mt-2">
                        <p class="text-md text-gray-500 dark:text-neutral-300 mb-1">Addresses</p>
                        <p class="text-sm text-gray-500">
                            <input
                                v-on:keydown="console.log($event); gen_private = '';"
                                class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none w-full"
                                type="text" v-model.trim="clientAddress" placeholder="Addresses" />
                        </p>
                        <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Optional, clients are referred to by public key if no name is given.</p>
                    </div>
                    <div class="mt-2">
                        <p class="text-md text-gray-500 dark:text-neutral-300 mb-1">Keys</p>
                        <div class="pl-2">
                            <div class="mt-2">
                                <p class="text-sm text-gray-500 dark:text-neutral-300 mb-1">Private Key</p>
                                <p class="text-sm text-gray-500 dark:text-neutral-300">
                                    <input
                                        v-on:keydown="gen_public = ''"
                                        v-on:blur="genPublic()"
                                        class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none w-full"
                                        type="text" v-model.trim="gen_private" placeholder="Private Key" />
                                </p>
                                <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Optional. You can provide a private key and we can determine your public key, or, <a class="text-blue-500" href="#" @click="regenerate()">you can let us generate you one</a>.</p>
                            </div>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500 dark:text-neutral-300 mb-1">Public Key</p>
                                <p class="text-sm text-gray-500">
                                    <input
                                        v-on:keydown="gen_private = ''" 
                                        class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none w-full"
                                        type="text" v-model.trim="gen_public" placeholder="Public Key" />
                                </p>
                                <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Required. Automatically derived from your private key, or you can input your public key here without providing the private key.</p>
                            </div>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500 dark:text-neutral-300 mb-1">Pre-shared Key</p>
                                <p class="text-sm text-gray-500">
                                    <input 
                                        class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none w-full"
                                        type="text" v-model.trim="gen_preshared" placeholder="Preshared Key" />
                                </p>
                                <p class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Optional. If you would like to generate one <a class="text-blue-500" href="#" @click="genPreshared()">click here</a></p>
                            </div>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500 dark:text-neutral-300">
                                    <input  
                                        class="rounded p-2 border-2 dark:bg-neutral-600 dark:border-neutral-700 dark:text-neutral-100 border-gray-100 focus:border-gray-200 outline-none mr-2"
                                        type="checkbox" v-model.trim="form_persist_privatekey" />
                                    <span v-if="form_persist_privatekey">Saving to server</span>
                                    <span v-else>Not saving to server</span>
                                </p>
                                <span class="text-xs text-gray-500 dark:text-neutral-400 mb-1">Optional. For your convenience, this is default to on. <br />
                                    When on, private keys will be sent and saved to the server. <br />
                                    When off, the client's private key will only be available until leaving this page.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button v-if="clientName.length && (form_persist_privatekey ? gen_private.length : true) && gen_public.length" type="button" @click="submitted()"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                Create
            </button>
            <button v-else type="button"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-200 dark:bg-gray-400 text-base font-medium text-white dark:text-gray-300 sm:ml-3 sm:w-auto sm:text-sm cursor-not-allowed">
                Create
            </button>
            <button type="button" @click="cancel()"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-neutral-700 shadow-sm px-4 py-2 bg-white dark:bg-neutral-800 text-base font-medium text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancel
            </button>
        </div>
    </Modal>
</template>

<script>
export default {
    data() {
        return {
            clientName: "",
            clientAddress: "",
            gen_private: "",
            gen_preshared: "",
            gen_public: "",
            gen_original: "",
            form_persist_privatekey: true,
        }
    },
    methods: {
        async genPrivate() {
            this.gen_private = (await window.wg_api.generatePrivateKey()).result;
        },
        async genPublic() {
            try {
                this.gen_public = (await window.wg_api.generatePublicKey(this.gen_private)).result;
            } catch(err) {
                console.debug(`Failed to generate public key for private ${this.gen_private}`, err);
                this.gen_public = "";
            }
        },
        async genPreshared() {
            this.gen_preshared = (await window.wg_api.generatePresharedKey()).result;
        },
        async regenerate() {
            await this.genPrivate();
            await this.genPublic();
        },
        submitted() {
            this.$emit('submitted', {
                name: this.clientName,
                addresses: this.clientAddress.split(","),
                privateKey: this.gen_private,
                publicKey: this.gen_public,
                presharedKey: this.gen_preshared,
                persistPrivateKey: this.form_persist_privatekey,
            });
        },
        cancel() {
            this.$emit('cancel');
        },
        genAddress() {
            this.clientAddress = window.wg_api.getNextIPs().join(',');
        },
    },
    props: {
        qrcode: String,
    },
    mounted() {
        this.genAddress();
    },
};
</script>

<style scoped>
</style>
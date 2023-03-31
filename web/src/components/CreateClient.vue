<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <div class="fixed z-10 inset-0 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <!--
            Background overlay, show/hide based on modal state.

            Entering: "ease-out duration-300"
                From: "opacity-0"
                To: "opacity-100"
            Leaving: "ease-in duration-200"
                From: "opacity-100"
                To: "opacity-0"
            -->
            <div class="fixed inset-0 transition-opacity" aria-hidden="true">
                <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <!-- This element is to trick the browser into centering the modal contents. -->
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <!--
            Modal panel, show/hide based on modal state.

            Entering: "ease-out duration-300"
                From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                To: "opacity-100 translate-y-0 sm:scale-100"
            Leaving: "ease-in duration-200"
                From: "opacity-100 translate-y-0 sm:scale-100"
                To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            -->
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog" aria-modal="true" aria-labelledby="modal-headline">
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div
                            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-800 sm:mx-0 sm:h-10 sm:w-10">
                            <Icon icon="material-symbols:add" class="h-6 w-6 text-white" />
                        </div>
                        <div class="flex-grow mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                                New Client
                            </h3>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500">
                                    <input
                                        class="rounded p-2 border-2 border-gray-100 focus:border-gray-200 outline-none w-full"
                                        type="text" v-model.trim="clientCreateName" placeholder="Name" />
                                </p>
                            </div>
                            <div class="mt-2">
                                <p class="text-sm text-gray-500">
                                    <input
                                        class="rounded p-2 border-2 border-gray-100 focus:border-gray-200 outline-none w-full"
                                        type="text" v-model.trim="privateKey" placeholder="Private Key" />
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button v-if="clientCreateName.length && privateKey.length" type="button" @click="submitted()"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-800 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                        Create
                    </button>
                    <button v-else type="button"
                        class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-200 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm cursor-not-allowed">
                        Create
                    </button>
                    <button type="button" @click="cancel()"
                        class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            clientCreateName: "",
            privateKey: "",
        }
    },
    methods: {
        submitted() {
            this.$emit('submitted', this.clientCreateName);
        },
        cancel() {
            this.$emit('cancel');
        }
    },
    props: {
        qrcode: String,
    }
};
</script>

<style scoped>
</style>
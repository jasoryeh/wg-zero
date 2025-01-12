<script setup>
import { Icon } from '@iconify/vue';
import QRCode from 'qrcode';
import Toggle from './Toggle.vue';
</script>

<template>
  <div class="bg-neutral-400 dark:bg-black bg-opacity-75 dark:bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20">
        <div class="bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 rounded-md shadow-lg relative max-h-screen overflow-y-auto scale-90">
            <button @click="$emit('close'); $emit('cancel');" class="absolute right-4 top-4 text-gray-600 dark:text-neutral-50 hover:text-gray-800">
                <Icon icon="heroicons:x-mark" class="w-8 h-8" />
            </button>
            <slot class="text-neutral-900 dark:text-neutral-50 "></slot>
        </div>
  </div>
</template>


<script>
export default {
    data() {
        return {
        }
    },
    methods: {
    },
    props: {
    },
    watch: {
    },
    async mounted() {
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
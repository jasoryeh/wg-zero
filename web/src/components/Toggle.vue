<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <div @click="$emit('toggle'); $emit('toggle_off');" v-if="switchStatus" :title="'Disable ' + switchName"
      :class="disabled === true ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-red-800 cursor-pointer hover:bg-red-700 transition-all mx-1">
      <div class="rounded-full w-4 h-4 m-1 ml-5 bg-white dark:bg-neutral-300"></div>
    </div>
    <div @click="$emit('toggle'); $emit('toggle_on');" v-else :title="'Enable ' + switchName"
      :class="disabled === true ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
      class="inline-block align-middle rounded-full w-10 h-6 mr-1 bg-gray-200 dark:bg-gray-400 cursor-pointer hover:bg-gray-300 transition-all mx-1">
      <div class="rounded-full w-4 h-4 m-1 bg-white"></div>
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
        switchStatus: Boolean,
        switchName: String,
        disabled: Boolean,
    },
    mounted() {
    },
};
</script>

<style scoped>
</style>
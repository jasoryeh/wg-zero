<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <button @click="$emit('press')"
        :class="disabled === true ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
        class="hover:bg-red-800 hover:border-red-800 hover:text-white text-gray-700 dark:text-gray-300 border-2 border-gray-100 dark:border-neutral-700 py-2 px-4 mx-1 rounded inline-flex items-center transition">
        <Icon v-if="buttonIcon" :icon="buttonIcon" class="w-4 h-4 mr-2" />
        <span v-else class="w-0 h-4 mr-0" />
        <span class="text-sm">{{buttonText}}</span>
    </button>
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
        buttonText: String,
        buttonIcon: String,
        disabled: Boolean,
    },
    mounted() {
    },
};
</script>

<style scoped>
</style>
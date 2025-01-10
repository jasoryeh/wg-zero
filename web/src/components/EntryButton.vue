<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <button 
      :class="disabled === true ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
      class="align-middle bg-gray-100 dark:bg-neutral-600 hover:bg-red-800 hover:text-white p-2 rounded transition mx-1"
      :title="buttonText" @click="$emit('press')">
      <Icon :icon="buttonIcon" class="w-5 h-5" />
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
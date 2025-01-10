<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <span
      class="text-sm text-gray-400 dark:text-white mb-10 mr-2 mt-3 cursor-pointer float-right" @click="$emit('press')">
      <span class="hover:underline">{{ text }}</span>&nbsp;
      <Icon :icon="icon" class="h-3 inline" />
    </span>
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
        text: String,
        icon: String
    },
    mounted() {
    },
};
</script>

<style scoped>
</style>
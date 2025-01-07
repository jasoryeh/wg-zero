<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <div class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20">
        <div class="bg-white rounded-md shadow-lg relative p-8">
            <button @click="close()" class="absolute right-4 top-4 text-gray-600 hover:text-gray-800">
                <Icon icon="heroicons:x-mark" class="w-8 h-8" />
            </button>
            <pre>{{ config }}</pre>
        </div>
    </div>
</template>

<script>
export default {
    methods: {
        close() {
            this.$emit('close');
        }
    },
    props: {
        config: String,
    }
};
</script>

<style scoped>
</style>

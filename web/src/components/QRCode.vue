<script setup>
</script>

<template>
    <div class="bg-black bg-opacity-50 fixed top-0 right-0 left-0 bottom-0 flex items-center justify-center z-20">
        <div class="bg-white rounded-md shadow-lg relative p-8">
        <button @click="this.close()" class="absolute right-4 top-4 text-gray-600 hover:text-gray-800">
            <svg class="w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <img :src="qrcode" />
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
        qrcode: String,
    }
};
</script>

<style scoped>
</style>

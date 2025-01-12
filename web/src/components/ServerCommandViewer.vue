<script setup>
import { Icon } from '@iconify/vue';
import Modal from './Modal.vue';
</script>

<template>
    <Modal class="dark:text-neutral-200">
        <div class="p-6">
            <h4 class="font-bold text-lg">Server Commands</h4>
            <p class="text-sm">Commands your server will run when it starts or stops the WireGuard server.</p>
            <div>
                <div class="bg-neutral-100 dark:bg-neutral-700 p-4 mt-2 rounded-md">
                    <h5 class="text-md font-bold mb-2">Before Starting</h5>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-if="PreUp && PreUp.length > 0">{{ PreUp.join('\n') }}</pre>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-else>No commands are run in this phase.</pre>
                </div>
                <div class="bg-neutral-100 dark:bg-neutral-700 p-4 mt-2 rounded-md">
                    <h5 class="text-md font-bold mb-2">After Starting</h5>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-if="PostUp && PostUp.length > 0">{{ PostUp.join('\n') }}</pre>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-else>No commands are run in this phase.</pre>
                </div>
                <div class="bg-neutral-100 dark:bg-neutral-700 p-4 mt-2 rounded-md">
                    <h5 class="text-md font-bold mb-2">Before Stopping</h5>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-if="PreDown && PreDown.length > 0">{{ PreDown.join('\n') }}</pre>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-else>No commands are run in this phase.</pre>
                </div>
                <div class="bg-neutral-100 dark:bg-neutral-700 p-4 mt-2 rounded-md">
                    <h5 class="text-md font-bold mb-2">After Stopping</h5>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-if="PostDown && PostDown.length > 0">{{ PostDown.join('\n') }}</pre>
                    <pre class="p-4 bg-white dark:bg-black dark:text-white rounded-md" v-else>No commands are run in this phase.</pre>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script>
export default {
    props: {
        PreUp: Array,
        PostUp: Array,
        PreDown: Array,
        PostDown: Array,
    },
    mounted() {
        console.log(this.PreUp, this.PostUp, this.PreDown, this.PostDown);
    }
};
</script>

<style scoped>
</style>
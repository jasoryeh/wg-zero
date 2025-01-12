<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <div class="shadow-md rounded-lg bg-white dark:bg-neutral-800 dark:text-white overflow-hidden mt-4 lg:mt-8">
      <!-- Card Header -->
      <div class="flex flex-row flex-auto items-center flex-wrap p-3 px-5 border border-b-2 border-gray-100 dark:border-neutral-700">
        <div class="flex-grow">
          <p class="text-2xl font-medium">
            <slot name="title"></slot>
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-300">
            <slot name="description"></slot>
          </p>
        </div>
        <div class="flex-shrink-0">
            <slot name="buttons"></slot>
        </div>
      </div>

      <!-- Card Body -->
      <div>
        <slot name="body"></slot>
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
    mounted() {
    },
};
</script>

<style scoped>
</style>
<script setup>
import Loading from './Loading.vue';
import { Icon } from '@iconify/vue';
</script>

<template>
    <div>
      <h1 class="text-4xl font-medium my-16 text-gray-700 dark:text-neutral-50 text-center">WireGuard</h1>

      <form @submit="login" class="shadow rounded-md bg-white dark:bg-neutral-700 mx-auto w-64 p-5 overflow-hidden mt-10">
        <!-- Avatar -->
        <div class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 relative overflow-hidden">
          <Icon icon="heroicons-solid:user" class="w-10 h-10 m-5 text-white dark:text-neutral-200" />
        </div>

        <input type="password" name="password" placeholder="Password" autocomplete="current-password" v-model="password"
          class="px-3 py-2 text-sm dark:bg-neutral-800 text-gray-500 dark:text-neutral-50 mb-5 border-2 border-gray-100 dark:border-neutral-600 rounded-lg w-full focus:border-red-800 outline-none" />
        
        <Loading v-if="$parent.authenticating" />
        <input v-if="!$parent.authenticating && password" type="submit" @click="(e) => {e.preventDefault(); $emit('try', password);}" 
          class="bg-red-800 w-full rounded shadow py-2 text-sm text-white hover:bg-red-700 transition cursor-pointer"
          value="Sign In">
        <input v-if="!$parent.authenticating && !password" type="submit" @click="(e) => e.preventDefault()" 
          class="bg-gray-200 dark:bg-neutral-800 w-full rounded shadow py-2 text-sm text-white dark:text-neutral-400 cursor-not-allowed" value="Sign In">
      </form>
    </div>
</template>

<script>
export default {
    data() {
      return {
        password: "",
      };
    },
};
</script>

<style scoped>
</style>

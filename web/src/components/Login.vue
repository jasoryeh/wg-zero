<script setup>
</script>

<template>
    <div>
      <h1 class="text-4xl font-medium my-16 text-gray-700 text-center">WireGuard</h1>

      <form @submit="login" class="shadow rounded-md bg-white mx-auto w-64 p-5 overflow-hidden mt-10">
        <!-- Avatar -->
        <div class="h-20 w-20 mb-10 mt-5 mx-auto rounded-full bg-red-800 relative overflow-hidden">
          <svg class="w-10 h-10 m-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
        </div>

        <input type="password" name="password" placeholder="Password" v-model="password"
          class="px-3 py-2 text-sm text-gray-500 mb-5 border-2 border-gray-100 rounded-lg w-full focus:border-red-800 outline-none" />

        <button v-if="authenticating"
          class="bg-red-800 w-full rounded shadow py-2 text-sm text-white cursor-not-allowed">
          <svg class="w-5 animate-spin mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
        </button>
        <input v-if="!this.$parent.authenticating && password" type="submit" @click="(e) => {e.preventDefault(); $emit('try', password);}" 
          class="bg-red-800 w-full rounded shadow py-2 text-sm text-white hover:bg-red-700 transition cursor-pointer"
          value="Sign In">
        <input v-if="!this.$parent.authenticating && !password" type="submit" @click="(e) => e.preventDefault()" 
          class="bg-gray-200 w-full rounded shadow py-2 text-sm text-white cursor-not-allowed" value="Sign In">
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

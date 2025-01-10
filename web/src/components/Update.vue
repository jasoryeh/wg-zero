<script setup>
</script>

<template>
    <div class="bg-red-800 p-4 text-white text-sm font-small mb-10 rounded-md shadow-lg"
        :title="`v${currentRelease} → v${latestRelease}`">
        <div class="container mx-auto flex flex-row flex-auto items-center">
          <div class="flex-grow">
            <p class="font-bold">There is an update available!</p>
            <p>{{changelog}}</p>
          </div>

          <a href="https://github.com/jasoryeh/wg-zero#updating" target="_blank"
            class="p-3 rounded-md bg-white float-right font-sm font-semibold text-red-800 flex-shrink-0 border-2 border-red-800 hover:border-white hover:text-white hover:bg-red-800 transition-all">
            Update →
          </a>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        currentRelease: String,
        latestRelease: String,
        changelog: String
    }
};
</script>

<style scoped>
</style>

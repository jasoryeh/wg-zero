<script setup>
</script>

<template>
  <div class="m-10">
    <p v-cloak class="text-center text-gray-300 text-xs">
      wg-zero
      &nbsp;&bullet;&nbsp;
      <span v-if="detectedEndpoint" key="refresher">Endpoint: {{ detectedEndpoint }}</span>
      <span v-else>Not connected yet.</span>
      &nbsp;&bullet;&nbsp;
      <a class="hover:underline" href="https://github.com/jasoryeh/wg-zero" target="_blank">Fork Source Code</a>
      &nbsp;·&nbsp;
      <a class="hover:underline" href="https://github.com/WeeJeWel/wg-easy" target="_blank">Original Source Code</a>
    </p>
    <p v-cloak class="text-center text-gray-300 text-xs">
      Forked by
      <a target="_blank" class="hover:underline" href="https://hogt.me/?ref=wg-zero">Jason Ho</a>
      &nbsp;·&nbsp;
      <a class="hover:underline" href="https://github.com/jasoryeh" target="_blank">Profile</a>
      &nbsp;&bullet;&nbsp;
      Originally by
      <a target="_blank" class="hover:underline" href="https://emilenijssen.nl/?ref=wg-easy">Emile Nijssen</a>
      &nbsp;·&nbsp;
      <a class="hover:underline" href="https://github.com/WeeJeWel" target="_blank">Profile</a>
    </p>
  </div>
</template>

<style scoped>
</style>

<script>
export default {
  data() {
    return {
      refresher: 1,
      detectedEndpoint: null,
    }
  },
  methods: {
    getEndpoint() {
      if (window.wg_api) {
        return window.wg_api.getEndpoint();
      } else {
        return null;
      }
    }
  },
  mounted() {
    (function _mounted() {
      this.detectedEndpoint = this.getEndpoint();
      this.refresher = Math.random();
      setTimeout(_mounted.bind(this), this.detectedEndpoint ? 10000 : 100); // refresh infrequently when found
    }.bind(this))();
  }
}
</script>
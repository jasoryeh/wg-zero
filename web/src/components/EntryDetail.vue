<script setup>
import { Icon } from '@iconify/vue';
import EditableText from './EditableText.vue';
</script>

<template>
    <span class="group" :title="title">
        <Icon :icon="icon" class="align-middle h-3 inline mr-1" />
        <EditableText v-if="editable === true" :fieldID="type + '-' + id" :fieldText="text" :disabled="readonly" @cancel="" @submit="({_, text}) => $emit('modify', text)" />
        <span v-else>{{ text }}</span>    
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
        type: String,
        id: String,
        icon: String,
        text: String,
        editable: Boolean,
        readonly: Boolean,
        title: String,
    },
    mounted() {
    },
};
</script>

<style scoped>
</style>
<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <span class="relative">
        <!-- Text -->
        <input v-if="editMode" v-model="textField"
            v-on:keyup.enter="submit(); editMode = false;"
            v-on:keyup.escape="editMode = false;"
            :ref="'field-' + fieldID + '-name'"
            class="rounded px-1 border-2 dark:bg-neutral-700 border-gray-100 dark:border-neutral-900 focus:border-gray-200 outline-none flex-1 grow" />
        <span v-else
            class="inline-block border-t-0 border-b-2 border-transparent" ref="display">{{fieldText}}</span>

        <!-- Actions -->
        <Icon v-if="editMode"
            @click="submit(); editMode = false;"
            icon="heroicons:check-circle" 
            class="cursor-pointer group-hover:opacity-100 transition-opacity h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100"
            :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
         />
        <Icon v-if="editMode"
            @click="fieldText = textField; editMode = false;"
            icon="heroicons:x-circle" 
            class="cursor-pointer group-hover:opacity-100 transition-opacity h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100"
            :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
         />
        <Icon v-else
            @click="textField = fieldText; editMode = true;"
            icon="heroicons:pencil-square" 
            class="cursor-pointer group-hover:Opacity-100 transition-opacity h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100"
            :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null"
             />
    </span>
</template>


<script>
export default {
    data() {
        return {
            editMode: false,
            textField: null,
        }
    },
    methods: {
        submit() {
            this.$emit('submit', {
                text: this.textField,
                id: this.fieldID,
            });
        },
        cancel() {
            this.$emit('cancel');
        },
    },
    props: {
        fieldID: String,
        fieldText: String,
        readonly: Boolean,
    },
    mounted() {
        this.textField = this.fieldText;
    },
};
</script>

<style scoped>
</style>
<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <span>
        <!-- Show -->
        <input v-if="editMode" v-model="textField"
        v-on:keyup.enter="submit(); editMode = false;"
        v-on:keyup.escape="editMode = false;"
        :ref="'field-' + fieldID + '-name'"
        class="rounded px-1 border-2 border-gray-100 focus:border-gray-200 outline-none w-full" />
        <span v-else
            class="inline-block border-t-2 border-b-2 border-transparent">{{fieldText}}</span>

        <!-- Edit -->
        <span v-show="!editMode"
        @click="textField = fieldText; editMode = true;"
        class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        :class="readonly ? 'cursor-not-allowed pointer-events-none opacity-25' : null">
        <Icon icon="heroicons:pencil-square" class="h-4 w-4 ml-1 inline align-middle opacity-25 hover:opacity-100" />
        </span>
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
            console.log('emit submitted: ', this.textField, this.fieldID);
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
        console.log(">.", this.fieldID, this.fieldText);
        this.textField = this.fieldText;
    },
};
</script>

<style scoped>
</style>
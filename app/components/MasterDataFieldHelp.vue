<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    field: string;
    inline?: boolean;
  }>(),
  { inline: false }
);

const { meta } = useMasterDataFieldHelp();
const copy = computed(() => meta(props.field));
</script>

<template>
  <span v-if="inline" class="master-data-field-help--inline">
    <FieldHelpLabel :label="copy.label" :help="copy.help" />
  </span>
  <div v-else class="master-data-field-help">
    <FieldHelpLabel :label="copy.label" :help="copy.help" />
  </div>
</template>

<style scoped>
.master-data-field-help {
  margin-bottom: 6px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 12px;
  font-weight: 600;
}
.master-data-field-help--inline {
  display: inline-flex;
}
</style>

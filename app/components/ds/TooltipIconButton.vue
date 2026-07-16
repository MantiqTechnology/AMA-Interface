<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

const props = withDefaults(
  defineProps<{
    icon: string;
    tooltip: string;
    ariaLabel?: string;
    tooltipLocation?: 'top' | 'bottom' | 'start' | 'end' | 'left' | 'right';
  }>(),
  {
    ariaLabel: undefined,
    tooltipLocation: 'top'
  }
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const accessibleLabel = computed(() => props.ariaLabel ?? props.tooltip);

function handleClick(event: MouseEvent) {
  emit('click', event);
}
</script>

<template>
  <VTooltip :location="tooltipLocation" :text="tooltip">
    <template #activator="{ props: tooltipProps }">
      <span class="ds-tooltip-icon-button__activator" v-bind="tooltipProps">
        <VBtn v-bind="$attrs" :aria-label="accessibleLabel" :icon="icon" @click="handleClick" />
      </span>
    </template>
  </VTooltip>
</template>

<style scoped>
.ds-tooltip-icon-button__activator {
  display: inline-flex;
  vertical-align: middle;
}
</style>

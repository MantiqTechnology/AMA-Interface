<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

type ConfirmTone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'error' | 'info';

const props = withDefaults(
  defineProps<{
    icon: string;
    tooltip: string;
    title: string;
    ariaLabel?: string;
    tooltipLocation?: 'top' | 'bottom' | 'start' | 'end' | 'left' | 'right';
    message?: string;
    confirmText?: string;
    cancelText?: string;
    tone?: ConfirmTone;
    confirmIcon?: string;
    maxWidth?: string | number;
    persistent?: boolean;
    action?: () => void | Promise<void>;
    closeOnConfirm?: boolean;
    confirmDisabled?: boolean;
  }>(),
  {
    ariaLabel: undefined,
    tooltipLocation: 'top',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    tone: 'primary',
    confirmIcon: undefined,
    maxWidth: 460,
    persistent: false,
    action: undefined,
    closeOnConfirm: true,
    confirmDisabled: false
  }
);

const dialog = ref(false);
const loading = ref(false);

const toneColor = computed(() => (props.tone === 'danger' ? 'error' : props.tone));
const actionIcon = computed(() => props.confirmIcon ?? toneIcon(props.tone));

function toneIcon(tone: ConfirmTone) {
  if (tone === 'success') return 'mdi-check-circle-outline';
  if (tone === 'warning') return 'mdi-alert-outline';
  if (tone === 'danger' || tone === 'error') return 'mdi-alert-circle-outline';
  if (tone === 'info') return 'mdi-information-outline';
  return 'mdi-check';
}

function openDialog() {
  dialog.value = true;
}

function closeDialog() {
  if (loading.value) return;
  dialog.value = false;
}

async function confirm() {
  if (loading.value || props.confirmDisabled) return;

  loading.value = true;
  try {
    await props.action?.();
    if (props.closeOnConfirm) dialog.value = false;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <DsTooltipIconButton
    v-bind="$attrs"
    :aria-label="ariaLabel"
    :icon="icon"
    :tooltip="tooltip"
    :tooltip-location="tooltipLocation"
    @click="openDialog"
  />

  <VDialog v-model="dialog" :max-width="maxWidth" :persistent="persistent">
    <VCard>
      <VCardTitle class="d-flex align-center ga-2">
        <VIcon :color="toneColor" :icon="actionIcon" />
        <slot name="title">{{ title }}</slot>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <slot :close="closeDialog" :confirm="confirm" :loading="loading">
          {{ message }}
        </slot>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <slot name="actions" :cancel="closeDialog" :confirm="confirm" :loading="loading">
          <VBtn :disabled="loading" variant="text" @click="closeDialog">
            {{ cancelText }}
          </VBtn>
          <VBtn
            :color="toneColor"
            :disabled="confirmDisabled"
            :loading="loading"
            :prepend-icon="actionIcon"
            @click="confirm"
          >
            {{ confirmText }}
          </VBtn>
        </slot>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import type { AgentDto, AgentInput } from '#shared/features/commercial/agents';
import StationSelect from '../../operations/stations/StationSelect.vue';
const props = defineProps<{ modelValue: boolean; record?: AgentDto | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [record: AgentDto] }>();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const serverError = ref('');
const form = reactive<AgentInput>({
  agentCode: '',
  agentName: '',
  agentType: 'TICKET_AGENT',
  stationId: null,
  commissionBasisPoints: null,
  contactPerson: null,
  phone: null
});
const required = (label: string) => (value: unknown) =>
  Array.isArray(value)
    ? value.length > 0 || `${label} is required`
    : value !== null && value !== ''
      ? true
      : `${label} is required`;
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    serverError.value = '';
    Object.assign(form, {
      agentCode: props.record ? (props.record.agentCode as AgentInput['agentCode']) : '',
      agentName: props.record ? (props.record.agentName as AgentInput['agentName']) : '',
      agentType: props.record
        ? (props.record.agentType as AgentInput['agentType'])
        : 'TICKET_AGENT',
      stationId: props.record ? (props.record.stationId as AgentInput['stationId']) : null,
      commissionBasisPoints: props.record
        ? (props.record.commissionBasisPoints as AgentInput['commissionBasisPoints'])
        : null,
      contactPerson: props.record
        ? (props.record.contactPerson as AgentInput['contactPerson'])
        : null,
      phone: props.record ? (props.record.phone as AgentInput['phone']) : null
    });
  }
);
async function submit() {
  const result = await formRef.value?.validate();
  if (result && !result.valid) return;
  submitting.value = true;
  serverError.value = '';
  try {
    const record = await fetchApi<AgentDto>(
      props.record ? '/api/master-data/agents/' + props.record.id : '/api/master-data/agents',
      { method: props.record ? 'PUT' : 'POST', body: { ...form } }
    );
    emit('saved', record);
    emit('update:modelValue', false);
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Unable to save agents.';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <VDialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>{{ record ? 'Edit' : 'Add' }} Agents</VCardTitle><VDivider /><VCardText>
        <VAlert v-if="serverError" class="mb-4" color="error" variant="tonal">
          {{ serverError }}
        </VAlert><VForm ref="formRef" @submit.prevent="submit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.agentCode"
                label="Agent code"
                :rules="[required('Agent code')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.agentName"
                label="Agent name"
                :rules="[required('Agent name')]"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.agentType"
                :items="['TICKET_AGENT', 'CARGO_AGENT', 'STATION_COUNTER']"
                label="Agent type"
                :rules="[required('Agent type')]"
                variant="outlined"
              />
            </VCol>
            <VCol v-if="form.agentType === 'STATION_COUNTER'" cols="12" md="6">
              <StationSelect v-model="form.stationId" label="Station" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="form.commissionBasisPoints"
                label="Commission rate"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contactPerson"
                label="Contact person"
                type="text"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="form.phone" label="Phone" type="text" variant="outlined" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText><VDivider /><VCardActions>
        <VSpacer /><VBtn variant="text" @click="emit('update:modelValue', false)">Cancel</VBtn><VBtn
          color="primary"
          :loading="submitting"
          prepend-icon="mdi-content-save"
          @click="submit"
        >
          Save agents
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

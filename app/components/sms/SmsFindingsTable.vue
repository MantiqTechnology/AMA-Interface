<template>
  <VCard border>
    <VCardItem class="pa-4 border-b">
      <template #title>
        <span class="text-subtitle-1 font-weight-bold">Top Safety Findings</span>
      </template>
      <template #append>
        <div class="d-flex ga-2 align-center">
          <VBtn
            variant="text"
            color="primary"
            class="text-none font-weight-bold"
            @click="$emit('click:view-all')"
          >
            View All Reports
          </VBtn>
          <slot name="actions" />
        </div>
      </template>
    </VCardItem>
    <VTable hover density="compact">
      <thead>
        <tr>
          <th>Priority</th>
          <th>ID / Ref</th>
          <th>Finding / Subject</th>
          <th>Station</th>
          <th>Risk Level</th>
          <th>Owner</th>
          <th>Due Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="item.id"
          style="cursor: pointer"
          @click="$emit('click:row', item)"
        >
          <td class="font-weight-medium" :class="priorityClass(item.priority)">{{ item.priority }}</td>
          <td class="font-weight-bold text-caption">{{ item.id }}</td>
          <td>{{ item.finding || item.title }}</td>
          <td>{{ item.station }}</td>
          <td>
            <VChip :color="riskColor(item.riskLevel)" size="x-small" class="font-weight-bold" variant="tonal">
              {{ item.riskLevel }}
            </VChip>
          </td>
          <td>{{ item.owner }}</td>
          <td class="text-caption">{{ item.dueDate || item.date }}</td>
          <td>
            <VChip :color="statusColor(item.status)" size="x-small">{{ item.status }}</VChip>
          </td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})

defineEmits(['click:view-all', 'click:row'])

function priorityClass(priority) {
  return priority === 'High' ? 'text-error' : priority === 'Medium' ? 'text-warning' : ''
}

function riskColor(level) {
  return { Low: 'success', Medium: 'warning', High: 'error', Critical: 'purple', Extreme: 'purple' }[level] || 'grey'
}

function statusColor(status) {
  return { Overdue: 'error', Open: 'warning', 'Due Soon': 'warning', Closed: 'success' }[status] || 'grey'
}
</script>
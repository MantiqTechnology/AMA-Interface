<template>
  <VCard border>
    <VCardItem>
      <template #title>
        <span class="text-subtitle-1 font-weight-bold">Top Safety Findings / Actions Requiring Attention</span>
      </template>
      <template #append>
        <VBtn color="primary" variant="flat" size="small">View All Findings</VBtn>
      </template>
    </VCardItem>
    <VTable>
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
        <tr v-for="item in items" :key="item.id">
          <td class="font-weight-medium" :class="priorityClass(item.priority)">{{ item.priority }}</td>
          <td>{{ item.id }}</td>
          <td>{{ item.finding }}</td>
          <td>{{ item.station }}</td>
          <td>
            <VChip :color="riskColor(item.riskLevel)" size="small" variant="tonal">{{ item.riskLevel }}</VChip>
          </td>
          <td>{{ item.owner }}</td>
          <td>{{ item.dueDate }}</td>
          <td>
            <VChip :color="statusColor(item.status)" size="small">{{ item.status }}</VChip>
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

function priorityClass(priority) {
  return priority === 'High' ? 'text-error' : priority === 'Medium' ? 'text-warning' : ''
}

function riskColor(level) {
  return { Low: 'success', Medium: 'warning', High: 'error', Critical: 'error' }[level] || 'grey'
}

function statusColor(status) {
  return { Overdue: 'error', Open: 'warning', 'Due Soon': 'warning', Closed: 'success' }[status] || 'grey'
}
</script>

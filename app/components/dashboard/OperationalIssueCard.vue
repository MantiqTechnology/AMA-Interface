<script setup lang="ts">
import type { OperationsAttentionItem } from '#shared/contracts/aviation-dashboard';

const props = defineProps<{ item: OperationsAttentionItem; primary?: boolean }>();

function formatDateTime(value: string | null) {
  if (!value) return 'No operational deadline';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jayapura'
  }).format(new Date(value));
}

const tone = computed(() =>
  props.item.severity === 'critical' ? ('danger' as const) : ('warning' as const)
);
</script>

<template>
  <article class="issue-card" :class="{ 'issue-card--primary': primary }">
    <div class="issue-card__identity">
      <DashboardStateBadge
        compact
        :icon="item.severity === 'critical' ? 'mdi-alert-circle' : 'mdi-alert'"
        :label="item.severity.toUpperCase()"
        :tone="tone"
      />
      <strong>{{ item.flightNumber }}</strong>
      <span>{{ item.route }}</span>
      <span v-if="item.currentState" class="issue-card__state">
        {{ item.currentState.replaceAll('_', ' ') }}
      </span>
    </div>
    <div class="issue-card__problem">
      <small>Problem</small>
      <p>{{ item.issue }}</p>
    </div>
    <dl>
      <div>
        <dt>Impact</dt>
        <dd>{{ item.impact }}</dd>
      </div>
      <div>
        <dt>Owner</dt>
        <dd>{{ item.owner }}</dd>
      </div>
      <div>
        <dt>Due</dt>
        <dd>{{ formatDateTime(item.dueAt) }}</dd>
      </div>
      <div class="issue-card__required">
        <dt>Required action</dt>
        <dd>{{ item.requiredAction ?? 'Review the affected flight.' }}</dd>
      </div>
    </dl>
    <VBtn
      append-icon="mdi-arrow-right"
      :color="tone"
      size="small"
      :to="item.href"
      :variant="primary ? 'flat' : 'tonal'"
    >
      {{ item.actionLabel ?? 'Review blocker' }}
    </VBtn>
  </article>
</template>

<style scoped>
.issue-card {
  display: grid;
  grid-template-columns: minmax(180px, 1.05fr) minmax(220px, 1.4fr) auto;
  align-items: center;
  gap: 12px 18px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-warning), 0.24);
  border-left: 4px solid rgb(var(--v-theme-warning));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.issue-card--primary {
  border-color: rgba(var(--v-theme-danger), 0.28);
  border-left-color: rgb(var(--v-theme-danger));
  background: rgba(var(--v-theme-danger), 0.025);
}
.issue-card__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.issue-card__identity strong {
  color: rgb(var(--v-theme-primary));
  font-size: 0.9375rem;
}
.issue-card__identity > span {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.8125rem;
}
.issue-card__state {
  width: 100%;
  font-size: 0.75rem !important;
  font-weight: 700;
  letter-spacing: 0.035em;
}
.issue-card__problem small,
dt {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.issue-card__problem p {
  margin-top: 3px;
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.35;
}
dl {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 0.85fr 1.65fr;
  gap: 12px;
  margin: 0;
}
dd {
  margin: 3px 0 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
}
.issue-card > .v-btn {
  grid-column: 3;
  grid-row: 1;
}
@media (max-width: 1199px) {
  .issue-card {
    grid-template-columns: 1fr auto;
  }
  .issue-card__problem {
    grid-column: 1;
  }
  .issue-card > .v-btn {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .issue-card dl {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 599px) {
  .issue-card {
    grid-template-columns: 1fr;
  }
  .issue-card__problem,
  .issue-card dl,
  .issue-card > .v-btn {
    grid-column: 1;
    grid-row: auto;
  }
  .issue-card dl {
    grid-template-columns: 1fr 1fr;
  }
  .issue-card > .v-btn {
    width: 100%;
  }
}
</style>

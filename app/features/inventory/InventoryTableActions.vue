<template>
  <div class="inventory-table-actions">
    <slot />
  </div>
</template>

<style scoped>
.inventory-table-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
</style>

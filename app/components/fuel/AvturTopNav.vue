    <script setup lang="ts">

    const route = useRoute();

    // Menentukan tab aktif secara dinamis berdasarkan URL rute saat ini
    const activeTab = computed(() => {
    const path = route.path;
    if (path.includes('master-data')) return 'master-data';
    if (path.includes('stock-monitoring') || path.includes('AvturStockMonitoring')) return 'stock-monitoring';
    if (path.includes('hardware-integration')) return 'hardware';
    if (path.includes('rugged-tablet-app')) return 'rugged-tablet';
    if (path.includes('synchronization')) return 'synchronization';
    if (path.includes('fuel-transactions')) return 'transactions';
    if (path.includes('fuel-burn')) return 'fuel-burn';
    if (path.includes('costing')) return 'costing';
    if (path.includes('reconciliation')) return 'reconciliation';
    if (path.includes('quality-control') || path.includes('AvturQualityControl')) return 'quality-control';
    if (path.includes('alert-notification')) return 'alert-notification';
    if (path.includes('audit-trail')) return 'audit-trail';   
    return 'dashboard'; // Default fallback ke dashboard
    });

    // Daftar Tab Navigasi Atas Modul Avtur
    const avturNavTabs = [
    { value: 'dashboard', label: 'Dashboard', to: '/avtur-monitoring/dashboard', icon: 'mdi-chart-box-outline' },
    { value: 'master-data', label: 'Master Data', to: '/avtur-monitoring/master-data', icon: 'mdi-database-outline' },
    { value: 'stock-monitoring', label: 'Stock Monitoring', to: '/avtur-monitoring/avtur-stock-monitoring-view', icon: 'mdi-water-check-outline' },
    { value: 'hardware', label: 'Hardware Integration', to: '/avtur-monitoring/hardware-integration', icon: 'mdi-expansion-card' },
    { value: 'rugged-tablet', label: 'Rugged Tablet App', to: '/avtur-monitoring/rugged-tablet-app', icon: 'mdi-tablet-dashboard' },
    { value: 'synchronization', label: 'Synchronization', to: '/avtur-monitoring/synchronization', icon: 'mdi-sync' },
    { value: 'transactions', label: 'Fuel Transactions', to: '/avtur-monitoring/fuel-transactions', icon: 'mdi-swap-horizontal-circle-outline' },
    { value: 'fuel-burn', label: 'Fuel Burn Analysis', to: '/avtur-monitoring/fuel-burn-audit-analysis-view', icon: 'mdi-fire' },
    { value: 'costing', label: 'Costing & Finance', to: '/avtur-monitoring/fuel-costing-finance-view', icon: 'mdi-cash-multiple' },
    { value: 'reconciliation', label: 'Reconciliation', to: '/avtur-monitoring/fuel-reconciliation-view', icon: 'mdi-scale-balance' },
    { value: 'quality-control', label: 'Quality Control', to: '/avtur-monitoring/avtur-quality-control-view', icon: 'mdi-shield-check-outline' },
    { value: 'alert-notification', label: 'Alert Notifications', to: '/avtur-monitoring/fuel-alert-notification-engine-view', icon: 'mdi-bell-alert-outline' },
    { value: 'audit-trail', label: 'Analytics & Audit', to: '/avtur-monitoring/fuel-analysis-audit-trail-view', icon: 'mdi-file-document-check-outline' }
    ];
    </script>

    <template>
    <v-card variant="flat" class="border rounded-lg mb-6 bg-white">
        <v-tabs :model-value="activeTab" color="primary" show-arrows>
        <v-tab
            v-for="tab in avturNavTabs"
            :key="tab.value"
            :value="tab.value"
            :to="tab.to"
            class="text-none"
            :class="activeTab === tab.value ? 'font-weight-bold' : 'font-weight-medium text-medium-emphasis'"
        >
            <v-icon :icon="tab.icon" size="18" class="mr-2" />
            {{ tab.label }}
        </v-tab>
        </v-tabs>
    </v-card>
    </template>
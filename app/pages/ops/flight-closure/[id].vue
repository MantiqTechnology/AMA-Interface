<script setup lang="ts">
const route = useRoute();
await navigateTo(`/flights/${String(route.params.id)}`, { replace: true });
</script>

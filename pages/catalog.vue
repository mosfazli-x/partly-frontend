<script setup lang="ts">
useHead({ title: 'کاتالوگ قطعات | پارتلی' })
const route = useRoute()
const initialType = computed(() => (String(route.query.type || '').toLowerCase() === 'motorcycle' ? 'MOTORCYCLE' : 'CAR'))
</script>
<template>
  <CatalogBrowser :key="initialType" :initial-type="initialType" />
</template>

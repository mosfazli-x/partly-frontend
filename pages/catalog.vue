<script setup lang="ts">
// Retire the legacy browser before it can mount or request motorcycle data.
definePageMeta({
  middleware: [to => {
    const query: Record<string, string> = {}
    for (const key of ['q', 'category', 'makeId', 'modelId', 'variant', 'year']) {
      const value = to.query[key]
      if (typeof value === 'string' && value.trim()) query[key] = value.trim()
    }
    const sort = to.query.sort
    if (typeof sort === 'string' && ['newest', 'price-asc', 'price-desc'].includes(sort)) query.sort = sort
    const page = to.query.page
    if (typeof page === 'string' && /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page))) query.page = page
    if (query.year && !/^\d{4}$/.test(query.year)) delete query.year
    return navigateTo({ path: '/brands', query }, { redirectCode: 301, replace: true })
  }],
})
</script>

<template>
  <div />
</template>

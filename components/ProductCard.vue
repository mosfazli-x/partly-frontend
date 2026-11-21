<script setup lang="ts">
const props = withDefaults(defineProps<{ product: any; showAdd?: boolean }>(), { showAdd: true })
defineEmits<{ add: [product: any] }>()
const { money } = useMarketplace()
const percent = computed(() => discountPercent(props.product?.compareAt, props.product?.price))
const lowStock = computed(() => Number(props.product?.stock) > 0 && Number(props.product?.stock) <= 3)
const stockLabel = computed(() => {
  if (!props.product?.stock) return 'ناموجود'
  return lowStock.value ? `تنها ${Number(props.product.stock).toLocaleString('fa-IR')} عدد` : 'موجود'
})
</script>

<template>
  <article class="product-card">
    <NuxtLink :to="`/products/${product.slug}`" class="product-visual">
      <img :src="product.image" :alt="product.name" loading="lazy" class="h-36 w-4/5 object-contain" @error="($event.target as HTMLImageElement).style.visibility='hidden'">
      <span v-if="percent" class="discount-badge" :aria-label="`${percent} درصد تخفیف`">٪{{ percent.toLocaleString('fa-IR') }}</span>
      <span class="stock-label" :class="{ '!text-red-600': !product.stock, 'is-low': lowStock }">{{ stockLabel }}</span>
    </NuxtLink>
    <div class="p-5">
      <p class="mb-2 text-xs text-slate-400">{{ product.brand }}<template v-if="product.category?.name"> • {{ product.category.name }}</template></p>
      <NuxtLink :to="`/products/${product.slug}`" class="block min-h-12 text-sm font-bold leading-6">{{ product.name }}</NuxtLink>
      <div class="mt-5 flex flex-wrap items-end justify-between gap-2">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <strong class="text-sm">{{ money(product.price) }}</strong>
          <s v-if="percent" class="text-xs text-slate-400">{{ money(product.compareAt) }}</s>
        </div>
        <button v-if="showAdd" class="market-secondary" :disabled="!product.stock" :aria-label="`افزودن ${product.name} به سبد`" @click="$emit('add', product)">+ سبد</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.discount-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #df592e;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.stock-label.is-low { color: #b45309; }
</style>

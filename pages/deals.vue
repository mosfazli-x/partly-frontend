<script setup lang="ts">
const { api, add, message } = useMarketplace()
const products = ref<any[]>([]), page = ref(1), total = ref(0), pages = ref(0), busy = ref(true), error = ref(''), notice = ref('')

async function load(reset = false) {
  if (reset) page.value = 1
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const result: any = await api(`/api/products?deals=true&sort=discount&limit=24&page=${page.value}`)
    products.value = result.products || []
    total.value = result.total
    pages.value = result.pages
  } catch (e) {
    error.value = message(e); products.value = []
  } finally {
    busy.value = false
  }
}
function addItem(product: any) { add(product); notice.value = `${product.name} به سبد خرید اضافه شد.` }
onMounted(load)
useHead({ title: 'فروش ویژه | پارتلی' })
</script>

<template>
  <section class="shell deals-page" dir="rtl">
    <nav class="breadcrumb" aria-label="مسیر صفحه">
      <NuxtLink to="/">خانه</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">فروش ویژه</span>
    </nav>
    <header class="deals-hero">
      <div>
        <p class="market-eyebrow">تخفیف‌های فعال</p>
        <h1 class="market-title">فروش ویژه قطعات</h1>
        <p>قطعات منتخب با قیمت کاهش‌یافته؛ موجودی و مهلت تخفیف محدود است.</p>
      </div>
      <span class="deals-count">{{ total.toLocaleString('fa-IR') }} کالا</span>
    </header>

    <div v-if="error" class="market-error" role="alert">{{ error }} <button type="button" class="underline" @click="load()">تلاش دوباره</button></div>
    <p v-if="notice" class="market-success" role="status">{{ notice }} <NuxtLink to="/cart" class="underline">مشاهده سبد</NuxtLink></p>
    <p v-if="busy" class="market-empty" role="status">در حال دریافت تخفیف‌ها…</p>
    <div v-else-if="products.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ProductCard v-for="product in products" :key="product.id" :product="product" @add="addItem" />
    </div>
    <div v-else-if="!error" class="market-panel market-empty">
      <h2>در حال حاضر تخفیفی فعال نیست.</h2>
      <p>کالاهای موجود را ببینید؛ تخفیف‌های تازه به‌زودی اضافه می‌شوند.</p>
      <NuxtLink to="/brands" class="market-primary deals-empty-link">مشاهده قطعات</NuxtLink>
    </div>

    <nav v-if="pages > 1 && !busy" class="mt-8 flex items-center justify-center gap-4" aria-label="صفحه‌بندی">
      <button class="market-secondary" :disabled="page <= 1" @click="page--;load()">قبلی</button>
      <span class="text-sm">{{ page }} / {{ pages }}</span>
      <button class="market-secondary" :disabled="page >= pages" @click="page++;load()">بعدی</button>
    </nav>
  </section>
</template>

<style scoped>
.deals-page { padding-block: 32px 72px; color: #202623; background: #f8f7f4; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; font-size: 12px; color: #656b65; }
.breadcrumb a:hover { color: #b5411e; }
.deals-hero { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 36px; }
.deals-hero p:last-child { color: #656b65; font-size: 13px; line-height: 2; }
.deals-count { padding: 6px 14px; border: 1px solid #dedfd8; border-radius: 999px; background: #fff; color: #656b65; font-size: 12px; }
.deals-empty-link { margin-top: 24px; }
@media (max-width: 479px) {
  .deals-page { padding-block: 24px 48px; }
}
</style>

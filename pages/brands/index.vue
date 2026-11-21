<script setup lang="ts">
const { api, add, money, message } = useMarketplace()
const route = useRoute(), router = useRouter()

const failedImages = ref<Record<string, boolean>>({})
const selectedMake = computed(() => makes.value.find((make: any) => make.id === makeId.value))
const vehicleLabel = computed(() => [selectedMake.value?.name, selectedModel.value?.name, year.value].filter(Boolean).join(' / '))
let mounted = false
let writtenQuery = ''
const makeList = ref<any[]>([]), categoryList = ref<any[]>([])
const makeId = ref(String(route.query.makeId || ''))
const modelId = ref(String(route.query.modelId || ''))
const year = ref(String(route.query.year || ''))
const category = ref(String(route.query.category || ''))
const query = ref(String(route.query.q || ''))
const sort = ref(['newest', 'price-asc', 'price-desc'].includes(String(route.query.sort)) ? String(route.query.sort) : 'newest')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const products = ref<any[]>([]), total = ref(0), pages = ref(0)
const busy = ref(true), error = ref(''), notice = ref('')
const vehicleBusy = ref(true), vehicleError = ref('')
let request = 0, vehicleRequest = 0

useHead({
  title: 'خرید قطعات خودرو | پارتلی',
  meta: [{ name: 'description', content: 'فهرست قطعات و لوازم یدکی خودرو پارتلی با فیلتر برند خودرو، مدل، سال ساخت و دسته‌بندی.' }],
})

// Brand here means the vehicle make: the filter narrows fitment, never the part manufacturer.
const makes = computed(() => makeList.value.filter((make: any) => (make.models || []).length))
const models = computed((): any[] => makeList.value.find((make: any) => make.id === makeId.value)?.models || [])
const selectedModel = computed((): any => models.value.find((model: any) => model.id === modelId.value) || null)
const categoryTree = computed(() => filterCategoryTreeByEquipment(categoryList.value as any, 'CAR'))
const categories = computed(() => flattenCategoryTree(categoryTree.value))

// Only explicit trim years are trusted; model production dates do not prove trim fitment.
function yearRange(value: string | null | undefined) {
  const match = String(value || '').trim().match(/^(\d{4})(?:\s*[-–—]\s*(\d{4}))?$/)
  if (!match) return null
  const from = Number(match[1]), to = Number(match[2] ?? match[1])
  return from >= 1886 && to <= 2100 && from <= to ? { from, to } : null
}
const knownYears = computed(() => {
  const ranges = (selectedModel.value?.variants || []).map((variant: any) => yearRange(variant.years)).filter(Boolean) as { from: number; to: number }[]
  if (!ranges.length) return []
  const years = new Set<number>()
  for (const range of ranges) {
    for (let value = range.from; value <= range.to; value++) years.add(value)
  }
  return [...years].sort((a, b) => b - a)
})
const yearHint = computed(() => {
  if (!modelId.value) return 'ابتدا مدل خودرو را انتخاب کنید.'
  if (!knownYears.value.length) return 'بازه سال ساخت این مدل ثبت نشده است.'
  return 'سال ساخت میلادی (شمسی در سامانه ثبت نشده)'
})
const activeFilters = computed(() => {
  const chips: { key: string; label: string }[] = []
  const make = makes.value.find((item: any) => item.id === makeId.value)
  if (make) chips.push({ key: 'make', label: make.name })
  if (selectedModel.value) chips.push({ key: 'model', label: selectedModel.value.name })
  if (year.value) chips.push({ key: 'year', label: `سال ${Number(year.value).toLocaleString('fa-IR', { useGrouping: false })}` })
  if (category.value) chips.push({ key: 'category', label: categories.value.find((item: any) => item.slug === category.value)?.name || category.value })
  if (query.value.trim()) chips.push({ key: 'query', label: `«${query.value.trim()}»` })
  return chips
})

async function loadVehicles() {
  const current = ++vehicleRequest
  vehicleBusy.value = true; vehicleError.value = ''
  try {
    const [vehicles, allCategories] = await Promise.all([api('/api/vehicles?type=CAR'), api('/api/categories')])
    if (current !== vehicleRequest) return
    makeList.value = Array.isArray(vehicles) ? vehicles : []
    categoryList.value = Array.isArray(allCategories) ? allCategories : []
    if (category.value && !findCategoryNode(categoryTree.value, category.value)) category.value = ''
    if (makeId.value && !makes.value.some((item: any) => item.id === makeId.value)) makeId.value = ''
    if (modelId.value && !selectedModel.value) modelId.value = ''
    if (year.value && !knownYears.value.includes(Number(year.value))) year.value = ''
  } catch (e) {
    if (current === vehicleRequest) vehicleError.value = message(e)
  } finally {
    if (current === vehicleRequest) vehicleBusy.value = false
  }
}

function queryParams() {
  return {
    sort: sort.value, page: page.value, limit: 12,
    ...(makeId.value && { makeId: makeId.value }),
    ...(modelId.value && { modelId: modelId.value }),
    ...(year.value && { year: year.value }),
    ...(category.value && { category: category.value }),
    ...(query.value.trim() && { q: query.value.trim() }),
  }
}
function queryKey(value: Record<string, unknown>) {
  return JSON.stringify(Object.entries(value).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]).sort(([a], [b]) => a.localeCompare(b)))
}
async function syncUrl() {
  const { limit: _limit, ...params } = queryParams()
  writtenQuery = queryKey(params)
  if (queryKey(route.query) !== writtenQuery) await router.replace({ query: params })
}

async function load(reset = false) {
  if (reset) page.value = 1
  const current = ++request
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await syncUrl()
    if (current !== request) return
    const params = new URLSearchParams({ vehicleType: 'CAR' })
    for (const [key, value] of Object.entries(queryParams())) params.set(key, String(value))
    const result: any = await api(`/api/products?${params}`)
    if (current !== request) return
    products.value = result.products || []
    total.value = result.total || 0
    pages.value = result.pages || 0
  } catch (e) {
    if (current === request) { error.value = message(e); products.value = []; total.value = 0; pages.value = 0 }
  } finally {
    if (current === request) busy.value = false
  }
}

function onMake() { modelId.value = ''; year.value = ''; load(true) }
function onModel() { year.value = ''; load(true) }
function onYear() { load(true) }
function clearYear() { year.value = ''; load(true) }
function clearVehicle() { makeId.value = ''; modelId.value = ''; year.value = ''; load(true) }
function clearFilter(key: string) {
  if (key === 'make') return clearVehicle()
  if (key === 'model') { modelId.value = ''; year.value = '' }
  if (key === 'year') year.value = ''
  if (key === 'category') category.value = ''
  if (key === 'query') query.value = ''
  load(true)
}
function goToPage(next: number) {
  page.value = next
  load()
  requestAnimationFrame(() => document.getElementById('product-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function addItem(product: any) {
  if (!product.stock) return
  add(product)
  notice.value = `${product.name} به سبد خرید اضافه شد.`
}
function resetFilters() {
  makeId.value = ''; modelId.value = ''; year.value = ''; category.value = ''; query.value = ''
  load(true)
}
function retry() { error.value ? load() : loadVehicles() }

watch(() => route.query, (params) => {
  if (!mounted || queryKey(params) === writtenQuery) return
  makeId.value = String(params.makeId || '')
  modelId.value = String(params.modelId || '')
  year.value = String(params.year || '')
  category.value = String(params.category || '')
  query.value = String(params.q || '')
  sort.value = ['newest', 'price-asc', 'price-desc'].includes(String(params.sort)) ? String(params.sort) : 'newest'
  page.value = Math.max(1, Math.floor(Number(params.page) || 1))
  if (!models.value.some((model: any) => model.id === modelId.value)) modelId.value = ''
  if (!knownYears.value.includes(Number(year.value))) year.value = ''
  load()
})
onMounted(async () => { await loadVehicles(); await load(); mounted = true })
</script>

<template>
  <div class="store-page">
    <section class="store-head">
      <div class="shell">
        <nav class="store-breadcrumb" aria-label="مسیر صفحه"><NuxtLink to="/">انتخاب وسیله نقلیه</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">قطعات خودرو</span></nav>
        <div class="store-title-row">
          <div>
            <p class="store-eyebrow">قدم دوم / قطعه مناسب را پیدا کنید</p>
            <h1 class="store-title">قطعه درست، <span>برای خودروی شما.</span></h1>
            <p class="store-lead">خودرویتان را معرفی کنید؛ پیدا کردن قطعه را ساده‌تر می‌کنیم.</p>
          </div>
          <NuxtLink to="/" class="store-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3 15 2-6h14l2 6v5h-3v-3H6v3H3v-5Zm3-6 2-5h8l2 5M6 13h2m8 0h2"/></svg>
            خودرو سواری <span>تغییر نوع</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <main class="shell store-main">
      <section class="filter-panel" aria-labelledby="filters-title">
        <div class="filter-head">
          <div class="filter-heading"><span class="filter-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg></span><div><h2 id="filters-title">خودروی شما چیست؟</h2><p>انتخاب خودرو اختیاری است؛ می‌توانید همه قطعات را هم ببینید.</p></div></div>
          <p v-if="vehicleError" class="filter-error" role="alert">{{ vehicleError }} <button type="button" @click="loadVehicles">تلاش دوباره</button></p>
          <p v-else-if="vehicleBusy" class="filter-note" role="status">در حال دریافت فهرست خودروها…</p>
          <p v-else-if="!makes.length" class="filter-note">فهرست خودروها هنوز در دسترس نیست؛ برای پذیرش فیلتر خودرو داده‌ای ثبت نشده است.</p>
          <button v-if="makeId" type="button" class="filter-clear" @click="clearVehicle">حذف فیلتر خودرو</button>
        </div>

        <div class="filter-grid">
          <label class="filter-field">
            <span><b class="field-step">۱</b> برند خودرو</span>
            <select v-model="makeId" :disabled="!makes.length" @change="onMake">
              <option value="">همه برندها</option>
              <option v-for="make in makes" :key="make.id" :value="make.id">{{ make.name }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span><b class="field-step">۲</b> مدل خودرو</span>
            <select v-model="modelId" :disabled="!makeId || !models.length" @change="onModel">
              <option value="">{{ makeId ? 'همه مدل‌ها' : 'ابتدا برند را انتخاب کنید' }}</option>
              <option v-for="model in models" :key="model.id" :value="model.id">{{ model.name }}</option>
            </select>
          </label>
          <label class="filter-field">
            <span><b class="field-step">۳</b> سال ساخت <em>میلادی</em></span>
            <select v-model="year" :disabled="!knownYears.length" aria-describedby="year-hint" @change="onYear">
              <option value="">{{ knownYears.length ? 'همه سال‌ها' : 'در دسترس نیست' }}</option>
              <option v-for="value in knownYears" :key="value" :value="String(value)">{{ value.toLocaleString('fa-IR', { useGrouping: false }) }}</option>
            </select>
            <small id="year-hint">{{ yearHint }}</small>
          </label>
          <div class="filter-field filter-field-tree">
            <span>دسته‌بندی</span>
            <CategoryPicker v-model="category" :categories="categoryTree" placeholder="همه دسته‌ها" aria-label="فیلتر دسته‌بندی" @change="load(true)" />
          </div>
          <form class="filter-search" role="search" @submit.prevent="load(true)">
            <label class="filter-field">
              <span>جستجو</span>
              <input v-model="query" type="search" placeholder="نام قطعه، برند یا کد فنی…">
            </label>
            <button type="submit" class="filter-submit">جستجو</button>
          </form>
          <div class="vehicle-context"><span class="context-dot" aria-hidden="true"></span><strong>{{ vehicleLabel || 'همه خودروهای سواری' }}</strong><small>{{ vehicleLabel ? 'نتایج بر اساس سازگاری با انتخاب شما' : 'با انتخاب خودرو، نتایج دقیق‌تری ببینید' }}</small></div>
        </div>
      </section>

      <div class="results-bar">
        <div class="results-summary" aria-live="polite">
          <strong>{{ busy ? 'در حال بارگذاری…' : `${total.toLocaleString('fa-IR')} کالا` }}</strong>
          <ul v-if="activeFilters.length" class="results-chips" aria-label="فیلترهای فعال">
            <li v-for="filter in activeFilters" :key="filter.key">
              <button type="button" :aria-label="`حذف فیلتر ${filter.label}`" @click="clearFilter(filter.key)">
                {{ filter.label }} <span aria-hidden="true">×</span>
              </button>
            </li>
          </ul>
        </div>
        <label class="sort-select">
          <span>مرتب‌سازی</span>
          <select v-model="sort" @change="load(true)">
            <option value="newest">جدیدترین</option>
            <option value="price-asc">ارزان‌ترین</option>
            <option value="price-desc">گران‌ترین</option>
          </select>
        </label>
      </div>

      <div id="product-results" class="scroll-target" aria-live="polite" :aria-busy="busy">
        <div v-if="notice" class="market-success" role="status">{{ notice }} <NuxtLink to="/cart" class="underline">مشاهده سبد</NuxtLink></div>
        <div v-if="error" class="market-error" role="alert">{{ error }} <button type="button" class="underline" @click="retry">تلاش دوباره</button></div>

        <ul v-if="busy" class="product-grid" aria-hidden="true">
          <li v-for="index in 8" :key="index" class="product-skeleton"><span></span><span></span><span></span></li>
        </ul>
        <ul v-else-if="products.length" class="product-grid">
          <li v-for="product in products" :key="product.id" class="product-card">
            <NuxtLink :to="`/products/${product.slug}`" class="product-media">
              <img v-if="product.image && !failedImages[product.id]" :src="product.image" :alt="product.name" loading="lazy" decoding="async" width="320" height="240" @error="failedImages[product.id] = true">
              <span v-else class="product-fallback" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m28 7 4 8 9 2-6 7 1 10-9-4-8 5-2-10-8-5 9-4 2-9Z"/><circle cx="25" cy="22" r="6"/></svg></span>
              <span class="stock-badge" :class="{ 'is-out': !product.stock }">{{ product.stock ? 'موجود' : 'ناموجود' }}</span>
            </NuxtLink>
            <div class="product-body">
              <p class="product-meta">{{ [product.brand, product.category?.name, product.packaging ? `بسته‌بندی: ${packagingLabel(product.packaging)}` : null].filter(Boolean).join(' • ') || 'قطعه عمومی' }}</p>
              <NuxtLink :to="`/products/${product.slug}`" class="product-name">{{ product.name }}</NuxtLink>
              <div class="product-foot">
                <strong>{{ money(product.price) }}</strong>
                <button type="button" class="product-add" :disabled="!product.stock" :aria-label="`افزودن ${product.name} به سبد خرید`" @click="addItem(product)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  افزودن
                </button>
              </div>
            </div>
          </li>
        </ul>
        <div v-else-if="!error" class="products-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m14 7 3 3m-4.5 1.5 3 3M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2Z"/></svg>
          <strong>{{ activeFilters.length ? 'کالایی با این فیلترها پیدا نشد.' : 'هنوز کالایی در این فروشگاه ثبت نشده است.' }}</strong>
          <p>{{ activeFilters.length ? 'فیلترها را تغییر دهید یا قطعه را با نام دیگری جستجو کنید.' : 'به‌زودی قطعات خودرو در پارتلی ارائه می‌شود.' }}</p>
          <button v-if="activeFilters.length" type="button" @click="resetFilters">نمایش همه کالاها</button>
        </div>

        <nav v-if="pages > 1 && !busy" class="pagination" aria-label="صفحه‌بندی">
          <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">قبلی</button>
          <span>{{ page.toLocaleString('fa-IR') }} از {{ pages.toLocaleString('fa-IR') }}</span>
          <button type="button" :disabled="page >= pages" @click="goToPage(page + 1)">بعدی</button>
        </nav>
      </div>
    </main>
  </div>
</template>

<style scoped>
.store-page { --ink: #191b1d; --muted: #686c6e; --border: #e5e5e1; --accent: #b73c16; min-height: 60vh; background: #f5f5f2; padding-bottom: 56px; }
.store-head { border-bottom: 1px solid var(--border); background: #f5f5f2; }
.store-head .shell { padding-block: 32px 26px; }
.store-eyebrow { color: var(--accent); font-size: 11px; font-weight: 600; }
.store-title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-top: 8px; }
.store-title { font-size: clamp(28px, 3.2vw, 40px); font-weight: 800; line-height: 1.5; letter-spacing: -1.4px; }
.store-lead { margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.9; }
.store-back { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; color: #505457; font-size: 12px; white-space: nowrap; transition: color .2s; }
.store-back:hover { color: var(--accent); }
.store-back svg { width: 17px; height: 17px; }
.store-main { padding-top: 22px; }
.filter-panel { padding: 20px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.filter-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 14px; margin-bottom: 14px; }
.filter-head h2 { font-size: 15px; font-weight: 800; }
.filter-note, .filter-error { color: var(--muted); font-size: 11px; }
.filter-error { color: #a03018; }
.filter-error button { text-decoration: underline; }
.filter-clear { margin-inline-start: auto; min-height: 32px; padding-inline: 10px; border-radius: 8px; color: var(--accent); font-size: 11px; font-weight: 700; }
.filter-clear:hover { background: #fbf0eb; }
.filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.filter-field > span { color: #55595b; font-size: 11px; font-weight: 600; }
.filter-field select, .filter-field input, .sort-select select { width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid #dcddd8; border-radius: 10px; background: #fff; color: var(--ink); font: inherit; font-size: 12px; transition: border-color .2s, box-shadow .2s; }
.filter-field select:hover:not(:disabled), .filter-field input:hover, .sort-select select:hover { border-color: #b9bcb5; }
.filter-field select:focus-visible, .filter-field input:focus-visible, .sort-select select:focus-visible, .filter-submit:focus-visible, .results-chips button:focus-visible, .product-add:focus-visible, .pagination button:focus-visible, .products-empty button:focus-visible, .filter-clear:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.filter-field select:disabled { background: #f4f4f0; color: #949a96; cursor: not-allowed; }
.filter-field small { color: #8a8e8f; font-size: 10px; line-height: 1.7; }
.filter-field input[type="search"]::-webkit-search-cancel-button { display: none; }
.filter-search { grid-column: span 4; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 10px; }
.filter-submit { min-height: 44px; padding-inline: 26px; border-radius: 10px; background: var(--ink); color: #fff; font: inherit; font-size: 12px; font-weight: 700; transition: background .2s; }
.filter-submit:hover { background: #33373a; }
.results-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 18px; margin: 24px 0 18px; }
.results-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-height: 32px; }
.results-summary > strong { font-size: 13px; }
.results-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.results-chips button { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding-inline: 10px; border: 1px solid #dfe0da; border-radius: 999px; background: #fff; color: #46494b; font: inherit; font-size: 11px; transition: border-color .2s, color .2s; }
.results-chips button:hover { border-color: #b9bcb5; color: var(--accent); }
.results-chips span { font-size: 13px; line-height: 1; }
.sort-select { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; }
.sort-select select { width: auto; min-width: 130px; }
.scroll-target { scroll-margin-top: 24px; }
.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.product-card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border); border-radius: 16px; background: #fff; transition: border-color .25s, box-shadow .25s, transform .25s; }
.product-card:hover { border-color: #cfd1ca; box-shadow: 0 12px 28px rgba(25, 27, 29, .06); transform: translateY(-2px); }
.product-media { position: relative; display: grid; place-items: center; height: 170px; background: #f0f0eb; }
.product-media img { max-width: 82%; max-height: 78%; object-fit: contain; transition: transform .35s ease; }
.product-card:hover .product-media img { transform: scale(1.04); }
.product-fallback { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 18px; background: #e4e5de; color: #8f938c; font-size: 24px; font-weight: 800; }
.stock-badge { position: absolute; inset-block-start: 12px; inset-inline-end: 12px; padding: 3px 9px; border-radius: 999px; background: #fff; color: #2c7a4b; font-size: 10px; font-weight: 700; box-shadow: 0 1px 3px rgba(0, 0, 0, .06); }
.stock-badge.is-out { color: #a0322a; }
.product-body { display: flex; flex: 1; flex-direction: column; padding: 14px 16px 16px; }
.product-meta { overflow: hidden; color: #92968f; font-size: 10px; line-height: 1.8; text-overflow: ellipsis; white-space: nowrap; }
.product-name { display: -webkit-box; overflow: hidden; margin-top: 4px; font-size: 13px; font-weight: 700; line-height: 1.9; -webkit-box-orient: vertical; -webkit-line-clamp: 2; transition: color .2s; }
.product-name:hover { color: var(--accent); }
.product-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 14px; }
.product-foot strong { font-size: 13px; }
.product-add { display: inline-flex; align-items: center; gap: 4px; min-height: 34px; padding-inline: 10px; border: 1px solid #dfe0da; border-radius: 9px; background: #fff; color: #3d4143; font: inherit; font-size: 11px; font-weight: 700; transition: border-color .2s, color .2s, background .2s; }
.product-add svg { width: 14px; height: 14px; }
.product-add:hover:not(:disabled) { border-color: var(--ink); background: var(--ink); color: #fff; }
.product-add:disabled { opacity: .45; cursor: not-allowed; }
.product-skeleton { overflow: hidden; height: 292px; border: 1px solid #ecece7; border-radius: 16px; background: #fff; }
.product-skeleton span { display: block; background: #f0f0eb; animation: pulse 1.4s ease-in-out infinite alternate; }
.product-skeleton span:nth-child(1) { height: 170px; }
.product-skeleton span:nth-child(2) { width: 64%; height: 12px; margin: 20px 16px 0; border-radius: 4px; }
.product-skeleton span:nth-child(3) { width: 38%; height: 12px; margin: 12px 16px 0; border-radius: 4px; }
@keyframes pulse { to { opacity: .55; } }
.products-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 24px; border: 1px dashed #d6d8cf; border-radius: 18px; background: #fff; text-align: center; }
.products-empty svg { width: 34px; height: 34px; margin-bottom: 4px; color: #b7bbaf; }
.products-empty strong { font-size: 14px; }
.products-empty p { color: var(--muted); font-size: 12px; }
.products-empty button { margin-top: 10px; min-height: 38px; padding-inline: 16px; border: 1px solid #d9dbd2; border-radius: 9px; background: #fff; font: inherit; font-size: 12px; font-weight: 700; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 28px; font-size: 12px; }
.pagination button { min-height: 40px; min-width: 84px; padding-inline: 14px; border: 1px solid #dfe0da; border-radius: 10px; background: #fff; font: inherit; font-size: 12px; font-weight: 700; }
.pagination button:hover:not(:disabled) { border-color: var(--ink); }
.pagination button:disabled { opacity: .45; cursor: not-allowed; }
.market-success, .market-error { margin-bottom: 16px; }
@media (max-width: 1100px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) { .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filter-search { grid-column: span 2; } }
@media (max-width: 780px) { .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .store-head .shell { padding-block: 24px 20px; }
  .store-title-row { align-items: flex-start; flex-direction: column; gap: 6px; }
  .store-lead { font-size: 12px; }
  .store-main { padding-top: 16px; }
  .filter-panel { padding: 16px; border-radius: 16px; }
  .filter-search { grid-template-columns: minmax(0, 1fr) auto; }
  .filter-field small { display: none; }
  .results-bar { margin-block: 18px 14px; }
  .sort-select { width: 100%; justify-content: space-between; }
  .sort-select select { flex: 1; }
  .product-grid { gap: 12px; }
  .product-media { height: 136px; }
  .product-body { padding: 12px 12px 13px; }
  .product-foot { flex-wrap: wrap; }
  .product-add { min-height: 34px; }
}
.store-page { --ink: #202623; --muted: #737770; --border: #e6e6de; --accent: #c94822; background: #f8f7f4; padding-bottom: 80px; }
.store-head { background: transparent; border: 0; }
.store-head .shell { padding-block: 28px 36px; }
.store-breadcrumb { display: flex; gap: 12px; align-items: center; margin-bottom: 30px; font-size: 11px; color: #76796f; }
.store-breadcrumb a:hover { color: var(--accent); }
.store-breadcrumb [aria-current] { color: var(--ink); }
.store-eyebrow { color: var(--accent); font-size: 11px; }
.store-title-row { align-items: center; }
.store-title { font-size: clamp(28px, 3.7vw, 45px); line-height: 1.7; letter-spacing: -1.5px; margin-top: 8px; }
.store-title span { font-weight: 500; }
.store-lead { margin-top: 8px; }
.store-back { padding: 12px 16px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--ink); }
.store-back svg { width: 25px; height: 25px; }
.store-back span { margin-inline-start: 18px; color: var(--accent); font-size: 10px; }
.store-main { padding-top: 0; }
.filter-panel { padding: 26px; border-radius: 20px; box-shadow: 0 5px 20px #20262303; }
.filter-head { align-items: center; margin-bottom: 24px; }
.filter-heading { display: flex; align-items: center; gap: 12px; }
.filter-heading p { color: var(--muted); font-size: 11px; margin-top: 5px; line-height: 1.8; }
.filter-symbol { display: grid; place-items: center; width: 42px; height: 42px; background: #f5f5ee; border-radius: 12px; }
.filter-symbol svg { width: 23px; height: 23px; }
.filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.filter-field { gap: 9px; }
.filter-field > span { display: flex; gap: 7px; align-items: center; color: #444a43; font-size: 12px; }
.field-step { display: grid; place-items: center; width: 21px; height: 21px; border: 1px solid var(--border); border-radius: 6px; color: #73786d; font-size: 10px; font-weight: 500; }
.filter-field em { color: var(--muted); font-size: 10px; font-style: normal; font-weight: 400; }
.filter-field select, .filter-field input { min-height: 50px; border-color: var(--border); background: #fdfdfb; border-radius: 10px; }
.filter-field select:disabled { background: #f6f6f2; color: #74796f; }
.filter-grid > .filter-field:nth-child(4) { grid-column: 1; padding-top: 18px; border-top: 1px solid #efefe8; }
.filter-search { grid-column: 2 / 4; padding-top: 18px; border-top: 1px solid #efefe8; }
.filter-submit { min-height: 50px; background: var(--ink); }
.vehicle-context { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; padding-top: 3px; font-size: 11px; color: #4d5d48; }
.vehicle-context strong { font-weight: 500; }
.vehicle-context small { margin-inline-start: auto; color: var(--muted); font-size: 10px; }
.context-dot { width: 6px; height: 6px; border-radius: 50%; background: #789268; }
.results-bar { margin-block: 34px 20px; }
.results-summary > strong { font-size: 15px; }
.product-grid { gap: 20px; }
.product-card { border-radius: 15px; border-color: var(--border); }
.product-media { height: 210px; margin: 8px 8px 0; border-radius: 9px; background: #f5f5f0; }
.product-media img { width: 82%; height: 78%; }
.product-fallback { background: #ebede4; color: #8a9280; }
.product-fallback svg { width: 45px; height: 45px; }
.stock-badge { box-shadow: none; border: 1px solid #e6ebdf; font-weight: 500; }
.product-body { padding: 18px; }
.product-name { min-height: 50px; font-size: 14px; font-weight: 600; }
.product-meta { color: #74796f; font-size: 11px; }
.product-foot { margin-top: 18px; border-top: 1px solid #f0f0ea; }
.product-foot strong { font-size: 12px; }
.product-add { min-height: 38px; background: #faf0e9; color: #b6411e; border-color: #f1dfd2; font-weight: 500; }
.product-add:hover:not(:disabled) { background: #df592e; border-color: #df592e; }
.product-skeleton { height: 345px; }
.product-skeleton span:nth-child(1) { height: 210px; }
@media (max-width: 900px) {
  .filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .filter-search { grid-column: 2 / 4; }
  .product-grid { gap: 14px; }
  .product-media { height: 175px; }
}
@media (max-width: 640px) {
  .store-head .shell { padding-block: 20px 24px; }
  .store-breadcrumb { margin-bottom: 22px; }
  .store-title-row { align-items: flex-start; gap: 18px; }
  .store-title { font-size: 28px; letter-spacing: -.9px; }
  .store-title span { display: block; }
  .store-back { min-height: 44px; padding: 8px 12px; }
  .filter-panel { padding: 18px; }
  .filter-heading { gap: 9px; }
  .filter-heading p { font-size: 10px; }
  .filter-head { margin-bottom: 20px; }
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
  .filter-grid > .filter-field:nth-child(3) { grid-column: 1 / -1; }
  .filter-grid > .filter-field:nth-child(4) { grid-column: 1 / -1; }
  .filter-search { grid-column: 1 / -1; padding-top: 0; border: 0; }
  .filter-field small { display: block; }
  .filter-submit { padding-inline: 18px; }
  .vehicle-context { flex-wrap: wrap; line-height: 1.8; }
  .vehicle-context small { width: 100%; margin-inline-start: 14px; }
  .results-bar { margin-top: 24px; }
  .product-grid { gap: 10px; }
  .product-media { height: 140px; margin: 5px 5px 0; }
  .product-body { padding: 12px; }
  .product-name { font-size: 12px; min-height: 46px; }
  .product-meta { font-size: 10px; }
  .product-foot { margin-top: 12px; gap: 9px; }
  .product-foot strong { font-size: 11px; }
  .product-add { width: 100%; justify-content: center; }
  .stock-badge { inset-block-start: 8px; inset-inline-end: 7px; font-size: 9px; padding: 2px 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .product-card, .product-media img, .product-skeleton span { transition: none; animation: none; }
  .product-card:hover { transform: none; }
  .product-card:hover .product-media img { transform: none; }
}
</style>

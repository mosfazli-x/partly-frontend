<script setup lang="ts">
const { api, add, money, message } = useMarketplace()
const route = useRoute(), router = useRouter()
const props = withDefaults(defineProps<{ initialType?: 'CAR' | 'MOTORCYCLE'; showTypeToggle?: boolean }>(), { initialType: 'CAR', showTypeToggle: false })
const products = ref<any[]>([]), categories = ref<any[]>([]), makes = ref<any[]>([])
const vehicleType = ref<'CAR' | 'MOTORCYCLE'>(props.initialType)
const makeId = ref(''), modelId = ref(''), variantId = ref(String(route.query.variant || '')), query = ref(String(route.query.q || '')), category = ref(String(route.query.category || '')), sort = ref('newest'), page = ref(1), total = ref(0), pages = ref(0), busy = ref(true), error = ref(''), notice = ref('')
const selectedVehicle = ref<string | null>(null)
const models = computed(() => makes.value.find(m => m.id === makeId.value)?.models || [])
const variants = computed(() => models.value.find((m: any) => m.id === modelId.value)?.variants || [])
const isMoto = computed(() => vehicleType.value === 'MOTORCYCLE')
const makeLabel = computed(() => (isMoto.value ? 'برند موتورسیکلت' : 'سازنده خودرو'))
const modelLabel = computed(() => (isMoto.value ? 'مدل موتورسیکلت' : 'مدل خودرو'))
const variantLabel = computed(() => (isMoto.value ? 'تیپ موتورسیکلت' : 'تیپ خودرو'))
const vehicleBusy = ref(true), vehicleError = ref('')
// Keep the 3D garage in the codebase, but hide it until its model archive is ready.
const garageEnabled = useGarageEnabled()
let request = 0, vehicleRequest = 0

async function loadMakes() {
  const current = ++vehicleRequest
  vehicleBusy.value = true; vehicleError.value = ''
  try {
    const result = await api(`/api/vehicles?type=${vehicleType.value}`)
    if (current === vehicleRequest) makes.value = result
  } catch (e) {
    if (current === vehicleRequest) { vehicleError.value = message(e); makes.value = [] }
  } finally {
    if (current === vehicleRequest) vehicleBusy.value = false
  }
}

function selectVehicle(selection: { makeId: string; modelId: string; variantId: string }) {
  makeId.value = selection.makeId; modelId.value = selection.modelId; variantId.value = selection.variantId
  load(true)
}
function clearVehicle() {
  makeId.value = ''; modelId.value = ''; variantId.value = ''
  selectedVehicle.value = null
  load(true)
}

async function load(reset = false) {
  if (reset) page.value = 1
  const current = ++request
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '12', sort: sort.value })
    if (query.value.trim()) params.set('q', query.value.trim())
    if (category.value) params.set('category', category.value)
    const result: any = await api(variantId.value ? `/api/catalog/${variantId.value}?${params}` : `/api/products?${params}`)
    if (current !== request) return
    let list = result.products || []
    if (variantId.value) {
      selectedVehicle.value = result.vehicle ? `${result.vehicle.model?.make?.name || ''} ${result.vehicle.model?.name || ''} ${result.vehicle.name || ''}`.trim() : null
      if (sort.value !== 'newest') list.sort((a: any, b: any) => (Number(a.price) - Number(b.price)) * (sort.value === 'price-asc' ? 1 : -1))
      total.value = list.length
      pages.value = Math.ceil(list.length / 12)
      list = list.slice((page.value - 1) * 12, page.value * 12)
    } else {
      selectedVehicle.value = null
      total.value = result.total
      pages.value = result.pages
    }
    products.value = list
  } catch (e) {
    if (current === request) { error.value = message(e); products.value = [] }
  } finally {
    if (current === request) busy.value = false
  }
}

async function switchType(type: 'CAR' | 'MOTORCYCLE') {
  if (vehicleType.value === type) return
  vehicleType.value = type
  makeId.value = ''; modelId.value = ''; variantId.value = ''
  selectedVehicle.value = null
  await loadMakes()
  await load(true)
}

onMounted(async () => {
  try {
    ;[categories.value] = await Promise.all([api('/api/categories')])
    await loadMakes()
  } catch (e) {
    error.value = message(e)
  }
  await load()
})

// Brand pages link straight to a model's first trim. Resolve its make and model
// from the loaded vehicle tree so the compact filters always reflect it.
const linkedVariant = computed(() => {
  const linked = String(route.query.variant || '')
  if (!linked) return null
  for (const make of makes.value) for (const model of make.models || []) {
    const variant = (model.variants || []).find((item: any) => item.id === linked)
    if (variant) return { makeId: make.id, modelId: model.id, variantId: variant.id }
  }
  return null
})
watch(linkedVariant, linked => {
  if (!linked || linked.variantId === variantId.value) return
  makeId.value = linked.makeId; modelId.value = linked.modelId; variantId.value = linked.variantId
  load(true)
}, { immediate: true })

function addItem(p: any) { add(p); notice.value = `${p.name} به سبد خرید اضافه شد.` }

async function search() {
  await router.replace({ query: { ...route.query, q: query.value || undefined, category: category.value || undefined } })
  await load(true)
}

watch(() => route.query.q, q => { query.value = String(q || ''); load(true) })
</script>
<template>
  <section class="shell py-12" id="catalog">
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="market-eyebrow">کاتالوگ پارتلی</p>
        <h2 class="market-title">{{ isMoto ? 'قطعه مناسب موتورسیکلت شما' : 'قطعه مناسب خودروی شما' }}</h2>
        <p class="text-sm text-slate-500">انتخاب {{ isMoto ? 'موتورسیکلت' : 'خودرو' }} اختیاری است؛ با انتخاب تیپ، فقط قطعات سازگار نمایش داده می‌شوند.</p>
      </div>
      <span class="market-badge">{{ total.toLocaleString('fa-IR') }} کالا</span>
    </div>

    <div v-if="showTypeToggle" class="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1" role="tablist" aria-label="نوع وسیله نقلیه">
      <button type="button" role="tab" :aria-selected="!isMoto" class="rounded-xl px-5 py-2 text-sm font-bold transition" :class="!isMoto ? 'bg-slate-900 text-white' : 'text-slate-500'" @click="switchType('CAR')">🚗 خودرو</button>
      <button type="button" role="tab" :aria-selected="isMoto" class="rounded-xl px-5 py-2 text-sm font-bold transition" :class="isMoto ? 'bg-slate-900 text-white' : 'text-slate-500'" @click="switchType('MOTORCYCLE')">🏍️ موتورسیکلت</button>
    </div>

    <VehicleGarage v-if="!isMoto && garageEnabled" :makes="makes" :make-id="makeId" :model-id="modelId" :variant-id="variantId" :loading="vehicleBusy" :error="vehicleError" @select="selectVehicle" @clear="clearVehicle" @retry="loadMakes" />
    <VehicleBrandStrip v-if="!isMoto && !garageEnabled" />
    <div v-if="vehicleError && (isMoto || garageEnabled)" class="market-error" role="alert">{{ vehicleError }} <button type="button" class="underline" @click="loadMakes">تلاش دوباره</button></div>

    <form class="market-panel mb-7" @submit.prevent="search">
      <div class="grid gap-4" :class="isMoto ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-1'">
        <label v-if="isMoto" class="market-label">{{ makeLabel }}
          <select v-model="makeId" class="market-input" @change="modelId='';variantId='';load(true)">
            <option value="">همه {{ makeLabel }}</option>
            <option v-for="m in makes" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label v-if="isMoto" class="market-label">{{ modelLabel }}
          <select v-model="modelId" :disabled="!makeId" class="market-input" @change="variantId='';load(true)">
            <option value="">همه مدل‌ها</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </label>
        <label v-if="isMoto" class="market-label">{{ variantLabel }}
          <select v-model="variantId" :disabled="!modelId" class="market-input" @change="load(true)">
            <option value="">همه تیپ‌ها</option>
            <option v-for="v in variants" :key="v.id" :value="v.id">{{ v.name }}</option>
          </select>
        </label>
        <label class="market-label">دسته‌بندی
          <select v-model="category" class="market-input" @change="load(true)">
            <option value="">همه دسته‌ها</option>
            <template v-for="c in categories" :key="c.id">
              <option :value="c.slug">{{ c.name }}</option>
              <option v-for="child in c.children" :key="child.id" :value="child.slug">— {{ child.name }}</option>
            </template>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap gap-3">
        <input v-model="query" aria-label="جستجوی نام قطعه یا کد کالا" placeholder="نام قطعه، برند یا کد فنی…" class="market-input min-w-0 flex-1">
        <button class="market-primary">جستجو</button>
        <select v-model="sort" aria-label="مرتب‌سازی" class="market-input sm:w-auto" @change="load(true)">
          <option value="newest">جدیدترین</option>
          <option value="price-asc">ارزان‌ترین</option>
          <option value="price-desc">گران‌ترین</option>
        </select>
      </div>
    </form>

    <div v-if="makes.length" class="mb-8 market-panel rounded-xl border border-slate-200 p-6">
      <h3 class="mb-4 text-lg font-bold">همه خودروها</h3>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="m in makes" :key="m.id" class="rounded-lg border border-slate-100 p-4">
          <h4 class="mb-3 text-base font-semibold">{{ m.name }}</h4>
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="model in m.models" :key="model.id" class="rounded border border-slate-200 p-3">
              <p class="mb-2 text-sm font-medium">{{ model.name }}</p>
              <ul class="space-y-1">
                <li v-for="variant in model.variants" :key="variant.id" class="text-sm">
                  <button type="button" class="w-full text-left underline underline-offset-4 hover:text-slate-900" @click="selectVehicle({ makeId: m.id, modelId: model.id, variantId: variant.id })">{{ variant.name }}</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="catalog-results" class="scroll-mt-28" aria-live="polite" :aria-busy="busy">
    <div v-if="error" class="market-error" role="alert">{{ error }} <button class="underline" @click="load()">تلاش دوباره</button></div>
    <div v-if="notice" class="market-success" role="status">{{ notice }} <NuxtLink to="/cart" class="underline">مشاهده سبد</NuxtLink></div>
    <p v-if="busy" class="market-empty" role="status">در حال دریافت کالاها…</p>
    <div v-else-if="products.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <article v-for="p in products" :key="p.id" class="product-card">
        <NuxtLink :to="`/products/${p.slug}`" class="product-visual">
          <img :src="p.image" :alt="p.name" loading="lazy" class="h-36 w-4/5 object-contain" @error="($event.target as HTMLImageElement).style.visibility='hidden'">
          <span class="stock-label" :class="{ '!text-red-600': !p.stock }">{{ p.stock ? 'موجود' : 'ناموجود' }}</span>
        </NuxtLink>
        <div class="p-5">
          <p class="mb-2 text-xs text-slate-400">{{ p.brand }} • {{ p.category?.name }}</p>
          <NuxtLink :to="`/products/${p.slug}`" class="block min-h-12 text-sm font-bold leading-6">{{ p.name }}</NuxtLink>
          <div class="mt-5 flex items-center justify-between gap-2">
            <strong class="text-sm">{{ money(p.price) }}</strong>
            <button class="market-secondary" :disabled="!p.stock" :aria-label="`افزودن ${p.name} به سبد`" @click="addItem(p)">+ سبد</button>
          </div>
        </div>
      </article>
    </div>
    <p v-else-if="!error && selectedVehicle" class="market-panel market-empty">هیچ قطعه‌ای برای {{ selectedVehicle }} ثبت نشده است.</p>
    <p v-else-if="!error" class="market-panel market-empty">کالایی با این فیلترها یافت نشد. جستجو یا {{ isMoto ? 'موتورسیکلت' : 'خودرو' }} دیگری را امتحان کنید.</p>

    <nav v-if="pages > 1 && !busy" class="mt-8 flex items-center justify-center gap-4" aria-label="صفحه‌بندی">
      <button class="market-secondary" :disabled="page <= 1" @click="page--;load()">قبلی</button>
      <span class="text-sm">{{ page }} / {{ pages }}</span>
      <button class="market-secondary" :disabled="page >= pages" @click="page++;load()">بعدی</button>
    </nav>
    </div>
  </section>
</template>

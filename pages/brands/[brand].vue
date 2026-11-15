<script setup lang="ts">
import { brandGroups, carBrands, getBrandMakeSlugs, getCarBrand, isBrandAvailable, type CarBrand } from '~/utils/carBrands'

type Variant = { id: string; name: string; faName?: string | null; enName?: string | null; body?: string | null; engine?: string | null; years?: string | null; transmission?: string | null; marketStatus?: string | null }
type Model = { id: string; name: string; faName?: string | null; enName?: string | null; slug: string; body?: string | null; manufacturer?: string | null; variants: Variant[] }
type Make = { id: string; name: string; faName?: string | null; enName?: string | null; slug: string; models: Model[] }
type MakeSummary = { slug: string; _count: { models: number } }

const route = useRoute()
const { api, message } = useMarketplace()
const brand = computed<CarBrand | undefined>(() => getCarBrand(String(route.params.brand)))
const makeSlugs = computed(() => brand.value ? getBrandMakeSlugs(brand.value) : [])
const groupBrand = computed(() => makeSlugs.value.length > 1)
const groupLabel = computed(() => brand.value ? brandGroups.find(group => group.key === brand.value!.group)?.label || '' : '')

const makes = ref<Make[]>([]), summary = ref<MakeSummary[]>([])
const loading = ref(true), error = ref('')
const modelQuery = ref(''), bodyFilter = ref('all')
let request = 0

const bodyLabels: Record<string, string> = { SEDAN: 'سدان', HATCHBACK: 'هاچ‌بک', SUV: 'شاسی‌بلند', CROSSOVER: 'کراس‌اور', PICKUP: 'پیکاپ', VAN: 'ون', COUPE: 'کوپه', FASTBACK: 'فست‌بک', WAGON: 'استیشن', OTHER: 'سایر' }
const transmissionLabels: Record<string, string> = { MANUAL: 'دستی', AUTOMATIC: 'اتوماتیک', CVT: 'CVT', DCT: 'دوکلاچه' }
const marketLabels: Record<string, string> = { CURRENT: 'تولید فعلی', LEGACY: 'توقف تولید', IMPORTED: 'وارداتی', ASSEMBLED: 'مونتاژی' }
const normalize = (value: string) => value.toLowerCase().replace(/[\u064A]/g, 'ی').replace(/[\u0643]/g, 'ک').replace(/‌/g, ' ').replace(/[أإآ]/g, 'ا').trim()
const digits = (value: number) => value.toLocaleString('fa-IR')

const availableSlugs = computed(() => new Set(summary.value.map(make => make.slug)))
const hasModels = computed(() => Boolean(brand.value) && isBrandAvailable(brand.value!, availableSlugs.value))
const loadedMakes = computed(() => makes.value.filter(make => makeSlugs.value.includes(make.slug)))
const modelRows = computed(() => loadedMakes.value.flatMap(make => make.models.map(model => ({ model, make, key: `${make.slug}:${model.slug}` }))))
const bodies = computed(() => [...new Set(modelRows.value.map(row => row.model.body).filter(Boolean) as string[])].sort((a, b) => (bodyLabels[a] || a).localeCompare(bodyLabels[b] || b, 'fa')))
const totalVariants = computed(() => modelRows.value.reduce((sum, row) => sum + row.model.variants.length, 0))

const filteredRows = computed(() => {
  const q = normalize(modelQuery.value)
  return modelRows.value.filter(({ model, make }) => {
    if (bodyFilter.value !== 'all' && model.body !== bodyFilter.value) return false
    if (!q) return true
    return [model.name, model.faName, model.enName, model.slug, make.name, make.faName, make.enName,
      ...model.variants.flatMap(variant => [variant.name, variant.faName, variant.enName])]
      .some(value => value && normalize(String(value)).includes(q))
  })
})

const filtersActive = computed(() => Boolean(modelQuery.value.trim()) || bodyFilter.value !== 'all')
const featuredKeys = computed(() => new Set(filteredRows.value.slice(0, 3).map(row => row.key)))
const lastUpdatedLabel = computed(() => modelRows.value.length ? 'مدل‌ها مستقیم از کاتالوگ پارتلی خوانده می‌شوند' : '')

const otherBrands = computed(() => {
  const used = new Set([brand.value?.slug])
  for (const make of loadedMakes.value) {
    const owner = carBrands.find(item => item.slug !== brand.value?.slug && getBrandMakeSlugs(item).includes(make.slug))
    if (owner) used.add(owner.slug)
  }
  const group = brand.value?.group
  const pool = carBrands.filter(item => !used.has(item.slug))
  return [...pool.filter(item => item.group === group), ...pool.filter(item => item.group !== group)].slice(0, 6)
})

function bodyLabel(body?: string | null) { return body ? bodyLabels[body] || 'خودرو' : 'خودرو' }
function bodyClass(body?: string | null) {
  if (!body) return 'sedan'
  if (body === 'SUV' || body === 'CROSSOVER' || body === 'VAN') return 'suv'
  if (body === 'HATCHBACK') return 'hatch'
  if (body === 'PICKUP') return 'pickup'
  if (body === 'COUPE' || body === 'FASTBACK') return 'coupe'
  if (body === 'WAGON') return 'wagon'
  return 'sedan'
}
function variantSummary(model: Model) {
  const first = model.variants[0]
  return [first?.engine, first?.transmission ? transmissionLabels[first.transmission] || first.transmission : '', first?.years]
    .filter(Boolean).join(' · ')
}
function modelInitials(model: Model) {
  return (model.enName || model.slug || model.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'CAR'
}
const catalogLink = (model: Model) => model.variants[0]?.id ? `/catalog?type=car&variant=${model.variants[0].id}#catalog-results` : '/catalog?type=car'
function resetFilters() { modelQuery.value = ''; bodyFilter.value = 'all' }
function focusSearch() {
  nextTick(() => document.getElementById('model-search')?.focus())
}

async function load() {
  const current = ++request
  loading.value = true; error.value = ''
  try {
    const [summaries, ...makeResults] = await Promise.all([
      api<MakeSummary[]>('/api/vehicle-makes/summary?type=CAR'),
      ...makeSlugs.value.map(slug => api<Make>(`/api/vehicles/${encodeURIComponent(slug)}/models`).catch(() => null)),
    ])
    if (current !== request) return
    summary.value = summaries
    makes.value = makeResults.filter((make): make is Make => Boolean(make))
  } catch (e) {
    if (current === request) { error.value = message(e); makes.value = []; summary.value = [] }
  } finally {
    if (current === request) loading.value = false
  }
}

watch(() => route.params.brand, () => { modelQuery.value = ''; bodyFilter.value = 'all'; load() })
watch(() => brand.value?.slug, slug => { if (slug) load() }, { immediate: true })

useHead(() => ({
  title: brand.value ? `مدل‌های ${brand.value.name} | پارتلی` : 'برند خودرو | پارتلی',
  meta: [{ name: 'description', content: brand.value ? `فهرست مدل‌ها و تیپ‌های ${brand.value.name} در بازار ایران همراه با قطعات سازگار در پارتلی.` : 'فهرست برندهای خودرو.' }],
}))
</script>

<template>
  <div v-if="brand" class="brand-page" dir="rtl">
    <a class="brands-skip" href="#brand-models">رفتن به مدل‌ها</a>

    <header class="brand-head">
      <div class="shell">
        <nav class="brand-crumbs" aria-label="مسیر صفحه">
          <NuxtLink to="/catalog?type=car">فروشگاه خودرو</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink to="/brands">برندها</NuxtLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ brand.name }}</span>
        </nav>

        <div class="brand-head__main">
          <div class="brand-head__identity">
            <span class="brand-head__logo"><BrandLogo :brand="brand" size="lg" decorative /></span>
            <div class="brand-head__text">
              <p class="brand-head__eyebrow"><span aria-hidden="true"></span> {{ groupLabel }}</p>
              <h1>{{ brand.name }}</h1>
              <p class="brand-head__latin" dir="ltr">{{ brand.enName }}</p>
            </div>
          </div>

          <dl class="brand-head__stats">
            <div>
              <dt>مدل</dt>
              <dd>{{ loading ? '—' : digits(modelRows.length) }}</dd>
            </div>
            <div>
              <dt>تیپ</dt>
              <dd>{{ loading ? '—' : digits(totalVariants) }}</dd>
            </div>
            <div>
              <dt>وضعیت</dt>
              <dd class="brand-head__status" :class="{ 'is-ready': hasModels, 'is-pending': !loading && !hasModels }">
                {{ loading ? '…' : hasModels ? 'آماده انتخاب' : 'به‌زودی' }}
              </dd>
            </div>
          </dl>
        </div>

        <p class="brand-head__tagline">{{ brand.tagline }}</p>
      </div>
    </header>

    <main id="brand-models" class="shell brand-main" tabindex="-1">
      <div v-if="error" class="brand-alert" role="alert">
        <span>{{ error }}</span>
        <button type="button" @click="load">تلاش دوباره</button>
      </div>

      <template v-if="loading">
        <div class="brand-toolbar brand-toolbar--skeleton" aria-hidden="true"><span></span><span></span></div>
        <div class="model-grid" aria-busy="true" aria-label="در حال دریافت مدل‌ها">
          <div v-for="n in 6" :key="n" class="model-card model-card--skeleton"><span></span><span></span><span></span></div>
        </div>
      </template>

      <div v-else-if="!hasModels" class="brand-pending">
        <span class="brand-pending__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="9"/></svg>
        </span>
        <h2>مدل‌های {{ brand.name }} هنوز کامل نشده است</h2>
        <p>در حال تکمیل اطلاعات مدل‌ها و تیپ‌های این برند هستیم. تا آن زمان می‌توانید برندهای آماده را ببینید یا با انتخاب خودرو، قطعات سازگار را جستجو کنید.</p>
        <div class="brand-pending__actions">
          <NuxtLink to="/brands" class="model-cta model-cta--solid">برندهای آماده</NuxtLink>
          <NuxtLink to="/catalog?type=car" class="model-cta">جستجوی قطعات</NuxtLink>
        </div>
      </div>

      <template v-else>
        <div class="brand-toolbar">
          <div class="brand-toolbar__row">
            <label class="model-search">
              <span class="sr-only">جستجوی مدل {{ brand.name }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/></svg>
              <input id="model-search" v-model="modelQuery" type="search" :placeholder="`جستجو در مدل‌های ${brand.name}…`" autocomplete="off">
              <button v-if="modelQuery" type="button" aria-label="پاک کردن جستجو" @click="modelQuery = ''">✕</button>
            </label>
            <p class="brand-toolbar__count" role="status" aria-live="polite">
              {{ digits(filteredRows.length) }} <span>از</span> {{ digits(modelRows.length) }} مدل
            </p>
          </div>
          <div v-if="bodies.length > 1" class="model-body-filters" role="group" aria-label="فیلتر بدنه">
            <button type="button" :aria-pressed="bodyFilter === 'all'" :class="{ 'is-active': bodyFilter === 'all' }" @click="bodyFilter = 'all'">همه</button>
            <button v-for="body in bodies" :key="body" type="button" :aria-pressed="bodyFilter === body" :class="{ 'is-active': bodyFilter === body }" @click="bodyFilter = body">{{ bodyLabel(body) }}</button>
          </div>
        </div>

        <p v-if="lastUpdatedLabel" class="brand-source-note">{{ lastUpdatedLabel }}</p>

        <div v-if="!filteredRows.length" class="brand-empty" role="status">
          <strong>مدلی با این مشخصات پیدا نشد.</strong>
          <p>عبارت جستجو یا فیلتر بدنه را تغییر دهید.</p>
          <button type="button" @click="resetFilters">نمایش همه مدل‌ها</button>
        </div>

        <ul v-else class="model-grid">
          <li v-for="row in filteredRows" :key="row.key" class="model-card" :class="{ 'model-card--featured': featuredKeys.has(row.key) }">
            <div class="model-card__visual" :class="`is-${bodyClass(row.model.body)}`" aria-hidden="true">
              <svg class="model-card__car" viewBox="0 0 220 84" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <template v-if="bodyClass(row.model.body) === 'suv'">
                  <path d="M14 55 26 47 40 22h104l30 23 26 5 8 14H10z" /><path d="M52 45l14-18h64l22 18z" />
                </template>
                <template v-else-if="bodyClass(row.model.body) === 'hatch'">
                  <path d="m14 57 18-8 18-23h70l34 22 28 6 8 12H12z" /><path d="M55 45l16-16h48l26 16z" />
                </template>
                <template v-else-if="bodyClass(row.model.body) === 'pickup'">
                  <path d="M14 56l16-9 24-23h64l24 21 34 3 12 16H10z" /><path d="M56 43l16-16h44l20 16z" />
                </template>
                <template v-else-if="bodyClass(row.model.body) === 'coupe'">
                  <path d="m10 57 26-9 30-26h62l30 25 32 6 10 12H8z" /><path d="M60 43l22-18h44l24 18z" />
                </template>
                <template v-else-if="bodyClass(row.model.body) === 'wagon'">
                  <path d="M12 56l20-8 22-25h96l28 24 26 5 8 14H10z" /><path d="M56 44l18-18h60l22 18z" />
                </template>
                <template v-else>
                  <path d="m12 56 24-8 30-24h58l28 24 30 5 10 13H10z" /><path d="M60 43l20-17h42l22 17z" />
                </template>
                <circle cx="58" cy="68" r="10" /><circle cx="160" cy="68" r="10" />
                <path d="M14 60h30m130 0h26" />
              </svg>
              <span class="model-card__body-type">{{ bodyLabel(row.model.body) }}</span>
            </div>

            <div class="model-card__content">
              <div class="model-card__title">
                <span class="model-card__mono" aria-hidden="true">{{ modelInitials(row.model) }}</span>
                <div>
                  <h3>{{ row.model.faName || row.model.name }}</h3>
                  <p dir="ltr">{{ row.model.enName || row.model.slug }}</p>
                </div>
              </div>

              <p v-if="groupBrand" class="model-card__family">{{ row.make.faName || row.make.name }}</p>
              <p v-if="variantSummary(row.model)" class="model-card__specs">{{ variantSummary(row.model) }}</p>

              <div class="model-card__chips">
                <span v-for="variant in row.model.variants.slice(0, 3)" :key="variant.id" class="model-chip">{{ variant.faName || variant.name }}</span>
                <span v-if="row.model.variants.length > 3" class="model-chip model-chip--more">+{{ digits(row.model.variants.length - 3) }}</span>
              </div>

              <div class="model-card__foot">
                <span class="model-card__count">{{ digits(row.model.variants.length) }} تیپ</span>
                <span v-if="row.model.variants[0]?.marketStatus && marketLabels[row.model.variants[0].marketStatus!]" class="model-card__market">{{ marketLabels[row.model.variants[0].marketStatus!] }}</span>
                <NuxtLink :to="catalogLink(row.model)" class="model-card__link">
                  قطعات سازگار
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>
                </NuxtLink>
              </div>
            </div>
          </li>
        </ul>
      </template>

      <section v-if="otherBrands.length && !error" class="brand-others" aria-labelledby="other-brands-title">
        <div class="brand-others__head">
          <h2 id="other-brands-title">برندهای دیگر</h2>
          <NuxtLink to="/brands">همه برندها ←</NuxtLink>
        </div>
        <ul class="brand-others__list">
          <li v-for="item in otherBrands" :key="item.slug">
            <NuxtLink :to="`/brands/${item.slug}`" class="brand-others__item">
              <BrandLogo :brand="item" size="sm" decorative />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>

  <div v-else class="brand-missing shell">
    <p class="market-eyebrow">برند خودرو</p>
    <h1>این برند پیدا نشد.</h1>
    <p>ممکن است نشانی تغییر کرده باشد. از فهرست برندها دوباره انتخاب کنید.</p>
    <NuxtLink to="/brands" class="market-primary">مشاهده همه برندها</NuxtLink>
  </div>
</template>

<style scoped>
.brand-page { --accent: #c45f3d; --ink: #1f2723; background: #f8f7f3; color: var(--ink); min-height: 100svh; }
.brands-skip { position: absolute; top: -80px; right: 20px; z-index: 60; padding: 12px 16px; border-radius: 10px; background: #fff; font-size: 12px; }
.brands-skip:focus { top: 16px; }
.brand-head { padding: clamp(18px, 3vw, 28px) 0 clamp(22px, 3vw, 32px); border-bottom: 1px solid #e6e6df; background: #fff; }
.brand-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px; color: #9a9d92; }
.brand-crumbs a { transition: color .2s ease; }
.brand-crumbs a:hover { color: var(--accent); }
.brand-crumbs [aria-current] { color: #4c554b; font-weight: 700; }
.brand-head__main { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px 32px; margin-top: clamp(16px, 2.4vw, 26px); }
.brand-head__identity { display: flex; align-items: center; gap: clamp(14px, 2vw, 22px); min-width: 0; }
.brand-head__logo { display: grid; place-items: center; width: clamp(76px, 9vw, 106px); height: clamp(76px, 9vw, 106px); flex: none; border: 1px solid #e6e7e0; border-radius: 22px; background: #f7f7f2; }
.brand-head__logo :deep(.brand-logo--lg) { width: 62%; height: 62%; }
.brand-head__text { min-width: 0; }
.brand-head__eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 6px; color: var(--accent); font-size: 11px; font-weight: 700; }
.brand-head__eyebrow span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.brand-head__text h1 { margin: 0; font-size: clamp(28px, 4vw, 44px); font-weight: 900; line-height: 1.35; letter-spacing: -1.4px; }
.brand-head__latin { margin: 2px 0 0; color: #a3a69b; font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 1.4px; }
.brand-head__stats { display: flex; gap: clamp(18px, 3vw, 40px); margin: 0; padding: 0; }
.brand-head__stats div { display: flex; flex-direction: column-reverse; gap: 5px; }
.brand-head__stats dt { color: #9a9d92; font-size: 10px; }
.brand-head__stats dd { margin: 0; font-size: clamp(20px, 2.4vw, 26px); font-weight: 900; letter-spacing: -.5px; }
.brand-head__status { font-size: clamp(13px, 1.4vw, 15px) !important; line-height: 1.7; }
.brand-head__status.is-ready { color: #4d7a55; }
.brand-head__status.is-pending { color: #a08a4e; }
.brand-head__tagline { margin: clamp(16px, 2vw, 22px) 0 0; color: #85897e; font-size: 12px; line-height: 2; }
.brand-main { padding-top: clamp(22px, 3vw, 34px); padding-bottom: clamp(44px, 6vw, 76px); }
.brand-main:focus { outline: none; }
.brand-alert { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; padding: 14px 18px; border: 1px solid #e7c7b9; border-radius: 14px; background: #fdf4ef; color: #8f4a2c; font-size: 12px; }
.brand-alert button { padding: 7px 14px; border: 1px solid #d9a68d; border-radius: 9px; background: #fff; color: #8f4a2c; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.brand-toolbar { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
.brand-toolbar__row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; }
.model-search { display: flex; align-items: center; gap: 9px; width: min(100%, 380px); height: 46px; padding: 0 14px; border: 1px solid #dedfd7; border-radius: 12px; background: #fff; transition: border-color .2s ease, box-shadow .2s ease; }
.model-search:focus-within { border-color: #b7bdb0; box-shadow: 0 0 0 4px rgba(196, 95, 61, .08); }
.model-search svg { width: 18px; height: 18px; flex: none; color: #a3a69b; }
.model-search input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: var(--ink); font: inherit; font-size: 12px; outline: none; }
.model-search input::-webkit-search-cancel-button { display: none; }
.model-search button { display: grid; place-items: center; width: 24px; height: 24px; flex: none; border: 0; border-radius: 50%; background: #f0f1ea; color: #6f756a; font-size: 10px; cursor: pointer; }
.brand-toolbar__count { margin: 0; color: #6f756a; font-size: 12px; font-weight: 700; }
.brand-toolbar__count span { color: #a3a69b; font-weight: 400; }
.model-body-filters { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; }
.model-body-filters::-webkit-scrollbar { display: none; }
.model-body-filters button { flex: none; padding: 7px 14px; border: 1px solid #e1e2da; border-radius: 999px; background: #fff; color: #6f756a; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: background .2s ease, color .2s ease, border-color .2s ease; }
.model-body-filters button:hover { border-color: #bcc1b5; }
.model-body-filters button.is-active { border-color: var(--ink); background: var(--ink); color: #fff; }
.brand-source-note { margin: 0 0 18px; color: #a3a69b; font-size: 10px; }
.model-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
.model-card { display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e3e4dc; border-radius: 18px; background: #fff; transition: border-color .25s ease, transform .25s ease, box-shadow .25s ease; }
.model-card:hover { transform: translateY(-3px); border-color: #c3c8bc; box-shadow: 0 16px 34px rgba(31, 39, 35, .08); }
.model-card--featured { border-color: #dcd6c9; }
.model-card__visual { position: relative; display: grid; place-items: center; height: 116px; overflow: hidden; background: radial-gradient(ellipse at 50% 118%, #eceee6 0%, #f6f6f1 68%); }
.model-card__visual::after { content: ''; position: absolute; inset-inline: 12%; bottom: 16px; height: 10px; border-radius: 50%; background: rgba(31, 39, 35, .07); filter: blur(5px); }
.model-card__car { width: 78%; height: auto; color: #7d877c; transition: color .3s ease, transform .3s ease; }
.model-card:hover .model-card__car { color: var(--ink); transform: translateX(-4px); }
.model-card__body-type { position: absolute; top: 12px; right: 14px; color: #9a9d92; font-size: 10px; font-weight: 600; }
.model-card__content { display: flex; flex-direction: column; gap: 8px; flex: 1; padding: 15px 17px 16px; }
.model-card__title { display: flex; align-items: center; gap: 10px; }
.model-card__mono { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border: 1px solid #e6e7e0; border-radius: 10px; color: #7d877c; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .4px; direction: ltr; }
.model-card__title h3 { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.6; }
.model-card__title p { margin: 0; color: #a3a69b; font-family: Arial, sans-serif; font-size: 9px; letter-spacing: .8px; }
.model-card__family { margin: 0; color: var(--accent); font-size: 10px; font-weight: 700; }
.model-card__specs { margin: 0; color: #85897e; font-size: 10px; line-height: 1.9; }
.model-card__chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.model-chip { max-width: 100%; overflow: hidden; padding: 3px 9px; border-radius: 7px; background: #f3f4ee; color: #6f756a; font-size: 9px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.model-chip--more { background: #fbf0ea; color: #b86444; }
.model-card__foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid #f0f0ea; }
.model-card__count { color: #6f756a; font-size: 10px; font-weight: 700; }
.model-card__market { padding: 2px 7px; border-radius: 6px; background: #f3f4ee; color: #8a8e82; font-size: 9px; }
.model-card__link { display: inline-flex; align-items: center; gap: 5px; margin-inline-start: auto; color: var(--ink); font-size: 10px; font-weight: 800; transition: color .2s ease; }
.model-card__link svg { width: 14px; height: 14px; transition: transform .2s ease; }
.model-card__link:hover { color: var(--accent); }
.model-card__link:hover svg { transform: translateX(-3px); }
.model-card__link:focus-visible, .model-search button:focus-visible, .model-body-filters button:focus-visible, .brand-others a:focus-visible, .model-cta:focus-visible, .brand-alert button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.model-card--skeleton { height: 300px; padding: 18px; gap: 12px; pointer-events: none; }
.model-card--skeleton span, .brand-toolbar--skeleton span { display: block; border-radius: 10px; background: linear-gradient(90deg, #f0f0ea 25%, #f7f7f2 50%, #f0f0ea 75%); background-size: 200% 100%; animation: brand-shimmer 1.4s ease-in-out infinite; }
.model-card--skeleton span:nth-child(1) { height: 80px; }
.model-card--skeleton span:nth-child(2) { height: 20px; width: 60%; }
.model-card--skeleton span:nth-child(3) { height: 14px; width: 80%; }
.brand-toolbar--skeleton span { height: 46px; width: 380px; max-width: 100%; }
@keyframes brand-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.brand-empty, .brand-pending { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: clamp(40px, 6vw, 64px) 24px; border: 1px dashed #d6d8cf; border-radius: 20px; background: #fff; text-align: center; }
.brand-empty strong, .brand-pending h2 { margin: 0; font-size: clamp(16px, 2vw, 19px); font-weight: 900; }
.brand-empty p, .brand-pending p { max-width: 460px; margin: 0; color: #85897e; font-size: 12px; line-height: 2.1; }
.brand-empty button, .model-cta { margin-top: 8px; padding: 10px 20px; border: 1px solid #d9dbd2; border-radius: 11px; background: #fff; color: #3d443d; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: border-color .2s ease, background .2s ease; }
.brand-empty button:hover, .model-cta:hover { border-color: var(--ink); }
.brand-pending__icon { display: grid; place-items: center; width: 54px; height: 54px; margin-bottom: 4px; border-radius: 50%; background: #f5f2e9; color: #a08a4e; }
.brand-pending__icon svg { width: 26px; height: 26px; }
.brand-pending__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }
.brand-pending__actions .model-cta { margin-top: 0; }
.model-cta--solid { border-color: var(--ink) !important; background: var(--ink) !important; color: #fff !important; }
.brand-others { margin-top: clamp(34px, 5vw, 56px); padding-top: clamp(22px, 3vw, 30px); border-top: 1px solid #e6e6df; }
.brand-others__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.brand-others__head h2 { margin: 0; font-size: 16px; font-weight: 900; }
.brand-others__head a { color: #85897e; font-size: 11px; font-weight: 700; }
.brand-others__list { display: flex; flex-wrap: wrap; gap: 9px; margin: 0; padding: 0; list-style: none; }
.brand-others__item { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 10px; border: 1px solid #e3e4dc; border-radius: 999px; background: #fff; color: #4c554b; font-size: 11px; font-weight: 600; transition: border-color .2s ease, transform .2s ease; }
.brand-others__item:hover { transform: translateY(-2px); border-color: #b9c0b2; }
.brand-missing { padding: clamp(48px, 8vw, 96px) 20px; text-align: center; }
.brand-missing h1 { margin: 0 0 10px; font-size: clamp(24px, 3vw, 34px); font-weight: 900; }
.brand-missing p:not(.market-eyebrow) { margin: 0 0 22px; color: #85897e; font-size: 12px; }
@media (max-width: 640px) {
  .brand-head__main { gap: 16px; }
  .brand-head__stats { width: 100%; justify-content: space-between; padding-top: 14px; border-top: 1px solid #f0f0ea; }
  .model-grid { grid-template-columns: 1fr; }
  .model-search { width: 100%; }
  .brand-toolbar__count { margin-inline-start: auto; }
  .brand-alert { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .model-card, .model-card__car, .model-card__link svg, .brand-others__item, .model-body-filters button { transition: none; }
  .model-card:hover, .brand-others__item:hover { transform: none; }
  .model-card:hover .model-card__car { transform: none; }
  .model-card--skeleton span, .brand-toolbar--skeleton span { animation: none; }
}
</style>

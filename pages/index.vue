<script setup lang="ts">
const { api, add } = useMarketplace()
const { data: home } = await useAsyncData('home-merchandising', () => api('/api/home').catch(() => ({ deals: [], bestSellers: [], newest: [], brands: [], categories: [] })))
const deals = computed(() => ((home.value as any)?.deals ?? []) as any[])
const bestSellers = computed(() => ((home.value as any)?.bestSellers ?? []) as any[])
const newest = computed(() => ((home.value as any)?.newest ?? []) as any[])
const brands = computed(() => ((home.value as any)?.brands ?? []) as { name: string; count: number }[])
const categories = computed(() => ((home.value as any)?.categories ?? []) as { id: string; name: string; slug: string; productCount?: number }[])
const notice = ref('')
function addItem(product: any) { add(product); notice.value = `${product.name} به سبد خرید اضافه شد.` }
const rails = computed(() => [
  { key: 'deals', eyebrow: 'تخفیف‌های فعال', title: 'فروش ویژه', to: '/deals', items: deals.value },
  { key: 'best', eyebrow: 'انتخاب خریداران', title: 'پرفروش‌ترین‌ها', to: '/brands?sort=best-selling', items: bestSellers.value },
  { key: 'new', eyebrow: 'تازه رسیده', title: 'جدیدترین قطعات', to: '/brands', items: newest.value },
].filter(rail => rail.items.length))
const trust = [
  { title: 'ضمانت بازگشت', text: 'تا ۷ روز پس از خرید' },
  { title: 'اصالت کالا', text: 'تضمین کیفیت و اصالت' },
  { title: 'پشتیبانی', text: 'پاسخ‌گویی همه روزه' },
  { title: 'ارسال سریع', text: 'ارسال به سراسر ایران' },
]

useHead({
  title: 'پارتلی | لوازم یدکی خودرو و موتورسیکلت',
  meta: [{ name: 'description', content: 'نوع وسیله نقلیه خود را انتخاب کنید و قطعات و لوازم یدکی مورد نیاز خودرو یا موتورسیکلت خود را در پارتلی پیدا کنید.' }],
})

// Locally served photography. Small variants keep mobile downloads light.
const car = {
  image: '/welcome-car.jpg',
  smallImage: '/welcome-car-small.jpg',
  alt: 'نمای سه‌ربع جلوی خودروی شورولت نقره‌ای در نمایشگاه با نورپردازی کنترل‌شده',
}

const motorcycle = {
  image: '/welcome-motorcycle.jpg',
  smallImage: '/welcome-motorcycle-small.jpg',
  alt: 'نمای سه‌ربع جلوی موتورسیکلت اسپرت دوکاتی قرمز در محیط معماری تاریک',
}

const steps = [
  {
    number: '۰۱',
    title: 'انتخاب وسیله نقلیه',
    text: 'خودرو یا موتورسیکلت را انتخاب کنید تا فهرست برندها و قطعات مرتبط را ببینید.',
  },
  {
    number: '۰۲',
    title: 'انتخاب برند و قطعه',
    text: 'قطعه مناسب مدل خودروی خود را با مشخصات کامل و امکان بررسی سازگاری پیدا کنید.',
  },
  {
    number: '۰۳',
    title: 'ثبت سفارش و تحویل',
    text: 'سفارش را ثبت کنید و قطعه را در محل تحویل بگیرید.',
  },
]
</script>

<template>
  <div class="welcome" dir="rtl" lang="fa">
    <div class="welcome-main">
      <section class="intro" aria-labelledby="welcome-title">
        <div class="intro-lead">
          <p class="step-eyebrow">
            <span class="step-pill">گام ۱ از ۳</span>
            <span class="step-rule" aria-hidden="true"></span>
            <span class="step-label">انتخاب وسیله نقلیه</span>
          </p>
          <h1 id="welcome-title" class="intro-title">
            امروز دنبال
            <span class="title-accent">چه قطعه‌ای</span>
            هستید؟
          </h1>
        </div>

        <div class="intro-aside">
          <p class="intro-text">
            نوع وسیله نقلیه خود را انتخاب کنید تا قطعات سازگار، برندهای معتبر و مشخصات کامل را در یک مسیر روشن ببینید.
          </p>
          <p class="intro-help">
            سؤالی دارید؟
            <NuxtLink to="/support">راهنمای خرید</NuxtLink>
            <span class="help-sep" aria-hidden="true">·</span>
            <NuxtLink to="/contact">تماس با پشتیبانی</NuxtLink>
          </p>
        </div>
      </section>

      <section class="vehicle-section" aria-labelledby="vehicle-title">
        <h2 id="vehicle-title" class="visually-hidden">انتخاب نوع وسیله نقلیه</h2>

        <div class="vehicle-grid">
          <NuxtLink to="/brands" class="vehicle-card is-car">
            <div class="card-media">
              <img
                :src="car.image"
                :srcset="`${car.smallImage} 720w, ${car.image} 1440w`"
                sizes="(max-width: 860px) calc(100vw - 40px), (max-width: 1240px) 56vw, 660px"
                :alt="car.alt"
                width="1440"
                height="851"
                fetchpriority="high"
                decoding="async"
              >
              <span class="card-meta">
                <span class="card-index" aria-hidden="true">۰۱</span>
                <span class="card-kind">خودرو</span>
              </span>
            </div>
            <div class="card-body">
              <h3 class="card-title">لوازم یدکی خودرو</h3>
              <p class="card-text">
                قطعات و لوازم مصرفی برای برندها و مدل‌های مختلف خودرو، با مشخصات کامل و امکان بررسی سازگاری.
              </p>
              <span class="card-action">
                <span class="action-label">ورود به فروشگاه خودرو</span>
                <span class="action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </span>
            </div>
          </NuxtLink>

          <button
            type="button"
            class="vehicle-card is-motorcycle"
            disabled
            aria-disabled="true"
            aria-describedby="motorcycle-note"
          >
            <div class="card-media">
              <img
                :src="motorcycle.image"
                :srcset="`${motorcycle.smallImage} 720w, ${motorcycle.image} 1440w`"
                sizes="(max-width: 860px) calc(100vw - 40px), (max-width: 1240px) 40vw, 480px"
                :alt="motorcycle.alt"
                width="1440"
                height="960"
                loading="lazy"
                decoding="async"
              >
              <span class="card-meta">
                <span class="card-index" aria-hidden="true">۰۲</span>
                <span class="card-kind">موتورسیکلت</span>
              </span>
              <span class="soon-badge">به‌زودی</span>
            </div>
            <div class="card-body">
              <h3 class="card-title">لوازم یدکی موتورسیکلت</h3>
              <p id="motorcycle-note" class="card-text">
                این بخش در حال آماده‌سازی است و به‌زودی در دسترس قرار می‌گیرد.
              </p>
              <span class="card-action">
                <span class="action-label">در حال آماده‌سازی</span>
                <span class="action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </span>
            </div>
          </button>
        </div>
      </section>

      <section class="steps" aria-labelledby="steps-title">
        <div class="steps-head">
          <h2 id="steps-title" class="steps-title">خرید در سه گام</h2>
          <p class="steps-sub">از انتخاب وسیله نقلیه تا تحویل قطعه، مسیر کوتاه و روشن است.</p>
        </div>
        <ol class="steps-list">
          <li v-for="step in steps" :key="step.number" class="step">
            <span class="step-number" aria-hidden="true">{{ step.number }}</span>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-text">{{ step.text }}</p>
          </li>
        </ol>
      </section>

      <section class="trust-strip" aria-label="مزیت‌های خرید از پارتلی">
        <div v-for="item in trust" :key="item.title" class="trust-item">
          <span class="trust-mark" aria-hidden="true"></span>
          <div><strong>{{ item.title }}</strong><p>{{ item.text }}</p></div>
        </div>
      </section>

      <p v-if="notice" class="market-success home-notice" role="status">{{ notice }} <NuxtLink to="/cart" class="underline">مشاهده سبد</NuxtLink></p>

      <section v-for="rail in rails" :key="rail.key" class="home-section" :aria-labelledby="`rail-${rail.key}`">
        <div class="rail-head">
          <div>
            <p class="rail-eyebrow">{{ rail.eyebrow }}</p>
            <h2 :id="`rail-${rail.key}`" class="rail-title">{{ rail.title }}</h2>
          </div>
          <NuxtLink :to="rail.to" class="rail-more">مشاهده همه</NuxtLink>
        </div>
        <div class="rail-grid">
          <ProductCard v-for="product in rail.items" :key="product.id" :product="product" @add="addItem" />
        </div>
      </section>

      <section v-if="categories.length" class="home-section" aria-labelledby="home-categories">
        <div class="rail-head">
          <div><p class="rail-eyebrow">مسیر خرید</p><h2 id="home-categories" class="rail-title">دسته‌بندی قطعات</h2></div>
          <NuxtLink to="/brands" class="rail-more">همه دسته‌ها</NuxtLink>
        </div>
        <div class="tile-grid">
          <NuxtLink v-for="category in categories" :key="category.id" :to="{ path: '/brands', query: { category: category.slug } }" class="category-tile">
            <span class="tile-name">{{ category.name }}</span>
            <span class="tile-count">{{ (category.productCount ?? 0).toLocaleString('fa-IR') }} کالا</span>
          </NuxtLink>
        </div>
      </section>

      <section v-if="brands.length" class="home-section" aria-labelledby="home-brands">
        <div class="rail-head">
          <div><p class="rail-eyebrow">برندهای معتبر</p><h2 id="home-brands" class="rail-title">خرید بر اساس برند</h2></div>
          <NuxtLink to="/brands" class="rail-more">همه برندها</NuxtLink>
        </div>
        <div class="tile-grid brands">
          <NuxtLink v-for="brand in brands" :key="brand.name" :to="{ path: '/brands', query: { q: brand.name } }" class="brand-tile">
            <span class="tile-name">{{ brand.name }}</span>
            <span class="tile-count">{{ brand.count.toLocaleString('fa-IR') }} کالا</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  --paper: #f8f7f4;
  --card: #fffdf9;
  --ink: #202623;
  --muted: #6d736e;
  --line: #e3e0d8;
  --line-strong: #cfcbc0;
  --accent: #df592e;
  --accent-ink: #b8431f;
  --ease: cubic-bezier(.22, 1, .36, 1);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.welcome-main {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(20px, 4vw, 40px);
  padding-block: clamp(40px, 6vw, 84px) clamp(56px, 7vw, 104px);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* Intro */
.intro {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  align-items: end;
  gap: clamp(24px, 4vw, 64px);
  padding-bottom: clamp(28px, 3.4vw, 44px);
  border-bottom: 1px solid var(--line);
}

.step-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 clamp(18px, 2vw, 26px);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.step-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding-inline: 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--card);
  color: var(--accent-ink);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.step-rule {
  width: 26px;
  height: 1px;
  background: var(--line-strong);
}

.step-label {
  font-size: 11px;
  letter-spacing: 0;
}

.intro-title {
  margin: 0;
  font-size: clamp(2.05rem, 5.1vw, 3.9rem);
  font-weight: 800;
  line-height: 1.42;
  text-wrap: balance;
}

.title-accent {
  color: var(--accent);
}

.intro-aside {
  padding-bottom: 6px;
}

.intro-text {
  margin: 0;
  max-width: 40ch;
  color: var(--muted);
  font-size: 13px;
  line-height: 2.05;
  text-wrap: pretty;
}

.intro-help {
  margin: 18px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.intro-help a {
  color: var(--ink);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-decoration-thickness: 1px;
  text-underline-offset: 5px;
  transition: color .25s, text-decoration-color .25s;
}

.help-sep {
  padding-inline: 6px;
  color: var(--line-strong);
}

/* Vehicle cards */
.vehicle-section {
  padding-top: clamp(28px, 3.4vw, 44px);
}

.vehicle-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 1fr);
  gap: clamp(16px, 1.8vw, 26px);
  align-items: stretch;
}

.vehicle-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  text-align: start;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--card);
  color: inherit;
  font: inherit;
  box-shadow: 0 1px 2px rgba(32, 38, 35, .03), 0 14px 34px rgba(32, 38, 35, .035);
  transition: transform .5s var(--ease), border-color .35s, box-shadow .5s var(--ease);
}

.is-car {
  cursor: pointer;
}

.card-media {
  position: relative;
  flex: 1 1 auto;
  min-height: clamp(210px, 24vw, 320px);
  overflow: hidden;
  isolation: isolate;
  background: #2a2f2c;
}

.card-media img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .9s var(--ease), filter .5s;
}

.is-car .card-media img {
  object-position: 62% 56%;
}

.is-motorcycle .card-media img {
  object-position: 50% 53%;
  filter: grayscale(1) contrast(.92) brightness(1.02);
}

.card-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(24, 29, 26, .5), rgba(24, 29, 26, 0) 46%);
  pointer-events: none;
}

.is-motorcycle .card-media::after {
  background: linear-gradient(to top, rgba(24, 29, 26, .34), rgba(24, 29, 26, 0) 42%);
}

.card-meta {
  position: absolute;
  inset-block-start: 18px;
  inset-inline-start: 20px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 6px rgba(0, 0, 0, .45);
}

.card-index {
  font-variant-numeric: tabular-nums;
  opacity: .8;
}

.card-kind {
  padding-inline-start: 9px;
  border-inline-start: 1px solid rgba(255, 255, 255, .45);
}

.soon-badge {
  position: absolute;
  inset-block-start: 16px;
  inset-inline-end: 18px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding-inline: 12px;
  border: 1px solid rgba(255, 255, 255, .5);
  border-radius: 999px;
  background: rgba(248, 247, 244, .94);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.card-body {
  display: flex;
  flex-direction: column;
  padding: clamp(20px, 2.1vw, 28px) clamp(20px, 2.2vw, 30px) clamp(16px, 1.6vw, 20px);
}

.card-title {
  margin: 0;
  font-size: clamp(1.2rem, 1.7vw, 1.55rem);
  font-weight: 800;
  line-height: 1.6;
}

.card-text {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.95;
  text-wrap: pretty;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: clamp(18px, 2vw, 26px);
  padding-top: 16px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
  font-weight: 700;
  transition: color .3s;
}

.action-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--ink);
  transition: background .3s, border-color .3s, color .3s;
}

.action-icon svg {
  width: 18px;
  height: 18px;
  transition: transform .45s var(--ease);
}

/* Disabled motorcycle card */
.is-motorcycle {
  cursor: not-allowed;
  border-color: #e6e2d9;
  background: #f3f1ea;
  box-shadow: none;
}

.is-motorcycle .card-title {
  color: #4a504b;
}

.is-motorcycle .card-text {
  color: #7c817b;
}

.is-motorcycle .card-action {
  color: #7c817b;
  border-top-color: #e2ded4;
}

.is-motorcycle .action-icon {
  border-color: #dcd7cc;
  color: #8a8f88;
}

/* Focus */
.vehicle-card:focus-visible,
.intro-help a:focus-visible {
  outline: 3px solid var(--accent-ink);
  outline-offset: 4px;
  border-radius: 6px;
}

.vehicle-card:focus-visible {
  border-radius: 20px;
}

/* Steps */
.steps {
  margin-top: clamp(48px, 6vw, 88px);
  padding-top: clamp(28px, 3.2vw, 40px);
  border-top: 1px solid var(--line);
}

.steps-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 24px;
  margin-bottom: clamp(22px, 2.6vw, 34px);
}

.steps-title {
  margin: 0;
  font-size: clamp(1.05rem, 1.5vw, 1.3rem);
  font-weight: 800;
}

.steps-sub {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.9;
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 2.4vw, 36px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.step-number {
  display: block;
  color: var(--accent-ink);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.step-title {
  margin: 10px 0 0;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.7;
}

.step-text {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.95;
  text-wrap: pretty;
}

/* Commerce */
.trust-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: clamp(40px, 5vw, 64px);
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--line);
  overflow: hidden;
}

.trust-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px 18px;
  background: var(--card);
}

.trust-item strong {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
}

.trust-item p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}

.trust-mark {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.home-notice {
  margin-top: 24px;
}

.home-section {
  margin-top: clamp(44px, 5.5vw, 72px);
}

.rail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 24px;
  margin-bottom: clamp(18px, 2.2vw, 26px);
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.rail-eyebrow {
  margin: 0 0 4px;
  color: var(--accent-ink);
  font-size: 11px;
  font-weight: 700;
}

.rail-title {
  margin: 0;
  font-size: clamp(1.1rem, 1.7vw, 1.4rem);
  font-weight: 800;
}

.rail-more {
  color: var(--muted);
  font-size: 12px;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 5px;
  transition: color .2s var(--ease);
}

.rail-more:hover {
  color: var(--accent-ink);
}

.rail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 1.6vw, 20px);
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.category-tile,
.brand-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  min-height: 92px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  transition: border-color .2s var(--ease), transform .2s var(--ease);
}

.category-tile:hover,
.brand-tile:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
}

.tile-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
}

.tile-count {
  color: var(--muted);
  font-size: 11px;
}

/* Hover */
@media (hover: hover) and (pointer: fine) {
  .is-car:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    box-shadow: 0 2px 4px rgba(32, 38, 35, .04), 0 22px 48px rgba(32, 38, 35, .08);
  }

  .is-car:hover .card-media img {
    transform: scale(1.035);
  }

  .is-car:hover .card-action {
    color: var(--accent-ink);
  }

  .is-car:hover .action-icon {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .is-car:hover .action-icon svg {
    transform: translateX(-3px);
  }

  .intro-help a:hover {
    color: var(--accent-ink);
    text-decoration-color: var(--accent);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .intro {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 20px;
  }

  .intro-text {
    max-width: 56ch;
  }

  .rail-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .trust-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .vehicle-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .rail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-media {
    flex: 0 0 auto;
    min-height: 0;
    aspect-ratio: 1.5;
  }

  .is-car .card-media {
    aspect-ratio: 1.42;
  }

  .steps-list {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .step {
    padding-block: 16px;
  }

  .step:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .step:last-child {
    padding-bottom: 0;
  }
}

@media (max-width: 480px) {
  .welcome-main {
    padding-inline: 18px;
  }

  .intro-title {
    font-size: clamp(1.85rem, 8.4vw, 2.4rem);
    line-height: 1.5;
  }

  .step-eyebrow {
    gap: 9px;
    font-size: 11px;
  }

  .step-rule {
    width: 16px;
  }

  .card-meta {
    inset-block-start: 15px;
    inset-inline-start: 16px;
  }

  .soon-badge {
    inset-block-start: 13px;
    inset-inline-end: 14px;
  }

  .card-body {
    padding: 18px 18px 14px;
  }

  .card-action {
    margin-top: 16px;
    padding-top: 14px;
  }

  .rail-grid,
  .tile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome *,
  .welcome *::before,
  .welcome *::after {
    transition: none !important;
    animation: none !important;
  }

  .is-car:hover,
  .is-car:hover .card-media img,
  .is-car:hover .action-icon svg {
    transform: none;
  }
}
</style>

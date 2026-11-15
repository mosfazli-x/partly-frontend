<script setup lang="ts">
import { brandGroups, carBrands } from '~/utils/carBrands'

// Compact entry point shown where the 3D garage used to sit. The full brand
// catalogue lives at /brands.
const highlights = computed(() => carBrands.filter(brand => brand.group === 'iranian').slice(0, 10))
const totalBrands = carBrands.length
const totalGroups = brandGroups.length
</script>

<template>
  <section class="brand-strip" aria-labelledby="brand-strip-title">
    <div class="brand-strip__head">
      <div>
        <p class="brand-strip__eyebrow"><span aria-hidden="true"></span> انتخاب برند خودرو</p>
        <h2 id="brand-strip-title">خودروی خود را انتخاب کنید</h2>
        <p class="brand-strip__copy">همه برندهای بازار ایران، از خودروهای داخلی تا وارداتی‌های ژاپنی، کره‌ای و چینی.</p>
      </div>
      <NuxtLink to="/brands" class="brand-strip__all">
        <span>{{ totalBrands.toLocaleString('fa-IR') }} برند در {{ totalGroups.toLocaleString('fa-IR') }} دسته</span>
        <span class="brand-strip__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M19 12H5m6-6-6 6 6 6"/></svg>
        </span>
      </NuxtLink>
    </div>

    <ul class="brand-strip__list">
      <li v-for="brand in highlights" :key="brand.slug">
        <NuxtLink :to="`/brands/${brand.slug}`" class="brand-strip__item">
          <BrandLogo :brand="brand" size="sm" decorative />
          <span>{{ brand.name }}</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/brands" class="brand-strip__item brand-strip__item--more">
          <span aria-hidden="true">+</span>
          <span>همه برندها</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.brand-strip {
  margin-bottom: 28px;
  padding: 26px clamp(18px, 3vw, 32px);
  border: 1px solid #e3e5e0;
  border-radius: 22px;
  background: linear-gradient(135deg, #fbfaf6, #f2f3ee);
}
.brand-strip__head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 18px; }
.brand-strip__eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 10px; color: #c45f3d; font-size: 11px; font-weight: 700; }
.brand-strip__eyebrow span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.brand-strip h2 { margin: 0 0 8px; font-size: clamp(22px, 2.6vw, 30px); font-weight: 900; letter-spacing: -.8px; }
.brand-strip__copy { max-width: 460px; margin: 0; color: #7c817a; font-size: 12px; line-height: 2; }
.brand-strip__all { display: inline-flex; align-items: center; gap: 12px; font-size: 12px; font-weight: 700; color: #30392f; }
.brand-strip__arrow { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #d7dbd2; border-radius: 50%; transition: background .25s ease, color .25s ease, border-color .25s ease; }
.brand-strip__arrow svg { width: 17px; height: 17px; }
.brand-strip__list { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0 0; padding: 0; list-style: none; }
.brand-strip__item { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 10px; border: 1px solid #e0e3da; border-radius: 999px; background: #fff; color: #38403a; font-size: 12px; font-weight: 600; transition: border-color .25s ease, transform .25s ease, box-shadow .25s ease; }
.brand-strip__item--more { gap: 6px; border-style: dashed; color: #6b7269; }
.brand-strip__item--more > span:first-child { font-size: 15px; line-height: 1; }
.brand-strip__item:hover { transform: translateY(-2px); border-color: #b9c0b2; box-shadow: 0 8px 18px rgba(37, 40, 36, .06); }
.brand-strip__item:hover :deep(img) { opacity: 1; }
.brand-strip a:focus-visible { outline: 2px solid #c45f3d; outline-offset: 3px; border-radius: 999px; }
.brand-strip__all:focus-visible { border-radius: 8px; }
@media (max-width: 640px) {
  .brand-strip { padding: 20px 16px; border-radius: 16px; }
  .brand-strip__list { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
  .brand-strip__list::-webkit-scrollbar { display: none; }
  .brand-strip__item { white-space: nowrap; }
}
@media (prefers-reduced-motion: reduce) { .brand-strip__item, .brand-strip__arrow { transition: none; } .brand-strip__item:hover { transform: none; } }
</style>

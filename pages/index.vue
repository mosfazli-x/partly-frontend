<script setup lang="ts">
useHead({
  title: 'پارتلی | لوازم یدکی خودرو و موتورسیکلت',
  meta: [{ name: 'description', content: 'نوع وسیله نقلیه خود را انتخاب کنید و قطعات و لوازم یدکی مورد نیاز خودرو یا موتورسیکلت خود را در پارتلی پیدا کنید.' }],
})

// Locally served Unsplash photography: photo-1492144534655-ae79c964c9d7
// and photo-1568772585407-9361f9bf3a87. Mobile sources avoid oversized downloads.
const categories = [
  {
    type: 'car',
    number: '۰۱',
    label: 'خودرو',
    title: 'لوازم یدکی خودرو',
    description: 'انواع قطعات و لوازم مورد نیاز خودروی شما',
    action: 'ورود به فروشگاه خودرو',
    image: '/welcome-car.jpg',
    smallImage: '/welcome-car-small.jpg',
    alt: 'نمای سه‌ربع جلوی خودروی شورولت نقره‌ای در نمایشگاه با نورپردازی کنترل‌شده',
    to: '/brands',
  },
  {
    type: 'motorcycle',
    number: '۰۲',
    label: 'موتورسیکلت',
    title: 'لوازم یدکی موتورسیکلت',
    description: 'قطعات و لوازم مورد نیاز انواع موتورسیکلت',
    action: 'ورود به فروشگاه موتورسیکلت',
    image: '/welcome-motorcycle.jpg',
    smallImage: '/welcome-motorcycle-small.jpg',
    alt: 'نمای سه‌ربع جلوی موتورسیکلت اسپرت دوکاتی قرمز در محیط معماری تاریک',
    to: '/catalog?type=motorcycle',
  },
]
</script>

<template>
  <div class="welcome" dir="rtl">
    <a class="skip-link" href="#main-content">رفتن به محتوای اصلی</a>

    <header class="welcome-header">
      <NuxtLink to="/" class="welcome-brand" aria-label="پارتلی، صفحه اصلی">
        <span class="welcome-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none"><path d="M9 24V8h8a6 6 0 0 1 0 12h-3" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/><path d="M14 13h4" stroke="currentColor" stroke-width="3"/></svg>
        </span>
        <span>پارتلی<span class="brand-period">.</span></span>
      </NuxtLink>
      <span class="header-note">برای مسیرهای پیش رو</span>
      <NuxtLink to="/support" class="help-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v6h4v-6H4Zm16 0h1v6h-4v-6h3ZM20 18c0 3-3 3-6 3"/><path d="M11 21h3" stroke-linecap="round"/></svg>
        <span>راهنما و پشتیبانی</span>
      </NuxtLink>
    </header>

    <main id="main-content" class="welcome-main">
      <div class="intro">
        <p class="intro-label"><span aria-hidden="true"></span> قطعه درست، برای مسیر شما</p>
        <h1>امروز دنبال چه قطعه‌ای هستید؟</h1>
        <p class="intro-description">نوع وسیله نقلیه خود را انتخاب کنید و قطعات مورد نیازتان را پیدا کنید.</p>
      </div>

      <div class="vehicle-choices" aria-label="انتخاب نوع وسیله نقلیه">
        <NuxtLink
          v-for="(category, index) in categories"
          :key="category.type"
          :to="category.to"
          class="vehicle-choice"
          :class="`choice-${category.type}`"
          :aria-labelledby="`title-${category.type} action-${category.type}`"
        >
          <div class="choice-photo">
            <img
              :src="category.image"
              :srcset="`${category.smallImage} 720w, ${category.image} 1440w`"
              sizes="(max-width: 699px) calc(100vw - 40px), (max-width: 1279px) calc((100vw - 104px) / 2), 580px"
              :alt="category.alt"
              width="1440"
              :height="category.type === 'car' ? 851 : 960"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
              decoding="async"
            >
            <span class="photo-label"><span>{{ category.number }}</span><span class="label-divider" aria-hidden="true">/</span>{{ category.label }}</span>
            <span class="photo-corner" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M17 7H7v10M7 7l10 10"/></svg></span>
          </div>
          <div class="choice-content">
            <h2 :id="`title-${category.type}`">{{ category.title }}</h2>
            <p>{{ category.description }}</p>
            <div class="choice-bottom">
              <span :id="`action-${category.type}`">{{ category.action }}</span>
              <span class="choice-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M19 12H5m6-6-6 6 6 6"/></svg>
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <p class="selection-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 7 3v6c0 4-7 8-7 8s-7-4-7-8V6l7-3Z"/><path d="m9 11 2 2 4-4"/></svg>
        انتخاب دقیق‌تر<span class="note-dot" aria-hidden="true">·</span>خرید مطمئن‌تر
      </p>
    </main>

    <footer class="welcome-footer">
      <div class="footer-identity"><span class="footer-brand">پارتلی<span>.</span></span><span class="footer-divider" aria-hidden="true"></span><span>همراهِ مسیر شما</span></div>
      <p>تمامی حقوق برای پارتلی محفوظ است.</p>
      <NuxtLink to="/contact">ارتباط با ما <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M17 7H7v10M7 7l10 10"/></svg></NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.welcome {
  --accent: #e85d32;
  --ink: #191b1d;
  --muted: #686c6e;
  --border: #e5e5e1;
  --ease: cubic-bezier(.22, 1, .36, 1);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  padding-inline: max(40px, calc((100vw - 1320px) / 2));
  color: var(--ink);
  background: #f5f5f2;
  -webkit-font-smoothing: antialiased;
}
.welcome-header { min-height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid var(--border); position: relative; }
.welcome-brand { display: inline-flex; align-items: center; gap: 11px; font-size: 28px; font-weight: 900; letter-spacing: -1.4px; }
.welcome-mark { width: 39px; height: 39px; display: grid; place-items: center; border-radius: 12px; background: var(--ink); color: #fff; }
.welcome-mark svg { width: 30px; height: 30px; }
.brand-period { color: var(--accent); margin-inline-start: 2px; }
.header-note { position: absolute; inset-inline-start: 50%; transform: translateX(50%); font-size: 11px; color: var(--muted); }
.help-link { display: inline-flex; align-items: center; gap: 9px; min-height: 44px; font-size: 12px; color: #505457; transition: color .25s; }
.help-link svg { width: 18px; height: 18px; }
.help-link:hover, .welcome-footer a:hover { color: #b73c16; }
.welcome-main { width: 100%; max-width: 1184px; margin: auto; padding-block: 32px 24px; }
.intro { text-align: center; margin-bottom: 28px; }
.intro-label { display: inline-flex; align-items: center; gap: 9px; color: #a94020; font-size: 11px; font-weight: 500; }
.intro-label > span { width: 18px; height: 2px; background: var(--accent); }
.intro h1 { margin: 13px 0 12px; font-size: clamp(30px, 3.3vw, 44px); font-weight: 800; line-height: 1.5; letter-spacing: -1.7px; text-wrap: balance; }
.intro-description { color: var(--muted); font-size: 13px; line-height: 2; }
.vehicle-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.vehicle-choice { min-width: 0; display: block; overflow: hidden; border: 1px solid var(--border); border-radius: 22px; background: #fff; box-shadow: 0 3px 5px #191b1d02, 0 10px 30px #191b1d03; transition: border-color .35s, transform .45s var(--ease), box-shadow .45s var(--ease); }
.choice-photo { height: clamp(230px, 20vw, 280px); position: relative; overflow: hidden; isolation: isolate; background: #242729; }
.choice-photo img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .85s var(--ease); }
.choice-car img { object-position: 62% 56%; }
.choice-motorcycle img { object-position: 50% 53%; }
.photo-label { position: absolute; inset-block-start: 22px; inset-inline-start: 25px; display: inline-flex; align-items: center; gap: 10px; color: #fff; font-size: 11px; font-weight: 500; text-shadow: 0 1px 5px #000; }
.photo-label > span:first-child { font-size: 12px; font-variant-numeric: tabular-nums; }
.label-divider { opacity: .6; }
.photo-corner { position: absolute; inset-block-start: 22px; inset-inline-end: 24px; width: 24px; height: 24px; color: #fff; opacity: .75; transition: opacity .3s, transform .4s var(--ease); }
.photo-corner svg { width: 100%; height: 100%; }
.choice-content { padding: 23px 29px 14px; }
.choice-content h2 { font-size: clamp(22px, 2vw, 28px); font-weight: 800; line-height: 1.6; letter-spacing: -.9px; }
.choice-content > p { margin-top: 5px; color: var(--muted); font-size: 13px; line-height: 1.9; }
.choice-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; margin-top: 19px; padding-top: 12px; border-top: 1px solid #eeefeb; font-size: 13px; font-weight: 600; transition: color .3s; }
.choice-arrow { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #f2f2ee; color: #424749; transition: background .3s, color .3s; }
.choice-arrow svg { width: 20px; height: 20px; transition: transform .4s var(--ease); }
.vehicle-choice:focus-visible { outline: 3px solid #b73c16; outline-offset: 5px; }
.welcome a:not(.vehicle-choice):focus-visible { outline: 3px solid #b73c16; outline-offset: 5px; border-radius: 4px; }
.selection-note { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 25px; color: var(--muted); font-size: 10px; line-height: 1.8; }
.selection-note svg { width: 16px; height: 16px; margin-inline-end: 2px; }
.note-dot { padding-inline: 3px; }
.welcome-footer { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid var(--border); font-size: 10px; color: var(--muted); }
.footer-identity { display: flex; align-items: center; gap: 14px; }
.footer-brand { color: #45494b; font-size: 17px; font-weight: 800; letter-spacing: -.8px; }
.footer-brand > span { color: var(--accent); }
.footer-divider { height: 13px; width: 1px; background: #d7d9d4; }
.welcome-footer > a { min-height: 44px; display: inline-flex; align-items: center; gap: 9px; color: #505457; transition: color .25s; }
.welcome-footer > a svg { width: 15px; height: 15px; }
.skip-link { position: absolute; inset-block-start: -100px; inset-inline-start: 24px; z-index: 50; padding: 12px 20px; background: #fff; color: var(--ink); }
.skip-link:focus { inset-block-start: 12px; }
@media (hover: hover) and (pointer: fine) {
  .vehicle-choice:hover { transform: translateY(-5px); border-color: #c9cbc4; box-shadow: 0 14px 40px #191b1d0c; }
  .vehicle-choice:hover img { transform: scale(1.04); }
  .vehicle-choice:hover .choice-bottom { color: #b73c16; }
  .vehicle-choice:hover .choice-arrow { background: var(--accent); color: var(--ink); }
  .vehicle-choice:hover .choice-arrow svg { transform: translateX(-3px); }
  .vehicle-choice:hover .photo-corner { opacity: 1; transform: translate(-2px, -2px); }
}
@media (min-width: 1600px) { .welcome-main { padding-block: 54px 34px; } .intro { margin-bottom: 40px; } }
@media (min-width: 700px) and (max-height: 800px) { .welcome-header { min-height: 76px; } .welcome-main { padding-block: 28px 22px; } .intro { margin-bottom: 25px; } .choice-photo { height: clamp(210px, 19vw, 260px); } .selection-note { margin-top: 19px; } .welcome-footer { min-height: 64px; } }
@media (min-width: 700px) and (max-width: 900px) {
  .welcome { padding-inline: 28px; }
  .vehicle-choices { gap: 18px; }
  .choice-content { padding: 22px 21px 14px; }
  .choice-content h2 { font-size: 22px; }
  .choice-content > p { font-size: 11px; }
  .choice-bottom { font-size: 11px; }
  .photo-label { inset-inline-start: 21px; }
}
@media (max-width: 699px) {
  .welcome { padding-inline: 20px; }
  .welcome-header { min-height: 76px; gap: 16px; }
  .welcome-brand { font-size: 25px; gap: 8px; }
  .welcome-mark { width: 34px; height: 34px; border-radius: 10px; }
  .welcome-mark svg { width: 27px; height: 27px; }
  .header-note { display: none; }
  .help-link { font-size: 10px; gap: 7px; }
  .help-link svg { width: 16px; height: 16px; }
  .welcome-main { padding-block: 32px 26px; }
  .intro { margin-bottom: 27px; }
  .intro-label { font-size: 10px; }
  .intro h1 { max-width: 340px; margin: 13px auto 10px; font-size: clamp(27px, 7.4vw, 37px); line-height: 1.65; letter-spacing: -1.1px; }
  .intro-description { max-width: 290px; margin-inline: auto; font-size: 11px; line-height: 2.1; text-wrap: pretty; }
  .vehicle-choices { grid-template-columns: 1fr; gap: 22px; }
  .vehicle-choice { border-radius: 20px; }
  .choice-photo { height: auto; aspect-ratio: 1.5; }
  .photo-label { inset-block-start: 18px; inset-inline-start: 20px; font-size: 10px; }
  .photo-corner { inset-block-start: 17px; inset-inline-end: 18px; width: 22px; height: 22px; }
  .choice-content { padding: 20px 21px 13px; }
  .choice-content h2 { font-size: 24px; }
  .choice-content > p { font-size: 12px; }
  .choice-bottom { min-height: 59px; margin-top: 18px; font-size: 12px; }
  .choice-arrow { width: 36px; height: 36px; }
  .selection-note { margin-top: 23px; }
  .welcome-footer { min-height: 100px; display: grid; grid-template-columns: 1fr auto; align-content: center; gap: 2px 12px; padding-block: 13px; }
  .footer-identity { gap: 10px; }
  .footer-identity > span:last-child { font-size: 9px; }
  .welcome-footer > p { grid-column: 1; grid-row: 2; font-size: 9px; }
  .welcome-footer > a { grid-column: 2; grid-row: 1 / 3; font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .welcome *, .welcome *::before, .welcome *::after { transition: none !important; }
  .vehicle-choice:hover, .vehicle-choice:hover img, .vehicle-choice:hover .choice-arrow svg, .vehicle-choice:hover .photo-corner { transform: none; }
}
</style>

<script setup lang="ts">
const { user, cart, restore, loadCart } = useMarketplace()
const route = useRoute()
const menu = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const count = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const accountPath = computed(() => user.value?.role === 'ADMIN' ? '/admin' : user.value?.role === 'VENDOR' ? '/vendor' : user.value ? '/account' : '/login')
const year = new Date().toLocaleDateString('fa-IR', { year: 'numeric' })
useHead({ htmlAttrs: { lang: 'fa', dir: 'rtl' } })
onMounted(async () => { loadCart(); await restore() })
watch(() => route.fullPath, () => {
  menu.value = false
  search.value = typeof route.query.q === 'string' ? route.query.q : ''
})
function closeMenu() {
  if (!menu.value) return
  menu.value = false
  menuButton.value?.focus()
}
async function submit() {
  menu.value = false
  await navigateTo({ path: '/brands', query: search.value.trim() ? { q: search.value.trim() } : {} })
}
</script>

<template>
  <div dir="rtl" class="site-shell" @keydown.esc="closeMenu">
    <a href="#main-content" class="skip-link">رفتن به محتوای اصلی</a>
    <div class="site-announcement">
      <div class="shell announcement-inner">
        <span>پارتلی؛ انتخاب دقیق برای خودروی شما</span>
        <NuxtLink to="/support">راهنمای خرید</NuxtLink>
      </div>
    </div>
    <header class="site-header">
      <div class="shell header-inner">
        <NuxtLink to="/" class="site-brand" aria-label="پارتلی، صفحه اصلی">
          <span class="brand-mark" aria-hidden="true">پ</span>
          <span>پارتلی<span class="brand-dot">.</span></span>
        </NuxtLink>
        <nav class="desktop-nav" aria-label="منوی اصلی">
          <NuxtLink to="/brands" class="nav-link">خرید قطعات</NuxtLink>
          <NuxtLink to="/support" class="nav-link">راهنمای خرید</NuxtLink>
          <NuxtLink to="/contact" class="nav-link">تماس با ما</NuxtLink>
        </nav>
        <form class="header-search" role="search" aria-label="جستجوی قطعات" @submit.prevent="submit">
          <input v-model="search" type="search" name="q" placeholder="نام قطعه یا خودرو…" aria-label="نام قطعه یا خودرو">
          <button type="submit" aria-label="جستجو">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" stroke-linecap="round" /></svg>
          </button>
        </form>
        <div class="header-actions">
          <NuxtLink :to="accountPath" class="account-link">{{ user ? 'حساب من' : 'ورود / ثبت‌نام' }}</NuxtLink>
          <NuxtLink to="/cart" class="icon-button cart-link" :aria-label="`سبد خرید، ${count.toLocaleString('fa-IR')} کالا`">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4h2l2 11h12l2-8H6M9 19h.01M17 19h.01" stroke-linecap="round" stroke-linejoin="round" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></svg>
            <span v-if="count" class="badge" aria-hidden="true">{{ count.toLocaleString('fa-IR') }}</span>
          </NuxtLink>
          <button ref="menuButton" type="button" class="menu-button mobile-menu-toggle" :aria-label="menu ? 'بستن منو' : 'باز کردن منو'" :aria-expanded="menu" aria-controls="mobile-nav" @click="menu = !menu">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path v-if="menu" d="m6 6 12 12M6 18 18 6" /><path v-else d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>
      <nav v-show="menu" id="mobile-nav" class="mobile-nav shell" aria-label="منوی موبایل">
        <NuxtLink to="/brands">خرید قطعات</NuxtLink>
        <NuxtLink :to="accountPath">{{ user ? 'حساب کاربری' : 'ورود و ثبت‌نام' }}</NuxtLink>
        <NuxtLink to="/support">راهنمای خرید</NuxtLink>
        <NuxtLink to="/contact">تماس با ما</NuxtLink>
        <form class="mobile-search" role="search" aria-label="جستجوی موبایل" @submit.prevent="submit">
          <input v-model="search" type="search" name="q" class="market-input" placeholder="نام قطعه یا خودرو…" aria-label="نام قطعه یا خودرو">
          <button type="submit" class="market-primary">جستجو</button>
        </form>
      </nav>
    </header>
    <main id="main-content" tabindex="-1">
      <NuxtPage />
    </main>
    <footer class="site-footer">
      <div class="shell footer-grid">
        <div>
          <NuxtLink to="/" class="site-brand" aria-label="پارتلی، صفحه اصلی"><span class="brand-mark" aria-hidden="true">پ</span><span>پارتلی<span class="brand-dot">.</span></span></NuxtLink>
          <p class="footer-description">قطعات یدکی خودرو، با اطلاعات روشن و انتخابی متناسب با خودروی شما.</p>
        </div>
        <nav aria-label="فروشگاه">
          <h2 class="footer-title">فروشگاه</h2>
          <div class="footer-links">
            <NuxtLink to="/brands">خرید قطعات</NuxtLink>
            <NuxtLink to="/cart">سبد خرید</NuxtLink>
            <NuxtLink :to="accountPath">حساب کاربری و سفارش‌ها</NuxtLink>
          </div>
        </nav>
        <nav aria-label="راهنما و پشتیبانی">
          <h2 class="footer-title">همراه شما</h2>
          <div class="footer-links">
            <NuxtLink to="/support">راهنمای خرید</NuxtLink>
            <NuxtLink to="/returns">شرایط خرید و مرجوعی</NuxtLink>
            <NuxtLink to="/contact">تماس با ما</NuxtLink>
          </div>
        </nav>
      </div>
      <div class="shell footer-bottom"><span>© {{ year }} پارتلی. همه حقوق محفوظ است.</span><span>انتخاب آگاهانه، مسیر مطمئن.</span></div>
    </footer>
  </div>
</template>

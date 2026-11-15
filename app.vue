<script setup lang="ts">
const { user, cart, restore, loadCart } = useMarketplace()
const menu = ref(false), search = ref('')
const count = computed(() => cart.value.reduce((s, i) => s + i.quantity, 0))
const accountPath = computed(() => user.value?.role === 'ADMIN' ? '/admin' : user.value?.role === 'VENDOR' ? '/vendor' : user.value ? '/account' : '/login')
onMounted(async () => { loadCart(); await restore() })
const route = useRoute(); watch(() => route.fullPath, () => menu.value = false)
async function submit() { await navigateTo({ path: '/catalog', query: search.value.trim() ? { q: search.value.trim() } : {} }) }
</script>
<template>
    <NuxtPage v-if="route.path === '/'" />
    <div v-else dir="rtl" class="min-h-screen bg-[#f5f7f8] text-ink"><a href="#main-content"
            class="sr-only focus:not-sr-only focus:block focus:bg-white focus:p-4">رفتن به محتوای اصلی</a>
        <div class="bg-ink text-white">
            <div class="shell flex h-9 items-center justify-between text-[11px] text-white/70"><span>بازار تخصصی قطعات
                    یدکی</span>
                <NuxtLink to="/support">راهنمای خرید و پرداخت در محل</NuxtLink>
            </div>
        </div>
        <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
            <div class="shell flex h-[78px] items-center justify-between gap-4">
                <NuxtLink to="/" class="flex shrink-0 items-center gap-3" aria-label="پارتلی، صفحه اصلی"><span
                        class="brand-mark">پ</span><span class="text-xl font-black">پارتلی<span
                            class="text-orange">.</span></span></NuxtLink>
                <nav class="hidden items-center gap-6 text-xs font-bold text-slate-500 lg:flex" aria-label="منوی اصلی">
                    <NuxtLink to="/catalog" class="nav-link">خرید قطعات</NuxtLink>
                    <NuxtLink to="/support" class="nav-link">راهنمای خرید</NuxtLink>
                    <NuxtLink to="/contact" class="nav-link">پشتیبانی</NuxtLink>
                </nav>
                <form class="hidden max-w-xs flex-1 items-center sm:flex" role="search" @submit.prevent="submit"><input
                        v-model="search" class="market-input !rounded-l-none !py-2.5" placeholder="جستجوی قطعه…"
                        aria-label="جستجوی قطعه"><button class="market-secondary !rounded-r-none !py-3"
                        aria-label="جستجو">⌕</button></form>
                <div class="flex shrink-0 items-center gap-2">
                    <NuxtLink to="/cart" class="icon-button relative" aria-label="سبد خرید"><span aria-hidden="true">
                            <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19"
                                    stroke="#1C274C" stroke-width="1.5" stroke-linecap="round" />
                                <path opacity="0.5"
                                    d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z"
                                    stroke="#1C274C" stroke-width="1.5" />
                                <path opacity="0.5"
                                    d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"
                                    stroke="#1C274C" stroke-width="1.5" />
                                <path opacity="0.5" d="M11 9H8" stroke="#1C274C" stroke-width="1.5"
                                    stroke-linecap="round" />
                                <path
                                    d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5"
                                    stroke="#1C274C" stroke-width="1.5" />
                            </svg>
                        </span><span class="badge">{{ count.toLocaleString('fa-IR') }}</span>
                    </NuxtLink>
                    <NuxtLink :to="accountPath" class="market-secondary hidden sm:inline-flex">{{ user ? 'پنل من' :
                        'ورود ثبت‌نام' }}</NuxtLink><button class="menu-button lg:hidden" aria-label="منو"
                        :aria-expanded="menu" aria-controls="mobile-nav" @click="menu = !menu">☰</button>
                </div>
            </div>
            <nav v-if="menu" id="mobile-nav" class="shell grid gap-3 border-t py-5 text-sm lg:hidden"
                aria-label="منوی موبایل">
                <NuxtLink to="/catalog">کاتالوگ قطعات</NuxtLink>
                <NuxtLink :to="accountPath">{{ user ? 'حساب کاربری' : 'ورود و ثبت‌نام' }}</NuxtLink>
                <NuxtLink to="/support">راهنمای خرید</NuxtLink>
                <NuxtLink to="/contact">تماس و پشتیبانی</NuxtLink>
                <form class="flex gap-2 sm:hidden" @submit.prevent="submit"><input v-model="search" class="market-input"
                        placeholder="جستجوی قطعه" aria-label="جستجوی موبایل"><button
                        class="market-primary">جستجو</button></form>
            </nav>
        </header>
        <main id="main-content">
            <NuxtPage />
        </main>
        <footer class="border-t border-slate-200 bg-white">
            <div class="shell grid gap-8 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                    <NuxtLink to="/" class="flex items-center gap-3"><span class="brand-mark">پ</span><strong
                            class="text-xl">پارتلی<span class="text-orange">.</span></strong></NuxtLink>
                    <p class="mt-4 max-w-sm text-sm leading-7 text-slate-500">بازار تخصصی قطعات یدکی؛ اطلاعات شفاف و
                        انتخاب متناسب با خودرو.</p>
                </div>
                <div>
                    <h2 class="footer-title">فروشگاه</h2>
                    <div class="footer-links">
                        <NuxtLink to="/catalog">کاتالوگ قطعات</NuxtLink>
                        <NuxtLink to="/cart">سبد خرید</NuxtLink>
                        <NuxtLink to="/account">پیگیری سفارش‌ها</NuxtLink>
                        <NuxtLink to="/login">ورود / ثبت‌نام</NuxtLink>
                    </div>
                </div>
                <div>
                    <h2 class="footer-title">راهنما و پشتیبانی</h2>
                    <div class="footer-links">
                        <NuxtLink to="/support">راهنمای خرید</NuxtLink>
                        <NuxtLink to="/returns">شرایط خرید و مرجوعی</NuxtLink>
                        <NuxtLink to="/contact">تماس با ما</NuxtLink>
                    </div>
                </div>
            </div>
            <div class="shell border-t border-slate-100 py-5 text-xs text-slate-400">© {{ new
                Date().toLocaleDateString('fa-IR', { year: 'numeric' }) }} پارتلی — همه حقوق محفوظ است.</div>
        </footer>
    </div>
</template>
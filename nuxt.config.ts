export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  devServer: { host: '0.0.0.0', port: 3000 },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiTarget: 'http://localhost:4000/api',
    public: { apiBase: '/api' },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      title: 'پارتلی — قطعه‌ای که دقیقاً می‌خورد',
      meta: [{ name: 'description', content: 'فروشگاه تخصصی قطعات یدکی خودرو و موتورسیکلت با تطبیق دقیق خودرو.' }],
    },
  },
})

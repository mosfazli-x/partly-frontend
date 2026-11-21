<script setup lang="ts">
const {user,restore,cart,loadCart,saveCart,api,money,message}=useMarketplace()
const busy=ref(false),error=ref(''),ready=ref(false),confirmed=ref(false)
const form=reactive({name:'',phone:'',address:'',postalCode:'',note:''})
const total=computed(()=>cart.value.reduce((s,i)=>s+Number(i.price)*i.quantity,0))
onMounted(async()=>{loadCart();await restore();Object.assign(form,{name:user.value?.name||'',phone:user.value?.phone||'',address:user.value?.address||''});ready.value=true})
async function submit(){if(busy.value||!confirmed.value)return;busy.value=true;error.value='';try{const order:any=await api('/api/orders',{method:'POST',body:{...form,items:cart.value.map(i=>({productId:i.id,quantity:i.quantity}))}});cart.value=[];saveCart();await navigateTo(`/orders/${order.id}`)}catch(e){error.value=message(e)}finally{busy.value=false}}
useHead({title:'ثبت سفارش | پارتلی'})
</script>

<template>
  <section class="shell checkout-page" dir="rtl">
    <nav class="breadcrumb" aria-label="مسیر صفحه"><NuxtLink to="/brands">قطعات و برندها</NuxtLink><span aria-hidden="true">/</span><NuxtLink to="/cart">سبد خرید</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">ثبت سفارش</span></nav>
    <header class="page-heading"><p class="market-eyebrow">تکمیل خرید</p><h1 class="market-title">اطلاعات ارسال و ثبت سفارش</h1><p>نشانی گیرنده و جزئیات سفارش را بررسی کنید.</p></header>
    <p v-if="!ready" class="market-empty" role="status">در حال آماده‌سازی…</p>
    <div v-else-if="!user" class="market-panel market-empty"><h2>برای ثبت سفارش وارد شوید.</h2><p>سبد خرید شما حفظ می‌شود.</p><NuxtLink to="/login" class="market-primary empty-link">ورود / ثبت‌نام</NuxtLink></div>
    <div v-else-if="!cart.length" class="market-panel market-empty"><h2>سبد خرید خالی است.</h2><NuxtLink to="/brands" class="market-primary empty-link">انتخاب کالا</NuxtLink></div>
    <form v-else class="checkout-layout" :aria-busy="busy" @submit.prevent="submit">
      <section class="market-panel address-panel" aria-labelledby="address-title">
        <header class="panel-heading"><h2 id="address-title">نشانی گیرنده</h2><p>همه فیلدها به‌جز توضیحات سفارش الزامی هستند.</p></header>
        <div class="field-grid">
          <label class="market-label">نام گیرنده<input v-model="form.name" required maxlength="100" autocomplete="name" class="market-input"></label>
          <label class="market-label">تلفن تماس<input v-model="form.phone" required type="tel" pattern="[+0-9 ()\-]{7,30}" autocomplete="tel" class="market-input" dir="ltr"></label>
          <label class="market-label full-width">نشانی کامل<textarea v-model="form.address" required maxlength="2000" autocomplete="street-address" rows="4" class="market-input" /></label>
          <label class="market-label">کد پستی ۱۰ رقمی<input v-model="form.postalCode" required pattern="[0-9]{10}" inputmode="numeric" autocomplete="postal-code" class="market-input" dir="ltr"></label>
          <label class="market-label full-width">توضیحات سفارش (اختیاری)<textarea v-model="form.note" maxlength="2000" rows="3" class="market-input" /></label>
        </div>
      </section>
      <aside class="market-panel summary" aria-labelledby="order-summary-title">
        <div class="summary-heading"><h2 id="order-summary-title">خلاصه سفارش</h2><NuxtLink to="/cart">ویرایش سبد</NuxtLink></div>
        <ul class="order-items"><li v-for="item in cart" :key="item.id"><div><span class="order-name">{{item.name}}</span><span class="quantity">تعداد: {{item.quantity.toLocaleString('fa-IR')}}</span></div><strong>{{money(Number(item.price)*item.quantity)}}</strong></li></ul>
        <dl class="totals"><div class="subtotal"><dt>جمع کالاها</dt><dd>{{money(total)}}</dd></div><div><dt>هزینه ارسال</dt><dd>۰ هزار تومان</dd></div></dl>
        <div class="payment-note"><h3>پرداخت در محل</h3><p>روش پرداخت این نسخه فقط پرداخت در محل است؛ هیچ پرداخت اینترنتی انجام نمی‌شود. قیمت روز کالاها هنگام ثبت سفارش توسط سرور محاسبه می‌شود.</p></div>
        <label class="confirmation"><input v-model="confirmed" type="checkbox" required><span>اطلاعات سفارش و <NuxtLink to="/returns">شرایط خرید و مرجوعی</NuxtLink> را بررسی کرده‌ام.</span></label>
        <div v-if="error" class="market-error" role="alert">{{error}}</div>
        <button type="submit" class="market-primary submit-button" :disabled="busy||!confirmed">{{busy?'در حال ثبت سفارش…':'ثبت سفارش با پرداخت در محل'}}</button>
        <NuxtLink to="/cart" class="back-link">بازگشت به سبد</NuxtLink>
      </aside>
    </form>
  </section>
</template>

<style scoped>
.checkout-page { padding-block: 32px 72px; color: #202623; background: #f8f7f4; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; font-size: 12px; color: #656b65; }
.breadcrumb a:hover, .summary-heading a:hover, .back-link:hover { color: #b5411e; }
.page-heading { margin-bottom: 36px; }
.page-heading > p:last-child { font-size: 13px; color: #656b65; line-height: 2; }
.checkout-layout { display: grid; grid-template-columns: minmax(0,1fr) 370px; gap: 32px; align-items: start; }
.address-panel, .summary { min-width: 0; }
h2 { font-size: 17px; font-weight: 700; }
.panel-heading { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid #dedfd8; }
.panel-heading p { margin-top: 8px; font-size: 12px; color: #656b65; }
.field-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px 20px; }
.market-label { margin: 0; min-width: 0; font-size: 13px; }
.full-width { grid-column: 1 / -1; }
textarea { resize: vertical; }
.summary-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.summary-heading a { display: inline-flex; align-items: center; min-height: 44px; font-size: 12px; text-decoration: underline; text-underline-offset: 4px; }
.order-items { margin-top: 12px; }
.order-items li { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 16px; padding-block: 18px; border-bottom: 1px solid #dedfd8; font-size: 12px; line-height: 2; }
.order-name { display: block; overflow-wrap: anywhere; }
.quantity { display: block; margin-top: 4px; color: #656b65; font-size: 11px; }
.order-items strong { align-self: start; font-weight: 600; }
.totals { display: grid; gap: 12px; padding-block: 22px; }
.totals > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 12px; }
.totals dt { color: #656b65; }
.totals dd { margin: 0; }
.totals .subtotal { font-size: 15px; font-weight: 700; }
.subtotal dt { color: #202623; }
.payment-note { padding: 16px; border: 1px solid #dedfd8; border-radius: 8px; background: #f8f7f4; }
.payment-note h3 { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.payment-note p { font-size: 12px; line-height: 2.1; color: #656b65; }
.confirmation { display: flex; align-items: flex-start; gap: 10px; padding-block: 24px; font-size: 12px; line-height: 2.1; cursor: pointer; }
.confirmation input { flex-shrink: 0; margin-top: 5px; width: 18px; height: 18px; accent-color: #df592e; }
.confirmation a { color: #b5411e; text-decoration: underline; text-underline-offset: 4px; }
.submit-button { width: 100%; }
.back-link { display: flex; align-items: center; justify-content: center; min-height: 44px; margin-top: 8px; font-size: 12px; color: #656b65; }
.market-empty h2 { color: #202623; }
.empty-link { margin-top: 24px; }
@media (max-width: 1000px) {
  .checkout-layout { grid-template-columns: minmax(0,1fr); gap: 24px; }
}
@media (max-width: 539px) {
  .checkout-page { padding-block: 24px 48px; }
  .field-grid { grid-template-columns: minmax(0,1fr); gap: 20px; }
  .order-items li { grid-template-columns: minmax(0,1fr); gap: 6px; }
}
</style>

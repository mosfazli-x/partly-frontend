<script setup lang="ts">
const {cart,loadCart,saveCart,money}=useMarketplace()
onMounted(loadCart)
const total=computed(()=>cart.value.reduce((s,i)=>s+Number(i.price)*i.quantity,0))
function quantity(item:any){item.quantity=Math.max(1,Math.min(Number(item.stock)||1000,Math.floor(Number(item.quantity)||1)));saveCart()}
function remove(id:string){cart.value=cart.value.filter(i=>i.id!==id);saveCart()}
useHead({title:'سبد خرید | پارتلی'})
</script>

<template>
  <section class="shell cart-page" dir="rtl">
    <nav class="breadcrumb" aria-label="مسیر صفحه"><NuxtLink to="/brands">قطعات و برندها</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">سبد خرید</span></nav>
    <header class="page-heading"><p class="market-eyebrow">بررسی انتخاب‌ها</p><h1 class="market-title">سبد خرید</h1><p>قیمت و موجودی کالا هنگام ثبت سفارش دوباره بررسی می‌شود.</p></header>
    <div v-if="!cart.length" class="market-panel market-empty">
      <h2>سبد خرید شما خالی است.</h2><p>برای انتخاب قطعه، برندها و کالاها را بررسی کنید.</p><NuxtLink to="/brands" class="market-primary empty-link">مشاهده قطعات</NuxtLink>
    </div>
    <div v-else class="cart-layout">
      <section class="items-panel" aria-labelledby="items-title">
        <div class="panel-heading"><h2 id="items-title">کالاهای سبد</h2><span>{{cart.length.toLocaleString('fa-IR')}} نوع کالا</span></div>
        <article v-for="item in cart" :key="item.id" class="cart-item">
          <div class="item-info"><NuxtLink :to="`/products/${item.slug}`" class="item-name">{{item.name}}</NuxtLink><p>قیمت واحد <span>{{money(item.price)}}</span></p><p class="unit-words">{{priceInWords(item.price)}}</p><p v-if="item.packaging">نوع بسته‌بندی <span>{{packagingLabel(item.packaging)}}</span></p></div>
          <div class="item-controls"><label class="quantity-label">تعداد<input v-model.number="item.quantity" type="number" min="1" :max="item.stock" :aria-label="`تعداد ${item.name}`" class="market-input quantity-input" @change="quantity(item)"></label><button type="button" class="remove-button" :aria-label="`حذف ${item.name}`" @click="remove(item.id)">حذف</button></div>
          <div class="line-total"><span>جمع کالا</span><strong>{{money(Number(item.price)*item.quantity)}}</strong></div>
        </article>
        <NuxtLink to="/brands" class="continue-link">ادامه خرید</NuxtLink>
      </section>
      <aside class="market-panel summary" aria-labelledby="summary-title">
        <h2 id="summary-title">خلاصه سبد</h2>
        <dl><div class="summary-total"><dt>جمع کالاها</dt><dd>{{money(total)}}</dd></div></dl>
        <p class="summary-note">پرداخت در محل. مبلغ و شرایط ارسال در مرحله بعد نمایش داده می‌شود.</p>
        <NuxtLink to="/checkout" class="market-primary checkout-link">ادامه و ثبت سفارش</NuxtLink>
        <p class="summary-footnote">اطلاعات ارسال را در مرحله بعد وارد کنید.</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.cart-page { padding-block: 32px 72px; color: #202623; background: #f8f7f4; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; font-size: 12px; color: #656b65; }
.breadcrumb a:hover, .item-name:hover, .continue-link:hover { color: #b5411e; }
.page-heading { margin-bottom: 36px; }
.page-heading > p:last-child { font-size: 13px; color: #656b65; line-height: 2; }
.cart-layout { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 40px; align-items: start; }
.items-panel { min-width: 0; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid #dedfd8; }
h2 { font-size: 17px; font-weight: 700; }
.panel-heading > span { font-size: 12px; color: #656b65; }
.cart-item { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 20px 24px; border-bottom: 1px solid #dedfd8; padding-block: 26px; }
.item-info { min-width: 0; }
.item-name { font-size: 15px; font-weight: 600; line-height: 2; overflow-wrap: anywhere; }
.item-info p { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; font-size: 12px; color: #656b65; }
.item-info .unit-words { margin-top: 2px; color: #8a8f86; font-size: 11px; }
.item-controls { display: flex; align-items: end; gap: 12px; }
.quantity-label { display: grid; gap: 6px; font-size: 11px; color: #656b65; }
.quantity-input { width: 88px; text-align: center; padding-inline: 8px; }
.remove-button { min-width: 44px; min-height: 46px; font-size: 12px; color: #b5411e; text-decoration: underline; text-underline-offset: 4px; }
.line-total { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 14px; }
.line-total > span { color: #656b65; font-size: 12px; }
.continue-link { display: inline-flex; align-items: center; min-height: 44px; margin-top: 16px; font-size: 13px; text-decoration: underline; text-underline-offset: 5px; }
.summary { position: sticky; top: 112px; }
.summary-total { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-block: 24px; padding-block: 20px; border-block: 1px solid #dedfd8; font-size: 14px; }
.summary-total dd { margin: 0; font-weight: 700; }
.summary-note, .summary-footnote { color: #656b65; font-size: 12px; line-height: 2; }
.summary-note { margin-bottom: 24px; }
.checkout-link { width: 100%; }
.summary-footnote { margin-top: 14px; text-align: center; }
.market-empty h2 { color: #202623; margin-bottom: 8px; }
.empty-link { margin-top: 24px; }
@media (max-width: 900px) {
  .cart-layout { grid-template-columns: minmax(0,1fr); gap: 28px; }
  .summary { position: static; }
}
@media (max-width: 479px) {
  .cart-page { padding-block: 24px 48px; }
  .cart-item { grid-template-columns: minmax(0,1fr); }
  .item-controls { justify-content: space-between; }
  .quantity-label { display: flex; align-items: center; gap: 12px; }
  .line-total { flex-wrap: wrap; }
}
</style>

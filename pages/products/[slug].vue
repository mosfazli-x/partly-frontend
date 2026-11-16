<script setup lang="ts">
const route=useRoute(), {api,add,money,message}=useMarketplace()
const {data:product,error,refresh}=await useAsyncData(`product-${route.params.slug}`,()=>api(`/api/products/${encodeURIComponent(String(route.params.slug))}`))
const added=ref(false)
const activeIndex=ref(0)
const gallery=computed(() => (product.value as { images?: { id: string; url: string }[] } | null)?.images ?? [])
const activeImage=computed(() => { const g=gallery.value; const i=Math.max(0,Math.min(activeIndex.value,g.length-1)); return g[i]?.url ?? (product.value as { image?: string } | null)?.image ?? '' })
const failedImages=ref<string[]>([])
function imageFailed(url:string) { if (!failedImages.value.includes(url)) failedImages.value.push(url) }
useHead({title:()=>product.value?`${product.value.name} | پارتلی`:'کالا | پارتلی'})
</script>

<template>
  <section class="shell product-page" dir="rtl">
    <nav class="breadcrumb" aria-label="مسیر صفحه">
      <NuxtLink to="/brands">قطعات و برندها</NuxtLink><span aria-hidden="true">/</span><span aria-current="page">جزئیات کالا</span>
    </nav>
    <div v-if="error" class="market-error" role="alert">{{message(error)}} <button type="button" class="retry" @click="refresh()">تلاش دوباره</button></div>
    <template v-else-if="product">
      <div class="product-layout">
        <div class="gallery">
          <div id="product-image" class="image-stage">
            <img v-if="activeImage && !failedImages.includes(activeImage)" :key="activeImage" :src="activeImage" :alt="product.name" @error="imageFailed(activeImage)">
            <p v-else class="image-placeholder" role="status">تصویر کالا در دسترس نیست</p>
          </div>
          <div v-if="gallery.length>1" class="thumbnails" role="group" aria-label="انتخاب تصویر کالا">
            <button v-for="(im,i) in gallery" :key="im.id" type="button" class="thumbnail" :class="{selected:activeIndex===i}" :aria-label="`نمایش تصویر ${i+1} از ${gallery.length}: ${product.name}`" :aria-pressed="activeIndex===i" aria-controls="product-image" @click="activeIndex=i">
              <img v-if="im.url && !failedImages.includes(im.url)" :src="im.url" alt="" loading="lazy" @error="imageFailed(im.url)">
              <span v-else class="thumbnail-placeholder">تصویر {{i+1}}</span>
            </button>
          </div>
        </div>
        <div class="product-details">
          <p class="market-eyebrow">{{product.category?.name}}<span v-if="product.category?.name && product.brand"> / </span>{{product.brand}}</p>
          <h1 class="market-title">{{product.name}}</h1>
          <p class="sku">کد کالا: <bdi>{{product.sku}}</bdi></p>
          <p class="description">{{product.description}}</p>
          <dl class="product-facts">
            <div><dt>فروشنده</dt><dd>{{product.vendor?.shopName || 'فروشگاه پارتلی'}}</dd></div>
            <div><dt>وضعیت کالا</dt><dd>{{({NEW:'نو',USED:'کارکرده',REFURBISHED:'بازسازی‌شده'} as any)[product.condition]}}</dd></div>
            <div><dt>موجودی</dt><dd :class="{'in-stock':product.stock}">{{product.stock?`${product.stock} عدد موجود`:'ناموجود'}}</dd></div>
          </dl>
          <div class="purchase">
            <div class="price"><span>قیمت کالا</span><strong>{{money(product.price)}}</strong></div>
            <button type="button" :disabled="!product.stock" class="market-primary" @click="add(product);added=true">{{product.stock?'افزودن به سبد خرید':'ناموجود'}}</button>
          </div>
          <p v-if="added" class="market-success added" role="status">به سبد خرید اضافه شد. <NuxtLink to="/cart" class="retry">مشاهده سبد</NuxtLink></p>
          <p class="purchase-note">پرداخت در محل · مبلغ نهایی در مرحله ثبت سفارش تأیید می‌شود.</p>
        </div>
      </div>
      <section class="compatibility" aria-labelledby="compatibility-title">
        <div class="section-heading"><p class="market-eyebrow">پیش از خرید بررسی کنید</p><h2 id="compatibility-title">سازگاری با خودرو</h2></div>
        <ul v-if="product.fitments?.length" class="fitments">
          <li v-for="f in product.fitments" :key="f.variantId"><strong>{{f.variant.model.make.name}} / {{f.variant.model.name}}</strong><span>{{f.variant.name}}<span v-if="f.variant.years"> · {{f.variant.years}}</span></span></li>
        </ul>
        <p v-else class="muted">اطلاعات سازگاری ثبت نشده است؛ پیش از سفارش از تطبیق مشخصات فنی اطمینان حاصل کنید.</p>
      </section>
      <section v-if="product.specifications?.length" class="specifications" aria-labelledby="specifications-title">
        <h2 id="specifications-title">مشخصات فنی</h2>
        <dl class="spec-grid"><div v-for="s in product.specifications" :key="s.id"><dt>{{s.key || s.name}}</dt><dd>{{s.value}}</dd></div></dl>
      </section>
    </template>
  </section>
</template>

<style scoped>
.product-page { padding-block: 32px 72px; color: #202623; background: #f8f7f4; }
.breadcrumb { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; font-size: 12px; color: #656b65; }
.breadcrumb a:hover, .retry:hover { color: #b5411e; }
.retry { text-decoration: underline; text-underline-offset: 4px; }
.product-layout { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); gap: clamp(28px,5vw,72px); align-items: start; }
.gallery, .product-details { min-width: 0; }
.image-stage { display: grid; place-items: center; aspect-ratio: 1; padding: 32px; background: #fff; border: 1px solid #dedfd8; border-radius: 14px; overflow: hidden; }
.image-stage img { width: 100%; height: 100%; max-height: 460px; object-fit: contain; }
.image-placeholder { color: #656b65; font-size: 14px; text-align: center; }
.thumbnails { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.thumbnail { width: 72px; height: 72px; padding: 6px; border: 1px solid #dedfd8; border-radius: 8px; background: white; }
.thumbnail.selected { border-color: #df592e; box-shadow: inset 0 0 0 1px #df592e; }
.thumbnail:hover { border-color: #202623; }
.thumbnail img { width: 100%; height: 100%; object-fit: contain; }
.thumbnail-placeholder { font-size: 10px; color: #656b65; }
.sku, .purchase-note { font-size: 12px; color: #656b65; }
.description { margin-block: 24px; font-size: 14px; line-height: 2.2; color: #656b65; white-space: pre-line; overflow-wrap: anywhere; }
.product-facts { border-block: 1px solid #dedfd8; padding-block: 12px; }
.product-facts > div { display: flex; justify-content: space-between; gap: 20px; padding-block: 8px; font-size: 13px; }
dt { color: #656b65; }
dd { margin: 0; overflow-wrap: anywhere; }
.in-stock { color: #386047; font-weight: 600; }
.purchase { margin-top: 28px; display: grid; gap: 20px; }
.price { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
.price > span { color: #656b65; font-size: 12px; }
.price strong { font-size: clamp(22px,2.5vw,28px); }
.purchase-note { margin-top: 16px; line-height: 2; }
.added { margin-top: 16px; }
.compatibility, .specifications { border-top: 1px solid #dedfd8; padding-top: 32px; margin-top: 48px; }
h2 { font-size: 20px; font-weight: 700; }
.section-heading { margin-bottom: 24px; }
.fitments, .spec-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 32px; }
.fitments li { display: flex; flex-direction: column; gap: 5px; border-bottom: 1px solid #dedfd8; padding: 18px 0; font-size: 13px; overflow-wrap: anywhere; }
.fitments li > span, .muted { color: #656b65; font-size: 13px; line-height: 2; }
.spec-grid { margin-top: 16px; }
.spec-grid > div { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #dedfd8; padding-block: 16px; font-size: 13px; }
@media (max-width: 767px) {
  .product-page { padding-block: 24px 48px; }
  .product-layout, .fitments, .spec-grid { grid-template-columns: minmax(0,1fr); }
  .image-stage { max-height: 420px; padding: 24px; }
  .compatibility, .specifications { margin-top: 32px; }
}
</style>

<script setup lang="ts">
const route=useRoute(), {api,add,message}=useMarketplace()
const {data:product,error,refresh}=await useAsyncData(`product-${route.params.slug}`,()=>api(`/api/products/${encodeURIComponent(String(route.params.slug))}`))
const {data:related}=await useAsyncData(`related-${route.params.slug}`,()=>api(`/api/products/${encodeURIComponent(String(route.params.slug))}/related`).catch(()=>({related:[],sameVehicle:[]})))
const relatedProducts=computed(()=>((related.value as any)?.related ?? []) as any[])
const sameVehicleProducts=computed(()=>((related.value as any)?.sameVehicle ?? []) as any[])
const discount=computed(()=>discountPercent((product.value as any)?.compareAt,(product.value as any)?.price))
const added=ref(false)
const shareState=ref('')
const activeIndex=ref(0)
const gallery=computed(() => (product.value as { images?: { id: string; url: string }[] } | null)?.images ?? [])
const activeImage=computed(() => { const g=gallery.value; const i=Math.max(0,Math.min(activeIndex.value,g.length-1)); return g[i]?.url ?? (product.value as { image?: string } | null)?.image ?? '' })
const failedImages=ref<string[]>([])
const isVideoUrl=(url:string)=>/\.(?:mp4|webm|ogv|mov|m4v|avi|mpeg|mpg|3gp|mkv)(?:[?#]|$)/i.test(url)
function imageFailed(url:string) { if (!failedImages.value.includes(url)) failedImages.value.push(url) }
function addRelated(item:any) { add(item); added.value=true }
function addCurrent() { if (product.value) add(product.value); added.value=true }
async function share() {
  if (!import.meta.client || !product.value) return
  const url=window.location.href
  try {
    if (navigator.share) { await navigator.share({ title: product.value.name, url }); return }
    await navigator.clipboard.writeText(url)
    shareState.value='نشانی کالا کپی شد.'
  } catch { shareState.value='' }
}
useHead({title:()=>product.value?`${product.value.name} | پارتلی`:'کالا | پارتلی'})
</script>

<template>
  <section class="shell product-page" dir="rtl">
    <nav class="breadcrumb" aria-label="مسیر صفحه">
      <NuxtLink to="/">خانه</NuxtLink><span aria-hidden="true">/</span>
      <NuxtLink to="/brands">خرید قطعات</NuxtLink>
      <template v-if="product?.category"><span aria-hidden="true">/</span><NuxtLink :to="{ path: '/brands', query: { category: product.category.slug } }">{{product.category.name}}</NuxtLink></template>
      <span aria-hidden="true">/</span><span aria-current="page">{{product?.name || 'جزئیات کالا'}}</span>
    </nav>
    <div v-if="error" class="market-error" role="alert">{{message(error)}} <button type="button" class="retry" @click="refresh()">تلاش دوباره</button></div>
    <template v-else-if="product">
      <div class="product-layout">
        <div class="gallery">
          <div id="product-image" class="image-stage">
            <video v-if="activeImage && isVideoUrl(activeImage)" :key="activeImage" :src="activeImage" controls playsinline :aria-label="product.name" />
            <img v-else-if="activeImage && !failedImages.includes(activeImage)" :key="activeImage" :src="activeImage" :alt="product.name" @error="imageFailed(activeImage)">
            <p v-else class="image-placeholder" role="status">تصویر کالا در دسترس نیست</p>
          </div>
          <div v-if="gallery.length>1" class="thumbnails" role="group" aria-label="انتخاب تصویر کالا">
            <button v-for="(im,i) in gallery" :key="im.id" type="button" class="thumbnail" :class="{selected:activeIndex===i}" :aria-label="`نمایش رسانه ${i+1} از ${gallery.length}: ${product.name}`" :aria-pressed="activeIndex===i" aria-controls="product-image" @click="activeIndex=i">
              <video v-if="im.url && isVideoUrl(im.url)" :src="im.url" muted playsinline preload="metadata" />
              <img v-else-if="im.url && !failedImages.includes(im.url)" :src="im.url" alt="" loading="lazy" @error="imageFailed(im.url)">
              <span v-else class="thumbnail-placeholder">تصویر {{i+1}}</span>
              <span v-if="im.url && isVideoUrl(im.url)" class="media-badge" aria-hidden="true">▶</span>
            </button>
          </div>
        </div>
        <div class="product-details">
          <p class="market-eyebrow">{{product.category?.name}}<span v-if="product.category?.name && product.brand"> / </span>{{product.brand}}</p>
          <h1 class="market-title">{{product.name}}</h1>
          <div class="meta-row">
            <p class="sku">کد کالا: <bdi>{{product.sku}}</bdi></p>
            <button type="button" class="share" @click="share">اشتراک‌گذاری</button>
          </div>
          <p v-if="shareState" class="share-note" role="status">{{shareState}}</p>
          <p class="description">{{product.description}}</p>
          <dl class="product-facts">
            <div><dt>فروشنده</dt><dd>{{product.vendor?.shopName || 'فروشگاه پارتلی'}}</dd></div>
            <div v-if="product.packaging"><dt>نوع بسته‌بندی</dt><dd>{{packagingLabel(product.packaging)}}</dd></div>
            <div v-if="product.quantityPerPackage"><dt>تعداد در بسته</dt><dd>{{Number(product.quantityPerPackage).toLocaleString('fa-IR')}} عدد</dd></div>
            <div v-if="product.packagePrice"><dt>قیمت بسته</dt><dd>{{formatPriceUnit(product.packagePrice)}} {{PRICE_UNIT}}</dd></div>
            <div><dt>موجودی</dt><dd :class="{'in-stock':product.stock}">{{product.stock?`${product.stock} عدد موجود`:'ناموجود'}}</dd></div>
          </dl>
          <div class="purchase">
            <div class="price-block">
              <div class="price"><span>قیمت واحد</span><div class="price-values"><strong>{{formatPriceUnit(product.price)}}</strong><span class="price-unit">{{PRICE_UNIT}}</span><s v-if="discount" class="price-old">{{formatPriceUnit(product.compareAt)}} {{PRICE_UNIT}}</s><span v-if="discount" class="discount-pill">٪{{discount.toLocaleString('fa-IR')}} تخفیف</span></div></div>
              <p class="price-words">{{priceInWords(product.price)}}</p>
              <p v-if="product.stock > 0 && product.stock <= 3" class="scarcity">تنها {{product.stock.toLocaleString('fa-IR')}} عدد در انبار باقی مانده است.</p>
            </div>
            <button type="button" :disabled="!product.stock" class="market-primary" @click="addCurrent">{{product.stock?'افزودن به سبد خرید':'ناموجود'}}</button>
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
      <section v-if="relatedProducts.length || sameVehicleProducts.length" class="related" aria-label="پیشنهادهای بیشتر">
        <div v-if="relatedProducts.length" class="related-block">
          <div class="section-heading"><p class="market-eyebrow">پیشنهاد مشابه</p><h2>محصولات مرتبط</h2></div>
          <div class="related-grid"><ProductCard v-for="item in relatedProducts" :key="item.id" :product="item" @add="addRelated" /></div>
        </div>
        <div v-if="sameVehicleProducts.length" class="related-block">
          <div class="section-heading"><p class="market-eyebrow">برای خودروی شما</p><h2>سایر قطعات این خودرو</h2></div>
          <div class="related-grid"><ProductCard v-for="item in sameVehicleProducts" :key="item.id" :product="item" @add="addRelated" /></div>
        </div>
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
.image-stage video { width: 100%; height: 100%; max-height: 460px; background: #000; }
.image-placeholder { color: #656b65; font-size: 14px; text-align: center; }
.thumbnails { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.thumbnail { position: relative; width: 72px; height: 72px; padding: 6px; border: 1px solid #dedfd8; border-radius: 8px; background: white; }
.thumbnail.selected { border-color: #df592e; box-shadow: inset 0 0 0 1px #df592e; }
.thumbnail:hover { border-color: #202623; }
.thumbnail img, .thumbnail video { width: 100%; height: 100%; object-fit: contain; }
.thumbnail-placeholder { font-size: 10px; color: #656b65; }
.media-badge { position: absolute; inset-block-end: 4px; inset-inline-start: 4px; padding: 1px 5px; border-radius: 999px; background: rgba(32,38,35,.82); color: #fff; font-size: 9px; }
.sku, .purchase-note { font-size: 12px; color: #656b65; }
.meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.share { min-height: 32px; padding-inline: 10px; border: 1px solid #dedfd8; border-radius: 999px; background: #fff; font-size: 11px; color: #656b65; }
.share:hover { border-color: #202623; color: #202623; }
.share-note { margin-top: 6px; font-size: 11px; color: #386047; }
.price-old { color: #9a9e94; font-size: 12px; }
.discount-pill { padding: 2px 8px; border-radius: 999px; background: #fdece6; color: #b5411e; font-size: 11px; font-weight: 700; }
.scarcity { margin-top: 8px; color: #b45309; font-size: 12px; font-weight: 600; }
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
.price-block { display: grid; gap: 6px; }
.price-values { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; }
.price-unit, .price-words { color: #656b65; font-size: 12px; }
.price-words { line-height: 2; }
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
.related { display: grid; gap: 40px; border-top: 1px solid #dedfd8; margin-top: 48px; padding-top: 32px; }
.related-block .section-heading { margin-bottom: 20px; }
.related-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; }
@media (max-width: 1024px) {
  .related-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 767px) {
  .product-page { padding-block: 24px 48px; }
  .product-layout, .fitments, .spec-grid { grid-template-columns: minmax(0,1fr); }
  .image-stage { max-height: 420px; padding: 24px; }
  .compatibility, .specifications { margin-top: 32px; }
  .related-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 479px) {
  .related-grid { grid-template-columns: minmax(0,1fr); }
}
</style>

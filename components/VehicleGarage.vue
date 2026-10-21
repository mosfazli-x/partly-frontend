<script setup lang="ts">
import { getVehicleModelAsset, getShowroomVehicles, getShowroomModelAsset } from '~/utils/vehicleModels'
type Vehicle = { id: string; name: string; faName?: string; enName?: string; slug?: string; body?: string; engine?: string; years?: string; transmission?: string; fuel?: string; models?: Vehicle[]; variants?: Vehicle[]; showroomOnly?: boolean; assetId?: string }
const props = defineProps<{ makes: Vehicle[]; makeId: string; modelId: string; variantId: string; loading?: boolean; error?: string }>()
const emit = defineEmits<{ select: [selection: { makeId: string; modelId: string; variantId: string }]; clear: []; retry: [] }>()
const previewMakeId = ref(''), previewModelId = ref(''), previewVariantId = ref('')
const brandQuery = ref(''), paint = ref('#ced5db'), rotating = ref(true), view = ref<'orbit' | 'side' | 'front'>('orbit'), sceneReady = ref(false), sceneUnavailable = ref(false)
const paints = [{ value: '#ced5db', label: 'نقره‌ای متالیک' }, { value: '#192b38', label: 'آبی نیمه‌شب' }, { value: '#bd472d', label: 'نارنجی مسی' }, { value: '#eee8d9', label: 'سفید صدفی' }, { value: '#444a40', label: 'سبز گرافیتی' }]
const make = computed(() => props.makes.find(item => item.id === previewMakeId.value))
const models = computed<Vehicle[]>(() => [...(make.value?.models || []), ...getShowroomVehicles(make.value?.slug)])
const model = computed(() => models.value.find(item => item.id === previewModelId.value))
const showroomOnly = computed(() => model.value?.showroomOnly === true)
function assetFor(item?: Vehicle) {
  return item?.showroomOnly ? getShowroomModelAsset(item.assetId) : getVehicleModelAsset(make.value?.slug, item?.slug, item?.variants?.[0]?.slug)
}
const variants = computed(() => model.value?.variants || [])
const variant = computed(() => variants.value.find(item => item.id === previewVariantId.value))
const modelAsset = computed(() => showroomOnly.value ? getShowroomModelAsset(model.value?.assetId) : getVehicleModelAsset(make.value?.slug, model.value?.slug, variant.value?.slug))
const modelState = ref<'loading' | 'ready' | 'error' | 'generic'>('loading')
watch(() => modelAsset.value?.url, () => { sceneReady.value = false; sceneUnavailable.value = false; modelState.value = 'loading' })
function previewPride111() {
  const pride = props.makes.find(item => item.slug === 'pride')
  const pride111 = pride?.models?.find(item => item.slug === '111')
  if (pride && pride111) { chooseMake(pride.id); chooseModel(pride111.id) }
}
const hasPride111 = computed(() => props.makes.some(item => item.slug === 'pride' && item.models?.some(model => model.slug === '111')))
const brands = computed(() => props.makes.filter(item => `${item.name} ${item.faName || ''} ${item.enName || ''}`.toLowerCase().includes(brandQuery.value.toLowerCase())))
const body = computed(() => variant.value?.body || model.value?.body || 'SEDAN')
const bodyNames: Record<string, string> = { SEDAN: 'سدان', HATCHBACK: 'هاچ‌بک', SUV: 'شاسی‌بلند', CROSSOVER: 'کراس‌اور', PICKUP: 'پیکاپ', VAN: 'ون', COUPE: 'کوپه', FASTBACK: 'فست‌بک', WAGON: 'استیشن SW' }
const transmissionNames: Record<string, string> = { MANUAL: 'دستی', AUTOMATIC: 'اتوماتیک', CVT: 'CVT', DCT: 'دوکلاچه' }
const applied = computed(() => Boolean(props.variantId) && props.variantId === previewVariantId.value)
const title = computed(() => model.value?.faName || model.value?.name || 'خودروی بعدی شما')
const englishTitle = computed(() => model.value ? `${make.value?.enName || make.value?.slug?.replace(/-/g, ' ') || ''} ${model.value.enName || model.value.slug?.replace(/-/g, ' ') || ''}`.trim() : 'YOUR NEXT DRIVE')
const modelIndex = computed(() => Math.max(0, models.value.findIndex(item => item.id === previewModelId.value)))
function chooseModel(id: string) {
  previewModelId.value = id
  previewVariantId.value = models.value.find(item => item.id === id)?.variants?.[0]?.id || ''
  // A showroom-only model must never retain an applied fitment from another car.
  if (showroomOnly.value && props.variantId) emit('clear')
}
function chooseMake(id: string) {
  previewMakeId.value = id
  chooseModel((make.value?.models?.find(item => getVehicleModelAsset(make.value?.slug, item.slug, item.variants?.[0]?.slug)) || make.value?.models?.[0])?.id || '')
}
watch(() => [props.makes, props.makeId, props.modelId, props.variantId] as const, () => {
  if (!props.makes.length) return
  if (props.makeId) {
    previewMakeId.value = props.makeId
    previewModelId.value = props.modelId || make.value?.models?.[0]?.id || ''
    previewVariantId.value = props.variantId || model.value?.variants?.[0]?.id || ''
  } else if (!props.makes.some(item => item.id === previewMakeId.value)) {
    chooseMake((props.makes.find(item => item.slug === 'saipa' || item.slug === 'pride') || props.makes[0])!.id)
  }
}, { immediate: true })
function stepModel(direction: number) {
  if (!models.value.length) return
  chooseModel(models.value[(modelIndex.value + direction + models.value.length) % models.value.length]!.id)
}
function apply() {
  if (showroomOnly.value || !variant.value) return
  emit('select', { makeId: previewMakeId.value, modelId: previewModelId.value, variantId: previewVariantId.value })
  nextTick(() => document.getElementById('catalog-results')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
}
</script>

<template>
  <section class="garage" aria-labelledby="garage-title">
    <header class="garage-topline">
      <div class="garage-brand" dir="ltr"><span class="garage-mark">P<span>/</span></span><span>PARTLY <b>GARAGE</b></span><span class="garage-version">V.01</span></div>
      <span class="garage-live"><i></i> گاراژ تعاملی <span dir="ltr">/ LIVE 3D</span></span>
    </header>
    <div class="garage-intro">
      <div><p class="garage-kicker">خودرو را ببینید. دقیق انتخاب کنید.</p><h3 id="garage-title">گاراژ شما، <span>انتخاب شما.</span></h3></div>
      <p>خودرو را بچرخانید، مدل و تیپ را انتخاب کنید<br>و مستقیماً به قطعات سازگار برسید.</p>
    </div>

    <div v-if="error" class="garage-alert" role="alert">{{ error }} <button type="button" @click="emit('retry')">دریافت دوباره خودروها</button></div>
    <div class="garage-workspace">
      <div class="garage-stage">
        <div class="garage-stage-grid" aria-hidden="true"></div>
        <div class="garage-watermark" dir="ltr" aria-hidden="true">{{ englishTitle }}</div>
        <div class="garage-stage-tag" dir="ltr"><span>SHOWROOM</span><b>{{ String(modelIndex + 1).padStart(2, '0') }}</b><span>/ {{ String(models.length).padStart(2, '0') }}</span></div>
        <ClientOnly v-if="modelAsset">
          <VehicleScene :body="body" :color="paint" :rotating="rotating" :vehicle-key="previewVariantId" :view="view" :model-url="modelAsset.url" :poster-url="modelAsset.poster" @ready="sceneReady = true" @unavailable="sceneUnavailable = true" @model-state="modelState = $event" />
          <template #fallback><div class="garage-render-loading" role="status">آماده‌سازی گاراژ سه‌بعدی…</div></template>
        </ClientOnly>
        <div v-else class="garage-asset-missing" role="status">
          <span class="garage-missing-index" dir="ltr">3D / COMING NEXT</span>
          <strong>{{ loading ? 'در حال دریافت خودروها…' : 'مدل اختصاصی این خودرو هنوز اضافه نشده است' }}</strong>
          <p>برای نمایش دقیق، فقط از فایل سه‌بعدی همان خودرو استفاده می‌کنیم.</p>
          <button v-if="hasPride111" type="button" @click="previewPride111">مشاهده مدل پراید ۱۱۱ ←</button>
        </div>
        <div v-if="modelAsset && modelState === 'ready' && !sceneUnavailable" class="garage-model-badge">مدل اختصاصی {{ modelAsset.label }}</div>
        <div v-if="modelAsset && modelState === 'ready' && !sceneUnavailable" class="garage-stage-bottom">
          <div class="garage-camera" aria-label="زاویه دوربین">
            <button v-for="camera in ([{ value: 'orbit', label: 'سه‌رخ' }, { value: 'side', label: 'نمای جانبی' }, { value: 'front', label: 'نمای جلو' }] as const)" :key="camera.value" type="button" :aria-pressed="view === camera.value" @click="view = camera.value">{{ camera.label }}</button>
          </div>
          <button class="garage-rotation" type="button" :aria-pressed="rotating" :aria-label="rotating ? 'توقف چرخش خودکار' : 'شروع چرخش خودکار'" @click="rotating = !rotating"><span aria-hidden="true">{{ rotating ? 'Ⅱ' : '▷' }}</span><span>چرخش خودکار</span></button>
        </div>
        <div v-if="modelAsset && modelState === 'ready' && !sceneUnavailable" class="garage-drag-hint"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12a8 8 0 1 1 2 5M4 12V6m0 6h6"/></svg>برای چرخاندن، روی خودرو بکشید</div>
      </div>

      <aside class="garage-inspector" aria-label="مشخصات خودروی انتخاب‌شده">
        <div class="garage-inspector-top"><span class="garage-kicker">خودروی منتخب</span><span class="garage-outline-tag">{{ bodyNames[body] || 'خودرو' }}</span></div>
        <p class="garage-make-name">{{ make?.faName || make?.name || 'انتخاب سازنده' }}</p>
        <h4>{{ title }}</h4>
        <p class="garage-en-name" dir="ltr">{{ englishTitle }}</p>
        <div v-if="!showroomOnly" class="garage-specs">
          <div><span>پیشرانه</span><strong>{{ variant?.engine || 'ثبت نشده' }}</strong></div>
          <div><span>سال تولید</span><strong dir="auto">{{ variant?.years || 'ثبت نشده' }}</strong></div>
          <div><span>انتقال قدرت</span><strong>{{ transmissionNames[variant?.transmission || ''] || variant?.transmission || 'ثبت نشده' }}</strong></div>
        </div>
        <div v-if="showroomOnly" class="garage-showroom-note" role="status"><strong>صرفاً نمایشی · بدون تطبیق قطعات</strong><p>این مدل، نسخه استیشن ۲۰۷ SW است و به تیپ‌های ۲۰۷ هاچ‌بک متصل نیست. مشخصات فنی و سازگاری قطعات برای آن ثبت نشده است.</p></div>
        <fieldset v-if="modelAsset" class="garage-paint" :disabled="modelState !== 'ready' || sceneUnavailable"><legend>رنگ نمایشی <span>فقط برای پیش‌نمایش</span></legend><div><button v-for="item in paints" :key="item.value" type="button" :style="{ '--paint': item.value }" :aria-label="item.label" :aria-pressed="paint === item.value" @click="paint = item.value"><span v-if="paint === item.value" aria-hidden="true">✓</span></button></div></fieldset>
        <div v-if="!showroomOnly" class="garage-trim"><span class="garage-field-label">تیپ را انتخاب کنید</span><div class="garage-trims" role="group" aria-label="تیپ خودرو"><button v-for="item in variants" :key="item.id" type="button" :aria-pressed="previewVariantId === item.id" @click="previewVariantId = item.id">{{ item.faName || item.name }}</button><span v-if="!variants.length" class="garage-muted">{{ loading ? 'در حال دریافت خودروها…' : 'هنوز تیپی ثبت نشده است.' }}</span></div></div>
        <button type="button" class="garage-apply" :disabled="showroomOnly || !previewVariantId || loading" @click="apply"><span>{{ showroomOnly ? 'نمایشگاه سه‌بعدی · تطبیق غیرفعال' : applied ? 'مشاهده قطعات این خودرو' : 'نمایش قطعات سازگار' }}</span><span aria-hidden="true">{{ showroomOnly ? 'SW' : '←' }}</span></button>
        <button v-if="variantId" type="button" class="garage-clear" @click="emit('clear')">حذف انتخاب و نمایش همه قطعات</button>
        <p class="garage-disclaimer">{{ modelAsset ? modelAsset.materialNote : 'برای این خودرو هنوز فایل اختصاصی سه‌بعدی ثبت نشده است؛ مدل عمومی به‌جای آن نمایش داده نمی‌شود.' }} {{ showroomOnly ? 'این نما هیچ فیلتر سازگاری به قطعات اعمال نمی‌کند.' : 'تطبیق قطعات بر اساس تیپ ثبت‌شده انجام می‌شود.' }}</p>
      </aside>
    </div>

    <div class="garage-browser">
      <div class="garage-browser-header"><div><span class="garage-step" dir="ltr">01</span><span>انتخاب سازنده</span></div><label class="garage-brand-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input v-model="brandQuery" aria-label="جستجوی سازنده خودرو" placeholder="جستجوی سازنده…"></label></div>
      <div class="garage-brands" role="group" aria-label="سازنده خودرو"><button v-for="item in brands" :key="item.id" type="button" :aria-pressed="previewMakeId === item.id" @click="chooseMake(item.id)">{{ item.faName || item.name }}</button><span v-if="!brands.length" class="garage-muted">{{ loading ? 'در حال دریافت سازنده‌ها…' : brandQuery ? 'سازنده‌ای با این نام یافت نشد.' : 'هنوز خودرویی ثبت نشده است.' }}</span></div>
      <div class="garage-browser-header garage-model-heading"><div><span class="garage-step" dir="ltr">02</span><span>مدل خود را پیدا کنید</span><span class="garage-muted">{{ models.length.toLocaleString('fa-IR') }} مدل</span></div><div class="garage-arrows"><button type="button" aria-label="مدل قبلی" :disabled="!models.length" @click="stepModel(-1)">→</button><button type="button" aria-label="مدل بعدی" :disabled="!models.length" @click="stepModel(1)">←</button></div></div>
      <div class="garage-models" role="group" aria-label="مدل خودرو">
        <button v-for="(item, index) in models" :key="item.id" type="button" class="garage-model-card" :aria-pressed="previewModelId === item.id" @click="chooseModel(item.id)">
          <div class="garage-model-card-top"><span>{{ item.showroomOnly ? 'صرفاً نمایشی · SW' : assetFor(item) ? 'مدل سه‌بعدی اختصاصی' : bodyNames[item.body || 'SEDAN'] || 'خودرو' }}</span><span dir="ltr">{{ String(index + 1).padStart(2, '0') }}</span></div>
          <img v-if="assetFor(item)" :src="assetFor(item)!.poster" :alt="`مدل سه‌بعدی ${assetFor(item)!.label}`" class="garage-model-photo" loading="lazy">
          <svg v-else class="garage-car-icon" viewBox="0 0 200 75" fill="none" aria-hidden="true"><path v-if="['SUV','CROSSOVER','VAN'].includes(item.body || '')" d="M15 48 26 40 44 16 127 16 157 39 182 44 188 59 12 59Z"/><path v-else-if="item.body === 'HATCHBACK'" d="m15 49 17-7 20-22h66l36 21 27 6 6 12H13Z"/><path v-else d="m13 49 22-7 31-22h57l29 23 30 5 6 11H12Z"/><path class="garage-icon-glass" d="m53 40 17-16h48l24 17Z"/><circle cx="49" cy="58" r="12"/><circle cx="151" cy="58" r="12"/><circle class="garage-icon-hub" cx="49" cy="58" r="5"/><circle class="garage-icon-hub" cx="151" cy="58" r="5"/></svg>
          <strong>{{ item.faName || item.name }}</strong><span class="garage-model-sub">{{ item.showroomOnly ? 'بدون تیپ کاتالوگ' : `${item.variants?.length.toLocaleString('fa-IR') || '۰'} تیپ` }} <span v-if="previewModelId === item.id" class="garage-card-selected">انتخاب شده</span></span>
        </button>
      </div>
    </div>
    <footer class="garage-footer"><span><i></i>{{ showroomOnly ? 'پژو ۲۰۷ SW · نمایش مستقل، بدون ادعای سازگاری قطعات' : applied ? 'تطبیق فعال؛ قطعات متناسب با تیپ شما' : 'پیش‌نمایش آزاد؛ برای تطبیق قطعات، انتخاب را تأیید کنید' }}</span><span dir="ltr">BUILT FOR YOUR DRIVE <span class="garage-footer-slash">///</span></span></footer>
  </section>
</template>

<style scoped>
.garage-showroom-note { grid-column: 1 / -1; padding: 12px; margin: 5px 0 15px; border: 1px solid #f2784933; border-radius: 7px; background: #f2784908; }
.garage-showroom-note strong { font-size: 11px; color: #f6b28f; }
.garage-showroom-note p { font-size: 10px; line-height: 2; color: #9ba7b5; margin: 7px 0 0; }
.garage-model-photo { width: 100%; height: 62px; margin-top: 5px; object-fit: cover; border-radius: 4px; }
.garage-asset-missing { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 15px; padding: 30px; text-align: center; }
.garage-missing-index { color: #f27849; font: 11px monospace; letter-spacing: 3px; border: 1px solid #f2784933; padding: 10px 15px; border-radius: 5px; }
.garage-asset-missing strong { font-size: 16px; color: #c9d1db; }
.garage-asset-missing p { font-size: 11px; color: #8894a2; line-height: 2; }
.garage-asset-missing button { border: 1px solid #f2784955; border-radius: 6px; padding: 9px 15px; color: #f8b391; font-size: 11px; }
.garage-model-badge { position: absolute; top: 43px; left: 16px; color: #b5d2bd; border: 1px solid #b5d2bd30; background: #101419c9; border-radius: 4px; padding: 5px 8px; font-size: 9px; pointer-events: none; }
.garage{--g-orange:#f27849;--g-muted:#8a939f;position:relative;isolation:isolate;overflow:hidden;color:#eef1f5;background:#101419;border:1px solid #2d333b;border-radius:24px;box-shadow:0 28px 70px #10141924;margin-bottom:32px;text-align:right}.garage button,.garage input{font:inherit}.garage button{transition:background .2s,border-color .2s,color .2s,transform .2s}.garage button:focus-visible,.garage input:focus-visible{outline:2px solid #ffac82;outline-offset:4px}.garage button:disabled{opacity:.4;cursor:not-allowed}.garage-topline{padding:21px 30px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff0d}.garage-brand{display:flex;align-items:center;gap:12px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:3px}.garage-brand b{font-weight:400;color:#8a939f}.garage-mark{font-style:italic;font-size:27px;font-weight:900;letter-spacing:-4px;padding-right:5px}.garage-mark span{color:var(--g-orange)}.garage-version{font:10px monospace;letter-spacing:1px;color:#69737e;border:1px solid #343b44;padding:3px 5px}.garage-live{font-size:10px;color:#a5adb7;display:flex;align-items:center;gap:7px}.garage-live>span{font:9px monospace;letter-spacing:1px;color:#69737e}.garage-live i,.garage-footer i{display:inline-block;width:5px;height:5px;border-radius:50%;background:#98b49c;box-shadow:0 0 10px #98b49c50}.garage-intro{display:flex;justify-content:space-between;align-items:end;padding:30px 32px 22px;gap:20px}.garage-kicker{font-size:10px;letter-spacing:.2px;color:var(--g-orange);margin:0 0 9px}.garage-intro h3{font-size:clamp(24px,3vw,36px);font-weight:850;line-height:1.6;letter-spacing:-1.2px;margin:0}.garage-intro h3 span{color:#87919b}.garage-intro>p{color:#9099a5;font-size:11px;line-height:2.2;margin:0 0 6px}.garage-workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;direction:ltr;padding:0 24px;gap:4px}.garage-stage{position:relative;min-width:0;height:435px;overflow:hidden;direction:rtl;background:radial-gradient(ellipse at 50% 55%,#35394050,transparent 65%);border-radius:14px}.garage-stage-grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff03 1px,transparent 1px),linear-gradient(90deg,#ffffff03 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(transparent,black 50%,transparent);pointer-events:none}.garage-watermark{position:absolute;top:10px;left:0;right:0;overflow:hidden;text-overflow:clip;text-align:center;white-space:nowrap;font:900 clamp(55px,7vw,100px)/1.3 Arial,sans-serif;letter-spacing:-3px;text-transform:uppercase;color:transparent;-webkit-text-stroke:1px #ffffff0d;pointer-events:none}.garage-stage-tag{position:absolute;top:12px;left:16px;display:flex;align-items:center;gap:8px;z-index:2;font:9px monospace;letter-spacing:1px;color:#7e8895}.garage-stage-tag b{font-size:19px;color:#d7dde5;letter-spacing:-1px}.garage-stage-tag>span:first-child{border-left:2px solid var(--g-orange);padding-left:8px;margin-right:8px}.garage-stage-bottom{position:absolute;bottom:32px;left:18px;right:18px;display:flex;align-items:center;justify-content:space-between;gap:10px;z-index:2;direction:rtl}.garage-camera{display:flex;gap:3px;padding:4px;border:1px solid #ffffff12;border-radius:8px;background:#11161cd9;backdrop-filter:blur(12px)}.garage-camera button{padding:6px 11px;font-size:10px;border-radius:5px;color:#87919f}.garage-camera button[aria-pressed=true]{background:#363b43;color:#fff}.garage-rotation{display:flex;gap:7px;align-items:center;font-size:10px;color:#9da5b0}.garage-rotation>span:first-child{display:grid;place-items:center;width:29px;height:29px;border:1px solid #ffffff21;border-radius:50%;color:#eceff4;font-size:14px}.garage-drag-hint{position:absolute;bottom:6px;inset-inline:0;display:flex;align-items:center;justify-content:center;gap:7px;color:#707b87;font-size:9px;pointer-events:none}.garage-loading-label{position:absolute;top:45%;left:0;right:0;text-align:center;color:#929aa5;font-size:11px;pointer-events:none}.garage-render-loading{height:100%;display:grid;place-items:center;font-size:12px;color:#9da5b0}.garage-inspector{direction:rtl;padding:17px 21px 12px;background:linear-gradient(130deg,#1c222a99,#151a2077);border:1px solid #ffffff0a;border-radius:14px;min-width:0}.garage-inspector-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:17px}.garage-inspector-top .garage-kicker{margin:0}.garage-outline-tag{font-size:9px;color:#abb4be;border:1px solid #ffffff20;padding:4px 8px;border-radius:4px}.garage-make-name{color:#c0c7d0;font-size:12px;margin:0 0 3px}.garage-inspector h4{font-size:31px;line-height:1.5;font-weight:800;letter-spacing:-1px;margin:0}.garage-en-name{font:10px/1.8 monospace;letter-spacing:2px;text-transform:uppercase;color:#6d7988;text-align:right;margin:0 0 17px}.garage-specs{display:grid;grid-template-columns:1fr 1fr;gap:13px 10px;padding-bottom:15px;border-bottom:1px solid #ffffff0b}.garage-specs>div:first-child{grid-column:1 / -1}.garage-specs span{font-size:9px;color:#7f8b99;display:block;margin-bottom:3px}.garage-specs strong{font-size:11px;font-weight:500;color:#dce1e7;overflow-wrap:anywhere}.garage-paint{border:0;padding:13px 0 0;margin:0}.garage-paint legend{font-size:10px;color:#c0c7d0;float:right;width:100%;margin-bottom:10px}.garage-paint legend span{font-size:8px;color:#687584;margin-inline-start:8px}.garage-paint>div{display:flex;gap:10px;clear:both}.garage-paint button{width:22px;height:22px;background:var(--paint);border-radius:50%;position:relative;box-shadow:inset 0 2px 4px #ffffff30;border:2px solid #ffffff18;color:#fff;display:grid;place-items:center;font-size:12px;text-shadow:0 1px 3px #000}.garage-paint button[aria-pressed=true]{outline:1px solid var(--g-orange);outline-offset:4px}.garage-trim{padding-top:20px}.garage-field-label{font-size:10px;display:block;margin-bottom:8px;color:#aeb7c1}.garage-trims{display:flex;flex-wrap:wrap;gap:5px;max-height:83px;overflow:auto;padding:2px}.garage-trims button{font-size:10px;padding:5px 9px;background:#ffffff04;border:1px solid #ffffff13;border-radius:5px;color:#9ba6b3}.garage-trims button[aria-pressed=true]{border-color:#f2784970;color:#ffd2bd;background:#f2784914}.garage-apply{width:100%;display:flex;justify-content:space-between;align-items:center;background:var(--g-orange);color:#15181c;padding:12px 14px;margin-top:17px;border-radius:6px;font-size:12px;font-weight:800}.garage-apply:hover{background:#ff9b6e;transform:translateY(-1px)}.garage-apply>span:last-child{font-size:19px;font-weight:400}.garage-clear{width:100%;font-size:9px;text-decoration:underline;color:#b4beca;margin-top:10px}.garage-disclaimer{color:#788391;font-size:8px;line-height:1.9;margin:12px 0 0}.garage-browser{padding:25px 30px 22px}.garage-browser-header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:12px}.garage-browser-header>div:first-child{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600}.garage-step{font:10px monospace;color:var(--g-orange);border:1px solid #f2784930;padding:4px 6px;border-radius:4px}.garage-brand-search{display:flex;align-items:center;gap:7px;color:#717c8a;background:#ffffff04;border:1px solid #ffffff0e;border-radius:6px;padding:7px 10px}.garage-brand-search input{width:125px;min-width:0;background:none;border:0;color:#ccd3dd;font-size:10px}.garage-brand-search input::placeholder{color:#6d7886}.garage-brands{display:flex;gap:6px;overflow-x:auto;padding:3px 2px 11px;scrollbar-width:thin;scrollbar-color:#414852 transparent}.garage-brands button{flex-shrink:0;padding:8px 16px;border-radius:5px;border:1px solid #ffffff0d;background:#ffffff03;color:#8f9ba9;font-size:11px}.garage-brands button:hover{background:#ffffff0b;color:#fff}.garage-brands button[aria-pressed=true]{background:#e9edf2;color:#18212b;border-color:#e9edf2;font-weight:700}.garage-model-heading{margin-top:18px}.garage-muted{font-size:10px;color:#707d8c;font-weight:400}.garage-arrows{display:flex;gap:6px}.garage-arrows button{width:28px;height:25px;border:1px solid #ffffff1c;border-radius:4px;font-size:14px;color:#abb5c1}.garage-arrows button:hover{color:#fff;border-color:#f27849}.garage-models{display:flex;gap:10px;overflow:auto;scrollbar-width:thin;scrollbar-color:#414852 transparent;padding:3px 2px 10px}.garage-model-card{position:relative;flex:0 0 164px;padding:12px 13px 10px;text-align:right;border:1px solid #ffffff0c;border-radius:9px;background:linear-gradient(140deg,#252c3650,#1a202840);color:#aab4c0}.garage-model-card:hover{background:#29313c77;border-color:#ffffff30}.garage-model-card[aria-pressed=true]{border-color:#f27849c0;background:linear-gradient(150deg,#f2784916,#20252d50);box-shadow:inset 0 -2px #f27849}.garage-model-card-top{display:flex;justify-content:space-between;font-size:8px;color:#73808f}.garage-model-card-top>span:last-child{font-family:monospace}.garage-car-icon{width:100%;height:62px;margin-top:5px;color:#717e8d}.garage-car-icon>path:first-child{fill:#566474;stroke:#8d9bad;stroke-width:1}.garage-car-icon .garage-icon-glass{fill:#17212d;stroke:#9eacbb;stroke-width:.5}.garage-car-icon>circle{fill:#101419;stroke:#8d9bad;stroke-width:1.5}.garage-car-icon .garage-icon-hub{fill:#7d8c9b;stroke:#202832}.garage-model-card[aria-pressed=true] .garage-car-icon>path:first-child{fill:#c3b5a7;stroke:#f7c1a6}.garage-model-card strong{display:block;font-size:12px;font-weight:650;margin:3px 0 7px}.garage-model-card[aria-pressed=true] strong{color:#fff}.garage-model-sub{display:flex;justify-content:space-between;font-size:8px;color:#748191}.garage-card-selected{color:#efa47e}.garage-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 30px;border-top:1px solid #ffffff0c;background:#0c101499;color:#7b8796;font-size:9px}.garage-footer>span:first-child{display:flex;align-items:center;gap:8px}.garage-footer>span:last-child{font:8px monospace;letter-spacing:1.4px}.garage-footer-slash{color:var(--g-orange);font-weight:700;margin-left:9px}.garage-alert{padding:14px 30px;font-size:12px;color:#ffd1c1;background:#a63d2525}.garage-alert button{margin-right:10px;text-decoration:underline}
@media(min-width:1280px){.garage-workspace{grid-template-columns:minmax(0,1fr) 318px}.garage-stage{height:455px}.garage-inspector{padding:20px 24px}.garage-inspector h4{font-size:34px}}
@media(max-width:900px){.garage-workspace{grid-template-columns:minmax(0,1fr) 260px;padding:0 16px}.garage-inspector{padding:15px}.garage-stage{height:440px}.garage-stage-bottom{flex-wrap:wrap;justify-content:center;bottom:40px}.garage-inspector h4{font-size:27px}.garage-rotation span:last-child{display:none}}
@media(max-width:640px){.garage{border-radius:16px}.garage-topline{padding:16px 18px}.garage-brand{font-size:10px;letter-spacing:2px;gap:9px}.garage-version,.garage-live>span{display:none}.garage-live{font-size:9px}.garage-intro{padding:23px 20px 12px;display:block}.garage-intro h3{font-size:26px}.garage-intro>p{font-size:10px;margin-top:10px}.garage-intro>p br{display:none}.garage-workspace{grid-template-columns:1fr;padding:0 12px;gap:12px}.garage-stage{height:330px}.garage-watermark{font-size:67px;top:15px}.garage-stage-tag{font-size:8px;top:5px;left:10px}.garage-stage-bottom{bottom:31px;justify-content:space-between;left:9px;right:9px}.garage-inspector{padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.garage-inspector-top{grid-column:1/-1;margin-bottom:12px}.garage-make-name,.garage-inspector h4,.garage-en-name{grid-column:1}.garage-inspector h4{font-size:27px}.garage-specs{grid-column:2;grid-row:2/6;border:0;padding:0;align-content:center;gap:10px}.garage-paint{grid-column:1;padding:0}.garage-paint legend{font-size:9px}.garage-paint legend span{display:none}.garage-paint button{width:18px;height:18px}.garage-paint>div{gap:9px}.garage-trim,.garage-apply,.garage-clear,.garage-disclaimer{grid-column:1/-1}.garage-trim{padding-top:20px}.garage-trims{max-height:95px}.garage-apply{margin-top:15px}.garage-disclaimer{font-size:8px;margin-bottom:0}.garage-browser{padding:22px 18px 14px}.garage-browser-header>div:first-child{font-size:10px;gap:7px}.garage-brand-search{padding:6px 8px}.garage-brand-search input{width:88px;font-size:9px}.garage-brands button{font-size:10px;padding:7px 13px}.garage-model-card{flex-basis:148px}.garage-footer{padding:14px 18px;font-size:8px;line-height:1.8}.garage-footer>span:last-child{display:none}}
@media(prefers-reduced-motion:reduce){.garage button{transition:none}}
</style>

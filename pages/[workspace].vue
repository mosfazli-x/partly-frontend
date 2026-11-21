<script setup lang="ts">
const route = useRoute()
const { user, api, restore, logout, money, message } = useMarketplace()
const workspace = computed(() => String(route.params.workspace))
if (!['admin', 'vendor', 'account'].includes(workspace.value)) throw createError({ statusCode: 404, statusMessage: 'صفحه پیدا نشد' })
const isAdmin = computed(() => workspace.value === 'admin'), isVendor = computed(() => workspace.value === 'vendor')
const tab = ref('dashboard'), busy = ref(true), saving = ref(false), error = ref(''), notice = ref(''), rows = ref<any[]>([]), dashboard = ref<any>(null), categories = ref<any[]>([]), vehicles = ref<any[]>([]), query = ref(''), editing = ref<string | null>(null), showForm = ref(false)
const profile = reactive({ name: '', phone: '', address: '', shopName: '' })
const blank = () => ({ name: '', sku: '', description: '', price: 0, compareAt: 0, stock: 0, brand: '', categoryId: '', image: '/products/brake-pad.svg', packaging: '', variantIds: [] as string[], images: [] as string[], packagePrice: 0, quantityPerPackage: 1, markupPercent: 0 })
const form = reactive(blank())
const brandOptions = ref<string[]>([])
const blankCategory = (parentId: string | null = null) => ({ name: '', slug: '', description: '', icon: '', sortOrder: 0, parentId, code: null as string | null })
const category = reactive(blankCategory())
const imageUploading = ref(false), imageFileName = ref('')
const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/tiff,image/heic,image/heif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,video/x-msvideo,video/mpeg,video/3gpp,video/x-matroska'
const MEDIA_TYPES = new Set(MEDIA_ACCEPT.split(','))
const IMAGE_MAX_BYTES = 10 * 1024 * 1024, VIDEO_MAX_BYTES = 50 * 1024 * 1024
const isVideoUrl = (url: string) => /\.(?:mp4|webm|ogv|mov|m4v|avi|mpeg|mpg|3gp|mkv)(?:[?#]|$)/i.test(url)
let imageVersion = 0
const tabs = computed(() => isAdmin.value ? [['dashboard','نمای کلی'],['products','بررسی کالاها'],['users','کاربران و فروشندگان'],['orders','سفارش‌ها'],['categories','دسته‌بندی‌ها'],['profile','حساب کاربری']] : isVendor.value ? [['dashboard','نمای کلی'],['products','کالاهای من'],['orders','سفارش‌های فروشگاه'],['profile','اطلاعات فروشگاه']] : [['orders','سفارش‌های من'],['profile','اطلاعات حساب']])
const labels: Record<string,string> = { ACTIVE:'فعال',PENDING:'در انتظار',SUSPENDED:'تعلیق',REJECTED:'رد شده',PROCESSING:'در حال آماده‌سازی',SHIPPED:'ارسال شده',DELIVERED:'تحویل شده',CANCELLED:'لغو شده',CUSTOMER:'خریدار',VENDOR:'فروشنده',ADMIN:'مدیر',products:'کالاها',orders:'سفارش‌ها',revenue:'فروش تحویل‌شده',lowStock:'موجودی کم',users:'کاربران',vendors:'فروشندگان',pendingProducts:'کالاهای در انتظار' }
const productCategoryFilter = ref('')
const productCategoryScope = computed(() => {
  if (!productCategoryFilter.value) return null
  const node = findCategoryNode(categories.value as any, productCategoryFilter.value, 'id')
  if (!node) return null
  const ids = new Set<string>()
  const visit = (item: any) => { ids.add(item.id); for (const child of item.children || []) visit(child) }
  visit(node)
  return ids
})
const filtered = computed(() => {
  const needle = query.value.toLowerCase()
  const scope = productCategoryScope.value
  return rows.value.filter(row => {
    if (!JSON.stringify(row).toLowerCase().includes(needle)) return false
    if (tab.value === 'products' && scope && !scope.has(row.categoryId)) return false
    return true
  })
})
const variants = computed(() => vehicles.value.flatMap(make => make.models.flatMap((model: any) => model.variants.map((v: any) => ({ id: v.id, name: `${make.name} / ${model.name} / ${v.name}` })))))
const categoryCounts = computed(() => countCategoryTree(categories.value as any))
const categorySearch = ref('')
const categoryTreeEl = ref<any>(null)
const categoryTreeView = computed(() => filterCategoryTree(categories.value as any, categorySearch.value))
const visibleCategoryCount = computed(() => flattenCategoryTree(categoryTreeView.value as any).length)
const selectedCategoryNode = computed(() => findCategoryNode(categories.value as any, form.categoryId, 'id'))
const parentCategoryTree = computed(() => editing.value ? excludeCategoryBranch(categories.value as any, editing.value) : categories.value)
const categoryParentValue = computed({ get: () => category.parentId ?? '', set: (value: string) => { category.parentId = value || null } })
const categoryRootValue = computed(() => {
  if (!category.parentId) return category.code ?? ''
  const parent = findCategoryNode(categories.value as any, category.parentId, 'id')
  return parent?.code ?? ''
})
const categoryCodeError = computed(() => {
  const value = category.code as string | null | undefined
  if (!category.parentId) {
    if (!value) return 'برای دسته‌بندی ریشه کد سه‌رقمی ۱۰۱–۱۹۹ (خودرو) یا ۲۰۱–۲۹۹ (موتورسیکلت) وارد کنید.'
    if (!/^(?:1(?:0[1-9]|[1-9][0-9])|2(?:0[1-9]|[1-9][0-9]))$/.test(value)) return 'کد ریشه باید ۱۰۱–۱۹۹ (خودرو) یا ۲۰۱–۲۹۹ (موتورسیکلت) باشد.'
    return ''
  }
  if (!value) return ''
  if (!categoryRootValue.value || value.slice(0, 3) !== categoryRootValue.value || value.length !== categoryRootValue.value.length + 2) {
    return `کد زیرشاخه باید «${categoryRootValue.value}» به‌همراه دو رقم (۰۱–۹۹) باشد.`
  }
  if (!/^\d{3}(\d{2})+$/.test(value)) return 'کد نامعتبر است.'
  return ''
})
const categoryFormEquipment = computed(() => categoryEquipmentType(category.code))
const categoryFormTitle = computed(() => editing.value ? 'ویرایش دسته‌بندی' : category.parentId ? 'افزودن زیرشاخه' : 'افزودن دسته‌بندی ریشه')
const productCategoryLabel = computed(() => {
  const node = selectedCategoryNode.value
  return node ? categoryPathLabel(node, ' › ') : 'دسته‌بندی‌ای انتخاب نشده است'
})
const prefix = computed(() => `/api/${workspace.value}`)
const allowed = computed(() => user.value && (workspace.value === 'account' || user.value.role === workspace.value.toUpperCase()))
let loadVersion = 0
let productSnapshot = ''
async function load() {
  const version = ++loadVersion
  const currentTab = tab.value
  const currentWorkspace = workspace.value
  const isCurrent = () => version === loadVersion && currentWorkspace === workspace.value && currentTab === tab.value
  busy.value = true; error.value = ''; rows.value = []
  try {
    if (currentTab === 'profile' || currentTab === 'categories') return
    const result = await api(currentTab === 'dashboard' ? `${prefix.value}/dashboard` : currentWorkspace === 'account' ? '/api/orders' : `${prefix.value}/${currentTab}`)
    if (!isCurrent()) return
    if (currentTab === 'dashboard') dashboard.value = result
    else rows.value = result
  } catch(e) { if (isCurrent()) error.value = message(e) }
  finally { if (isCurrent()) busy.value = false }
}
onBeforeUnmount(() => { loadVersion++ })
async function select(value:string) { tab.value = value; query.value=''; categorySearch.value=''; productCategoryFilter.value=''; showForm.value=false; notice.value=''; if (value==='categories' && isAdmin.value) await refreshCategories(); await load() }
onMounted(async () => { await restore(); if (!user.value) { await navigateTo('/login'); return } Object.assign(profile, {name:user.value.name,phone:user.value.phone||'',address:user.value.address||'',shopName:user.value.shopName||''}); if (!isAdmin.value && !isVendor.value) tab.value='orders'; if (!allowed.value || (isVendor.value && user.value.status !== 'ACTIVE')) {busy.value=false;return} try { [categories.value,vehicles.value,brandOptions.value] = await Promise.all([api(isAdmin.value ? '/api/admin/categories' : '/api/categories'),api('/api/vehicles'),api('/api/brands')]) } catch(e) {error.value=message(e)} await load() })
async function mutate(path:string,body:any,method='PATCH') { saving.value=true;error.value='';notice.value=''; try { await api(path,{method,body}); notice.value='تغییرات با موفقیت ذخیره شد.'; await load(); return true } catch(e) {error.value=message(e);return false} finally {saving.value=false} }
const pricingQty = () => { const value = Math.floor(Number(form.quantityPerPackage)); return Number.isFinite(value) && value > 0 ? value : 1 }
function syncPackageFromUnit() {
  const unit = Math.max(0, Number(form.price) || 0)
  form.packagePrice = Math.round(unit * pricingQty() * 1000) / 1000
}
function syncUnitFromPackage() {
  const pack = Math.max(0, Number(form.packagePrice) || 0)
  const markup = Math.max(0, Number(form.markupPercent) || 0)
  form.price = pack > 0 ? Math.round((pack / pricingQty()) * (1 + markup / 100) * 1000) / 1000 : 0
}
function editProduct(product?:any) {
  imageVersion++; imageUploading.value=false; imageFileName.value=''; editing.value=product?.id||null
  const quantityPerPackage = Math.max(1, Math.floor(Number(product?.quantityPerPackage) || 1))
  const markupPercent = product?.markupPercent != null ? Number(product.markupPercent) : 0
  const price = Number(product?.price ?? 0) / 1000
  const compareAt = Number(product?.compareAt ?? 0) / 1000
  const packagePrice = product?.packagePrice != null ? Number(product.packagePrice) / 1000 : price * quantityPerPackage
  Object.assign(form, blank(), product ? {
    name: product.name, sku: product.sku, description: product.description, price, compareAt, packagePrice, quantityPerPackage, markupPercent,
    stock: product.stock, brand: product.brand, categoryId: product.categoryId, image: product.image, packaging: product.packaging || '',
    variantIds: product.fitments?.map((f:any)=>f.variantId)||[], images: (product.images??[]).filter((im:any)=>im.url!==product.image).map((im:any)=>im.url),
  } : {})
  productSnapshot = JSON.stringify(form)
  showForm.value = true
}
async function saveProduct() {
  if (imageUploading.value) return
  if (!form.categoryId) { error.value = 'انتخاب دسته‌بندی برای کالا الزامی است.'; return }
  if (!form.brand.trim()) { error.value = 'انتخاب یا وارد کردن برند کالا الزامی است.'; return }
  const quantityPerPackage = Math.floor(Number(form.quantityPerPackage))
  if (!Number.isFinite(quantityPerPackage) || quantityPerPackage < 1) { error.value = 'تعداد در بسته باید عددی بزرگ‌تر از صفر باشد.'; return }
  // Admin registration uses the dedicated store-owned endpoint; vendor create/edit is untouched.
  const adminCreate = isAdmin.value && !editing.value
  const original = productSnapshot ? JSON.parse(productSnapshot) : {}
  // Product codes are generated by the API; the form never submits a sku.
  const { sku: _sku, ...values } = form
  const body: Record<string, any> = editing.value && !adminCreate
    ? Object.fromEntries(Object.entries(values).filter(([key,value]) => JSON.stringify(value) !== JSON.stringify(original[key])))
    : {...values}
  // The form collects prices in thousands of tomans; the API stores actual toman amounts.
  if (body.price !== undefined) body.price = Math.round(Number(body.price) * 1000)
  if (body.compareAt !== undefined) body.compareAt = Number(body.compareAt) > 0 ? Math.round(Number(body.compareAt) * 1000) : null
  if (body.packagePrice !== undefined) body.packagePrice = Number(body.packagePrice) > 0 ? Math.round(Number(body.packagePrice) * 1000) : null
  if (body.quantityPerPackage !== undefined) body.quantityPerPackage = quantityPerPackage
  if (body.markupPercent !== undefined) body.markupPercent = Math.max(0, Number(body.markupPercent) || 0)
  if (!adminCreate && !Object.keys(body).length) { notice.value='تغییری برای ذخیره وجود ندارد.'; showForm.value=false; return }
  const path = adminCreate ? '/api/admin/products' : `${prefix.value}/products${editing.value ? '/' + editing.value : ''}`
  if(await mutate(path,body,editing.value && !adminCreate ? 'PATCH':'POST')) showForm.value=false
}
function pickProductImages(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  if (input) input.value = ''
  if (!files.length) return
  for (const file of files) {
    if (!MEDIA_TYPES.has(file.type)) { error.value='فرمت فایل مجاز نیست. تصاویر JPEG، PNG، WebP، GIF، AVIF، BMP، TIFF، HEIC و ویدیوهای MP4، WebM، OGG، MOV، M4V، AVI، MPEG، 3GP و MKV پذیرفته می‌شوند.'; return }
    const limit = file.type.startsWith('video/') ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES
    if (file.size > limit) { error.value = file.type.startsWith('video/') ? 'حجم ویدیو نباید بیشتر از ۵۰ مگابایت باشد.' : 'حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد.'; return }
  }
  if (form.images.length + files.length > 9) { error.value='حداکثر ۹ فایل فراتر از تصویر اصلی مجاز است.'; return }
  for (const file of files) uploadProductImage(file)
}
async function uploadProductImage(file: File) {
  const version = ++imageVersion
  imageUploading.value = true; error.value=''; notice.value=''; imageFileName.value = file.name
  try {
    const result = await api<{ image: string }>('/api/admin/product-image', { method:'POST', body:file, headers:{ 'Content-Type': file.type } })
    if (version !== imageVersion) return
    const video = isVideoUrl(result.image)
    // Only images can be the cover; videos join the gallery.
    if (!video && (!form.image || form.image === '/products/brake-pad.svg')) form.image = result.image
    if (!form.images.includes(result.image)) form.images.push(result.image)
    notice.value = video ? 'ویدیو با موفقیت بارگذاری شد.' : 'تصویر با موفقیت بارگذاری شد.'
  } catch(e) { if (version === imageVersion) error.value=message(e) }
  finally { if (version === imageVersion) imageUploading.value = false }
}
function removeImage(url: string) {
  form.images = form.images.filter(u => u !== url)
  if (form.image === url) form.image = editing.value ? '' : '/products/brake-pad.svg'
}
async function refreshCategories() {
  try { categories.value = await api(isAdmin.value ? '/api/admin/categories' : '/api/categories') }
  catch(e) { error.value = message(e) }
  if (form.categoryId && !findCategoryNode(categories.value as any, form.categoryId, 'id')) form.categoryId = ''
}
function startCategory(node?: any, parentId: string | null = null) {
  editing.value = node?.id ?? null
  Object.assign(category, blankCategory(node?.parentId ?? parentId))
  if (node) Object.assign(category, { name: node.name, slug: node.slug, description: node.description || '', icon: node.icon || '', sortOrder: node.sortOrder, parentId: node.parentId ?? null, code: node.code ?? null })
  error.value = ''; notice.value = ''; showForm.value = true
}
function addChildCategory(node: any) { startCategory(undefined, node.id) }
async function deleteCategory(node: any) {
  if (!import.meta.client || !window.confirm(`دسته‌بندی «${node.name}» حذف شود؟ این کار قابل بازگشت نیست.`)) return
  saving.value = true; error.value = ''; notice.value = ''
  try {
    await api(`${prefix.value}/categories/${node.id}`, { method: 'DELETE' })
    notice.value = 'دسته‌بندی حذف شد.'
    if (editing.value === node.id) showForm.value = false
    await refreshCategories()
  } catch(e) { error.value = message(e) }
  finally { saving.value = false }
}
async function saveCategory() {
  if (categoryCodeError.value) { error.value = categoryCodeError.value; return }
  if (!category.parentId && !category.code) { error.value = 'برای دسته‌بندی ریشه، کد دسته‌بندی الزامی است.'; return }
  const payload = {
    name: category.name, slug: category.slug,
    description: category.description || null, icon: category.icon || null,
    sortOrder: Number(category.sortOrder) || 0, parentId: category.parentId || null,
    code: category.code ?? null,
  }
  if (await mutate(`${prefix.value}/categories${editing.value ? '/' + editing.value : ''}`, payload, editing.value ? 'PATCH' : 'POST')) {
    showForm.value = false
    await refreshCategories()
  }
}
async function saveProfile() {saving.value=true;error.value='';notice.value='';try {user.value=await api('/api/account',{method:'PATCH',body:{name:profile.name,phone:profile.phone,address:profile.address,...(isVendor.value?{shopName:profile.shopName}:{})}});notice.value='اطلاعات حساب ذخیره شد.'}catch(e){error.value=message(e)}finally{saving.value=false}}
function nextStatuses(status:string) { return ({PENDING:['PROCESSING','CANCELLED'],PROCESSING:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED'],DELIVERED:[],CANCELLED:[]} as Record<string,string[]>)[status]||[] }
const orderStatus = (order:any) => isVendor.value ? order.vendorStatus || order.status : order.status
useHead({title: isAdmin.value?'مدیریت پارتلی':isVendor.value?'پنل فروشندگان پارتلی':'حساب من | پارتلی'})
</script>
<template>
<section class="shell py-10">
<div class="mb-8 flex flex-wrap items-center justify-between gap-4">
<div>
<p class="market-eyebrow">فضای کاری پارتلی</p>
<h1 class="market-title">{{ isAdmin ? 'مدیریت سایت' : isVendor ? 'داشبورد فروشنده' : 'حساب کاربری' }}</h1>
<p class="text-sm text-slate-500">{{ user?.shopName || user?.name }}، خوش آمدید.</p>
</div>
<button class="market-secondary" @click="logout">خروج از حساب</button>
</div>
<div v-if="!allowed && !busy" class="market-error">شما به این بخش دسترسی ندارید. <NuxtLink to="/account">حساب من</NuxtLink>
</div>
<div v-else-if="isVendor && user?.status !== 'ACTIVE' && !busy" class="market-panel">
<h2 class="text-xl font-bold">فروشگاه در انتظار تأیید</h2>
<p class="mt-3 text-slate-500">درخواست ثبت فروشگاه دریافت شد. پس از بررسی مدیر، امکان ثبت کالا و مدیریت سفارش‌ها فعال می‌شود.</p>
</div>
<div v-else class="grid gap-6 lg:grid-cols-[220px_1fr]">
<aside class="market-panel h-fit">
<nav class="flex gap-2 overflow-auto lg:flex-col" aria-label="منوی داشبورد">
<button v-for="[key,label] in tabs" :key="key" class="market-nav" :class="{'market-nav-active':tab===key}" @click="select(key)">{{ label }}</button>
</nav>
<NuxtLink to="/catalog" class="mt-6 block text-sm text-orange">بازگشت به فروشگاه ←</NuxtLink>
</aside>
<div class="min-w-0">
<div v-if="error" class="market-error" role="alert">{{ error }} <button class="underline" @click="load">تلاش دوباره</button>
</div>
<div v-if="notice" class="market-success" role="status">{{ notice }}</div>
<div v-if="busy" class="market-panel" role="status">در حال دریافت اطلاعات…</div>
<template v-else-if="tab==='dashboard'">
<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
<div v-for="(value,key) in dashboard?.stats" :key="key" class="market-panel">
<p class="text-sm text-slate-500">{{ labels[key] || key }}</p>
<p class="mt-3 text-2xl font-black">{{ key==='revenue'?money(value):Number(value).toLocaleString('fa-IR') }}</p>
</div>
</div>
<div class="market-panel">
<h2 class="mb-5 text-lg font-bold">آخرین سفارش‌ها</h2>
<p v-if="!dashboard?.recentOrders?.length" class="market-empty">هنوز سفارشی ثبت نشده است.</p>
<div v-for="order in dashboard?.recentOrders" :key="order.id" class="flex flex-wrap justify-between gap-3 border-b py-4">
<span>{{ order.name }} · {{ new Date(order.createdAt).toLocaleDateString('fa-IR') }}</span>
<span>{{ money(order.total) }}</span>
<span class="market-badge">{{ labels[orderStatus(order)] }}</span>
</div>
<button class="mt-5 text-sm text-orange" @click="select('orders')">مشاهده همه سفارش‌ها ←</button>
</div>
</template>
<form v-else-if="tab==='profile'" class="market-panel max-w-2xl" @submit.prevent="saveProfile">
<h2 class="mb-6 text-xl font-bold">اطلاعات حساب</h2>
<label class="market-label">نام<input v-model="profile.name" required class="market-input">
</label>
<label v-if="isVendor" class="market-label">نام فروشگاه<input v-model="profile.shopName" required class="market-input">
</label>
<label class="market-label">شماره تماس<input v-model="profile.phone" class="market-input" dir="ltr">
</label>
<label class="market-label">نشانی<textarea v-model="profile.address" class="market-input" rows="3" />
</label>
<button class="market-primary" :disabled="saving">ذخیره اطلاعات</button>
</form>
<template v-else>
<div class="market-panel">
<div class="mb-6 flex flex-wrap justify-between gap-3">
<h2 class="text-xl font-bold">{{ tabs.find(t=>t[0]===tab)?.[1] }}</h2>
<button v-if="isVendor && tab==='products'" class="market-primary" @click="editProduct()">افزودن کالا</button>
<button v-if="isAdmin && tab==='products'" class="market-primary" @click="editProduct()">ثبت کالای فروشگاه</button>
<button v-if="isAdmin && tab==='categories'" class="market-primary" @click="startCategory()">دسته‌بندی جدید</button>
</div>
<input v-if="tab==='categories'" v-model="categorySearch" placeholder="جستجو با نام یا کد دسته‌بندی…" aria-label="جستجو در دسته‌بندی‌ها" class="market-input mb-5">
<div v-else-if="tab==='products'" class="mb-5 flex flex-wrap items-center gap-3">
<input v-model="query" placeholder="جستجو در کالاها…" aria-label="جستجو در کالاها" class="market-input min-w-0 flex-1">
<div class="min-w-0 sm:w-80">
<CategoryPicker v-model="productCategoryFilter" :categories="categories" value-key="id" placeholder="فیلتر همه دسته‌بندی‌ها" compact aria-label="فیلتر دسته‌بندی کالاها" />
</div>
</div>
<input v-else v-model="query" placeholder="جستجو در فهرست…" aria-label="جستجو در فهرست" class="market-input mb-5">
<p v-if="tab!=='categories' && !filtered.length" class="market-empty">موردی برای نمایش وجود ندارد.</p>
<div v-if="tab==='products'" class="overflow-x-auto">
<table class="market-table">
<thead>
<tr>
<th>کالا</th>
<th>قیمت / موجودی</th>
<th>وضعیت</th>
<th>عملیات</th>
</tr>
</thead>
<tbody>
<tr v-for="p in filtered" :key="p.id">
<td>
<strong>{{ p.name }}</strong>
<p class="text-xs text-slate-500">{{ p.sku }} · {{ p.vendor?.shopName || p.brand }}</p>
</td>
<td>{{ money(p.price) }}<p class="text-xs">{{ p.stock }} عدد</p>
</td>
<td>
<span class="market-badge">{{ labels[p.status] }}</span>
</td>
<td>
<button v-if="isVendor" class="market-secondary" @click="editProduct(p)">ویرایش</button>
<div v-else class="flex gap-2">
<button v-for="status in ['ACTIVE','REJECTED','PENDING'].filter(s=>s!==p.status)" :key="status" class="market-secondary" :disabled="saving" @click="mutate(`${prefix}/products/${p.id}`,{status})">{{ labels[status] }}</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<div v-if="tab==='users'" class="overflow-x-auto">
<table class="market-table">
<thead>
<tr>
<th>کاربر</th>
<th>نقش / وضعیت</th>
<th>عملیات</th>
</tr>
</thead>
<tbody>
<tr v-for="u in filtered" :key="u.id">
<td>{{ u.name }}<p class="text-xs text-slate-500">{{ u.phone }} {{ u.shopName }}</p>
</td>
<td>{{ labels[u.role] }} / {{ labels[u.status] }}</td>
<td>
<div v-if="u.role!=='ADMIN'" class="flex gap-2">
<button v-for="status in ['ACTIVE','SUSPENDED'].filter(s=>s!==u.status)" :key="status" class="market-secondary" :disabled="saving" @click="mutate(`${prefix}/users/${u.id}`,{status})">{{ status==='ACTIVE'?'فعال‌سازی':'تعلیق حساب' }}</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<div v-if="tab==='categories'" class="category-manager">
<div class="category-manager-stats">
<div><span>کل دسته‌بندی‌ها</span><strong>{{ categoryCounts.total.toLocaleString('fa-IR') }}</strong></div>
<div><span>تجهیزات خودرو <small>۱۰۰–۳۰۰</small></span><strong>{{ categoryCounts.car.toLocaleString('fa-IR') }}</strong></div>
<div><span>تجهیزات موتورسیکلت <small>۳۰۱–۵۰۱</small></span><strong>{{ categoryCounts.motorcycle.toLocaleString('fa-IR') }}</strong></div>
<div><span>بدون کد</span><strong>{{ categoryCounts.uncoded.toLocaleString('fa-IR') }}</strong></div>
</div>
<div class="category-manager-head">
<div>
<h3 class="text-lg font-bold">درخت دسته‌بندی‌ها</h3>
<p class="mt-1 text-xs leading-6 text-slate-500">هر شاخه را باز کنید تا زیرشاخه‌هایش جدا نمایش داده شوند. کد سه‌رقمی ریشه به همه زیرشاخه‌ها ارث می‌رسد.</p>
</div>
<span class="market-badge">{{ visibleCategoryCount.toLocaleString('fa-IR') }} دسته</span>
<div v-if="!categorySearch" class="flex items-center gap-2">
<button type="button" class="category-tool" @click="categoryTreeEl?.openAll()">باز کردن همه</button>
<button type="button" class="category-tool" @click="categoryTreeEl?.closeAll()">بستن همه</button>
</div>
</div>
<p v-if="!categoryTreeView.length" class="market-empty">دسته‌بندی‌ای با این جستجو پیدا نشد.</p>
<CategoryTree ref="categoryTreeEl" v-else :nodes="categoryTreeView" :selectable="false" :expand-all="!!categorySearch" show-codes show-counts>
<template #actions="{ node }">
<button type="button" class="tree-action" :disabled="saving" title="افزودن زیرشاخه" :aria-label="`افزودن زیرشاخه به ${node.name}`" @click.stop="addChildCategory(node)">
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke-linecap="round"/></svg>
</button>
<button type="button" class="tree-action" :disabled="saving" title="ویرایش" :aria-label="`ویرایش ${node.name}`" @click.stop="startCategory(node)">
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m11.2 2.4 2.4 2.4-8 8-3 .6.6-3 8-8Z" stroke-linejoin="round"/></svg>
</button>
<button type="button" class="tree-action is-danger" :disabled="saving" title="حذف" :aria-label="`حذف ${node.name}`" @click.stop="deleteCategory(node)">
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M6.8 7v3.6M9.2 7v3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>
</template>
</CategoryTree>
</div>
<div v-if="tab==='orders'" class="space-y-5">
<article v-for="o in filtered" :key="o.id" class="rounded-xl border p-5">
<div class="flex flex-wrap justify-between gap-3">
<strong>سفارش {{ o.id.slice(-8).toUpperCase() }}</strong>
<span class="market-badge">{{ labels[orderStatus(o)] }}</span>
</div>
<p class="my-3 text-sm text-slate-500">{{ o.name }} · {{ o.phone }} · {{ new Date(o.createdAt).toLocaleDateString('fa-IR') }}</p>
<p class="text-sm">{{ o.address }} · کد پستی {{ o.postalCode }}</p>
<ul class="my-4 space-y-2">
<li v-for="item in o.items" :key="item.id" class="flex justify-between gap-4 text-sm">
<span>{{ item.name }} × {{ item.quantity }} <small class="text-slate-400">{{ labels[item.status] }}</small>
</span>
<span>{{ money(Number(item.price)*item.quantity) }}</span>
</li>
</ul>
<div class="flex flex-wrap justify-between gap-3 border-t pt-4">
<strong>{{ money(o.total) }}</strong>
<span class="text-xs text-slate-500">پرداخت در محل</span>
</div>
<div v-if="isAdmin||isVendor" class="mt-4 flex flex-wrap gap-2">
<button v-for="status in nextStatuses(orderStatus(o))" :key="status" :disabled="saving" class="market-secondary" @click="mutate(`${prefix}/orders/${o.id}`,{status})">{{ labels[status] }}</button>
</div>
</article>
</div>
</div>
</template>
</div>
</div>
<div v-if="showForm" class="market-overlay" @click.self="showForm=false">
<form class="market-panel max-h-[90vh] w-full max-w-2xl overflow-auto" @submit.prevent="tab==='categories'?saveCategory():saveProduct()">
<div class="mb-6 flex justify-between">
<h2 class="text-xl font-bold">{{ tab==='categories' ? categoryFormTitle : isAdmin ? 'ثبت کالای جدید فروشگاه' : (editing?'ویرایش کالا':'افزودن کالا') }}</h2>
<button type="button" aria-label="بستن" @click="showForm=false">✕</button>
</div>
<div v-if="error" class="market-error">{{ error }}</div>
<template v-if="tab==='categories'">
<div class="category-form-grid">
<label class="market-label">نام دسته‌بندی<input v-model="category.name" required class="market-input" placeholder="مثلاً لنت ترمز جلو">
</label>
<label class="market-label">شناسه URL<input v-model="category.slug" required pattern="[^/ ]+" class="market-input" dir="ltr" placeholder="front-brake-pads">
</label>
<label class="market-label">کد دسته‌بندی<input v-model="category.code" class="market-input" dir="ltr" placeholder="۱۰۱">
</label>
<div class="market-label">نوع تجهیزات
<div class="cat-equipment" :class="categoryFormEquipment === 'CAR' ? 'is-car' : categoryFormEquipment === 'MOTORCYCLE' ? 'is-moto' : 'is-none'">
<span class="cat-equipment-dot" aria-hidden="true"></span>
<span>{{ categoryEquipmentLabel(categoryFormEquipment) }}</span>
</div>
</div>
</div>
<p class="category-hint" :class="{ 'is-error': categoryCodeError }">
<template v-if="categoryCodeError">{{ categoryCodeError }}</template>
<template v-else-if="!category.parentId">کد ریشه سه‌رقمی: ۱۰۱–۱۹۹ برای تجهیزات خودرو و ۲۰۱–۲۹۹ برای تجهیزات موتورسیکلت.</template>
<template v-else-if="!category.code">کد زیرشاخه به صورت خودکار از کد دسته مادر و یک پسوند دو رقمی (۰۱–۹۹) تولید می‌شود.</template>
<template v-else>کد کامل شاخه: {{ category.code }}</template>
</p>
<div class="market-label">دسته مادر
<CategoryPicker v-model="categoryParentValue" :categories="parentCategoryTree" value-key="id" placeholder="بدون دسته مادر (دسته ریشه)" aria-label="انتخاب دسته مادر" />
</div>
<label class="market-label">آیکن (اختیاری)<input v-model="category.icon" class="market-input" dir="ltr" placeholder="disc">
</label>
<label class="market-label">ترتیب نمایش<input v-model.number="category.sortOrder" type="number" min="0" class="market-input">
</label>
<label class="market-label">توضیحات<textarea v-model="category.description" class="market-input" rows="3" />
</label>
</template>
<template v-else>
<div class="grid gap-x-4 sm:grid-cols-2">
<label class="market-label">نام کالا<input v-model="form.name" required maxlength="200" class="market-input">
</label>
<div class="market-label">برند
<SearchSelect v-model="form.brand" :options="brandOptions" placeholder="جستجو یا نام برند جدید…" aria-label="انتخاب برند کالا" />
</div>
<label v-if="!isAdmin" class="market-label">نشانی تصویر<input v-model="form.image" required class="market-input">
</label>
<div class="market-label sm:col-span-2">کد کالا
<p class="sku-preview">{{ editing ? `کد فعلی: ${form.sku}` : 'پس از ذخیره، خودکار از کد دسته‌بندی و یک عدد سه‌رقمی ساخته می‌شود.' }}</p>
</div>
<label class="market-label">قیمت واحد (هزار تومان)<input v-model.number="form.price" type="number" min="1" max="9999999" step="1" required class="market-input" @input="syncPackageFromUnit">
<small v-if="Number(form.price) > 0" class="price-words">{{ priceInWords(Number(form.price) * 1000) }}</small>
</label>
<label class="market-label">قیمت بسته (هزار تومان)<input v-model.number="form.packagePrice" type="number" min="0" step="1" class="market-input" @input="syncUnitFromPackage">
</label>
<label class="market-label">قیمت پیش از تخفیف (هزار تومان)<input v-model.number="form.compareAt" type="number" min="0" step="1" class="market-input">
<small class="price-words">اختیاری؛ برای نمایش نشان تخفیف باید از قیمت واحد بیشتر باشد.</small>
</label>
<label class="market-label">تعداد در بسته<input v-model.number="form.quantityPerPackage" type="number" min="1" max="100000" step="1" required class="market-input" @input="syncPackageFromUnit">
</label>
<label class="market-label">درصد سود (٪)<input v-model.number="form.markupPercent" type="number" min="0" max="1000" step="0.1" class="market-input" @input="syncUnitFromPackage">
</label>
<p class="package-hint sm:col-span-2">قیمت بسته از قیمت واحد × تعداد در بسته به‌روزرسانی می‌شود؛ در مقابل، با تغییر قیمت بسته، قیمت واحد از قیمت بسته ÷ تعداد در بسته با احتساب درصد سود محاسبه می‌شود.</p>
<label class="market-label">موجودی<input v-model.number="form.stock" type="number" min="0" step="1" required class="market-input">
</label>
<div class="market-label">دسته‌بندی
<CategoryPicker v-model="form.categoryId" :categories="categories" value-key="id" placeholder="جستجوی نام یا کد دسته‌بندی…" aria-label="انتخاب دسته‌بندی کالا" />
<p class="mt-1 text-xs leading-5 text-slate-500">{{ productCategoryLabel }}</p>
</div>
<label class="market-label">نوع بسته‌بندی<select v-model="form.packaging" required class="market-input">
<option value="" disabled>انتخاب نوع بسته‌بندی</option>
<option v-for="option in packagingOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
</select>
</label>
</div>
<label class="market-label">توضیحات<textarea v-model="form.description" rows="4" class="market-input" />
</label>
<div class="market-label">خودروهای سازگار
<VehicleFitmentPicker v-model="form.variantIds" :options="variants" />
</div>
<fieldset v-if="isAdmin" class="mb-5 rounded-xl border p-4">
<legend class="px-2 text-sm font-bold">تصویرها و ویدیوهای کالا</legend>
<p class="mb-3 text-xs leading-6 text-slate-500">فقط مدیر می‌تواند فایل بارگذاری کند. تصاویر JPEG، PNG، WebP، GIF، AVIF، BMP، TIFF و HEIC تا ۱۰ مگابایت؛ ویدیوهای MP4، WebM، OGG، MOV، M4V، AVI، MPEG، 3GP و MKV تا ۵۰ مگابایت. تصویر نخست، تصویر اصلی کالا است و ویدیوها به گالری اضافه می‌شوند.</p>
<div class="mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
<video v-if="form.image && isVideoUrl(form.image)" :src="form.image" controls muted playsinline class="h-full w-full object-contain" aria-label="پیش‌نمایش ویدیوی کالا" />
<img v-else-if="form.image" :src="form.image" alt="پیش‌نمایش تصویر کالا" class="h-full w-full object-contain">
<span v-else class="text-xs text-slate-500">پیش‌نمایش تصویر</span>
</div>
<div v-if="form.images.length" class="mb-3 flex flex-wrap gap-2">
<figure v-for="(url, i) in form.images" :key="url" class="relative">
<video v-if="isVideoUrl(url)" :src="url" muted playsinline preload="metadata" class="h-20 w-20 rounded-lg object-cover" aria-label="ویدیوی کالا" />
<img v-else :src="url" :alt="`تصویر ${i + 1}`" class="h-20 w-20 rounded-lg object-cover">
<span v-if="isVideoUrl(url)" class="media-badge" aria-hidden="true">▶</span>
<button type="button" class="absolute -top-1 -right-1 rounded-full bg-slate-700 px-1.5 text-xs text-white" :disabled="saving || imageUploading" aria-label="حذف فایل" @click="removeImage(url)">✕</button>
</figure>
</div>
<label class="market-label" :class="{'pointer-events-none opacity-60': imageUploading}">انتخاب فایل‌های تصویر و ویدیو (چندتایی)<input type="file" :accept="MEDIA_ACCEPT" multiple class="market-input" :disabled="imageUploading || saving" @change="pickProductImages">
</label>
<p v-if="imageUploading" class="text-xs text-slate-500" role="status">در حال بارگذاری «{{ imageFileName }}»…</p>
</fieldset>
<p class="mb-5 text-sm text-slate-500">{{ isAdmin ? 'این کالا به‌نام فروشگاه پارتلی و فعال ثبت می‌شود.' : 'کالا پس از ثبت یا ویرایش برای بررسی مدیر ارسال می‌شود.' }}</p>
</template>
<button class="market-primary" :disabled="saving || imageUploading">{{ imageUploading ? 'در حال بارگذاری فایل…' : saving ? 'در حال ذخیره…' : 'ذخیره' }}</button>
</form>
</div>
</section>
</template>

<style scoped>
.category-manager { padding: 18px; border: 1px solid #e7e7e0; border-radius: 16px; background: #fff; }
.category-manager-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 20px; }
.category-manager-stats > div { padding: 12px 14px; border: 1px solid #eeeee7; border-radius: 12px; background: #fafaf6; }
.category-manager-stats span { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; color: #777c72; font-size: 11px; line-height: 1.7; }
.category-manager-stats small { color: #a3a79e; font-size: 9.5px; direction: ltr; }
.category-manager-stats strong { display: block; margin-top: 4px; font-size: 20px; font-weight: 800; }
.category-manager :deep(.category-tree) { max-height: 62vh; overflow-y: auto; padding-inline-end: 4px; }
.category-manager-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.category-tool { min-height: 30px; padding-inline: 10px; border: 1px solid #e2e3dc; border-radius: 8px; background: #fff; color: #687064; font-size: 10.5px; font-weight: 600; transition: border-color .15s, color .15s; }
.category-tool:hover { border-color: #c7c9c0; color: #b6411e; }
.category-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.category-form-grid > * { min-width: 0; }
.category-hint { margin: 0 0 18px; padding: 10px 12px; border-radius: 10px; background: #f6f7f2; color: #6b7066; font-size: 11px; line-height: 1.9; }
.category-hint.is-error { background: #fdf0ee; color: #a93a2e; }
.cat-equipment { display: flex; align-items: center; gap: 7px; min-height: 44px; padding: 0 12px; border: 1px solid #e3e4dd; border-radius: 10px; background: #fafaf7; font-size: 12px; }
.cat-equipment-dot { width: 8px; height: 8px; border-radius: 50%; background: #b9bdb2; }
.cat-equipment.is-car .cat-equipment-dot { background: #3f7f5a; }
.cat-equipment.is-moto .cat-equipment-dot { background: #b6411e; }
.cat-equipment-note { margin-inline-start: auto; color: #9a9e94; font-size: 9.5px; }
.price-words { display: block; margin-top: 4px; color: #777c72; font-size: 11px; line-height: 1.9; }
.sku-preview { margin: 4px 0 0; padding: 9px 12px; border: 1px dashed #d9dbd2; border-radius: 10px; background: #fafaf6; color: #6b7066; font-size: 12px; line-height: 1.9; }
.package-hint { margin: 0 0 14px; padding: 10px 12px; border-radius: 10px; background: #f6f7f2; color: #6b7066; font-size: 11px; line-height: 1.9; }
.media-badge { position: absolute; inset-block-end: 4px; inset-inline-start: 4px; padding: 1px 5px; border-radius: 999px; background: rgba(32,38,35,.82); color: #fff; font-size: 9px; }
@media (max-width: 640px) {
  .category-manager-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .category-form-grid { grid-template-columns: 1fr; }
}
</style>

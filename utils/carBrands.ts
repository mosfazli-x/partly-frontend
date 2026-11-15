// Curated brands sold in the Iranian market. This catalog is intentionally
// separate from the database vehicle makes: a brand can be listed before its
// models and fitment data are imported, and the UI stays stable either way.
// Each entry links to the matching backend make slug when one exists.

export type BrandGroup = 'iranian' | 'chinese' | 'japanese-korean' | 'european'

export type CarBrand = {
  slug: string
  name: string
  enName: string
  group: BrandGroup
  tagline: string
  logo?: string
  /** Backend VehicleMake.slug, when it exists in the vehicle data. */
  makeSlug?: string
  /** Locally assembled or jointly produced in Iran. */
  local?: boolean
}

export const brandGroups: { key: BrandGroup; label: string; caption: string }[] = [
  { key: 'iranian', label: 'ایرانی', caption: 'تولید داخل' },
  { key: 'chinese', label: 'چینی', caption: 'مونتاژ و وارداتی' },
  { key: 'japanese-korean', label: 'ژاپنی و کره‌ای', caption: 'وارداتی' },
  { key: 'european', label: 'اروپایی', caption: 'وارداتی و قدیمی' },
]

export const carBrands: CarBrand[] = [
  { slug: 'peugeot', name: 'پژو', enName: 'Peugeot', group: 'european', tagline: 'پارس، ۲۰۶، ۲۰۷، ۴۰۵', logo: '/brands/peugeot.svg', makeSlug: 'peugeot', local: true },
  { slug: 'citroen', name: 'سیتروئن', enName: 'Citroën', group: 'european', tagline: 'سیتروئن‌های مونتاژی و قدیمی', logo: '/brands/citroen.svg' },
  { slug: 'renault', name: 'رنو', enName: 'Renault', group: 'european', tagline: 'تندر و ال۹۰ سابق', logo: '/brands/renault.svg' },
  { slug: 'fiat', name: 'فیات', enName: 'Fiat', group: 'european', tagline: 'فیات‌های قدیمی بازار', logo: '/brands/fiat.svg' },

  { slug: 'toyota', name: 'تویوتا', enName: 'Toyota', group: 'japanese-korean', tagline: 'کرولا، کرولا کراس، راو۴', logo: '/brands/toyota.svg', makeSlug: 'toyota' },
  { slug: 'hyundai', name: 'هیوندای', enName: 'Hyundai', group: 'japanese-korean', tagline: 'النترا و توسان', logo: '/brands/hyundai.svg', makeSlug: 'hyundai' },
  { slug: 'kia', name: 'کیا', enName: 'Kia', group: 'japanese-korean', tagline: 'سراتو، کی۳ و اسپورتیج', logo: '/brands/kia.svg', makeSlug: 'kia', local: true },
  { slug: 'nissan', name: 'نیسان', enName: 'Nissan', group: 'japanese-korean', tagline: 'سیلفی و نیسان‌های وارداتی', logo: '/brands/nissan.svg', makeSlug: 'nissan' },
  { slug: 'mitsubishi', name: 'میتسوبیشی', enName: 'Mitsubishi', group: 'japanese-korean', tagline: 'اکلیپس کراس', logo: '/brands/mitsubishi.svg', makeSlug: 'mitsubishi' },
  { slug: 'honda', name: 'هوندا', enName: 'Honda', group: 'japanese-korean', tagline: 'سیویک', logo: '/brands/honda.svg', makeSlug: 'honda' },
  { slug: 'volkswagen', name: 'فولکس‌واگن', enName: 'Volkswagen', group: 'european', tagline: 'تی-راک', logo: '/brands/volkswagen.svg', makeSlug: 'volkswagen' },

  { slug: 'changan', name: 'چانگان', enName: 'Changan', group: 'chinese', tagline: 'یونی-زد', makeSlug: 'changan' },
  { slug: 'byd', name: 'بی‌وای‌دی', enName: 'BYD', group: 'chinese', tagline: 'هان و سیل', makeSlug: 'byd' },
  { slug: 'jac', name: 'جک', enName: 'JAC', group: 'chinese', tagline: 'جی۴، اس۳ و اس۵', makeSlug: 'jac', local: true },
  { slug: 'mvm', name: 'ام‌وی‌ام', enName: 'MVM', group: 'chinese', tagline: 'آریزو و ایکس سری', makeSlug: 'mvm', local: true },
  { slug: 'haima', name: 'هایما', enName: 'Haima', group: 'chinese', tagline: 'اس۵، اس۷ و ۸اس', makeSlug: 'haima', local: true },

  { slug: 'saipa', name: 'سایپا', enName: 'SAIPA', group: 'iranian', tagline: 'شاهین، ساینا، کوییک، تیبا', local: true },
  { slug: 'pride', name: 'پراید', enName: 'Pride', group: 'iranian', tagline: '۱۱۱، ۱۳۱ و ۱۳۲', makeSlug: 'pride' },
  { slug: 'tiba', name: 'تیبا', enName: 'Tiba', group: 'iranian', tagline: 'تیبا ۱ و تیبا ۲', makeSlug: 'tiba' },
  { slug: 'quick', name: 'کوییک', enName: 'Quick', group: 'iranian', tagline: 'کوییک اس و GXR', makeSlug: 'quick' },
  { slug: 'saina', name: 'ساینا', enName: 'Saina', group: 'iranian', tagline: 'ساینا اس', makeSlug: 'saina' },
  { slug: 'shahin', name: 'شاهین', enName: 'Shahin', group: 'iranian', tagline: 'دستی و اتوماتیک', makeSlug: 'shahin' },
  { slug: 'atlas', name: 'اطلس', enName: 'Atlas', group: 'iranian', tagline: 'کراس‌اور سایپا', makeSlug: 'atlas' },
  { slug: 'iran-khodro', name: 'ایران‌خودرو', enName: 'IKCO', group: 'iranian', tagline: 'سمند، دنا، تارا و آریسان', local: true },
  { slug: 'samand', name: 'سمند', enName: 'Samand', group: 'iranian', tagline: 'ال‌ایکس و سورن', makeSlug: 'samand' },
  { slug: 'dena', name: 'دنا', enName: 'Dena', group: 'iranian', tagline: 'دنا پلاس و توربو', makeSlug: 'dena' },
  { slug: 'tara', name: 'تارا', enName: 'Tara', group: 'iranian', tagline: 'تارا دستی و اتوماتیک', makeSlug: 'tara' },
  { slug: 'arisun', name: 'آریسان', enName: 'Arisun', group: 'iranian', tagline: 'پیکاپ ایران‌خودرو', makeSlug: 'arisun' },
  { slug: 'bahman', name: 'بهمن', enName: 'Bahman', group: 'iranian', tagline: 'فیدلیتی و دیگنیتی', local: true },
  { slug: 'fidelity', name: 'فیدلیتی', enName: 'Fidelity', group: 'iranian', tagline: 'پرایم و پرستیژ', makeSlug: 'fidelity' },
  { slug: 'dignity', name: 'دیگنیتی', enName: 'Dignity', group: 'iranian', tagline: 'پرایم و پرستیژ', makeSlug: 'dignity' },
  { slug: 'kmc', name: 'کی‌ام‌سی', enName: 'KMC', group: 'iranian', tagline: 'جی۷، تی۸ و ایکس۵', makeSlug: 'kmc', local: true },
  { slug: 'lamari', name: 'لاماری', enName: 'Lamari', group: 'iranian', tagline: 'ایما هیبریدی', makeSlug: 'lamari' },
]

export const getCarBrand = (slug?: string) => carBrands.find(brand => brand.slug === slug)

// Group brands (SAIPA, IKCO, Bahman, …) own several database makes; resolving the
// make slugs here keeps the catalogue independent from import details.
export const brandMakeSlugs: Record<string, string[]> = {
  saipa: ['pride', 'tiba', 'quick', 'saina', 'shahin', 'atlas'],
  'iran-khodro': ['samand', 'dena', 'tara', 'arisun'],
  bahman: ['fidelity', 'dignity'],
}

export function getBrandMakeSlugs(brand: CarBrand): string[] {
  return brandMakeSlugs[brand.slug] || (brand.makeSlug ? [brand.makeSlug] : [])
}

/** A brand is browsable once at least one of its makes exists in the database. */
export function isBrandAvailable(brand: CarBrand, availableSlugs: ReadonlySet<string>): boolean {
  return getBrandMakeSlugs(brand).some(slug => availableSlugs.has(slug))
}

export function getBrandInitials(brand: CarBrand) {
  return brand.enName.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || brand.name.slice(0, 1)
}

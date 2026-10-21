export type VehicleModelAsset = {
  url: string
  poster: string
  label: string
  materialNote: string
}

// Only register model-specific source geometry here. Do not map one car's mesh
// to another car just because their body classes happen to match.
const assets: Record<string, VehicleModelAsset> = {
  'pride/111': {
    url: '/models/pride-111.glb',
    poster: '/models/pride-111.webp',
    label: 'پراید ۱۱۱',
    materialNote: 'هندسه از فایل سه‌بعدی ارائه‌شده؛ متریال‌ها به‌دلیل نبود فایل MTL بازسازی شده‌اند.',
  },
}

export type ShowroomVehicle = {
  id: string
  name: string
  enName: string
  slug: string
  body: string
  showroomOnly: true
  assetId: string
}

// Separate display-only assets must never be returned as catalog/fitment models.
const showroomAssets: Record<string, VehicleModelAsset> = {
  'peugeot-207-sw': {
    url: '/models/peugeot-207-sw.glb',
    poster: '/models/peugeot-207-sw.webp',
    label: 'پژو ۲۰۷ SW',
    materialNote: 'هندسه و بافت‌ها از فایل‌های OBJ، MTL و DDS ارائه‌شده؛ ظاهر شیشه و متریال PBR بازسازی شده است. این مدل استیشن SW است، نه ۲۰۷ هاچ‌بک.',
  },
}

export function getShowroomVehicles(makeSlug?: string): ShowroomVehicle[] {
  if (makeSlug !== 'peugeot') return []
  return [{ id: 'showroom:peugeot-207-sw', name: '۲۰۷ SW', enName: '207 SW', slug: '207-sw', body: 'WAGON', showroomOnly: true, assetId: 'peugeot-207-sw' }]
}

export function getShowroomModelAsset(assetId?: string): VehicleModelAsset | undefined {
  return assetId ? showroomAssets[assetId] : undefined
}

export function getVehicleModelAsset(makeSlug?: string, modelSlug?: string, variantSlug?: string): VehicleModelAsset | undefined {
  if (makeSlug === 'saipa' && modelSlug === 'pride' && variantSlug === 'pride-111') return assets['pride/111']
  return assets[`${makeSlug || ''}/${modelSlug || ''}`]
}

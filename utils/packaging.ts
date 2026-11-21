export const packagingOptions = [
  { value: 'CARTON', label: 'کارتن' },
  { value: 'PACK', label: 'بسته' },
  { value: 'SHRINK_WRAP', label: 'شرینک' },
  { value: 'BOX', label: 'جعبه' },
  { value: 'BAG', label: 'کیسه' },
  { value: 'BOTTLE', label: 'بطری' },
  { value: 'CAN', label: 'قوطی' },
  { value: 'BULK', label: 'فله' },
  { value: 'OTHER', label: 'سایر' },
] as const

export const packagingLabels: Record<string, string> = Object.fromEntries(packagingOptions.map(option => [option.value, option.label]))

export function packagingLabel(value: string | null | undefined) {
  return value ? packagingLabels[value] ?? value : 'نامشخص'
}

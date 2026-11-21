// Prices are stored and returned by the API as actual toman amounts.
// The storefront presents them in thousands of tomans: 1 displayed unit = 1,000 tomans.
export const PRICE_UNIT = 'هزار تومان'

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون']

function groupToWords(value: number) {
  const words: string[] = []
  const hundreds = Math.floor(value / 100)
  const rest = value % 100
  if (hundreds) words.push(HUNDREDS[hundreds])
  if (rest >= 10 && rest < 20) words.push(TEENS[rest - 10])
  else {
    const tens = Math.floor(rest / 10)
    const ones = rest % 10
    if (tens) words.push(TENS[tens])
    if (ones) words.push(ONES[ones])
  }
  return words.join(' و ')
}

export function numberToPersianWords(value: number) {
  const amount = Math.floor(Math.abs(Number(value) || 0))
  if (!amount) return 'صفر'
  const groups: number[] = []
  for (let rest = amount; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000)
  if (groups.length > SCALES.length) return amount.toLocaleString('fa-IR')
  const parts: string[] = []
  for (let index = groups.length - 1; index >= 0; index--) {
    if (!groups[index]) continue
    const words = groupToWords(groups[index])
    parts.push(SCALES[index] ? `${words} ${SCALES[index]}` : words)
  }
  return parts.join(' و ')
}

export function priceInThousands(value: unknown) {
  return Number(value || 0) / 1000
}

// Thousands of tomans with a separator every three digits (Persian digits).
export function formatPriceUnit(value: unknown) {
  return priceInThousands(value).toLocaleString('fa-IR', { maximumFractionDigits: 3 })
}

export function formatToman(value: unknown) {
  return `${formatPriceUnit(value)} ${PRICE_UNIT}`
}

// Whole-percent discount between the original price and the current price, or 0 when there is no discount.
export function discountPercent(compareAt: unknown, price: unknown) {
  const original = Number(compareAt)
  const current = Number(price)
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= current || current <= 0) return 0
  return Math.round((1 - current / original) * 100)
}

// Written-out amount based on the actual toman value, e.g. 850000 -> هشتصد و پنجاه هزار تومان
export function priceInWords(value: unknown) {
  return `${numberToPersianWords(Math.round(Number(value) || 0))} تومان`
}

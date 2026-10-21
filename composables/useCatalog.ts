export type Variant = { id: string; name: string; slug: string; engine?: string; years?: string }
export type Make = { id: string; name: string; slug: string; type: string }
export type Category = { id: string; name: string; slug: string; description?: string; icon?: string }
export type Product = { id: string; sku: string; name: string; description: string; price: string | number; compareAt?: string | number; stock: number; brand: string; image: string; tags: string[]; category: Category; specifications: { name: string; value: string }[] }

export const useCatalog = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string
  const makes = ref<Make[]>([])
  const models = ref<any[]>([])
  const variants = ref<Variant[]>([])
  const selectedVariant = ref<Variant | null>(null)
  const categories = ref<Category[]>([])
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref('')
  const fetchMakes = async () => { makes.value = await $fetch<Make[]>(`${apiBase}/vehicle-types`) }
  const fetchModels = async (makeSlug: string) => { const data = await $fetch<any>(`${apiBase}/vehicles/${makeSlug}/models`); models.value = data.models; variants.value = models.value.flatMap((model: any) => model.variants) }
  const fetchCatalog = async (variantId: string, query = '') => { loading.value = true; error.value = ''; try { const data = await $fetch<any>(`${apiBase}/catalog/${variantId}${query}`); products.value = data.products; categories.value = data.categories; selectedVariant.value = data.vehicle } catch { error.value = 'We could not load this catalog. Please try again.' } finally { loading.value = false } }
  return { makes, models, variants, selectedVariant, categories, products, loading, error, fetchMakes, fetchModels, fetchCatalog }
}

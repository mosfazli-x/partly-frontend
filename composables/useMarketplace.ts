export const useMarketplace = () => {
  const token = useCookie<string | null>('partly-session', { sameSite: 'strict', maxAge: 604800, secure: !import.meta.dev })
  const user = useState<any>('market-user', () => null)
  const cart = useState<any[]>('market-cart', () => [])
  const config = useRuntimeConfig()
  async function api<T = any>(path: string, options: any = {}): Promise<T> {
    return await $fetch<T>(`${String(config.public.apiBase).replace(/\/$/, '').replace(/\/api$/, '')}${path}`, { ...options, headers: { ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}), ...options.headers } }) as T
  }
  async function restore() {
    if (token.value && !user.value) { try { user.value = await api('/api/auth/me') } catch { token.value = null } }
  }
  async function login(path: string, body: any) {
    const result: any = await api(path, { method: 'POST', body }); token.value = result.token; user.value = result.user
  }
  async function logout() { try { await api('/api/auth/logout', { method: 'POST' }) } finally { token.value = null; user.value = null; await navigateTo('/') } }
  function saveCart() { if (import.meta.client) localStorage.setItem('partly-cart', JSON.stringify(cart.value)) }
  function loadCart() { if (import.meta.client) { try { const saved = JSON.parse(localStorage.getItem('partly-cart') || '[]'); cart.value = Array.isArray(saved) ? saved.filter(i => i?.id && Number.isInteger(i.quantity) && i.quantity > 0) : [] } catch { cart.value = [] } } }
  function add(product: any) { if (!product.stock) return; const item = cart.value.find(i => i.id === product.id); if (item) item.quantity = Math.min(item.quantity + 1, product.stock); else cart.value.push({ id: product.id, name: product.name, slug: product.slug, price: product.price, stock: product.stock, quantity: 1 }); saveCart() }
  const money = (value: any) => Number(value || 0).toLocaleString('fa-IR') + ' تومان'
  const message = (e: any) => e?.data?.message || 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.'
  return { token, user, cart, api, restore, login, logout, loadCart, saveCart, add, money, message }
}

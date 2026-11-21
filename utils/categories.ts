// Shared category helpers for the storefront and dashboard.
// Classification codes are hierarchical strings:
// root categories are three digits: 101-199 car equipment, 201-299 motorcycle
// equipment. Every nested level appends two digits (01-99): 101 -> 10101 -> 1010101.

export const CAR_ROOT_MIN = 101
export const CAR_ROOT_MAX = 199
export const MOTORCYCLE_ROOT_MIN = 201
export const MOTORCYCLE_ROOT_MAX = 299
export const MAX_CATEGORY_DEPTH = 5

export type CategoryEquipmentType = 'CAR' | 'MOTORCYCLE'

export type CategoryNode = {
  id: string
  parentId: string | null
  code: string | null
  equipmentType: CategoryEquipmentType | null
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  sortOrder: number
  depth?: number
  path?: { id: string; name: string; slug: string; code: string | null }[]
  productCount?: number
  directProductCount?: number
  children: CategoryNode[]
  matched?: boolean
}

export function categoryEquipmentType(code: string | null | undefined): CategoryEquipmentType | null {
  const root = code !== null && code !== undefined && typeof code === 'string' ? code.slice(0, 3) : null
  if (!root) return null
  return root.startsWith('1') ? 'CAR' : 'MOTORCYCLE'
}

export function categoryEquipmentLabel(type: CategoryEquipmentType | null | undefined) {
  return type === 'CAR' ? 'خودرو' : type === 'MOTORCYCLE' ? 'موتورسیکلت' : 'نامشخص'
}

export function categoryCodeLevel(code: string | null | undefined): number {
  if (!code || !/^\d{3}(\d{2})*$/.test(code)) return 0
  return (code.length - 3) / 2 + 1
}

export function categoryRootCode(code: string | null | undefined): string | null {
  return typeof code === 'string' ? code.slice(0, 3) : null
}

export function categoryParentCode(code: string | null | undefined): string | null {
  return typeof code === 'string' && code.length > 3 ? code.slice(0, -2) : null
}

export function categoryCodeSuffix(code: string | null | undefined): string | null {
  return typeof code === 'string' && code.length > 3 ? code.slice(-2) : null
}

export function categoryCodeText(node: CategoryNode | null | undefined) {
  return node ? (node.code || '') : ''
}

export function categoryFullPathCode(node: CategoryNode | null | undefined) {
  if (!node || !node.code) return ''
  const suffix = (node.path || [])
    .filter(item => item.code)
    .map(item => item.code!.slice(-2))
    .join('')
  return node.code
}

/** Normalizes Persian/Arabic digits and letters so search behaves predictably. */
export function normalizeCategoryText(value: unknown) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function flattenCategoryTree(nodes: CategoryNode[], depth = 0, parents: CategoryNode[] = []): CategoryNode[] {
  const list: CategoryNode[] = []
  for (const node of nodes) {
    list.push({ ...node, depth: node.depth ?? depth, path: node.path ?? parents.map(p => ({ id: p.id, name: p.name, slug: p.slug, code: p.code })) })
    list.push(...flattenCategoryTree(node.children || [], depth + 1, [...parents, node]))
  }
  return list
}

export function countCategoryTree(nodes: CategoryNode[]) {
  const list = flattenCategoryTree(nodes)
  return {
    total: list.length,
    roots: nodes.length,
    car: list.filter(node => node.equipmentType === 'CAR').length,
    motorcycle: list.filter(node => node.equipmentType === 'MOTORCYCLE').length,
    uncoded: list.filter(node => node.code === null).length,
  }
}

export function findCategoryNode(nodes: CategoryNode[], value: string, key: 'id' | 'slug' | 'code' = 'slug'): CategoryNode | null {
  if (!value) return null
  return flattenCategoryTree(nodes).find(node => node[key] === value) ?? null
}

export function categoryPathLabel(node: CategoryNode | null | undefined, separator = ' / ') {
  if (!node) return ''
  return [...(node.path || []).map(item => item.name), node.name].join(separator)
}

/** Keeps matching nodes plus their ancestors so search results stay readable as a tree. */
export function filterCategoryTree(nodes: CategoryNode[], query: string): CategoryNode[] {
  const needle = normalizeCategoryText(query)
  if (!needle) return nodes
  const filter = (list: CategoryNode[]): CategoryNode[] => {
    const kept: CategoryNode[] = []
    for (const node of list) {
      const children = filter(node.children || [])
      const haystack = normalizeCategoryText([
        node.name, node.slug, node.code,
        ...(node.path || []).map(item => item.name),
      ].join(' '))
      if (haystack.includes(needle) || children.length) kept.push({ ...node, matched: haystack.includes(needle), children })
    }
    return kept
  }
  return filter(nodes)
}

export function filterCategoryTreeByEquipment(nodes: CategoryNode[], type: CategoryEquipmentType): CategoryNode[] {
  const filter = (list: CategoryNode[]): CategoryNode[] => list.flatMap(node => {
    if (node.equipmentType && node.equipmentType !== type) return []
    const children = filter(node.children || [])
    return [{ ...node, children }]
  })
  return filter(nodes)
}

/** Removes a node and its subtree, used to prevent choosing a descendant as a parent. */
export function excludeCategoryBranch(nodes: CategoryNode[], id: string): CategoryNode[] {
  return nodes.flatMap(node => node.id === id ? [] : [{ ...node, children: excludeCategoryBranch(node.children || [], id) }])
}

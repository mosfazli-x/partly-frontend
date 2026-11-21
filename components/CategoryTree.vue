<script setup lang="ts">
defineOptions({ name: 'CategoryTree' })

const props = withDefaults(defineProps<{
  nodes: any[]
  selected?: string
  valueKey?: 'id' | 'slug'
  selectable?: boolean
  showCodes?: boolean
  showCounts?: boolean
  expandAll?: boolean
  autoExpandRoots?: boolean
  dense?: boolean
}>(), {
  selected: '',
  valueKey: 'slug',
  selectable: true,
  showCodes: true,
  showCounts: false,
  expandAll: false,
  autoExpandRoots: true,
  dense: false,
})

const emit = defineEmits<{ select: [node: any] }>()

const expanded = ref<Set<string>>(new Set())
const initialized = ref(false)
watch(() => props.nodes, nodes => {
  if (initialized.value || !nodes.length) return
  initialized.value = true
  if (!props.autoExpandRoots) return
  const next = new Set(expanded.value)
  for (const node of nodes) if (node.children?.length) next.add(node.id)
  expanded.value = next
}, { immediate: true })

const isExpanded = (node: any) => props.expandAll || expanded.value.has(node.id)
function toggle(node: any) {
  const next = new Set(expanded.value)
  next.has(node.id) ? next.delete(node.id) : next.add(node.id)
  expanded.value = next
}
function activate(node: any) {
  if (node.children?.length) toggle(node)
  if (props.selectable) emit('select', node)
}
function setAll(expand: boolean) {
  const next = new Set<string>()
  if (expand) {
    const walk = (list: any[]) => {
      for (const node of list) {
        if (!node.children?.length) continue
        next.add(node.id)
        walk(node.children)
      }
    }
    walk(props.nodes)
  }
  expanded.value = next
}
defineExpose({ openAll: () => setAll(true), closeAll: () => setAll(false) })

// The tree is flattened for rendering so sub-branches stay indented and independent.
const visibleRows = computed(() => {
  const rows: { node: any; depth: number }[] = []
  const walk = (list: any[], depth: number) => {
    for (const node of list) {
      rows.push({ node, depth })
      if (node.children?.length && isExpanded(node)) walk(node.children, depth + 1)
    }
  }
  walk(props.nodes, 0)
  return rows
})

const isSelected = (node: any) => props.selected !== '' && String(node[props.valueKey]) === String(props.selected)
const codeOf = (node: any) => node.code ?? null
</script>

<template>
  <ul class="category-tree" :class="{ 'is-dense': dense }" role="tree" aria-label="درخت دسته‌بندی">
    <li v-for="{ node, depth } in visibleRows" :key="node.id" role="none" class="category-tree-item">
      <div
        class="tree-row"
        :class="{ 'is-selected': isSelected(node), 'is-branch': node.children?.length }"
        :style="{ '--tree-depth': depth }"
        role="treeitem"
        :aria-level="depth + 1"
        :aria-selected="selectable ? isSelected(node) : undefined"
        :aria-expanded="node.children?.length ? isExpanded(node) : undefined"
      >
        <button
          v-if="node.children?.length"
          type="button"
          class="tree-toggle"
          :aria-label="isExpanded(node) ? `بستن شاخه ${node.name}` : `باز کردن شاخه ${node.name}`"
          @click.stop="toggle(node)"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" :class="{ 'is-open': isExpanded(node) }"><path d="m5 3 5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span v-else class="tree-leaf" aria-hidden="true" />

        <button type="button" class="tree-label" @click="activate(node)">
          <span class="tree-name">{{ node.name }}</span>
          <span v-if="showCodes && codeOf(node) !== null" class="tree-code" :class="{ 'is-inherited': node.code === null }" :title="node.code === null ? 'کد ارثی از شاخه والد' : 'کد دسته‌بندی'" dir="ltr">{{ codeOf(node) }}</span>
          <span v-if="showCounts && node.productCount" class="tree-count" :title="`${node.productCount} کالا در این شاخه`">{{ Number(node.productCount).toLocaleString('fa-IR') }}</span>
        </button>

        <span v-if="$slots.actions" class="tree-actions"><slot name="actions" :node="node" /></span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.category-tree { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.tree-row { display: flex; align-items: center; gap: 2px; min-height: 40px; padding: 2px 6px 2px 2px; border-radius: 10px; padding-inline-start: calc(3px + var(--tree-depth, 0) * 18px); transition: background .15s, color .15s; }
.is-dense .tree-row { min-height: 34px; }
.tree-row:hover { background: var(--cat-hover, #f6f6f0); }
.tree-row.is-selected { background: var(--cat-selected, #fcf0e9); color: var(--cat-accent, #b6411e); }
.tree-row.is-selected .tree-name { font-weight: 700; }
.tree-toggle { display: grid; place-items: center; flex: none; width: 26px; height: 26px; border: 0; border-radius: 7px; background: transparent; color: #8b8f87; cursor: pointer; }
.tree-toggle:hover { background: var(--cat-hover, #ecece3); color: var(--cat-accent, #b6411e); }
.tree-toggle svg { width: 13px; height: 13px; transition: transform .18s ease; }
.tree-toggle svg.is-open { transform: rotate(90deg); }
.tree-leaf { flex: none; display: grid; place-items: center; width: 26px; height: 26px; }
.tree-leaf::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: #c9ccc3; }
.tree-label { display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; padding: 4px 2px; border: 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
.tree-label::after { content: ''; flex: 1 1 auto; }
.tree-name { flex: 0 1 auto; min-width: 0; overflow: hidden; font-size: 12.5px; font-weight: 500; line-height: 1.9; text-overflow: ellipsis; white-space: nowrap; }
.is-dense .tree-name { font-size: 12px; line-height: 1.7; }
.tree-code { flex: none; padding: 2px 7px; border-radius: 999px; background: #eef1f7; color: #475569; font-size: 10px; font-weight: 700; letter-spacing: .3px; }
.tree-code.is-inherited { background: #f1f2ee; color: #8a8e83; font-weight: 500; }
.tree-count { flex: none; padding: 2px 6px; border-radius: 999px; background: #eff0ea; color: #7c8076; font-size: 9.5px; }
.tree-actions { display: flex; flex: none; gap: 1px; opacity: 0; transition: opacity .15s; }
.tree-row:hover .tree-actions, .tree-row:focus-within .tree-actions { opacity: 1; }
.category-tree :deep(.tree-action) { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 7px; background: transparent; color: #858a80; cursor: pointer; }
.category-tree :deep(.tree-action:hover) { background: #ecece3; color: var(--cat-accent, #b6411e); }
.category-tree :deep(.tree-action.is-danger:hover) { background: #fbeceb; color: #b3362c; }
.category-tree :deep(.tree-action svg) { width: 15px; height: 15px; }
@media (hover: none) { .tree-actions { opacity: 1; } }
</style>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  categories: any[]
  valueKey?: 'id' | 'slug'
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  compact?: boolean
  ariaLabel?: string
  emptyText?: string
}>(), {
  valueKey: 'slug',
  placeholder: 'انتخاب دسته‌بندی…',
  disabled: false,
  clearable: true,
  compact: false,
  ariaLabel: 'انتخاب دسته‌بندی',
  emptyText: 'دسته‌بندی‌ای برای انتخاب ثبت نشده است.',
})

const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string]; select: [node: any] }>()

const open = ref(false)
const search = ref('')
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const selectedNode = computed(() => findCategoryNode(props.categories, props.modelValue, props.valueKey))
const selectedCode = computed(() => selectedNode.value?.code ?? null)
const selectedLabel = computed(() => selectedNode.value?.name || props.modelValue || '')
const selectedPath = computed(() => categoryPathLabel(selectedNode.value, ' › '))
const searching = computed(() => normalizeCategoryText(search.value).length > 0)
const results = computed(() => filterCategoryTree(props.categories, search.value))
const totalResults = computed(() => flattenCategoryTree(results.value).length)

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}
function openPanel() {
  open.value = true
  search.value = ''
  nextTick(() => searchInput.value?.focus())
}
function close() {
  open.value = false
  search.value = ''
}
function pick(node: any) {
  const value = String(node?.[props.valueKey] ?? '')
  close()
  emit('select', node)
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('change', value)
}
function clear() {
  close()
  if (!props.modelValue) return
  emit('update:modelValue', '')
  emit('change', '')
}
function onOutside(event: Event) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) close()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) { event.stopPropagation(); close() }
}
onMounted(() => {
  document.addEventListener('pointerdown', onOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="category-picker" :class="{ 'is-open': open, 'is-compact': compact, 'is-disabled': disabled }">
    <div class="picker-trigger-wrap">
      <button
        type="button"
        class="picker-trigger"
        :aria-label="ariaLabel"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :disabled="disabled"
        :title="selectedPath || placeholder"
        @click="toggle"
        @keydown.down.prevent="openPanel"
      >
        <span class="picker-value" :class="{ 'is-placeholder': !selectedLabel }">
          <span class="picker-name">{{ selectedLabel || placeholder }}</span>
          <span v-if="selectedCode !== null" class="picker-code" dir="ltr">{{ selectedCode }}</span>
        </span>
        <svg class="picker-chevron" :class="{ 'is-open': open }" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3 6 5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button v-if="clearable && modelValue && !disabled" type="button" class="picker-clear" aria-label="پاک کردن دسته‌بندی" @click.stop="clear">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div v-if="open" class="picker-panel" role="listbox" :aria-label="ariaLabel">
      <div class="picker-search">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5" stroke-linecap="round"/></svg>
        <input ref="searchInput" v-model="search" type="search" placeholder="جستجوی نام یا کد دسته‌بندی…" aria-label="جستجوی دسته‌بندی" @keydown.esc.prevent="close">
        <span v-if="searching" class="picker-count" aria-live="polite">{{ totalResults.toLocaleString('fa-IR') }}</span>
      </div>

      <div class="picker-body">
        <p v-if="!categories.length" class="picker-empty">{{ emptyText }}</p>
        <template v-else>
          <button v-if="clearable" type="button" class="picker-all" :class="{ 'is-active': !modelValue }" @click="clear">همه دسته‌بندی‌ها</button>
          <p v-if="!results.length" class="picker-empty">دسته‌بندی‌ای با «{{ search }}» پیدا نشد.</p>
          <CategoryTree
            v-else
            :nodes="results"
            :selected="modelValue"
            :value-key="valueKey"
            :expand-all="searching"
            :auto-expand-roots="false"
            dense
            @select="pick"
          />
        </template>
      </div>
      <p class="picker-hint">با نام، شناسه یا کد سه‌رقمی (۱۰۰ تا ۵۰۱) جستجو کنید.</p>
    </div>
  </div>
</template>

<style scoped>
.category-picker { position: relative; min-width: 0; }
.picker-trigger-wrap { position: relative; display: flex; }
.picker-trigger { display: flex; flex: 1; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 0 12px; border: 1px solid var(--picker-border, #dcddd8); border-radius: 10px; background: #fff; color: var(--picker-ink, #191b1d); font: inherit; font-size: 12px; text-align: start; cursor: pointer; transition: border-color .2s, box-shadow .2s; }
.is-compact .picker-trigger { min-height: 40px; font-size: 11.5px; }
.picker-trigger:hover:not(:disabled) { border-color: #b9bcb5; }
.picker-trigger:focus-visible { outline: 2px solid var(--picker-accent, #c94822); outline-offset: 2px; }
.picker-trigger:disabled { background: #f5f5f1; color: #949a96; cursor: not-allowed; }
.is-open .picker-trigger { border-color: var(--picker-accent, #c94822); box-shadow: 0 0 0 3px rgba(201, 72, 34, .1); }
.picker-value { display: flex; flex: 1; align-items: center; gap: 8px; min-width: 0; }
.picker-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picker-value.is-placeholder .picker-name { color: #979b93; }
.picker-code { flex: none; padding: 2px 7px; border-radius: 999px; background: #eef1f7; color: #475569; font-size: 10px; font-weight: 700; letter-spacing: .3px; }
.picker-clear { position: absolute; inset-inline-end: 34px; inset-block-start: 50%; display: grid; place-items: center; width: 22px; height: 22px; transform: translateY(-50%); border: 0; border-radius: 999px; background: #f0f0ea; color: #7c8077; cursor: pointer; }
.picker-clear:hover { background: #e4e5dd; color: #b3362c; }
.picker-clear svg { width: 12px; height: 12px; }
.picker-chevron { flex: none; width: 14px; height: 14px; color: #8b8f87; transition: transform .18s ease; }
.picker-chevron.is-open { transform: rotate(180deg); }
.picker-panel { position: absolute; z-index: 60; inset-inline: 0; top: calc(100% + 6px); display: flex; flex-direction: column; max-height: min(420px, 65vh); overflow: hidden; border: 1px solid #e1e2db; border-radius: 14px; background: #fff; box-shadow: 0 18px 44px rgba(25, 27, 29, .14); }
.picker-search { display: flex; align-items: center; gap: 7px; margin: 10px 10px 6px; padding: 0 10px; border: 1px solid #e2e3dc; border-radius: 9px; background: #fbfbf8; }
.picker-search:focus-within { border-color: #b9bcb5; background: #fff; }
.picker-search svg { flex: none; width: 15px; height: 15px; color: #8b8f87; }
.picker-search input { flex: 1; min-width: 0; min-height: 36px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 12px; outline: none; }
.picker-search input::-webkit-search-cancel-button { display: none; }
.picker-count { flex: none; padding: 1px 6px; border-radius: 999px; background: #eef0e8; color: #74796d; font-size: 9.5px; }
.picker-body { flex: 1; overflow: auto; padding: 2px 8px 8px; }
.picker-all { display: flex; width: 100%; align-items: center; min-height: 34px; margin-bottom: 2px; padding: 4px 10px; border: 0; border-radius: 8px; background: transparent; color: #5b6057; font: inherit; font-size: 12px; text-align: start; cursor: pointer; }
.picker-all:hover { background: #f6f6f0; }
.picker-all.is-active { background: #fcf0e9; color: var(--picker-accent, #b6411e); font-weight: 700; }
.picker-empty { padding: 18px 12px; color: #8b8f87; font-size: 11.5px; line-height: 1.9; text-align: center; }
.picker-hint { margin: 0; padding: 8px 14px; border-top: 1px solid #f0f0ea; color: #979b93; font-size: 10px; line-height: 1.8; }
</style>

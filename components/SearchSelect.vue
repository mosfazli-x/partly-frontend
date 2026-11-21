<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options: string[]
  placeholder?: string
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const open = ref(false)
const query = ref('')
const active = ref(-1)
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.options.filter(option => !needle || option.toLowerCase().includes(needle)).slice(0, 60)
})
function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  emit('update:modelValue', value)
  open.value = true
  active.value = -1
}
function onFocus() {
  query.value = props.modelValue
  open.value = true
}
function choose(value: string) {
  emit('update:modelValue', value)
  query.value = value
  open.value = false
  active.value = -1
}
function onBlur() {
  // Keep the list alive long enough for a click on an option.
  window.setTimeout(() => { open.value = false; active.value = -1 }, 140)
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault(); open.value = true; active.value = Math.min(active.value + 1, filtered.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault(); active.value = Math.max(active.value - 1, 0)
  } else if (event.key === 'Enter' && open.value && active.value >= 0 && filtered.value[active.value]) {
    event.preventDefault(); choose(filtered.value[active.value]!)
  } else if (event.key === 'Escape') {
    open.value = false; active.value = -1
  }
}
</script>

<template>
  <div class="search-select">
    <input
      :value="modelValue"
      type="text"
      class="market-input"
      autocomplete="off"
      role="combobox"
      :aria-label="ariaLabel || placeholder || 'جستجو و انتخاب'"
      :aria-expanded="open"
      aria-autocomplete="list"
      :placeholder="placeholder || 'جستجو و انتخاب…'"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    >
    <ul v-if="open && filtered.length" class="search-select-list" role="listbox">
      <li v-for="(option, index) in filtered" :key="option">
        <button
          type="button"
          class="search-select-option"
          :class="{ active: index === active, selected: option === modelValue }"
          role="option"
          :aria-selected="option === modelValue"
          @mousedown.prevent="choose(option)"
        >{{ option }}</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-select { position: relative; }
.search-select-list { position: absolute; z-index: 20; inset-inline: 0; top: calc(100% + 4px); max-height: 240px; overflow: auto; margin: 0; padding: 4px; list-style: none; border: 1px solid #e3e4dd; border-radius: 10px; background: #fff; box-shadow: 0 14px 32px rgba(32, 38, 35, .12); }
.search-select-option { display: block; width: 100%; padding: 9px 11px; border: 0; border-radius: 7px; background: none; color: #3c423e; font-size: 12.5px; text-align: start; cursor: pointer; }
.search-select-option:hover, .search-select-option.active { background: #f4f5ef; }
.search-select-option.selected { color: #b6411e; font-weight: 700; }
</style>

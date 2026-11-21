<script setup lang="ts">
type FitmentOption = { id: string; name: string }
const props = defineProps<{
  modelValue: string[]
  options: FitmentOption[]
}>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()
const search = ref('')

const selected = computed(() => props.options.filter(option => props.modelValue.includes(option.id)))
const needle = computed(() => search.value.trim().toLowerCase())
const filtered = computed(() => {
  const value = needle.value
  return value ? props.options.filter(option => option.name.toLowerCase().includes(value)) : props.options
})

function toggle(id: string) {
  const next = new Set(props.modelValue)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  emit('update:modelValue', [...next])
}
function remove(id: string) { emit('update:modelValue', props.modelValue.filter(value => value !== id)) }
function clear() { emit('update:modelValue', []) }
</script>

<template>
  <div class="fitment-picker">
    <div class="fitment-toolbar">
      <input v-model="search" type="search" class="market-input" placeholder="جستجوی خودرو: برند، مدل یا تیپ…" aria-label="جستجوی خودروهای سازگار">
      <button v-if="modelValue.length" type="button" class="fitment-clear" @click="clear">حذف همه</button>
    </div>
    <p class="fitment-count">{{ modelValue.length }} خودرو انتخاب شده است</p>
    <ul v-if="selected.length" class="fitment-selected" aria-label="خودروهای انتخاب‌شده">
      <li v-for="option in selected" :key="option.id">
        <span>{{ option.name }}</span>
        <button type="button" :aria-label="`حذف ${option.name}`" @click="remove(option.id)">✕</button>
      </li>
    </ul>
    <ul class="fitment-options" role="group" aria-label="فهرست خودروهای سازگار">
      <li v-for="option in filtered" :key="option.id">
        <button
          type="button"
          class="fitment-option"
          :class="{ selected: modelValue.includes(option.id) }"
          role="checkbox"
          :aria-checked="modelValue.includes(option.id)"
          @click="toggle(option.id)"
        >
          <span class="fitment-dot" aria-hidden="true"></span>
          <span class="fitment-name">{{ option.name }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!filtered.length" class="fitment-empty">خودرویی با این جستجو پیدا نشد.</p>
  </div>
</template>

<style scoped>
.fitment-picker { border: 1px solid #e3e4dd; border-radius: 12px; padding: 12px; background: #fcfcf8; }
.fitment-toolbar { display: flex; gap: 8px; align-items: center; }
.fitment-toolbar .market-input { flex: 1; min-width: 0; }
.fitment-clear { flex: none; min-height: 38px; padding-inline: 12px; border: 1px solid #e2e3dc; border-radius: 8px; background: #fff; color: #a93a2e; font-size: 11px; cursor: pointer; }
.fitment-count { margin: 8px 0; color: #777c72; font-size: 11px; }
.fitment-selected { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; padding: 0; list-style: none; }
.fitment-selected li { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 999px; background: #fdeee9; color: #a93a2e; font-size: 11px; }
.fitment-selected button { border: 0; background: none; color: inherit; font-size: 11px; cursor: pointer; }
.fitment-options { max-height: 260px; overflow: auto; margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
.fitment-option { display: flex; align-items: center; gap: 9px; width: 100%; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: #fff; color: #3c423e; font-size: 12px; text-align: start; cursor: pointer; }
.fitment-option:hover { border-color: #e3e4dd; }
.fitment-option.selected { border-color: #df592e; background: #fff7f3; color: #a93a2e; }
.fitment-dot { flex: none; width: 15px; height: 15px; border: 1.5px solid #b9bdb2; border-radius: 50%; background: #fff; }
.fitment-option.selected .fitment-dot { border-color: #df592e; box-shadow: inset 0 0 0 3px #df592e; }
.fitment-name { overflow-wrap: anywhere; }
.fitment-empty { margin: 8px 0 0; color: #777c72; font-size: 11px; }
</style>

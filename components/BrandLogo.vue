<script setup lang="ts">
import { getBrandInitials, type CarBrand } from '~/utils/carBrands'

const props = withDefaults(defineProps<{ brand: CarBrand; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }>(), {
  size: 'md',
  decorative: false,
})
const failed = ref(false)
const initials = computed(() => getBrandInitials(props.brand))

// If a logo ever fails to load, a typographic monogram keeps the card intact.
watch(() => props.brand.logo, () => { failed.value = false })
</script>

<template>
  <span class="brand-logo" :class="`brand-logo--${size}`">
    <img
      v-if="brand.logo && !failed"
      :src="brand.logo"
      :alt="decorative ? '' : `نشان ${brand.name}`"
      :aria-hidden="decorative ? 'true' : undefined"
      width="48"
      height="48"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    >
    <span v-else class="brand-logo__monogram" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<style scoped>
.brand-logo {
  display: grid;
  place-items: center;
  flex: none;
  color: #15252d;
}
.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: .82;
  transition: opacity .3s ease, transform .3s ease;
}
.brand-logo__monogram {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid #d9dcda;
  font-weight: 800;
  letter-spacing: .04em;
  color: #4b565b;
  direction: ltr;
}
.brand-logo--sm { width: 26px; height: 26px; }
.brand-logo--sm .brand-logo__monogram { font-size: 8px; }
.brand-logo--md { width: 42px; height: 42px; }
.brand-logo--md .brand-logo__monogram { font-size: 11px; }
.brand-logo--lg { width: clamp(52px, 6vw, 66px); height: clamp(52px, 6vw, 66px); }
.brand-logo--lg .brand-logo__monogram { font-size: 16px; }
@media (prefers-reduced-motion: reduce) {
  .brand-logo img { transition: none; }
}
</style>

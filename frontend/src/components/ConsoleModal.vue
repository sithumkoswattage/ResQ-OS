<template>
  <div class="c-backdrop" @mousedown.self="$emit('close')" @keydown.esc="$emit('close')">
    <form class="c-modal" role="dialog" aria-modal="true" :aria-label="title" @submit.prevent="$emit('submit')">
      <h2>{{ title }}</h2>
      <p v-if="error" class="c-error" role="alert">{{ error }}</p>
      <slot />
      <div class="c-modal-actions">
        <button class="c-btn" type="button" @click="$emit('close')">Cancel</button>
        <button class="c-btn" :class="danger ? 'danger' : 'primary'" type="submit" :disabled="busy">
          {{ busy ? 'Working…' : submitLabel }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  submitLabel: { type: String, default: 'Save' },
  busy: { type: Boolean, default: false },
  danger: { type: Boolean, default: false },
  error: { type: String, default: '' }
})
defineEmits(['close', 'submit'])
</script>

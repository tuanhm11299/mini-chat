<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@mini-chat/shared';
import type { FormSubmitEvent } from '@nuxt/ui';
import { z } from 'zod';

definePageMeta({ layout: 'auth', public: true });
useHead({ title: 'Create account' });

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(DISPLAY_NAME_MAX_LENGTH),
  email: z.email('Enter a valid email'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(128),
});
type Schema = z.output<typeof schema>;

const auth = useAuthStore();
const state = reactive({ displayName: '', email: '', password: '' });
const submitting = ref(false);
const errorMessage = ref('');

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  errorMessage.value = '';
  try {
    await auth.register(event.data.email, event.data.displayName, event.data.password);
    await navigateTo('/chats');
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not create your account');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">Create your account</h1>
      <p class="text-sm text-muted">It takes less than a minute.</p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="displayName" help="This is how others will see you.">
        <UInput v-model="state.displayName" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

      <UButton type="submit" block :loading="submitting">Create account</UButton>
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        Already have an account?
        <ULink to="/login" class="font-medium text-primary">Sign in</ULink>
      </p>
    </template>
  </UCard>
</template>

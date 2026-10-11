<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { z } from 'zod';

definePageMeta({ layout: 'auth', public: true });
useHead({ title: 'Sign in' });

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Schema = z.output<typeof schema>;

const auth = useAuthStore();
const redirectTo = useSafeRedirect();
const state = reactive({ email: '', password: '' });
const submitting = ref(false);
const errorMessage = ref('');

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  errorMessage.value = '';
  try {
    await auth.login(event.data.email, event.data.password);
    await navigateTo(redirectTo.value);
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not sign in');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">Welcome back</h1>
      <p class="text-sm text-muted">Sign in to continue chatting.</p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UAlert v-if="errorMessage" color="error" variant="subtle" :title="errorMessage" />

      <UButton type="submit" block :loading="submitting">Sign in</UButton>
    </UForm>

    <template #footer>
      <p class="text-center text-sm text-muted">
        New here?
        <ULink to="/register" class="font-medium text-primary">Create an account</ULink>
      </p>
    </template>
  </UCard>
</template>

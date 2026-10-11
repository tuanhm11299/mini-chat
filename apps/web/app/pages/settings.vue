<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH, type CurrentUserDto } from '@mini-chat/shared';
import type { FormSubmitEvent } from '@nuxt/ui';
import { z } from 'zod';

useHead({ title: 'Settings' });

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(DISPLAY_NAME_MAX_LENGTH),
  avatarUrl: z.union([
    z.url({ protocol: /^https$/, message: 'Use an https:// image URL' }),
    z.literal(''),
  ]),
});
type Schema = z.output<typeof schema>;

const auth = useAuthStore();
const api = useApi();
const toast = useToast();

const state = reactive({
  displayName: auth.user?.displayName ?? '',
  avatarUrl: auth.user?.avatarUrl ?? '',
});
const saving = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true;
  try {
    const user = await api<CurrentUserDto>('/users/me', {
      method: 'PATCH',
      body: { displayName: event.data.displayName, avatarUrl: event.data.avatarUrl || null },
    });
    auth.setUser(user);
    toast.add({ title: 'Profile saved', color: 'success' });
  } catch (error) {
    toast.add({ title: getErrorMessage(error, 'Could not save your profile'), color: 'error' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header
      class="flex shrink-0 items-center gap-2 border-b border-default px-2 pt-[env(safe-area-inset-top)]"
    >
      <UButton
        to="/chats"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back"
      />
      <h1 class="py-3 text-lg font-semibold">Settings</h1>
    </header>

    <div class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-lg space-y-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <InstallAppCard />

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UserAvatar
                :name="state.displayName || '?'"
                :src="state.avatarUrl || null"
                size="xl"
              />
              <div class="min-w-0">
                <p class="truncate font-semibold">{{ auth.user?.displayName }}</p>
                <p class="truncate text-sm text-muted">{{ auth.user?.email }}</p>
              </div>
            </div>
          </template>

          <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
            <UFormField label="Name" name="displayName">
              <UInput v-model="state.displayName" class="w-full" />
            </UFormField>
            <UFormField
              label="Avatar URL"
              name="avatarUrl"
              help="Optional. Leave empty to show your initials."
            >
              <UInput v-model="state.avatarUrl" placeholder="https://…" class="w-full" />
            </UFormField>
            <UButton type="submit" :loading="saving">Save profile</UButton>
          </UForm>
        </UCard>

        <UCard>
          <div class="flex items-center justify-between gap-4">
            <span class="text-sm font-medium">Appearance</span>
            <UColorModeSelect class="w-40" />
          </div>
        </UCard>

        <UButton
          color="error"
          variant="subtle"
          icon="i-lucide-log-out"
          block
          @click="auth.logout()"
        >
          Sign out
        </UButton>
      </div>
    </div>
  </div>
</template>

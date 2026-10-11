<script setup lang="ts">
import { GROUP_TITLE_MAX_LENGTH, type UserDto } from '@mini-chat/shared';

const open = defineModel<boolean>('open', { required: true });

const api = useApi();
const conversations = useConversationsStore();
const toast = useToast();

const isGroup = ref(false);
const groupTitle = ref('');
const search = ref('');
const debouncedSearch = refDebounced(search, 300);
const results = ref<UserDto[]>([]);
const searching = ref(false);
const selected = ref<UserDto[]>([]);
const creating = ref(false);

watch(debouncedSearch, async (term) => {
  if (!term.trim()) {
    results.value = [];
    return;
  }
  searching.value = true;
  try {
    results.value = await api<UserDto[]>('/users', { query: { search: term.trim() } });
  } catch (error) {
    toast.add({ title: getErrorMessage(error), color: 'error' });
  } finally {
    searching.value = false;
  }
});

// Start fresh every time the dialog opens.
watch(open, (isOpen) => {
  if (!isOpen) return;
  isGroup.value = false;
  groupTitle.value = '';
  search.value = '';
  results.value = [];
  selected.value = [];
});

const isSelected = (user: UserDto) => selected.value.some((u) => u.id === user.id);

function toggle(user: UserDto) {
  selected.value = isSelected(user)
    ? selected.value.filter((u) => u.id !== user.id)
    : [...selected.value, user];
}

async function create(action: () => Promise<{ id: string }>) {
  creating.value = true;
  try {
    const conversation = await action();
    open.value = false;
    await navigateTo(`/chats/${conversation.id}`);
  } catch (error) {
    toast.add({ title: getErrorMessage(error, 'Could not start the chat'), color: 'error' });
  } finally {
    creating.value = false;
  }
}

function onPick(user: UserDto) {
  if (isGroup.value) toggle(user);
  else void create(() => conversations.startDirect(user.id));
}

function createGroup() {
  void create(() =>
    conversations.createGroup(
      groupTitle.value.trim(),
      selected.value.map((u) => u.id),
    ),
  );
}
</script>

<template>
  <UModal v-model:open="open" title="New chat" :ui="{ body: 'space-y-4' }">
    <template #body>
      <USwitch v-model="isGroup" label="Create a group" />

      <UInput
        v-if="isGroup"
        v-model="groupTitle"
        placeholder="Group name"
        :maxlength="GROUP_TITLE_MAX_LENGTH"
        class="w-full"
      />

      <div v-if="isGroup && selected.length" class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="user in selected"
          :key="user.id"
          :label="user.displayName"
          color="neutral"
          variant="subtle"
          trailing-icon="i-lucide-x"
          class="cursor-pointer"
          @click="toggle(user)"
        />
      </div>

      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search by name or email"
        :loading="searching"
        autofocus
        class="w-full"
      />

      <ul class="max-h-72 space-y-0.5 overflow-y-auto">
        <li v-for="user in results" :key="user.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-elevated disabled:opacity-50"
            :disabled="creating"
            @click="onPick(user)"
          >
            <UserAvatar :name="user.displayName" :src="user.avatarUrl" />
            <span class="flex-1 truncate">{{ user.displayName }}</span>
            <UIcon
              v-if="isGroup"
              :name="isSelected(user) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
              class="size-5"
              :class="isSelected(user) ? 'text-primary' : 'text-dimmed'"
            />
          </button>
        </li>
        <li
          v-if="debouncedSearch && !searching && results.length === 0"
          class="py-6 text-center text-sm text-muted"
        >
          No one found for “{{ debouncedSearch }}”.
        </li>
      </ul>
    </template>

    <template v-if="isGroup" #footer>
      <UButton
        block
        :loading="creating"
        :disabled="!groupTitle.trim() || selected.length === 0"
        @click="createGroup"
      >
        Create group ({{ selected.length + 1 }} people)
      </UButton>
    </template>
  </UModal>
</template>

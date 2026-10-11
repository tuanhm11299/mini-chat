<template>
  <UApp :toaster="{ position: 'top-center' }">
    <!-- Adds <link rel="manifest">, which makes the app installable. -->
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppStatusBanner />
  </UApp>
</template>

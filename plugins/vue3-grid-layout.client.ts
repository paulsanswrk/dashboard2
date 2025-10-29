export default defineNuxtPlugin(async (nuxtApp) => {
  const mod = await import('vue3-grid-layout')
  nuxtApp.vueApp.component('GridLayout', (mod as any).GridLayout)
  nuxtApp.vueApp.component('GridItem', (mod as any).GridItem)
})



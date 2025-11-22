/**
 * Theme management composable
 * Provides reactive theme state and toggle functionality
 */
export const useTheme = () => {
  const colorMode = useColorMode()

  // Reactive theme state
  const isDark = computed(() => colorMode.value === 'dark')
  const isLight = computed(() => colorMode.value === 'light')
  const currentTheme = computed(() => colorMode.value)

  // Theme toggle function
  const toggleTheme = () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }

  // Set specific theme
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    colorMode.preference = theme
  }

  // Get theme icon based on current theme
  const themeIcon = computed(() => {
      if (isDark.value) return 'i-heroicons-sun'
      return 'i-heroicons-moon'
  })

  // Get theme label
  const themeLabel = computed(() => {
    if (isDark.value) return 'Light Mode'
    return 'Dark Mode'
  })

  return {
    isDark,
    isLight,
    currentTheme,
    toggleTheme,
    setTheme,
    themeIcon,
    themeLabel
  }
}

// Composable for handling reCAPTCHA v3 with nuxt-recaptcha module
export const useRecaptcha = () => {
    const {$recaptcha} = useNuxtApp()

    // Execute reCAPTCHA with action and return the token
    const executeRecaptcha = async (action: string = 'submit'): Promise<string | null> => {
        try {
            if (!$recaptcha) {
                console.warn('reCAPTCHA not available')
                return null
            }

            const token = await $recaptcha.execute(action)
            return token
        } catch (error) {
            console.error('reCAPTCHA execution failed:', error)
            return null
        }
    }

    // Alias for backwards compatibility
    const execute = executeRecaptcha

    // Get reCAPTCHA instance
    const getRecaptchaInstance = () => {
        return $recaptcha
    }

    return {
        executeRecaptcha,
        execute,
        getRecaptchaInstance
    }
}


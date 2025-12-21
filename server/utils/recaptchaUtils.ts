import {createError} from 'h3'

// Verify reCAPTCHA token server-side
export const verifyRecaptcha = async (token: string, action?: string): Promise<boolean> => {
    const config = useRuntimeConfig()

    if (!config.recaptchaSecretKey) {
        console.warn('reCAPTCHA secret key not configured')
        return true // Allow in development if not configured
    }

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: 'reCAPTCHA token is required'
        })
    }

    try {
        const response = await $fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            body: new URLSearchParams({
                secret: config.recaptchaSecretKey,
                response: token
            })
        })

        if (!response.success) {
            console.error('reCAPTCHA verification failed:', response['error-codes'])
            return false
        }

        // Check score for v3 (should be > 0.5 typically)
        if (response.score !== undefined && response.score < 0.5) {
            console.warn('reCAPTCHA score too low:', response.score)
            return false
        }

        // Check action if provided
        if (action && response.action !== action) {
            console.warn('reCAPTCHA action mismatch:', response.action, 'expected:', action)
            return false
        }

        return true
    } catch (error) {
        console.error('reCAPTCHA verification error:', error)
        return false
    }
}

// Middleware function to verify reCAPTCHA for API routes
export const requireRecaptcha = async (token: string, action?: string) => {
    const isValid = await verifyRecaptcha(token, action)

    if (!isValid) {
        throw createError({
            statusCode: 400,
            statusMessage: 'reCAPTCHA verification failed. Please try again.'
        })
    }
}








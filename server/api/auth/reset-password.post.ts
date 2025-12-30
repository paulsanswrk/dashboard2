import {supabaseUser} from '../supabase'
import {requireRecaptcha} from '../../utils/recaptchaUtils'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { email, recaptchaToken } = body

        if (!email) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email is required'
            })
        }

        // Verify reCAPTCHA if token provided
        if (recaptchaToken) {
            await requireRecaptcha(recaptchaToken, 'reset_password')
        }

        // Construct callback URL
        const origin = getRequestURL(event).origin
        const callbackUrl = `${origin}/auth/callback`

        // Send password reset email via Supabase Auth
        const { error } = await supabaseUser.auth.resetPasswordForEmail(email, {
            redirectTo: callbackUrl
        })

        if (error) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Failed to send password reset email'
            })
        }

        return {
            success: true,
            message: 'Password reset email sent! Check your email for instructions.'
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to send password reset email'
        })
    }
})









import {supabaseUser} from '../supabase'
import {requireRecaptcha} from '../../utils/recaptchaUtils'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const {email, recaptchaToken} = body

        console.log('🔑 Password reset request for email:', email)

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

        // Send password reset email via Supabase Auth
        const {error} = await supabaseUser.auth.resetPasswordForEmail(email, {
            redirectTo: `${getRequestURL(event).origin}/auth/callback`
        })

        if (error) {
            console.log('❌ Password reset error:', error.message)
            throw createError({
                statusCode: 400,
                statusMessage: 'Failed to send password reset email'
            })
        }

        console.log('✅ Password reset email sent successfully')

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








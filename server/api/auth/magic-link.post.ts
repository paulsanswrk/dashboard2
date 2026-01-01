import {supabaseUser} from '../supabase'
import {requireRecaptcha} from '../../utils/recaptchaUtils'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const {email, recaptchaToken} = body

        console.log('🔗 Magic link request for email:', email)

        if (!email) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email is required'
            })
        }

        // Verify reCAPTCHA if token provided
        if (recaptchaToken) {
            await requireRecaptcha(recaptchaToken, 'magic_link')
        }

        // Send magic link via Supabase Auth
        const {data, error: magicLinkError} = await supabaseUser.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${getRequestURL(event).origin}/auth/callback`
            }
        })

        if (magicLinkError) {
            console.log('❌ Magic link error:', magicLinkError.message)
            throw createError({
                statusCode: 400,
                statusMessage: 'Failed to send magic link'
            })
        }

        console.log('✅ Magic link sent successfully')

        return {
            success: true,
            message: 'Magic link sent! Please check your email and click the link to sign in.'
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to send magic link'
        })
    }
})













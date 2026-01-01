import {supabaseUser} from '../supabase'
import {requireRecaptcha} from '../../utils/recaptchaUtils'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const {email, firstName, lastName, role = 'EDITOR', organizationName, recaptchaToken} = body

        console.log('🔗 Magic link signup request for email:', email)

        if (!email || !firstName || !lastName) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email, firstName, and lastName are required'
            })
        }

        // Verify reCAPTCHA if token provided
        if (recaptchaToken) {
            await requireRecaptcha(recaptchaToken, 'signup')
        }

        // Send magic link via Supabase Auth with signup data
        const {data, error: magicLinkError} = await supabaseUser.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${getRequestURL(event).origin}/auth/callback`,
                data: {
                    firstName,
                    lastName,
                    role,
                    organizationName,
                    isSignUp: true
                }
            }
        })

        if (magicLinkError) {
            console.log('❌ Magic link signup error:', magicLinkError.message)
            throw createError({
                statusCode: 400,
                statusMessage: 'Failed to send magic link'
            })
        }

        console.log('✅ Magic link sent successfully for signup')

        return {
            success: true,
            message: 'Magic link sent! Please check your email and click the link to complete your registration.'
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to send magic link'
        })
    }
})













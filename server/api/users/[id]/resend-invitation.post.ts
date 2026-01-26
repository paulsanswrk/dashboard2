import { createClient } from '@supabase/supabase-js'
import { generateMagicLink, generateUserInvitationWithMagicLinkTemplate, sendEmail } from '../../../utils/emailUtils'

export default defineEventHandler(async (event) => {
    try {
        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            setResponseStatus(event, 500)
            return {
                success: false,
                error: 'Missing Supabase configuration'
            }
        }

        // Create Supabase client with service role (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get the authorization header
        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            setResponseStatus(event, 401)
            return {
                success: false,
                error: 'Authorization header required'
            }
        }

        // Extract token from "Bearer <token>"
        const token = authorization.replace('Bearer ', '')

        // Verify the token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            setResponseStatus(event, 401)
            return {
                success: false,
                error: 'Invalid or expired token'
            }
        }

        const currentUserId = user.id
        const targetUserId = getRouterParam(event, 'id')

        if (!targetUserId) {
            setResponseStatus(event, 400)
            return {
                success: false,
                error: 'User ID is required'
            }
        }

        // Get current user's profile to check permissions
        const { data: currentProfile, error: currentProfileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('user_id', currentUserId)
            .single()

        if (currentProfileError) {
            setResponseStatus(event, 404)
            return {
                success: false,
                error: 'User profile not found'
            }
        }

        // Get target user's profile
        const { data: targetProfile, error: targetProfileError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, role, organization_id')
            .eq('user_id', targetUserId)
            .single()

        if (targetProfileError) {
            setResponseStatus(event, 404)
            return {
                success: false,
                error: 'Target user not found'
            }
        }

        // Get target user's email from auth.users
        const { data: targetAuthUser, error: targetAuthError } = await supabase.auth.admin.getUserById(targetUserId)

        if (targetAuthError || !targetAuthUser.user) {
            setResponseStatus(event, 404)
            return {
                success: false,
                error: 'Target user email not found'
            }
        }

        const targetEmail = targetAuthUser.user.email

        if (!targetEmail) {
            setResponseStatus(event, 400)
            return {
                success: false,
                error: 'Target user has no email address'
            }
        }

        // Permission checks
        const isSuperAdmin = currentProfile.role === 'SUPERADMIN'
        const isAdmin = currentProfile.role === 'ADMIN'
        const isSameOrganization = currentProfile.organization_id === targetProfile.organization_id

        // SUPERADMIN can resend for any user
        // ADMIN can resend for users in any organization
        // Others can only resend for users in their own organization
        if (!isSuperAdmin && !isAdmin && !isSameOrganization) {
            setResponseStatus(event, 403)
            return {
                success: false,
                error: 'Insufficient permissions to resend invitation for this user'
            }
        }

        // Get organization name if available
        let organizationName = undefined
        if (targetProfile.organization_id) {
            const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', targetProfile.organization_id)
                .single()

            if (org) {
                organizationName = org.name
            }
        }

        // Generate magic link and send invitation email
        const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : 'http://localhost:3000'

        const confirmationUrl = generateMagicLink(targetUserId, targetEmail, siteUrl)
        const emailTemplate = generateUserInvitationWithMagicLinkTemplate({
            email: targetEmail,
            firstName: targetProfile.first_name || undefined,
            lastName: targetProfile.last_name || undefined,
            role: targetProfile.role,
            organizationName,
            confirmationUrl,
            siteUrl
        })

        const emailSent = await sendEmail(targetEmail, emailTemplate)

        if (!emailSent) {
            setResponseStatus(event, 500)
            return {
                success: false,
                error: 'Failed to send invitation email'
            }
        }

        return {
            success: true,
            message: `Invitation email resent successfully to ${targetEmail}`
        }

    } catch (error: any) {
        console.error('Resend invitation error:', error)

        setResponseStatus(event, 500)
        return {
            success: false,
            error: error.message || 'Internal server error'
        }
    }
})

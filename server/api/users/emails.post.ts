import {defineEventHandler} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    const body = await readBody(event)
    const {userIds} = body

    if (!userIds || !Array.isArray(userIds)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'userIds array is required'
        })
    }

    try {
        const {data: users, error} = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            throw error
        }

        // Filter users to only those requested and return their emails
        const userEmails = users.users
            .filter(user => userIds.includes(user.id))
            .map(user => ({
                id: user.id,
                email: user.email || user.id
            }))

        return userEmails
    } catch (error) {
        console.error('Failed to fetch user emails:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch user emails'
        })
    }
})

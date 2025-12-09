import {createError} from 'h3'
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../api/supabase'

export type AuthContext = {
    userId: string
    role: 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER'
    organizationId: string | null
}

type AccessOptions = {
    requireWrite?: boolean
    columns?: string
}

export class AuthHelper {
    static async requireAuthContext(event: any): Promise<AuthContext> {
        const user = await serverSupabaseUser(event)
        if (!user) {
            throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
        }

        const {data: profile, error} = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('user_id', user.id)
            .single()

        if (error || !profile) {
            throw createError({statusCode: 403, statusMessage: 'Profile not found'})
        }

        return {
            userId: user.id,
            role: profile.role,
            organizationId: profile.organization_id
        }
    }

    private static assertOrgAccess(ctx: AuthContext, connectionOrgId: string | null, requireWrite: boolean) {
        if (ctx.role === 'SUPERADMIN') return
        if (!connectionOrgId || !ctx.organizationId || connectionOrgId !== ctx.organizationId) {
            throw createError({statusCode: 403, statusMessage: 'Access denied to connection'})
        }
        if (requireWrite && (ctx.role === 'VIEWER')) {
            throw createError({statusCode: 403, statusMessage: 'Write access requires ADMIN or EDITOR'})
        }
    }

    static async requireConnectionAccess<T extends object = any>(
        event: any,
        connectionId: number,
        options: AccessOptions = {}
    ): Promise<T & { organization_id: string | null }> {
        const ctx = await this.requireAuthContext(event)
        const {columns = 'id, organization_id, owner_id, schema_json, auto_join_info'} = options

        const {data, error} = await supabaseAdmin
            .from('data_connections')
            .select(columns)
            .eq('id', connectionId)
            .single()

        if (error || !data) {
            throw createError({statusCode: 404, statusMessage: 'Connection not found'})
        }

        this.assertOrgAccess(ctx, (data as any).organization_id ?? null, !!options.requireWrite)
        return data as any
    }
}



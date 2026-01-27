/**
 * Tenant Cleanup CLI Script (Non-Interactive, One-Shot)
 * 
 * Deletes a tenant and all related objects without prompts.
 * 
 * Configuration: Edit TENANT_ID below
 * 
 * Usage (Terminal):
 *   npx tsx scripts/cleanup-tenant.ts
 * 
 * Usage (WebStorm):
 *   Right-click > Run 'cleanup-tenant.ts'
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

// Load environment variables from .env file
const envPath = resolve(process.cwd(), '.env')
config({ path: envPath })

// Debug: Check if variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Failed to load environment variables from .env')
    console.error('Expected .env location:', envPath)
    console.error('Current working directory:', process.cwd())
    console.error('\nPlease ensure:')
    console.error('1. The .env file exists at:', envPath)
    console.error('2. It contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nAlternatively, export them manually:')
    console.error('export SUPABASE_URL="https://bnhhjzcitgaczpojzkxd.supabase.co"')
    console.error('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
    process.exit(1)
}

// ============================================
// CONFIGURATION - EDIT THIS
// ============================================
const TENANT_ID = '22222222-2222-2222-2222-222222222222' // <-- CHANGE ME
const UNLINK_ORGANIZATIONS = true // true = unlink, false = delete organizations
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface CleanupResult {
    success: boolean
    dry_run: boolean
    tenant_id: string
    tenant_short_name?: string
    deleted?: {
        organizations_affected: number
        data_connections: number
        charts: number
        cache_entries: number
        chart_dependencies: number
        views: number
        column_access_rows: number
        push_log_rows: number
        schema: string
        role: string
    }
    warnings?: string[]
    action_planned?: string
    action_taken?: string
    error?: string
}

async function callCleanupFunction(
    tenantId: string,
    unlinkOrganizations: boolean,
    dryRun: boolean
): Promise<CleanupResult> {
    const { data, error } = await supabase.rpc('delete_tenant_completely', {
        p_tenant_id: tenantId,
        p_unlink_organizations: unlinkOrganizations,
        p_delete_optiqoflow_data: false, // Always false for safety
        p_dry_run: dryRun
    })

    if (error) {
        throw new Error(`Database error: ${error.message}`)
    }

    return data as CleanupResult
}

function printResult(result: CleanupResult) {
    console.log('\n' + '='.repeat(60))

    if (!result.success) {
        console.log('❌ FAILED')
        console.log('Error:', result.error)
        return
    }

    if (result.dry_run) {
        console.log('🔍 DRY RUN PREVIEW')
    } else {
        console.log('✅ DELETION COMPLETED')
    }

    console.log('='.repeat(60))
    console.log(`Tenant ID: ${result.tenant_id}`)
    console.log(`Tenant Short Name: ${result.tenant_short_name}`)
    console.log()

    if (result.deleted) {
        console.log('Objects affected:')
        console.log(`  Organizations:        ${result.deleted.organizations_affected}`)
        console.log(`  Data Connections:     ${result.deleted.data_connections}`)
        console.log(`  Charts:               ${result.deleted.charts}`)
        console.log(`  Cache Entries:        ${result.deleted.cache_entries}`)
        console.log(`  Chart Dependencies:   ${result.deleted.chart_dependencies}`)
        console.log(`  Views:                ${result.deleted.views}`)
        console.log(`  Column Access Rows:   ${result.deleted.column_access_rows}`)
        console.log(`  Push Log Rows:        ${result.deleted.push_log_rows}`)
        console.log(`  Schema:               ${result.deleted.schema}`)
        console.log(`  Role:                 ${result.deleted.role}`)
    }

    console.log()

    if (result.warnings && result.warnings.length > 0) {
        console.log('⚠️  Warnings:')
        result.warnings.forEach(w => console.log(`  - ${w}`))
        console.log()
    }

    if (result.action_planned) {
        console.log(`Action: ${result.action_planned}`)
    } else if (result.action_taken) {
        console.log(`Action: ${result.action_taken}`)
    }

    console.log('='.repeat(60))
}

async function main() {
    try {
        console.log('🗑️  Tenant Cleanup Script (One-Shot)')
        console.log('='.repeat(60))
        console.log(`Tenant ID: ${TENANT_ID}`)
        console.log(`Mode: ${UNLINK_ORGANIZATIONS ? 'UNLINK' : 'DELETE'} organizations`)
        console.log()

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(TENANT_ID)) {
            console.error('❌ Error: Invalid tenant ID format (must be UUID)')
            console.error('Edit the TENANT_ID constant at the top of this script.')
            process.exit(1)
        }

        // Step 1: Dry run preview
        console.log('Step 1: Analyzing tenant objects...')
        const dryRunResult = await callCleanupFunction(TENANT_ID, UNLINK_ORGANIZATIONS, true)
        printResult(dryRunResult)

        if (!dryRunResult.success) {
            console.error('\n❌ Dry-run failed. Cannot proceed.')
            process.exit(1)
        }

        console.log('\n⚠️  Proceeding with deletion in 3 seconds...')
        console.log('Press Ctrl+C to cancel.')
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Step 2: Execute deletion
        console.log('\n🗑️  Executing deletion...')
        const result = await callCleanupFunction(TENANT_ID, UNLINK_ORGANIZATIONS, false)
        printResult(result)

        if (result.success) {
            console.log('\n✅ Tenant cleanup completed successfully!')
            process.exit(0)
        } else {
            console.log('\n❌ Tenant cleanup failed!')
            process.exit(1)
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message)
        process.exit(1)
    }
}

main()

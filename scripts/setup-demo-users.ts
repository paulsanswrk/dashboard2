import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function setupDemoData() {
    console.log('--- Starting Demo Setup ---')

    // 1. Visera (IoT) Setup
    const viseraTenantId = 'c5b0b1bc-d54a-46f5-b79f-538a7328d9f4'
    console.log(`\nTriggering Sync for Visera (${viseraTenantId})...`)

    // Actually we need to hit the api endpoint for sync because it creates views etc.
    // We can do this via an authenticated fetch if we want, or just let the script do it via a direct call?
    // Since we are running outside Nuxt, we can hit localhost:3000/api/optiqoflow-sync/run-demo-sync
    // But wait! run-demo-sync requires an authenticated SUPERADMIN session.
    // Creating users directly in Supabase is easier here.

    // Let's create Organizations first
    const viseraOrgId = randomUUID()
    await supabase.from('organizations').upsert({
        id: viseraOrgId,
        name: 'Visera Demo',
        tenant_id: viseraTenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    })
    console.log('Created Visera Organization:', viseraOrgId)

    const puhastusTenantId = 'bf8bed36-b204-4d11-8f7e-12b5125d07d0'
    const puhastusOrgId = randomUUID()
    await supabase.from('organizations').upsert({
        id: puhastusOrgId,
        name: 'Puhastusekpert Demo',
        tenant_id: puhastusTenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    })
    console.log('Created Puhastusekpert Organization:', puhastusOrgId)

    // Demo users
    console.log('\nCreating Demo Users...')

    // Visera User
    const { data: viseraUser, error: viseraError } = await supabase.auth.admin.createUser({
        email: 'demo@visera.test',
        password: 'DemoPass123!',
        email_confirm: true,
        user_metadata: {
            first_name: 'Visera',
            last_name: 'Demo',
            has_password: true
        }
    })
    if (viseraError && viseraError.message !== 'User already registered') console.error('Visera user error:', viseraError)
    else if (viseraUser?.user) {
        console.log('Visera user created:', viseraUser.user.id)
        await supabase.from('profiles').upsert({
            user_id: viseraUser.user.id,
            first_name: 'Visera',
            last_name: 'Demo',
            email: 'demo@visera.test',
            role: 'EDITOR',
            organization_id: viseraOrgId
        })
    }

    // Puhastus User
    const { data: puhastusUser, error: puhastusError } = await supabase.auth.admin.createUser({
        email: 'demo@puhastus.test',
        password: 'DemoPass123!',
        email_confirm: true,
        user_metadata: {
            first_name: 'Puhastus',
            last_name: 'Demo',
            has_password: true
        }
    })

    if (puhastusError && puhastusError.message !== 'User already registered') console.error('Puhastus user error:', puhastusError)
    else if (puhastusUser?.user) {
        console.log('Puhastus user created:', puhastusUser.user.id)
        await supabase.from('profiles').upsert({
            user_id: puhastusUser.user.id,
            first_name: 'Puhastus',
            last_name: 'Demo',
            email: 'demo@puhastus.test',
            role: 'EDITOR',
            organization_id: puhastusOrgId
        })
    }

    console.log('\n--- Setup Complete ---')
    console.log('NOTE: You still need to run the Sync as a SUPERADMIN via the UI to generate the views if they don\'t exist.')
}

setupDemoData().catch(console.error)

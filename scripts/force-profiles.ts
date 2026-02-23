import { createClient } from '@supabase/supabase-js'
import { pgClient } from '../lib/db'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function run() {
    const { data: users } = await supabase.auth.admin.listUsers()

    // Get Orgs
    const viseraOrg = (await pgClient.unsafe(`SELECT id FROM public.organizations WHERE name = 'Visera Demo' LIMIT 1`))[0]?.id
    const puhastusOrg = (await pgClient.unsafe(`SELECT id FROM public.organizations WHERE name = 'Puhastusekpert Demo' LIMIT 1`))[0]?.id

    for (const u of users!.users) {
        if (u.email === 'demo@visera.test') {
            console.log('Inserting Visera Profile...')
            try {
                await pgClient.unsafe(`
                    INSERT INTO public.profiles (id, user_id, email, first_name, last_name, role, organization_id, created_at, updated_at)
                    VALUES ($1, $1, $2, 'Visera', 'Demo', 'SUPERADMIN', $3, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET role = 'SUPERADMIN'
                `, [u.id, u.email, viseraOrg])
                console.log('Success Visera')
            } catch (e) {
                console.error('Visera Error:', e)
            }
        }
        if (u.email === 'demo@puhastus.test') {
            console.log('Inserting Puhastus Profile...')
            try {
                await pgClient.unsafe(`
                    INSERT INTO public.profiles (id, user_id, email, first_name, last_name, role, organization_id, created_at, updated_at)
                    VALUES ($1, $1, $2, 'Puhastus', 'Demo', 'SUPERADMIN', $3, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET role = 'SUPERADMIN'
                `, [u.id, u.email, puhastusOrg])
                console.log('Success Puhastus')
            } catch (e) {
                console.error('Puhastus Error:', e)
            }
        }
    }
}
run().then(() => process.exit(0))

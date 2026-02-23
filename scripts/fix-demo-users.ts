import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function fixDemoUsers() {
    console.log('Fetching users...')
    const { data: users, error } = await supabase.auth.admin.listUsers()
    if (error) throw error

    const viseraUser = users.users.find(u => u.email === 'demo@visera.test')
    const puhastusUser = users.users.find(u => u.email === 'demo@puhastus.test')

    if (viseraUser) {
        console.log('Fixing Visera profile for ID:', viseraUser.id)
        await supabase.from('profiles').upsert({
            user_id: viseraUser.id,
            first_name: 'Visera',
            last_name: 'Demo',
            role: 'SUPERADMIN',
            email: 'demo@visera.test'
        })
    } else {
        console.log('Visera user not found in Auth!')
    }

    if (puhastusUser) {
        console.log('Fixing Puhastus profile for ID:', puhastusUser.id)
        await supabase.from('profiles').upsert({
            user_id: puhastusUser.id,
            first_name: 'Puhastus',
            last_name: 'Demo',
            role: 'SUPERADMIN',
            email: 'demo@puhastus.test'
        })
    } else {
        console.log('Puhastus user not found in Auth!')
    }

    console.log('Done.')
}

fixDemoUsers().catch(console.error)

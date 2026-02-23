import { pgClient } from '../lib/db'

async function run() {
    try {
        console.log("Fixing missing profiles by copying from auth.users...")

        await pgClient.unsafe(`
            INSERT INTO public.profiles (id, user_id, email, first_name, last_name, role, organization_id, created_at, updated_at)
            SELECT 
                u.id, 
                u.id, 
                u.email, 
                CASE 
                    WHEN u.email = 'demo@visera.test' THEN 'Visera'
                    ELSE 'Puhastus'
                END,
                'Demo',
                'SUPERADMIN',
                o.id,
                NOW(),
                NOW()
            FROM auth.users u
            LEFT JOIN public.organizations o ON 
                (u.email = 'demo@visera.test' AND o.name = 'Visera Demo') OR
                (u.email = 'demo@puhastus.test' AND o.name = 'Puhastusekpert Demo')
            WHERE u.email IN ('demo@visera.test', 'demo@puhastus.test')
            ON CONFLICT (id) DO UPDATE SET role = 'SUPERADMIN'
        `)
        console.log("Profiles synced and granted SUPERADMIN.")
    } catch (e) {
        console.error(e)
    }
}
run().then(() => process.exit(0))

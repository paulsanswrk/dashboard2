import { pgClient } from '../lib/db'

async function run() {
    console.log('Granting SUPERADMIN to Demo Users...')
    try {
        await pgClient.unsafe(`UPDATE public.profiles SET role = 'SUPERADMIN' WHERE first_name IN ('Visera', 'Puhastus')`)
        console.log('Granted SUPERADMIN successfully.')
    } catch (e) {
        console.error('Error:', e)
    }
}
run()

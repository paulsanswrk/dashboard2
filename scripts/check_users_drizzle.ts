import { pgClient } from '../lib/db'

async function run() {
    try {
        console.log("Auth Users:")
        const authUsers = await pgClient.unsafe(`SELECT id, email FROM auth.users WHERE email LIKE '%demo%'`)
        console.table(authUsers)

        console.log("Profiles:")
        const profiles = await pgClient.unsafe(`SELECT id, email, role FROM public.profiles WHERE email LIKE '%demo%'`)
        console.table(profiles)
    } catch (e) {
        console.error(e)
    }
}
run().then(() => process.exit(0))

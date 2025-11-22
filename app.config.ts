export default defineAppConfig({
    ui: {
        button: {
            variant: {
                solid: 'bg-{color}-500 hover:bg-{color}-600 text-white shadow-sm',
                outline: 'border border-{color}-500 text-{color}-500 hover:bg-{color}-500 hover:text-white shadow-sm',
                soft: 'bg-{color}-50 text-{color}-700 hover:bg-{color}-100 shadow-sm',
                ghost: 'text-{color}-500 hover:bg-{color}-50 hover:text-{color}-600',
                link: 'text-{color}-500 hover:text-{color}-600 underline-offset-4 hover:underline'
            }
        }
    }
})

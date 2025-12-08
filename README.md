# Optiqo Dashboard - Nuxt 4 Application

A comprehensive business intelligence and data visualization platform built with Nuxt 4, providing tools for connecting data sources, creating interactive dashboards, and sharing reports.

## Features

### Core Functionality
- **Dashboard Overview**: Account metrics, activity levels, and quick actions
- **Data Sources Management**: Connect to databases and flat files
- **Integration Wizard**: Multi-step process for adding new data sources
- **Analysis Tools**: Interactive chart creation and data visualization
- **Dashboard Creation**: Build and manage custom dashboards
- **User Management**: Admin, Editor, and Viewer role management
- **Viewer Management**: External and internal viewer access control
- **Sharing & Reports**: Dashboard sharing and automated report generation

### Technical Features
- Built with Nuxt 4 and Vue 3
- Nuxt UI component library for consistent design
- Tailwind CSS for styling
- Heroicons for iconography
- Responsive design
- TypeScript support ready

## Project Structure

```
optiqo-dashboard/
├── assets/
│   └── css/
│       └── main.css              # Global styles and custom CSS
├── components/
│   ├── AppLayout.vue             # Main application layout
│   ├── ShareDashboardModal.vue   # Dashboard sharing modal
│   └── CreateReportModal.vue     # Report creation modal
├── pages/
│   ├── index.vue                 # Dashboard overview
│   ├── data-sources.vue          # Data sources management
│   ├── integration-wizard.vue    # Data source integration
│   ├── analyze.vue               # Chart analysis tools
│   ├── users.vue                 # User management
│   ├── viewers.vue               # Viewer management
│   ├── sso.vue                   # SSO configuration (stub)
│   ├── account.vue               # Account settings (stub)
│   ├── support.vue               # Support center (stub)
│   └── billing.vue               # Billing management (stub)
├── app.vue                       # Root application component
├── nuxt.config.ts               # Nuxt configuration
└── package.json                 # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build

## Pages Overview

### Dashboard (`/`)
- Account overview with key metrics
- Activity levels and usage statistics
- Quick action cards for common tasks
- Data sources and dashboard listings

### Data Sources (`/data-sources`)
- List of connected databases and flat files
- Search functionality
- Add new data source button
- Data source selection and management

### Integration Wizard (`/integration-wizard`)
- Multi-step form for adding data sources
- Database connection configuration
- SSH tunneling options
- Progress indicator

### Analysis (`/analyze`)
- Interactive chart creation interface
- Field selection and configuration
- Chart type selection
- Real-time preview

### My Dashboard (`/my-dashboard`)

*Removed*
- Chart grid layout
- Dashboard actions (share, duplicate, delete)
- Activity tracking

### Users (`/users`)
- User list with role management
- User details editing
- Add/remove users
- Role-based access control

### Viewers (`/viewers`)
- External and internal viewer management
- Group-based organization
- Viewer invitation system
- Access control settings

## Components

### AppLayout
Main application layout with:
- Sidebar navigation
- Top bar with quick actions
- Responsive design
- Active route highlighting

### ShareDashboardModal
Modal for sharing dashboards with:
- User access management
- Viewer access control
- Public URL generation
- Embed code creation

### CreateReportModal
Modal for creating automated reports with:
- Recipient management
- Multiple format support
- Scheduling options
- Email configuration

## Styling

The application uses:
- **Tailwind CSS** for utility-first styling
- **Nuxt UI** for component styling
- **Custom CSS** in `assets/css/main.css` for specific Optiqo branding
- **Heroicons** for consistent iconography

## Development Notes

### State Management
Currently using local component state. For production, consider implementing:
- Pinia for global state management
- API integration for data persistence
- Real-time updates with WebSockets

### API Integration
The current implementation uses mock data. To connect to real APIs:
- Add API endpoints in `server/api/` directory
- Implement data fetching with `$fetch` or `useFetch`
- Add error handling and loading states

### Authentication
Authentication is not yet implemented. Consider adding:
- JWT token management
- Route protection middleware
- User session management

## Deployment

The application is configured for Vercel deployment with:
- Vercel preset in `nuxt.config.ts`
- SSR enabled for better SEO
- Optimized build configuration

## Future Enhancements

- [ ] Real-time data updates
- [ ] Advanced chart types and customization
- [ ] Data export functionality
- [ ] Advanced user permissions
- [ ] API integration
- [ ] Authentication system
- [ ] Mobile app support
- [ ] Advanced analytics
- [ ] Custom themes
- [ ] Plugin system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for Optiqo Dashboard.

# Optiqo Dashboard - Styling Guidelines

## Overview

This document outlines the comprehensive styling guidelines for the Optiqo Dashboard application. These guidelines ensure visual consistency, brand alignment, and optimal user experience across all components and pages.

## Brand Identity & Color Schema

### Primary Color Palette

#### Brand Colors
```css
/* Primary Brand Color - Warm Orange */
--color-primary: #F28C28;
--color-primary-foreground: #ffffff;
--color-primary-50: #fef7ed;
--color-primary-100: #fdedd3;
--color-primary-200: #fbd7a5;
--color-primary-300: #f8b86d;
--color-primary-400: #f59232;
--color-primary-500: #F28C28;
--color-primary-600: #e3730f;
--color-primary-700: #bc5a0a;
--color-primary-800: #96480e;
--color-primary-900: #7a3c0f;
```

#### Dark Theme Colors
```css
/* Dark Theme Colors for Modals and UI Elements */
--color-dark: #222222;
--color-dark-light: #363636;
--color-dark-lighter: #595959;
--color-dark-foreground: #ffffff;
```

#### Neutral Grays
```css
/* Neutral Gray Scale for Text and UI Elements */
--color-neutral-50: #fafafa;
--color-neutral-100: #f5f5f5;
--color-neutral-200: #e5e5e5;
--color-neutral-300: #d4d4d4;
--color-neutral-400: #a3a3a3;
--color-neutral-500: #737373;
--color-neutral-600: #525252;
--color-neutral-700: #404040;
--color-neutral-800: #262626;
--color-neutral-900: #171717;
```

### Color Usage Guidelines

#### Primary Orange (#F28C28)
- **Usage**: Buttons, active states, brand elements, links
- **Text on Orange**: Always white (#ffffff)
- **Hover States**: Use primary-600 (#e3730f)

#### Dark Colors
- **#222222**: Modal backgrounds, sidebar
- **#363636**: Hover states, secondary backgrounds
- **#595959**: Semi-transparent overlays

#### Text Colors
- **Black (#000000)**: Primary text on light backgrounds
- **White (#ffffff)**: Text on dark backgrounds
- **Gray-700 (#374151)**: Secondary text
- **Gray-500 (#6b7280)**: Placeholder text

## Typography System

### Font Families

#### Primary Fonts
```css
/* Body Text - Inter */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;

/* Headings - Barlow */
font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

#### Tailwind Font Classes
```javascript
// tailwind.config.js
fontFamily: {
  'sans': ['Inter', 'ui-sans-serif', 'system-ui', ...],
  'heading': ['Barlow', 'ui-sans-serif', 'system-ui', ...],
  'logo': ['Barlow', 'ui-sans-serif', 'system-ui', ...]
}
```

### Typography Scale

#### Headings
```css
/* H1 - Page Titles */
h1 {
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-weight: 700;
  font-size: 2rem; /* 32px */
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* H2 - Section Titles (Form Headers) */
h2 {
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-weight: 600; /* Not bold for better readability */
  font-size: 1.5rem; /* 24px */
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 1rem; /* Added spacing for better visual hierarchy */
}

/* H3 - Card Headers */
h3 {
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-weight: 600;
  font-size: 1.125rem; /* 18px */
  line-height: 1.2;
  letter-spacing: -0.02em;
}
```

#### Body Text
```css
/* Body Text */
body {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 1rem; /* 16px */
  line-height: 1.5;
  letter-spacing: -0.01em;
}

/* Small Text */
.text-sm {
  font-size: 0.875rem; /* 14px */
  line-height: 1.4;
}
```

### Typography Classes

#### Tailwind Typography Classes
```html
<!-- Page Titles -->
<h1 class="text-2xl font-heading font-bold tracking-tight">Page Title</h1>

<!-- Section Headers (Form Headers) -->
<h2 class="text-xl font-heading font-semibold tracking-tight mb-4">Section Title</h2>

<!-- Card Headers -->
<h3 class="text-lg font-heading font-semibold tracking-tight">Card Title</h3>

<!-- Body Text -->
<p class="text-base font-sans">Body text content</p>

<!-- Small Text -->
<p class="text-sm text-gray-600">Secondary information</p>
```

## Component Styling Guidelines

### Buttons

#### Primary Buttons
```html
<!-- Orange Primary Button -->
<UButton 
  class="bg-primary text-white hover:opacity-90 transition-opacity"
  style="background-color: #F28C28;"
>
  Primary Action
</UButton>
```

#### Secondary Buttons
```html
<!-- Outline Button -->
<UButton 
  variant="outline" 
  class="border-gray-300 text-gray-700 hover:bg-gray-50"
>
  Secondary Action
</UButton>
```

#### Button Sizes
```html
<!-- Small Button -->
<UButton size="sm" class="px-3 py-1.5 text-sm">Small</UButton>

<!-- Large Button -->
<UButton size="lg" class="px-6 py-3 text-base">Large</UButton>
```

### Form Elements

#### Input Fields
```html
<!-- Standard Input -->
<UInput 
  class="bg-white border-gray-300 text-black placeholder-gray-500 focus:border-primary focus:ring-primary"
  placeholder="Enter text"
/>

<!-- Input with Error -->
<UInput 
  class="bg-white border-red-300 text-black placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
  :error="errorMessage"
/>
```

#### Form Validation
```html
<!-- Error Summary (shown after button click) -->
<div v-if="showErrors && validationErrors.length > 0" class="mt-4">
  <div class="bg-red-50 border border-red-200 rounded-md p-4">
    <div class="flex">
      <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-400 mr-2 mt-0.5" />
      <div>
        <h4 class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</h4>
        <ul class="text-sm text-red-700 list-disc list-inside">
          <li v-for="error in validationErrors" :key="error">{{ error }}</li>
        </ul>
      </div>
    </div>
  </div>
</div>
```

#### Form Groups
```html
<!-- Form Group with Label -->
<UFormGroup 
  label="Field Label" 
  required 
  class="text-black"
>
  <UInput v-model="value" />
</UFormGroup>
```

#### Checkboxes
```html
<!-- Checkbox with Label -->
<UCheckbox 
  v-model="checked" 
  label="Checkbox Label"
  class="text-black"
/>
```

### Cards

#### Standard Card
```html
<!-- White Card -->
<UCard class="bg-white shadow-lg rounded-lg">
  <template #header>
    <h3 class="text-lg font-heading font-semibold tracking-tight">Card Title</h3>
  </template>
  <!-- Card Content -->
</UCard>
```

#### Success Message Card
```html
<!-- Success Message Card -->
<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-6">
  <div class="flex">
    <Icon name="heroicons:check-circle" class="w-6 h-6 text-green-400 mr-3 mt-0.5" />
    <div class="flex-1">
      <h4 class="text-lg font-medium text-green-800 dark:text-green-200 mb-2">Success Title</h4>
      <p class="text-sm text-green-700 dark:text-green-300 mb-4">
        Success message content with clear instructions.
      </p>
      <div class="flex justify-center">
        <UButton color="green" size="sm">
          Action Button
        </UButton>
      </div>
    </div>
  </div>
</div>
```

#### Dark Card
```html
<!-- Dark Card for Special Sections -->
<UCard class="bg-gray-900 text-white shadow-lg rounded-lg">
  <template #header>
    <h3 class="text-lg font-heading font-semibold text-white">Dark Card Title</h3>
  </template>
  <!-- Card Content -->
</UCard>
```

### Modals

#### Modal Overlay
```html
<!-- Semi-transparent Dark Overlay -->
<UModal 
  v-model="isOpen" 
  :ui="{ 
    overlay: 'fixed inset-0 bg-dark-lighter bg-opacity-75 flex items-center justify-center z-50' 
  }"
>
  <!-- Modal Content -->
</UModal>
```

#### Modal Content
```html
<!-- Dark Modal with White Text -->
<UCard class="w-full max-w-2xl mx-4 bg-dark text-white border-neutral-700">
  <template #header>
    <h3 class="text-lg font-heading font-semibold text-white">Modal Title</h3>
  </template>
  <!-- Modal Content -->
</UCard>
```

## Layout Guidelines

### Page Backgrounds

#### Authentication Pages
```html
<!-- Light Gray Background -->
<div 
  class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
  style="background-color: #f3f4f6;"
>
  <!-- Page Content -->
</div>
```

#### Dashboard Pages
```html
<!-- White Background with Padding -->
<div class="p-6 space-y-6">
  <!-- Page Content -->
</div>
```

### Sidebar Styling

#### Sidebar Container
```html
<!-- Dark Sidebar -->
<div class="sidebar flex flex-col bg-dark text-white">
  <!-- Sidebar Content -->
</div>
```

#### Sidebar Items
```html
<!-- Active Sidebar Item -->
<NuxtLink 
  class="sidebar-item bg-primary text-white"
  :class="{ active: $route.path === item.route }"
>
  <Icon :name="item.icon" class="w-5 h-5" />
  {{ item.label }}
</NuxtLink>

<!-- Inactive Sidebar Item -->
<NuxtLink 
  class="sidebar-item hover:bg-dark-light"
>
  <Icon :name="item.icon" class="w-5 h-5" />
  {{ item.label }}
</NuxtLink>
```

### Top Bar Styling

#### Top Bar Container
```html
<!-- Orange Top Bar -->
<div class="topbar bg-primary text-white px-6 py-3">
  <!-- Top Bar Content -->
</div>
```

#### Navigation Links
```html
<!-- Top Bar Navigation -->
<nav class="hidden lg:flex gap-6">
  <button class="hover:underline font-heading font-medium text-sm tracking-wide">
    NAVIGATION
  </button>
</nav>
```

## Responsive Design Guidelines

### Breakpoints

#### Mobile First Approach
```css
/* Mobile: < 640px (sm) */
/* Tablet: 640px - 1024px (md/lg) */
/* Desktop: > 1024px (xl) */
```

#### Responsive Classes
```html
<!-- Responsive Grid -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Content adapts from single column to two columns -->
</div>

<!-- Responsive Text -->
<h1 class="text-xl lg:text-2xl font-heading font-bold">
  Responsive Heading
</h1>

<!-- Responsive Spacing -->
<div class="p-4 lg:p-6">
  <!-- Padding increases on larger screens -->
</div>
```

### Mobile Navigation

#### Mobile Menu Button
```html
<!-- Mobile Menu Toggle -->
<button 
  class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md"
>
  <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-6 h-6" />
</button>
```

#### Mobile Sidebar
```html
<!-- Collapsible Mobile Sidebar -->
<div 
  :class="[
    'sidebar flex flex-col transition-transform duration-300 ease-in-out',
    'fixed lg:static inset-y-0 left-0 z-50 w-64',
    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  ]"
>
  <!-- Sidebar Content -->
</div>
```

## Logo Implementation

### Main Logo Usage
```html
<!-- Optiqo Logo in Sidebar -->
<div class="flex items-center justify-center">
  <img 
    src="/images/Optiqo_logo.png" 
    alt="Optiqo" 
    class="h-6 lg:h-8 w-auto"
  />
</div>
```

### Footer Logo Usage
```html
<!-- Q Logo in Footer -->
<footer class="bg-neutral-50 border-t border-neutral-200 px-4 lg:px-6 py-3 lg:py-4">
  <div class="flex items-center justify-center">
    <img 
      src="/images/qtransparent.png" 
      alt="Q" 
      class="h-4 lg:h-6 w-auto opacity-60"
    />
  </div>
</footer>
```

### Favicon Implementation
```html
<!-- Favicon Links -->
<link rel="icon" type="image/png" href="/images/optiqo_32x32.png" sizes="32x32" />
<link rel="icon" type="image/png" href="/images/optiqo_64x64.png" sizes="64x64" />
<link rel="apple-touch-icon" type="image/png" href="/images/optiqo_152x152.png" sizes="152x152" />
<link rel="shortcut icon" href="/images/optiqo_32x32.png" />
```

## CSS Architecture

### File Organization
```
assets/css/
├── main.css              # Global styles and imports
└── [component-specific].css  # Component-specific styles (if needed)
```

### CSS Import Order
```css
/* 1. Font Imports (must be first) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

/* 2. Tailwind Directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 3. Custom CSS Rules */
/* Global typography, component styles, etc. */
```

### Custom CSS Classes
```css
/* Logo-style text */
.logo-text {
  font-family: 'Poppins', 'Inter', sans-serif;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

/* Sidebar styles */
.sidebar {
  @apply bg-dark text-white;
}

.sidebar-item {
  @apply flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors w-full;
}

.sidebar-item:hover {
  @apply bg-dark-light;
}

.sidebar-item.active {
  @apply bg-primary text-white;
}
```

## Best Practices

### Color Usage
- **Always use semantic color names** (primary, dark, neutral) instead of hex values
- **Maintain consistent contrast ratios** for accessibility
- **Use the color palette systematically** across all components

### Typography
- **Use Barlow for all headings** for a modern, clean appearance
- **Use Inter for body text** for optimal readability
- **Apply consistent letter spacing** (-0.01em to -0.03em)
- **Maintain proper hierarchy** with appropriate font sizes
- **Form headers should not be bold** (font-weight: 600) for better readability
- **Add proper spacing** (mb-4) under form headers for visual hierarchy

### Component Consistency
- **Follow the established patterns** for buttons, forms, and cards
- **Use Tailwind classes** for consistent spacing and sizing
- **Apply hover states** consistently across interactive elements
- **Maintain responsive behavior** on all screen sizes
- **Show validation errors only after user interaction** (button click) for better UX
- **Always make action buttons clickable** with error summary display on click

### Performance
- **Use inline styles sparingly** and only when necessary
- **Leverage Tailwind's utility classes** for better performance
- **Optimize font loading** with display=swap
- **Minimize custom CSS** in favor of Tailwind utilities

## Accessibility Guidelines

### Color Contrast
- **Ensure sufficient contrast** between text and backgrounds
- **Test with accessibility tools** to verify WCAG compliance
- **Provide alternative indicators** beyond color alone

### Typography
- **Use appropriate font sizes** for readability
- **Maintain proper line height** (1.2 for headings, 1.5 for body text)
- **Ensure text is scalable** up to 200% without horizontal scrolling

### Interactive Elements
- **Provide clear focus indicators** for keyboard navigation
- **Use semantic HTML elements** where appropriate
- **Include proper ARIA labels** for screen readers

## Maintenance Guidelines

### Regular Updates
- **Review color usage** quarterly for consistency
- **Update font weights** as needed for new components
- **Test responsive behavior** on new devices and screen sizes
- **Validate accessibility** with automated and manual testing

### Documentation
- **Keep this guide updated** with any style changes
- **Document new patterns** as they're established
- **Include examples** for complex styling patterns
- **Maintain a style inventory** of all components

## Recent Improvements

### Enhanced User Experience
- **Improved form typography** with non-bold headers and better spacing
- **Enhanced validation UX** with error summaries shown only after user interaction
- **Clear success messaging** with prominent visual feedback
- **Consistent button behavior** - always clickable with proper error handling

### Authentication Flow Enhancements
- **Success message cards** with clear instructions and action buttons
- **Improved error handling** with user-friendly validation messages
- **Better visual hierarchy** across all authentication forms
- **Enhanced accessibility** with proper focus states and error indicators

## Conclusion

These styling guidelines ensure that the Optiqo Dashboard maintains a consistent, professional appearance that aligns with the brand identity. By following these guidelines, developers can create components that integrate seamlessly with the overall design system while providing an excellent user experience across all devices and screen sizes.

The combination of the warm orange brand color, modern typography (Barlow for headings, Inter for body text), and clean design principles creates a cohesive visual identity that reflects the professional nature of the Optiqo business intelligence platform.

Recent improvements focus on enhancing user experience through better form validation, clearer messaging, and improved visual hierarchy, ensuring that users have a smooth and intuitive experience when interacting with the authentication system and other application features.

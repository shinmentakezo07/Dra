# UI Design System - Dashboard Theme

## Overview
This document details the visual theme, style patterns, and UI components used in the dashboard at `http://localhost:3000/dashboard`. Use this as a reference to build consistent UI elements across the application.

---

## Color Palette

### Primary Colors
- **Background**: `#050505` (near-black)
- **Card Background**: `#0A0A0A` / `#0e0e0e` (dark gray)
- **Electric Blue**: `#3b82f6` (blue-500)
- **Neon Violet**: `#7c3aed` (violet-600)
- **Purple**: `#a855f7` (purple-500)

### Accent Colors
- **Orange**: `#f97316` (orange-500) - Streak indicators
- **Yellow**: `#eab308` (yellow-500) - XP badges
- **Green**: `#22c55e` (green-500) - Success states
- **Red**: `#ef4444` (red-600) - Destructive actions

### Text Colors
- **Primary Text**: `#ffffff` (white)
- **Secondary Text**: `#9ca3af` (gray-400)
- **Muted Text**: `#6b7280` (gray-500)
- **Disabled Text**: `#4b5563` (gray-600)

### Border & Overlay
- **Border**: `rgba(255, 255, 255, 0.05)` - `border-white/5`
- **Border Hover**: `rgba(255, 255, 255, 0.1)` - `border-white/10`
- **Overlay**: `rgba(255, 255, 255, 0.05)` - `bg-white/5`
- **Backdrop Blur**: `backdrop-blur-xl` / `backdrop-blur-sm`

---

## Typography

### Font Families
- **Sans-serif**: `Inter` (via `--font-inter`)
- **Monospace**: `Space Mono` (via `--font-space`)

### Font Sizes & Weights
- **Headings**: 
  - H1: `text-3xl sm:text-4xl font-bold` (30-36px)
  - H2: `text-xl font-bold` (20px)
  - H3: `text-lg font-bold` (18px)
- **Body**: `text-sm` (14px) / `text-base` (16px)
- **Small**: `text-xs` (12px)
- **Tiny**: `text-[10px]` (10px)
- **Mono Labels**: `text-xs font-mono uppercase tracking-wider`

---

## Layout Structure

### Container
```tsx
<div className="min-h-screen pt-6 pb-12 px-4 sm:px-6 lg:px-8 bg-[#050505] relative overflow-hidden">
  <div className="max-w-7xl mx-auto relative z-10">
    {/* Content */}
  </div>
</div>
```

### Grid System
- **Main Layout**: `grid grid-cols-1 lg:grid-cols-3 gap-8`
  - Left column (main content): `lg:col-span-2`
  - Right column (sidebar): `lg:col-span-1`
- **Stats Grid**: `grid grid-cols-1 sm:grid-cols-3 gap-4`

---

## Background Effects

### Ambient Gradient Blobs
```tsx
<div className="fixed inset-0 z-0 pointer-events-none">
  <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
  <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
</div>
```

### Grid Pattern Overlay
```tsx
<div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
```

---

## Card Components

### Standard Card
```tsx
<div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

### Gradient Border Card
```tsx
<div className="group relative p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 hover:from-blue-500/50 hover:to-purple-500/50 transition-all duration-300">
  <div className="relative h-full bg-[#0e0e0e] rounded-[15px] p-6">
    {/* Content */}
  </div>
</div>
```

### Promo Card (AI Lab Style)
```tsx
<div className="p-[1px] rounded-2xl bg-gradient-to-r from-violet-600/50 to-indigo-600/50 hover:from-violet-500 hover:to-indigo-500 transition-all duration-500 shadow-[0_0_30px_rgba(124,58,237,0.1)]">
  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
  <div className="relative bg-[#0e0e0e]/90 backdrop-blur-sm rounded-[15px] p-6">
    {/* Content */}
  </div>
</div>
```

---

## Stat Cards

### Stat Card Pattern
```tsx
<div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <div className="relative z-10">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
        <Activity className="w-5 h-5" />
      </div>
      <span className="text-xs font-mono text-blue-500/50 bg-blue-500/5 px-2 py-1 rounded">+12%</span>
    </div>
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Progress</p>
    <h3 className="text-2xl font-bold text-white">75%</h3>
    <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }} />
    </div>
  </div>
</div>
```

---

## Badges & Pills

### Status Badge
```tsx
<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono font-medium backdrop-blur-sm">
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
  </span>
  SYSTEM ONLINE
</span>
```

### Stat Badge (Streak/XP)
```tsx
<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
  <Flame className="w-3.5 h-3.5 fill-current" />
  <span className="text-xs font-bold font-mono">3</span>
</div>
```

### Tag Badge
```tsx
<span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-400 border border-white/5 uppercase tracking-wider">
  BEGINNER
</span>
```

---

## Buttons

### Primary Button
```tsx
<button className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-900/20">
  Enter Lab
</button>
```

### Secondary Button
```tsx
<button className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all hover:border-blue-500/50 hover:text-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
  Continue Sequence
</button>
```

### Neon Button
```tsx
<Link
  href="/signup"
  className="relative inline-flex items-center justify-center h-9 px-5 rounded-lg text-sm font-medium text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/20 hover:bg-[#00ff9d]/20 hover:border-[#00ff9d]/50 shadow-[0_0_10px_rgba(0,255,157,0.1)] hover:shadow-[0_0_20px_rgba(0,255,157,0.3)] transition-all duration-300"
>
  Get Started
</Link>
```

---

## Progress Bars

### Standard Progress Bar
```tsx
<div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: '75%' }} />
</div>
```

### Gradient Progress Bar
```tsx
<div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 relative" style={{ width: '75%' }}>
    <div className="absolute inset-0 bg-white/20 animate-pulse" />
  </div>
</div>
```

---

## Timeline / Activity Feed

```tsx
<div className="space-y-6">
  <div className="relative pl-6 border-l border-white/10 pb-6 group">
    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-[#1a1a1a] border border-blue-500 group-hover:bg-blue-500 transition-colors" />
    <p className="text-sm text-gray-300 mb-1">
      Completed module <span className="text-white font-medium">Python Basics</span>
    </p>
    <span className="text-[10px] text-gray-600 font-mono">2 HOURS AGO</span>
  </div>
</div>
```

---

## Icons & Decorative Elements

### Icon Container
```tsx
<div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
  <Activity className="w-5 h-5" />
</div>
```

### Decorative Line
```tsx
<div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_#3b82f6]" />
```

### Tech Grid Background
```tsx
<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(124,58,237,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(124,58,237,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
```

---

## Animations

### Framer Motion Variants
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
```

### CSS Animations
- `animate-pulse-slow` - Slow pulse (4s)
- `animate-gradient` - Gradient animation (3s)
- `animate-shimmer` - Shimmer effect (2s)
- `animate-ping` - Ping effect for status indicators

---

## Header Component

### Fixed Header with Blur
```tsx
<header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
  <div className="relative w-full max-w-6xl h-16 px-4 flex items-center justify-between rounded-2xl bg-[#0A0A0A]/80 backdrop-blur-xl border border-[#00ff9d]/10 shadow-2xl shadow-black/50 ring-1 ring-white/5">
    {/* Content */}
  </div>
</header>
```

### User Avatar
```tsx
<div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-[#00ff9d]/30 group-hover:border-[#00ff9d] transition-colors">
  <div className="absolute inset-0 bg-[#00ff9d]/20 animate-pulse" />
  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/50 to-purple-600/50 mix-blend-overlay" />
  <span className="relative z-10 text-xs font-bold text-[#00ff9d] text-shadow-neon">U</span>
</div>
```

---

## Logo Component (CyberpunkLogo)

### Tech-Inspired Logo
- Rotating tech rings with `motion.div`
- Scanline animation moving vertically
- Grid background pattern
- Glitch effect on hover with color shifts
- Neon green (`#00ff9d`) primary color
- Monospace "Netrunner" subtitle

---

## Responsive Design

### Breakpoints
- **Mobile**: Default (< 640px)
- **Tablet**: `sm:` (≥ 640px)
- **Desktop**: `lg:` (≥ 1024px)

### Mobile Patterns
- Stack cards vertically: `grid-cols-1`
- Hide secondary elements: `hidden sm:flex`
- Adjust padding: `px-4 sm:px-6 lg:px-8`
- Responsive text: `text-3xl sm:text-4xl`

---

## Hover Effects

### Card Hover
```tsx
className="group hover:border-blue-500/30 transition-colors"
// With gradient overlay
<div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
```

### Button Hover
```tsx
className="hover:bg-white/10 hover:border-blue-500/50 hover:text-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all"
```

### Icon Hover
```tsx
className="group-hover:text-blue-400 group-hover:scale-105 transition-all"
```

---

## Shadow & Glow Effects

### Neon Glow
```tsx
shadow-[0_0_10px_rgba(0,255,157,0.1)]
hover:shadow-[0_0_20px_rgba(0,255,157,0.3)]
```

### Card Shadow
```tsx
shadow-lg
shadow-xl
shadow-2xl shadow-black/50
```

### Text Shadow (Neon)
```tsx
className="text-shadow-neon"
// CSS: text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
```

---

## CSS Custom Properties

### Root Variables (from globals.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 100% 50%; /* Electric Blue */
  --primary-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 252 100% 65%; /* Neon Violet/Blue */
  --border: 240 3.7% 15.9%;
}
```

---

## Utility Classes

### Glass Effect
```tsx
className="glass" // bg-white/10 backdrop-blur-md border border-white/20
className="glass-card" // bg-black/40 backdrop-blur-xl border border-white/10
```

### Neon Effects
```tsx
className="neon-text" // text-shadow with purple glow
className="neon-border" // box-shadow with purple glow
```

### Grid Background
```tsx
className="bg-grid-white" // Subtle grid pattern
```

---

## Best Practices

1. **Consistency**: Use the defined color palette and spacing system
2. **Contrast**: Ensure text has sufficient contrast against dark backgrounds
3. **Hover States**: Always provide visual feedback on interactive elements
4. **Loading States**: Use skeleton loaders or spinners for async content
5. **Animations**: Keep animations subtle and performant (use `transform` and `opacity`)
6. **Accessibility**: Include proper ARIA labels and keyboard navigation
7. **Mobile First**: Design for mobile, enhance for desktop
8. **Dark Theme**: This is a dark-first design system

---

## Component Checklist

When building new components, ensure:
- [ ] Dark background (`bg-[#0A0A0A]` or `bg-[#050505]`)
- [ ] Subtle borders (`border-white/5` or `border-white/10`)
- [ ] Hover states with color transitions
- [ ] Proper spacing (p-6, gap-4, etc.)
- [ ] Rounded corners (`rounded-2xl`, `rounded-xl`)
- [ ] Backdrop blur for overlays
- [ ] Neon accent colors for CTAs
- [ ] Monospace font for technical labels
- [ ] Responsive grid/flex layouts
- [ ] Framer Motion animations where appropriate

---

## Example: Building a New Card

```tsx
<motion.div 
  variants={itemVariants}
  className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg"
>
  {/* Hover gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  
  {/* Content */}
  <div className="relative z-10">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-mono text-blue-500/50 bg-blue-500/5 px-2 py-1 rounded">
        LABEL
      </span>
    </div>
    
    <h3 className="text-lg font-bold text-white mb-2">Card Title</h3>
    <p className="text-sm text-gray-400 font-light">Card description text</p>
    
    <button className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all">
      Action Button
    </button>
  </div>
</motion.div>
```

---

## Model Detail Pages

### Layout Theme
Model detail pages use the refined dark theme with ambient gradient blobs and grid overlay.

#### Background
- **Page Background**: `#050505` (near-black)
- **Card Background**: `#0e0e0e` (dark gray)
- **Ambient Gradient Blobs**: Blue and purple gradient blobs with `blur-[120px]` and `animate-pulse-slow`

```tsx
<div className="fixed inset-0 z-0 pointer-events-none">
  <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
  <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
</div>
```

#### Visual Components

**Detail Card**
```tsx
<div className="p-6 rounded-2xl bg-[#0e0e0e] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

**Gradient Border Card**
```tsx
<div className="group relative p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 hover:from-blue-500/50 hover:to-purple-500/50 transition-all duration-300">
  <div className="relative h-full bg-[#0e0e0e] rounded-[15px] p-6 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10">{/* Content */}</div>
  </div>
</div>
```

**Section Header**
```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-white/10 text-white">
    <Icon className="w-4 h-4" />
  </div>
  <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Section Label</h2>
</div>
```

**Stat Value**
```tsx
<div className="relative group">
  <div className="absolute -inset-0.5 bg-gradient-to-br from-white/5 to-transparent rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity" />
  <div className="relative p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">Label</div>
    <div className="text-2xl font-bold font-mono text-white">Value</div>
  </div>
</div>
```

---

**Last Updated**: 2026-04-16
**Dashboard URL**: http://localhost:3000/dashboard
**Theme**: Cyberpunk / Tech / Dark Mode

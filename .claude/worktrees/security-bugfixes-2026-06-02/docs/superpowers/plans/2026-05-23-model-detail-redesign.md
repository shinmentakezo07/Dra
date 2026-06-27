# Model Detail Page — Complete Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the model detail page from a standard grid layout into an immersive, editorial-grade model showcase with bento-grid asymmetry, per-model accent theming, and orchestrated scroll animations.

**Architecture:** Keep the server/page.tsx component as-is (static params + delegation to client). Rewrite every component inside `components/models/detail/` with intentional minimalism: each panel becomes a distinct visual "spec card" with the provider's accent color woven into borders, glows, and highlights. The layout shifts from a 5-column grid to a 12-column bento grid with staggered card sizes. Navigation becomes a floating right-rail section indicator.

**Tech Stack:** Next.js 16, React 19, framer-motion, Tailwind CSS v4, lucide-react.

**Design Direction:** Dark Luxury Editorial — each model gets a personalized dark showcase. Accent color drives card borders, ambient glow positions, and highlight tones. Massive fluid typography, generous whitespace, subtle grain texture, and scroll-triggered parallax reveals.

---

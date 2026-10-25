# 🚀 Guriqbal Singh — Interactive Personal Developer Portfolio

> *"Blending creative vision with an obsession for minor details."*
---

## 🌟 Overview

Welcome to the official repository of my personal developer portfolio. Rather than using cookie-cutter templates or generic static layouts, this application was engineered from the ground up to demonstrate my philosophy as an aspiring **AI-enabled Software Developer**: putting human user experience first, obsessing over micro-interactions and responsiveness, and writing clean, high-performance web software.

Explore the live portfolio at: **[https://guripb13.github.io/Portfolio/](https://guripb13.github.io/Portfolio/)**

---

## 📖 What This Portfolio Represents

I am **Guriqbal Singh**, a Computer Science student at **SLIET (Sant Longowal Institute of Engineering & Technology)**. My engineering approach blends technical precision with deep empathy for end users:

* **Real-World Empathy**: Over 4 years of hands-on citizen support at a **CSC e-Governance centre** in Sangrur, translating complex bureaucratic and digital workflows into calm, accessible guidance for real people.
* **Rigorous CS & AI Foundation**: Formal education in computer systems, algorithms, Python, and C at SLIET, coupled with completion of **Harvard University's CS50 Introduction to Artificial Intelligence with Python** and **Saylor University's CS205 Building with AI**.
* **Enterprise Job Simulations**: Completed practical simulations with **Electronic Arts (EA)** (C++ data structure optimization), **Mastercard** (cybersecurity awareness), and **Deloitte Australia** (forensic data analytics & cyber breach response).

---

## ✨ Key Features & Engineering Highlights

### 1. 📱 Uncompromising Responsiveness & Ergonomics
* **Fluid Typography & Layouts**: Built using modern CSS `clamp()` and container queries to feel native across all screen sizes—from compact 320px smartphones to high-resolution 4K desktop monitors.
* **Dedicated Landscape Optimization**: Custom-crafted landscape layouts for mobile devices utilizing dynamic `100svh` viewports to prevent UI clipping, scroll traps, and awkward navbar overlaps.
* **Touch-Native Navigation**: Bottom-anchored actions on mobile, gesture-friendly tap targets, and smooth momentum scrolling.

### 2. 🔍 Interactive Project & Certificate Viewer (with Gesture Nav)
* **Comprehensive Modal Explorer**: Detailed modal view for each project and certification displaying year, organization, tech stack, key engineering highlights, and direct credential verification links.
* **High-Resolution Certificate Zoom**: Instant preview and enlargement of verified credentials.
* **Native Back Gesture Integration**: When an enlarged certificate is open on mobile or tablet, performing a native back swipe or browser back button smoothly returns the certificate to the project modal rather than exiting the site.

### 3. 🎯 Touch & Mouse Inertial Coursework Carousel
* **Physics-Driven Fling**: Horizontal credentials showcase featuring touch & mouse drag-to-scroll with custom inertia and friction physics.
* **Visual Polish**: Gradient smoothstep edge masks, hover elevation, and keyboard navigation support (`←` / `→` / `Enter`).
* **Direct Verification**: Immediate links to verify certificates from Harvard, Saylor, Forage, EA, Mastercard, and Deloitte.

### 4. ⚡ Real, Telemetry-Driven Preloader
* **Zero Fake Timers**: Unlike typical portfolio loaders with arbitrary `setTimeout` counters, this preloader monitors actual browser download streams, dynamic module chunk loading, layout mount signals, and font paint events.
* **Orbital SVG Physics**: Real-time canvas/SVG orbital physics animation indicating genuine pipeline initialization before smoothly unmasking the hero view.

### 5. 🎨 Fluid Motion, Magnetic Cursor & Ambient Glows
* **60 FPS Orchestration**: Animations orchestrated using **GSAP** and **ScrollTrigger**, synchronized with **Lenis smooth scrolling** via GSAP’s internal ticker for tear-free pinning.
* **Spotlight Cursor & Magnetic Pull**: Custom desktop spotlight cursor with magnetic attraction on interactive CTA buttons, social pills, and theme controls.
* **Reactive 3D Tilt**: Glassmorphism cards with multi-axis 3D tilt and cursor-following ambient radial lighting.

### 6. 🕒 Journey Timeline & Experience Specialty
* **Connected Narrative**: Vertical SVG progress timeline tracing my journey from CSC e-Governance technical support through academic study at SLIET to advanced AI engineering.
* **Scroll-Synced Illumination**: Visual milestone nodes that activate dynamically as the user scrolls through each phase of my career and education.

### 7. 🌓 Seamless View Transition Theme Engine
* **Native View Transition API**: Instant, GPU-accelerated switching between Dark and Light modes without flash of unstyled content (FOUC).
* **System Preference Sync**: Automatically detects and respects the user's OS color scheme preferences with manual override memory.

### 8. 📲 Native Web Share Integration
* **Device-Aware Sharing**: Leverages the native **Web Share API** on touch devices to open native mobile share sheets, featuring automated fallbacks with tactile clipboard feedback on desktop.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Core Framework** | React 19, TypeScript, Vite |
| **Styling & Design** | Tailwind CSS v4, CSS Modules, Glassmorphism, Dynamic SVGs |
| **Animation & Physics** | GSAP 3, ScrollTrigger, Lenis Smooth Scroll |
| **3D & Visuals** | Three.js / React Three Fiber (modular portrait/voxel components) |
| **Typography** | Bricolage Grotesque, Instrument Sans |
| **Deployment** | GitHub Pages (`gh-pages`), automated CI workflow |

### Project Directory Structure

```
Portfolio/
├── public/                  # Static assets, certificate images, and portraits
│   ├── me.png               # Profile portrait (About section)
│   ├── me2.webp             # Hero portrait
│   └── projects/            # High-resolution & optimized certificate images
│       ├── CS50AI_LOW.png   # Harvard CS50 AI
│       ├── CS205_LOW.png    # Saylor AI Coursework
│       ├── SEJS_LOW.png     # EA Software Engineering Simulation
│       ├── MCJS_LOW.png     # Mastercard Cybersecurity Simulation
│       └── DAJS_LOW.png     # Deloitte Data Analytics Simulation
├── src/
│   ├── components/          # Modular UI components
│   │   ├── Hero.tsx         # Hero section & scatter headline
│   │   ├── ScatterHeading.tsx # Canvas dot-matrix interactive heading
│   │   ├── Projects.tsx     # Horizontal coursework & credentials carousel
│   │   ├── ProjectViewer.tsx# Project modal with certificate zoom & gesture nav
│   │   ├── Timeline.tsx     # Animated experience & journey timeline
│   │   ├── About.tsx        # Bio, language proficiencies, and education cards
│   │   ├── Contact.tsx      # Interactive contact form & direct reachouts
│   │   ├── Navbar.tsx       # Floating pill navigation
│   │   ├── Loader.tsx       # Telemetry-driven SVG physics preloader
│   │   ├── CustomCursor.tsx # Magnetic cursor & spotlight halo
│   │   ├── ThemeToggle.tsx  # View-transition theme switcher
│   │   └── ShareButton.tsx  # Web Share API & clipboard integration
│   ├── data/
│   │   └── resume.tsx       # ✏️ Single Source of Truth for all site content
│   ├── App.tsx              # Main layout, Lenis ticker sync, and modal routing
│   ├── index.css            # Tailwind v4 theme definitions and design tokens
│   └── main.tsx             # Application bootstrap
└── README.md                # Project documentation
```

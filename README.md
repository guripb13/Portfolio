# Guriqbal Singh: Glass Portfolio

React 19 + Vite + TypeScript, GSAP ScrollTrigger, Lenis, Tailwind CSS v4, and Three.js (React Three Fiber, only for the optional voxel view).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
```

## Make it yours

1. **Content:** edit `src/data/resume.tsx` (bio, skills, projects, experience, email, socials). Everything on the page reads from it. Only the name is real so far; the rest is placeholder.
2. **Photo:** put your image in `public/` (a transparent PNG gives the cleanest voxel view) and set `photo: '/your-file.png'`.
3. **Project screenshots:** add `image: '/shot.jpg'` to a project. Without it, generated blue gradient artwork is shown.
4. **Colours:** `--color-*` tokens in the `@theme` block and `--accent` / `--accent-2` in `src/index.css`. The palette is neon blue plus a deeper blue; there is no red anywhere.

## Hero (matches the canvas wireframe)

| Piece | File |
|---|---|
| Name top-left, dot-matrix headline, intro, two buttons, scroll cue | `components/Hero.tsx` |
| Scatter-text engine: canvas dot matrix, pointer repulsion, spring recovery | `components/ScatterHeading.tsx` |
| 4:5 glass photo card with 3D tilt (+ optional voxel view) | `components/Hero.tsx`, `components/GlassCard.tsx`, `components/VoxelPortrait.tsx` |
| Floating glass pill nav (centered, no name inside) | `components/Navbar.tsx` |
| Spotlight cursor + magnetic buttons (`data-magnetic`) | `components/CustomCursor.tsx` |

## The rest of the page

About (scroll reveal + opposing skill marquees), Work (pinned project scenes), Experience (self-drawing timeline), Contact. Lenis is driven by GSAP's ticker in `App.tsx` so pins stay in sync.

## Notes

- Tailwind v4 is CSS-first: there is no `tailwind.config.js`.
- **Scatter engine accessibility:** the real `<h1>` text stays in the DOM (visually hidden) for screen readers and SEO. With `prefers-reduced-motion` the canvas is skipped and the heading is plain static text. The loop sleeps when dots are at rest and pauses off-screen.
- Three.js is lazy-loaded and only fetched if the voxel view is opened.
- Touch devices get no custom cursor; the dot headline reacts to touch-drag.
- Fonts (Bricolage Grotesque, Instrument Sans) load from Google Fonts in `index.html`; self-host them for strict privacy setups.

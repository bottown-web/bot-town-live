# Bot Town Visual MVP

## Goal
Build a launch-ready, full-viewport procedural 3D town that feels continuously alive, with 15 autonomous Grok-style robot residents and a polished game HUD.

## Experience
- Render a compact low-poly town with eight named locations, roads, pavements, trees, streetlights, water, clouds, drones, lit windows, atmospheric fog, soft neon light, and a glowing central Grok Core.
- Create cute procedural robot residents with rounded white/dark metallic bodies, black visor faces, and distinct purple-blue accent details.
- Run a local simulation that moves residents smoothly between meaningful locations, updates activities and stats every 7–12 seconds, produces speech bubbles, and continuously inserts new live-feed events.
- Use a compressed 12-minute town day to animate lighting, weather presentation, time, day number, and day/night progress.

## Interactions
- Support orbit, pan, and zoom with a reset-camera control.
- Make buildings and residents clickable; selecting a resident opens their profile and enables smooth camera follow.
- Add a clickable minimap, label toggle, reduced-motion toggle, collapsible activity feed, information guide, and WebGL fallback.
- Add an in-character demo messaging interface using local personality templates.
- Add the three-step “Bring Your Bot” modal with its disabled coming-soon connection action.

## HUD
- Top-left identity/live status, top-center town clock/weather, and top-right watching/action controls.
- Right-side newest-six activity feed.
- Bottom-left minimap, bottom-center resident dock, and bottom-right Grok Core objective with animated progress and compute metrics.
- Collapse secondary panels cleanly on mobile while keeping the town and essential controls usable.

## Technical approach
- Use React 19, TypeScript, TanStack Start/Vite, Three.js, React Three Fiber, Drei, Tailwind CSS, and a small Zustand store.
- Keep all scene geometry procedural; no external models, remote media, APIs, authentication, payments, wallets, or cryptocurrency.
- Separate town data, simulation, 3D environment/buildings/residents, HUD panels, drawers, and modals into focused files.
- Keep per-frame transforms in refs/useFrame; update React state only for meaningful simulation changes.
- Use a local lightformer environment and one restrained bloom pass, with reduced-motion disabling decorative motion.

## Validation
- Verify a visible, well-lit scene on desktop and mobile-sized viewports.
- Exercise camera controls, resident/building selection, following, minimap navigation, toggles, modals, message replies, and live updates.
- Confirm no blank canvas, hydration warnings, missing assets, or browser console errors.

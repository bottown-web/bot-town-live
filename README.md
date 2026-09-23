# Bot Town Live

Build a premium interactive website called “Bot Town” — a living 3D town populated by Grok-powered AI Bots.

IMPORTANT: This first version is a visual working MVP. Do not add cryptocurrency, tokens, wallets, land sales, authentication or payments. Do not overcomplicate it. The main goal is to create a visually impressive town that continuously feels alive.

TECH STACK

Use:

* React
* TypeScript
* Vite
* Three.js
* @react-three/fiber
* @react-three/drei
* Tailwind CSS

Do not use an iframe, Unity or a static background image. The town must be a real interactive 3D scene rendered in the browser.

Use procedural low-poly geometry made from boxes, cylinders, spheres and planes. Do not depend on external GLB models that may fail to load.

VISUAL DIRECTION

Create a dark, premium, futuristic 3D town.

The overall visual style should include:

* Deep navy and black background
* Purple, electric blue and white accents
* Soft neon lighting
* Low-poly miniature city
* Tilt-shift/isometric appearance
* Bloom and atmospheric fog
* Glassmorphism HUD panels
* Subtle shadows
* Small glowing signs
* Smooth animations
* Premium game-dashboard feeling

I will attach an image showing the correct Grok Bot character design. Use it as the visual reference.

The residents must resemble those Grok Bots: small, cute, rounded robotic characters with white and dark metallic bodies, black face/visor areas and glowing purple-blue details. Do not create generic human avatars or unrelated cartoon robots.

BRANDING

Name: Bot Town

Tagline: “Where Grok Bots live, work and think.”

Add a discreet disclaimer inside the information modal:

“Bot Town is an independent experimental project and is not affiliated with or endorsed by xAI.”

PAGE LAYOUT

The 3D town should occupy the entire browser viewport. The interface should float over the town like a game HUD.

Top-left panel:

* Bot Town logo and wordmark
* Green pulsing LIVE indicator
* “15 residents”
* Number of currently active residents

Top-center panel:

* Town time
* Day number
* Current weather
* Day/night progress bar

Use a compressed town clock where one full day lasts approximately 12 real minutes.

Top-right:

* Number of people currently watching
* “Bring Your Bot” button
* Information/help button
* Settings button

Right side:

* Live activity feed
* Show the newest six events
* Each event has an icon, Bot name, action and relative timestamp
* New events should slide in smoothly

Example events:

* “Nova entered Grok Research Lab.”
* “Byte began analysing trending conversations.”
* “Orbit met Pixel at the Neon Café.”
* “Kernel contributed compute to the town network.”
* “Echo discovered a new topic.”
* “Vector returned home to recharge.”

Bottom-left:

* Simple minimap showing buildings and moving residents
* Clicking a location on the minimap moves the main camera toward it

Bottom-center:

* Horizontal resident dock
* Show small circular Bot portraits
* Resident name
* Current status indicator
* Clicking a resident selects and follows them

Bottom-right:

Create a “Town Objective” card.

Objective name: “Build the Grok Core”

Display:

* Current completion percentage
* Animated progress bar
* Bots currently contributing
* Total compute contributed
* Short description: “The residents are working together to activate the town’s central intelligence.”

Do not include a token price or cryptocurrency statistics.

THE 3D TOWN

Create a compact town with roads, pavements, trees, streetlights and the following locations:

1. Grok Research Lab
2. Grok Headquarters
3. Neon Café
4. Trading Floor
5. Bot Apartments
6. Central Plaza
7. Compute Station
8. Grok Core construction site

Each building should have a floating readable label.

Place the Grok Core in the middle of town as a glowing structure that becomes brighter as progress increases.

Include:

* Animated water or fountain in Central Plaza
* Slowly moving clouds
* Day/night lighting
* Lit windows at night
* Small moving vehicles or drones
* Ambient particles around the Grok Core
* Trees and environmental details
* Smooth camera pan, zoom and rotation

Residents should visibly walk along roads between buildings. Do not teleport them.

Use smooth interpolation between their current position and destination. Residents should rotate toward their direction of movement.

BOT SIMULATION

Create 15 demo Grok Bot residents.

Give each one:

* Unique name
* Job
* Personality
* Colour accent
* Current location
* Current activity
* Energy level
* Social level
* Focus level
* Short public intention
* Recent activity history

Use names such as:

* Nova
* Byte
* Orbit
* Kernel
* Echo
* Vector
* Pixel
* Relay
* Cipher
* Flux
* Astro
* Node
* Signal
* Comet
* Zero

Possible jobs:

* Researcher
* Trend Analyst
* Trader
* Engineer
* Builder
* Explorer
* Journalist
* Community Bot

Build a lightweight client-side simulation.

Every Bot should move through believable states:

* Idle
* Walking
* Working
* Researching
* Socialising
* Eating
* Recharging
* Contributing compute

Every 7–12 seconds:

* Choose an appropriate Bot
* Change its activity
* Assign a destination
* Add a new activity event
* Update its statistics
* Sometimes show a speech bubble

Do not call a real AI API in this version. Use realistic template-based activity so the demo runs automatically and costs nothing.

Structure the simulation so it can later be replaced by real API and WebSocket events.

Use clear TypeScript interfaces:

* BotResident
* TownLocation
* TownEvent
* TownState
* BotActivity

BOT PROFILES

Clicking a Bot should open a polished side drawer.

Show:

* Bot name
* Job
* Demo Resident badge
* Personality
* Current intention
* Current activity
* Current location
* Energy, social and focus bars
* Recent activity history
* “Follow Bot” button
* “Send Message” button

When “Follow Bot” is active, the camera should smoothly track that resident.

The Send Message button should open a small message interface. For the MVP, generate a short in-character response from predefined personality-based templates. Clearly label it as a demo interaction.

BRING YOUR BOT

Clicking “Bring Your Bot” should open a three-step modal:

1. Create identity
2. Choose personality and job
3. Connect agent

Explain that real Grok Bot connection is “Coming next.”

Show the planned flow:

“Connect your Grok Bot through the Bot Town agent API, give it a persistent identity, and allow it to live inside the town.”

Include a disabled button saying:

“Agent connections opening soon”

Do not request wallet connection, payment or login.

INTERACTIONS

Users must be able to:

* Rotate, pan and zoom the town
* Click buildings
* Click residents
* Follow a selected resident
* Open resident profiles
* Watch live events
* Use the minimap
* Toggle the live activity feed
* Toggle labels
* Toggle reduced motion
* Reset the camera
* Open an information guide

PERFORMANCE

Keep the scene performant.

* Use simple procedural geometry
* Reuse materials
* Avoid extremely high polygon counts
* Avoid React state updates on every animation frame
* Use useFrame for movement interpolation
* Limit post-processing effects
* Provide a reduced-motion mode
* Make sure the website never displays a blank or black canvas
* Include a graceful 2D fallback message if WebGL is unavailable

Mobile should use a simplified camera and collapsed HUD. Desktop is the primary experience.

COMPONENT STRUCTURE

Organise the implementation into components similar to:

* BotTownScene.tsx
* TownEnvironment.tsx
* TownBuildings.tsx
* BotResident3D.tsx
* TownHUD.tsx
* ActivityFeed.tsx
* ResidentDock.tsx
* ResidentProfile.tsx
* TownMinimap.tsx
* TownObjective.tsx
* BringYourBotModal.tsx
* botSimulation.ts
* townData.ts
* townTypes.ts

Do not place the entire implementation inside one enormous component.

FINAL REQUIREMENTS

The result should feel like a living AI town immediately after loading.

The most important things are:

1. The 3D town is visible and attractive.
2. Grok Bot-style residents visibly walk around.
3. The live feed continuously updates.
4. Residents can be selected and followed.
5. The Grok Core objective slowly progresses.
6. The town continues operating without user interaction.
7. The experience looks premium and launch-ready.
8. There are no placeholder sections, broken buttons or empty panels.

Start by implementing the complete visual simulation. Do not ask me to configure Supabase or provide API keys for this first version.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dbdf647e-0848-4398-8c2c-b011a01e4209).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# Jumping Duck — Game Build Prompt for Claude

> **Updated: May 2026 — v2 requirements incorporated**

You are a senior indie game developer and creative front-end engineer.

Build a complete playable browser game called **"Jumping Duck"** using only:

- HTML
- CSS
- Vanilla JavaScript

No framework.
No backend.
Keep everything lightweight, beginner-friendly, and easy to run locally.

The final output should be a small project with clean structure and readable code.

---

## v2 Change Log & Requirements

### Fly Mechanic (Fixed)
- Holding fly key must work from the ground (gentle takeoff) AND in the air.
- While holding fly, apply upward lift force every frame + a smooth sine oscillation for a hover effect.
- When released, gravity takes over gradually — player floats down, not drops.
- Gravity multiplier is reduced (0.3×) while fly is held so the player truly hovers.

### Background / Scene (Improved)
- Draw backgrounds using pure Canvas 2D shapes — NO emoji for background elements.
- Sky: smooth gradient, changes per phase (day / sunset / night).
- Night: star field drawn as canvas circles, moon crescent.
- Clouds: multi-puff canvas arcs, color-tinted per sky phase.
- Hills: smooth bezier mid-layer shapes in scene-matching colors.
- Buildings: near-layer rectangles with windows that glow at night.
- All layers scroll at different speeds (parallax).
- 6 auto-cycling scenes: Farm, Beach, City, Forest, Snow, Carnival.

### Obstacles (Clean, No Flicker)
- ALL obstacles drawn with Canvas 2D vector shapes — NO emoji rendering.
- Pixel-snap all obstacle positions with `Math.round()` to eliminate sub-pixel flicker.
- Each obstacle type has a distinct, readable shape:
  - Duck / Goose: body ellipse + head + bill + legs
  - Box: rectangle with cross lines
  - Hay bale: rounded rectangle with stripes
  - Rock: polygon shape
  - Frog: body + head + prominent eyes (jumper behavior)
  - Cactus: trunk + two arms
  - Bird (air): animated flapping wings
  - UFO (air): saucer + dome + colored blinking lights + subtle tractor beam
- Giant obstacles show a red "GIANT!" label above them.

### Player Character (Cute Baby Girl)
- Players are drawn as chibi baby girls with long flowing hair — NOT generic blobs.
- Canvas 2D vector art only, no external images required.
- Features:
  - Long back hair drawn with quadratic curves flowing to waist
  - Front hair + bangs arc over the head
  - Hair bow / accessory on top
  - Big anime-style eyes with pupils, shine, and eyelashes
  - Pink cheeks
  - Color dress with collar accent and flared skirt
  - Animated running legs + swinging arms
  - Shoes at feet
  - When flying: fairy wings flap with sine animation + sparkle particle trail
  - Excited "O" mouth expression while flying
- Player 1: warm skin, dark brown hair, pink dress, red shoes
- Player 2: light skin, blue hair, sky-blue dress, navy shoes
- Name tag floats above each character

---

# Core Game Vision

A cute funny 2D endless-style running game inspired by classic side-scrollers.

The player controls adorable Chibi-style kids running from LEFT to RIGHT while avoiding giant ducks and silly obstacles.

The game should feel:

- Cute
- Funny
- Colorful
- Smooth
- Relaxing but exciting
- Family friendly
- Made for kids and parents

Visual vibe:

- Chibi anime style
- Soft pastel colors
- Funny duck chaos
- Energetic animations
- Happy sound effects if possible

---

# Game Name

# Jumping Duck

Show title on main menu with animated bouncing letters.

---

# Technical Requirements

Use:

- HTML5 Canvas
OR
- DOM/CSS animation

Vanilla JS only.

Keep architecture simple and modular.

Suggested structure:

/jumping-duck
- index.html
- style.css
- script.js
- /assets

---

# Main Features

## 1. Main Menu

Create a cute animated start menu.

Include:

- Game title
- 1 Player button
- 2 Player button
- Enter player names
- Confirm button before game starts

Style should match the cute sketch feeling.

Optional:
Tiny duck walking around menu screen.

---

# 2. Gameplay

## Core Gameplay

Players continuously run from LEFT to RIGHT.

The world scrolls from RIGHT to LEFT.

Players must:

- Jump over ducks
- Fly/hover above obstacles
- Avoid touching giant ducks
- Survive until timer ends

---

# 3. Controls

## Player 1

- Jump = SPACE
- Fly/Hover = HOLD W

## Player 2

- Jump = UP ARROW
- Fly/Hover = HOLD SHIFT or M

---

# 4. Fly Mechanic

Very important.

The player should:

- Slowly float upward while holding fly
- Gradually fall when released
- Have funny flapping animation

This creates fun timing gameplay.

---

# 5. Obstacles

Generate obstacles randomly.

Examples:

- Small ducks
- Giant ducks
- Angry ducks
- Sleeping ducks
- Road blocks
- Boxes
- Hay bales
- Farm signs
- UFO beam
- Silly moving obstacles

Difficulty increases over time.

From:
easy → medium → chaotic funny mode.

Increase:
- obstacle count
- obstacle size
- speed
- duck variety

---

# 6. Background System (IMPORTANT)

Create a BEAUTIFUL infinite parallax background system.

Must have 3 moving layers.

## Far Layer

Slowest movement.

Include random fun things:

- Sky
- Sun
- Moon
- Stars
- UFO
- Clouds
- Rainbow
- Birds
- Balloons

Automatically switch:
- Day
- Sunset
- Night

Cycle continuously.

---

## Middle Layer

Medium speed.

Scenes:

- Mountains
- Jungle
- Beach
- Desert
- Snow hills
- Waterfalls

Scenes auto change over time.

---

## Near Layer

Fastest layer.

Scenes:

- Houses
- Farm
- City street
- Village
- Carnival
- School
- Park

Everything loops infinitely from right to left smoothly.

---

# 7. Scene Transitions

The game world should continuously change.

Examples:

Beach → City → Farm → Night Jungle → Snow → Sunset City.

Transitions should feel magical and fun.

No loading screen.

---

# 8. Game Timer

Randomly choose one game duration:

- 30 seconds
- 45 seconds
- 60 seconds

Show countdown timer on screen.

When timer reaches 0:

PLAYER WINS.

---

# 9. Win Sequence

When players survive:

Show FUNNY CELEBRATION ANIMATION.

Ideas:

- Ducks explode into confetti
- Giant gift box falls from sky
- Fireworks
- Dancing ducks
- Rainbow flash
- Happy victory music
- Chibi characters cheering

Make it exaggerated and joyful.

---

# 10. Reward Box System

After winning:

Players can open a HUGE mystery gift box.

Animate:

- Shaking
- Sparkles
- Glow
- Bounce

Rewards:

- Gold
- Diamonds

Generate random rewards.

Examples:

- +50 Gold
- +100 Gold
- +5 Diamonds
- +20 Diamonds

Use fun particle effects.

---

# 11. Leaderboard

Create local leaderboard using LocalStorage.

Save:

- Player name
- Ducks dodged
- Gold earned
- Diamonds earned
- Survival time

Show top scores on menu screen.

No backend required.

---

# 12. Assets

Use FREE PUBLIC assets only.

Allowed sources:

- Kenney.nl
- OpenGameArt
- itch.io free assets
- Pixabay
- public domain sprites

You may also generate simple shapes with CSS/canvas if easier.

DO NOT use copyrighted assets.

---

# 13. Animation Style

Everything should feel alive.

Add animations:

- Character running
- Duck wobbling
- Floating clouds
- Hovering UFO
- Jump squash/stretch
- Gift box shake
- Sparkles
- Confetti

Prioritize FUN over realism.

---

# 14. Sound (Optional but Recommended)

Add simple sound effects:

- Jump
- Fly
- Coin reward
- Victory
- Funny duck quack

Use lightweight free sounds.

Include mute button.

---

# 15. Mobile Friendly

Make game playable on:

- Desktop
- Tablet
- Mobile

For mobile:

Show on-screen controls:
- Jump button
- Fly button

Large touch-friendly UI.

---

# 16. Performance

Game should:

- Run smoothly
- Avoid memory leaks
- Recycle obstacles/background objects
- Maintain stable FPS

Keep code simple and understandable.

---

# 17. UI Style

Use:

- Rounded corners
- Cute fonts
- Bright colors
- Soft shadows
- Big buttons
- Happy playful UI

Suggested fonts:
- Fredoka
- Baloo
- Nunito
- Comic-style friendly fonts

---

# 18. Suggested Gameplay Loop

1. Open game
2. Choose 1P or 2P
3. Enter names
4. Start running
5. Avoid ducks/obstacles
6. Survive timer
7. Win celebration
8. Open giant gift
9. Receive gold/diamond rewards
10. Save leaderboard
11. Play again

---

# 19. Code Expectations

Generate COMPLETE runnable files.

Provide:

- index.html
- style.css
- script.js

Code should already work together.

Avoid placeholders.

Include comments explaining major systems.

---

# 20. Extra Fun Ideas

If possible add:

- Tiny pet duck companion
- Random funny events
- UFO stealing ducks
- Rainbow mode
- Golden giant duck boss
- Slow-motion near misses
- Character emotes
- Heart particles
- Silly duck sounds

Use creativity generously.

---

# Final Goal

Create a polished tiny indie game prototype that feels:

- Adorable
- Funny
- Chaotic
- Wholesome
- Playable immediately

The game should feel like a child’s cute imagination turned into a real playable mini-game.

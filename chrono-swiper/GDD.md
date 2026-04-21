# Chrono-Swiper — Game Design Document

**Version:** 1.0  
**Date:** 2026-04-21  
**Status:** Current implementation  

---

## 1. Overview

Chrono-Swiper is a single-player, endless arcade runner built on HTML5 Canvas. The player pilots a glowing orb through an infinite corridor of procedurally generated barriers, steering horizontally to thread gaps while managing a consumable time-dilation resource called **Chrono-Shift**. The session ends the moment the orb contacts any barrier, pushing the player to restart and beat their personal best.

**Genre:** Endless arcade / reflex runner  
**Platform:** Web (desktop + mobile)  
**Input:** Swipe / drag (touch), mouse drag, or keyboard (A/D / arrows + spacebar/shift)  
**Session length:** 1–5 minutes per run  
**Persistence:** Personal best score saved to `localStorage`  

---

## 2. Core Loop

```
Start → Navigate obstacles → Collect near-miss bonuses → Manage Chrono meter
  ↑                                                                     ↓
Retry ←─────────────────── Collision → Game Over ←────────────────────┘
```

Each run is a single continuous push. Distance and forward speed increase automatically; the player only controls lateral position and when to spend Chrono. The tension comes from trading Chrono for precision and score rate versus saving it for upcoming tight gaps.

---

## 3. Player

### 3.1 Representation

- **Visual:** 8 px glowing orb with a pulsing outer ring (8–12 px radius) and a colour-matched shadow halo.
- **Normal colour:** Warm gold (`#fff6c9`)
- **Chrono colour:** Bright cyan (`#a9f4ff`)
- **Trail:** Up to 60 previous frame positions drawn behind the orb; cyan during Chrono, gold otherwise.

### 3.2 Position & Constraints

| Property | Value |
|---|---|
| Vertical position | Fixed at 120 px from screen bottom |
| Lateral bounds | Track width − 28 px margin each side |
| Collision radius | 10 px |

### 3.3 Movement Physics

Lateral movement is spring-follow physics, not direct position mapping.

- The **target X** is set by swipe/drag offset or keyboard input.
- Actual X approaches target X each frame: `actualX += (targetX − actualX) × min(1, followK × dt)`
- **`followK`**: 18 when Chrono is active, 14 otherwise (tighter response during slow-motion).
- Keyboard steering accumulates velocity at 1 800 px/sec² before clamping to track bounds.
- Velocity is derived from the frame-to-frame position delta and used for the trail effect.

---

## 4. Chrono-Shift

Chrono-Shift is the defining mechanic. It slows subjective game time, giving the player more reaction window and enabling tighter gap navigation at the cost of a depletable resource.

### 4.1 Parameters

| Parameter | Value |
|---|---|
| Activation | Hold pointer / hold spacebar or shift |
| Hold threshold | 50 ms (instant if pointer barely moves) |
| Time scale when active | 0.20 (20% speed) |
| Drain rate | 0.55 / sec (real time) |
| Recharge rate | 0.32 / sec (real time, only when not held) |
| Time scale interpolation | `timeScale += (target − timeScale) × min(1, realDt × 14)` |

### 4.2 HUD Representation

- Horizontal bar centred at screen bottom, up to 260 px wide.
- **Colour:** Cyan when active; white when ≥ 30 %; red when < 30 %.
- Percentage value displayed as text above the bar.

### 4.3 Strategic Trade-offs

| Choice | Benefit | Cost |
|---|---|---|
| Use Chrono | 2.2× score rate; safer navigation | Meter drains |
| Save Chrono | Meter refills passively | 1.0× score rate; faster subjective gap approach |
| Meter empty | Forced normal speed | Must wait for recharge |

---

## 5. Obstacles

All obstacles scroll toward the player at the current forward speed. They are procedurally generated ahead of the player's world Y position and destroyed once they pass out of view below.

### 5.1 Forward Speed

```
speedBase   = 520 px/sec (constant)
speedBoost  = min(380, 0.02 × distance)  px/sec
effectiveSpeed = (speedBase + speedBoost) × timeScale
```

Speed caps at 900 px/sec before time scaling, giving a natural difficulty ramp that levels off.

### 5.2 Difficulty Scalar

```
d = min(1.6, distance / 12 000)
```

`d` rises from 0 to 1.6 over the first 12 000 distance units, then stays constant. All procedural parameters are functions of `d`.

### 5.3 Spacing & Gap Sizing

| Property | Formula |
|---|---|
| Vertical spacing between obstacles | `rand(340 − d×90, 520 − d×140)` px |
| Gap width (min) | `110 − d×50` px |
| Gap width (max) | `190 − d×60` px |
| Obstacle thickness | `rand(22, 36)` px |

### 5.4 Obstacle Types

#### Wall
A full-width horizontal bar with a single gap at a random X position. The most common type at all difficulties. Establishes the base lane-reading skill.

#### Slab
Two **Wall** barriers staggered 180–260 px apart vertically. The second wall's gap is 5 % wider than the first. Creates a quick slalom: players must assess both gaps simultaneously.  
*Available from difficulty 0.*

#### Comb
Three to five evenly-spaced vertical pillars span the track; exactly one lane (gap) is open. Forces the player to commit to a specific lane early.  
*Unlocks at difficulty ≥ 0.35.*

#### Diag
Two **Wall** barriers placed 140–200 px apart where the gap position shifts 120–220 px horizontally between them. The second gap is 5 % narrower. Tests the ability to cut diagonally through successive barriers.  
*Available from difficulty 0.*

### 5.5 Type Gating Summary

| Difficulty | Types available |
|---|---|
| 0.00 – 0.15 | Wall only |
| 0.15 – 0.35 | Wall, Slab, Diag |
| 0.35+ | Wall, Slab, Diag, Comb |

### 5.6 Visual Style

- Obstacles are rendered as glowing bars/pillars with HSL colours (hue 200–240 °, 90 % saturation, 55–65 % lightness).
- Shadow blur: 9 px normal, 24 px during Chrono.
- A faint guide line marks each gap (near-invisible, subtle aid).

---

## 6. Near-Miss & Multiplier System

### 6.1 Near-Miss Detection

After the player's orb clears an obstacle's Y-band, the game measures the distance from the orb's X position to each gap edge. The closest edge determines the bonus tier.

| Tier | Distance to edge | Bonus points | Stars displayed |
|---|---|---|---|
| 1 | ≤ 44 px | 40 × multiplier | ★☆☆ |
| 2 | ≤ 28 px | 80 × multiplier | ★★☆ |
| 3 | ≤ 16 px | 120 × multiplier | ★★★ |

### 6.2 Streak

- Each near-miss increments the **streak** counter, capped at 9.
- **Multiplier:** `1 + streak × 0.15` → range 1.0× to 2.35×.
- **Decay:** Streak decrements by 1 every 2.5 seconds without a near-miss.
- The HUD shows the current multiplier when it exceeds 1.01× (e.g., "x1.60").

### 6.3 Particle Burst

Near-misses spawn 8–26 particles whose count and colours scale with tier intensity (cyan for low, gold for mid, pink for high).

---

## 7. Scoring

### 7.1 Continuous Score

Every game-time second, score accrues based on forward travel:

```
scoreRate   = (chronoActive ? 2.2 : 1.0) × multiplier
scoreDelta  = effectiveSpeed × dt × 0.1 × scoreRate
```

### 7.2 Bonus Score

Near-miss bonuses are added once per cleared obstacle, multiplied by the current streak multiplier.

### 7.3 Personal Best

Best score persisted in `localStorage` key `chrono_best`. The game over screen flags a new record with "NEW PERSONAL BEST".

---

## 8. Collision & Game Over

- Collision triggers when the orb (radius 10 px) overlaps any barrier solid region.
- **Wall/Slab/Diag:** horizontal check — orb X is outside the gap bounds plus a safety margin.
- **Comb:** AABB check against each pillar's bounding box.
- **On collision:**
  1. Screen shake initiates (18 px intensity, exponential decay).
  2. 60 explosion particles burst outward.
  3. Screen brightness flashes to 2.2×.
  4. Time-scale drains to zero over 600 ms (cinematic slow-mo death).
  5. Game over screen appears with final score and retry option.

---

## 9. Visual Design

### 9.1 Colour Palette

| Role | Value |
|---|---|
| Background | `#05060a` (near-black blue) |
| Text / foreground | `#e9f1ff` (cold white) |
| Chrono accent | `#7cf7ff` (bright cyan) |
| Death / warning | `#ff4d6d` (neon pink-red) |
| Score / near-miss | `#ffd166` (gold) |

### 9.2 Scene Layers (back to front)

1. **Starfield** — 120 depth-sorted stars scrolling at parallax rates proportional to their Z (0.2–1.0). Stars turn cyan during Chrono.
2. **Track edges** — Two vertical 2 px cyan lines at the lateral margins (opacity 0.25).
3. **Scroll lines** — Dashed centre stripe animating downward to reinforce forward motion; more opaque during Chrono.
4. **Obstacles** — Glowing bars and pillars.
5. **Player trail** — Fading prior-position circles.
6. **Player orb** — Core circle + pulsing ring + glow (pulsing at 18 rad/sec).
7. **Particles** — Near-miss bursts and death explosion.
8. **HUD overlays** — Score, best, Chrono bar, multiplier, near-miss flash.
9. **Screen flash** — Full-canvas brightness overlay on death.

---

## 10. HUD Layout

```
┌──────────────────────────────────────┐
│  SCORE  [value]    BEST  [value]     │  ← top bar
│                    CHRONO  [xx%]     │
│                                      │
│           [play field]               │
│                                      │
│            x1.60                     │  ← multiplier (when > 1.01)
│         [NEAR MISS]                  │  ← flash (0.5 sec fade)
│       [────────────] 78%             │  ← Chrono bar
│  SWIPE to steer · HOLD to Chrono-Shift  │  ← hint (bottom)
└──────────────────────────────────────┘
```

---

## 11. Game States

| State | Trigger | Description |
|---|---|---|
| **Idle / Menu** | App load; after game over | Starfield animates; stats and hint visible; tap/click/key to start |
| **Running** | Tap/click/key from idle | Full game loop active |
| **Game Over** | Collision | Slow-mo death animation → score screen → RETRY button |

Tab visibility API pauses the idle animation when the page is hidden.

---

## 12. Technical Summary

| Property | Detail |
|---|---|
| Renderer | HTML5 Canvas 2D |
| Language | Vanilla JavaScript (ES6, closure pattern) |
| Dependencies | None |
| Canvas scaling | Device pixel ratio (capped at 2×) |
| Target frame rate | 60 fps via `requestAnimationFrame` |
| Delta cap | 50 ms (prevents spiral of death on tab switch) |
| Mobile support | Touch events, safe-area insets, gesture prevention |
| Persistence | `localStorage` (best score only) |

---

## 13. Difficulty Progression Summary

| Distance | Approx. `d` | Notable changes |
|---|---|---|
| 0 | 0.00 | Walls only, wide gaps, slow speed |
| 2 000 | 0.17 | Slab and Diag types unlock |
| 4 000 | 0.33 | Gaps narrowing, spacing tighter |
| 4 200 | 0.35 | Comb type unlocks |
| 8 000 | 0.67 | Speed nearing mid-ramp |
| 12 000 | 1.00 | Gaps at near-minimum, high speed |
| 12 000+ | 1.60 (cap) | Hardest configuration, constant |

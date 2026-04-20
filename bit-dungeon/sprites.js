// Pixel-art sprite library. Each sprite is a 16x16 SVG rendered with shape-rendering: crispEdges.
// Using inline SVG avoids any network/licensing issues and keeps sprites crisp at any zoom.

const SPRITES = {
  player: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- helmet -->
      <rect x="5" y="1" width="6" height="2" fill="#c9a24a"/>
      <rect x="4" y="2" width="8" height="1" fill="#e8c55a"/>
      <rect x="4" y="3" width="1" height="3" fill="#c9a24a"/>
      <rect x="11" y="3" width="1" height="3" fill="#c9a24a"/>
      <!-- face -->
      <rect x="5" y="3" width="6" height="3" fill="#f2d4a0"/>
      <rect x="6" y="4" width="1" height="1" fill="#2a1a0a"/>
      <rect x="9" y="4" width="1" height="1" fill="#2a1a0a"/>
      <!-- body/tunic -->
      <rect x="4" y="6" width="8" height="5" fill="#7a1f2b"/>
      <rect x="5" y="7" width="6" height="3" fill="#a83242"/>
      <rect x="7" y="6" width="2" height="1" fill="#e8c55a"/>
      <!-- arms -->
      <rect x="3" y="7" width="1" height="3" fill="#7a1f2b"/>
      <rect x="12" y="7" width="1" height="3" fill="#7a1f2b"/>
      <!-- sword -->
      <rect x="13" y="5" width="1" height="5" fill="#cfd6e0"/>
      <rect x="13" y="4" width="1" height="1" fill="#e8eef6"/>
      <rect x="12" y="10" width="3" height="1" fill="#5a3b1c"/>
      <!-- legs -->
      <rect x="5" y="11" width="2" height="3" fill="#2f3a52"/>
      <rect x="9" y="11" width="2" height="3" fill="#2f3a52"/>
      <rect x="4" y="14" width="3" height="1" fill="#1a1406"/>
      <rect x="9" y="14" width="3" height="1" fill="#1a1406"/>
    </svg>
  `,

  // Enemy tier 1: rat
  enemy1: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect x="4" y="9" width="8" height="4" fill="#6d4a2a"/>
      <rect x="3" y="10" width="1" height="2" fill="#6d4a2a"/>
      <rect x="12" y="8" width="2" height="3" fill="#6d4a2a"/>
      <rect x="13" y="7" width="1" height="2" fill="#6d4a2a"/>
      <rect x="5" y="8" width="5" height="2" fill="#8a6038"/>
      <rect x="13" y="8" width="1" height="1" fill="#f2a0a0"/>
      <rect x="12" y="9" width="1" height="1" fill="#0a0a0a"/>
      <rect x="12" y="11" width="1" height="1" fill="#f2f2f2"/>
      <!-- tail -->
      <rect x="3" y="11" width="1" height="1" fill="#6d4a2a"/>
      <rect x="2" y="12" width="1" height="1" fill="#6d4a2a"/>
      <rect x="1" y="13" width="1" height="1" fill="#6d4a2a"/>
      <!-- legs -->
      <rect x="5" y="13" width="1" height="1" fill="#3a2814"/>
      <rect x="7" y="13" width="1" height="1" fill="#3a2814"/>
      <rect x="9" y="13" width="1" height="1" fill="#3a2814"/>
      <rect x="11" y="13" width="1" height="1" fill="#3a2814"/>
    </svg>
  `,

  // Enemy tier 2: goblin
  enemy2: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- ears -->
      <rect x="3" y="4" width="2" height="2" fill="#4a8a3a"/>
      <rect x="11" y="4" width="2" height="2" fill="#4a8a3a"/>
      <!-- head -->
      <rect x="4" y="3" width="8" height="5" fill="#5ba04a"/>
      <rect x="4" y="5" width="8" height="2" fill="#76bb5b"/>
      <rect x="6" y="5" width="1" height="1" fill="#f24b4b"/>
      <rect x="9" y="5" width="1" height="1" fill="#f24b4b"/>
      <!-- mouth + fangs -->
      <rect x="6" y="7" width="4" height="1" fill="#1a1a1a"/>
      <rect x="6" y="7" width="1" height="1" fill="#fff"/>
      <rect x="9" y="7" width="1" height="1" fill="#fff"/>
      <!-- body -->
      <rect x="4" y="8" width="8" height="4" fill="#4a3a2a"/>
      <rect x="5" y="9" width="6" height="2" fill="#6a5438"/>
      <!-- arms -->
      <rect x="3" y="8" width="1" height="3" fill="#5ba04a"/>
      <rect x="12" y="8" width="1" height="3" fill="#5ba04a"/>
      <!-- club -->
      <rect x="13" y="6" width="2" height="3" fill="#6a4022"/>
      <rect x="12" y="9" width="1" height="2" fill="#6a4022"/>
      <!-- legs -->
      <rect x="5" y="12" width="2" height="3" fill="#5ba04a"/>
      <rect x="9" y="12" width="2" height="3" fill="#5ba04a"/>
    </svg>
  `,

  // Enemy tier 3: orc (stronger)
  enemy3: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- horns -->
      <rect x="3" y="1" width="1" height="2" fill="#d4d4d4"/>
      <rect x="12" y="1" width="1" height="2" fill="#d4d4d4"/>
      <!-- head -->
      <rect x="3" y="2" width="10" height="5" fill="#7a1a6a"/>
      <rect x="4" y="3" width="8" height="3" fill="#a02a92"/>
      <rect x="5" y="4" width="1" height="1" fill="#f7c64b"/>
      <rect x="10" y="4" width="1" height="1" fill="#f7c64b"/>
      <rect x="5" y="6" width="6" height="1" fill="#1a1a1a"/>
      <rect x="5" y="6" width="1" height="1" fill="#fff"/>
      <rect x="7" y="6" width="1" height="1" fill="#fff"/>
      <rect x="10" y="6" width="1" height="1" fill="#fff"/>
      <!-- armor body -->
      <rect x="3" y="7" width="10" height="5" fill="#3a3648"/>
      <rect x="4" y="8" width="8" height="3" fill="#56536a"/>
      <rect x="7" y="9" width="2" height="1" fill="#c7c4dc"/>
      <!-- arms -->
      <rect x="2" y="8" width="1" height="3" fill="#7a1a6a"/>
      <rect x="13" y="8" width="1" height="3" fill="#7a1a6a"/>
      <!-- axe -->
      <rect x="14" y="5" width="1" height="5" fill="#5a3b1c"/>
      <rect x="13" y="5" width="2" height="2" fill="#d4d4d4"/>
      <rect x="12" y="6" width="1" height="1" fill="#a0a0a0"/>
      <!-- legs -->
      <rect x="4" y="12" width="3" height="3" fill="#3a3648"/>
      <rect x="9" y="12" width="3" height="3" fill="#3a3648"/>
    </svg>
  `,

  // Enemy tier 4: skeleton knight (stronger)
  enemy4: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- skull -->
      <rect x="4" y="2" width="8" height="5" fill="#e8e8dc"/>
      <rect x="4" y="3" width="1" height="3" fill="#bdbdb0"/>
      <rect x="11" y="3" width="1" height="3" fill="#bdbdb0"/>
      <rect x="6" y="4" width="1" height="2" fill="#0a0a0a"/>
      <rect x="9" y="4" width="1" height="2" fill="#0a0a0a"/>
      <rect x="6" y="4" width="1" height="1" fill="#ff3040"/>
      <rect x="9" y="4" width="1" height="1" fill="#ff3040"/>
      <rect x="5" y="6" width="6" height="1" fill="#bdbdb0"/>
      <rect x="6" y="6" width="1" height="1" fill="#0a0a0a"/>
      <rect x="8" y="6" width="1" height="1" fill="#0a0a0a"/>
      <!-- rib armor -->
      <rect x="4" y="7" width="8" height="5" fill="#48506a"/>
      <rect x="5" y="8" width="6" height="3" fill="#6a7290"/>
      <rect x="6" y="9" width="1" height="1" fill="#e8e8dc"/>
      <rect x="9" y="9" width="1" height="1" fill="#e8e8dc"/>
      <!-- arms -->
      <rect x="3" y="7" width="1" height="4" fill="#48506a"/>
      <rect x="12" y="7" width="1" height="4" fill="#48506a"/>
      <!-- sword tall -->
      <rect x="14" y="3" width="1" height="7" fill="#e8eef6"/>
      <rect x="13" y="10" width="3" height="1" fill="#c9a24a"/>
      <!-- legs -->
      <rect x="5" y="12" width="2" height="3" fill="#48506a"/>
      <rect x="9" y="12" width="2" height="3" fill="#48506a"/>
    </svg>
  `,

  // Enemy tier 5: demon (boss-tier)
  enemy5: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- horns -->
      <rect x="2" y="0" width="2" height="2" fill="#2a1010"/>
      <rect x="12" y="0" width="2" height="2" fill="#2a1010"/>
      <rect x="3" y="1" width="1" height="2" fill="#7a1a1a"/>
      <rect x="12" y="1" width="1" height="2" fill="#7a1a1a"/>
      <!-- head -->
      <rect x="3" y="2" width="10" height="5" fill="#9a1c1c"/>
      <rect x="4" y="3" width="8" height="3" fill="#c42a2a"/>
      <rect x="5" y="4" width="2" height="2" fill="#f7e14b"/>
      <rect x="9" y="4" width="2" height="2" fill="#f7e14b"/>
      <rect x="6" y="5" width="1" height="1" fill="#1a0000"/>
      <rect x="10" y="5" width="1" height="1" fill="#1a0000"/>
      <!-- mouth -->
      <rect x="5" y="6" width="6" height="1" fill="#1a0000"/>
      <rect x="6" y="6" width="1" height="1" fill="#fff"/>
      <rect x="8" y="6" width="1" height="1" fill="#fff"/>
      <rect x="10" y="6" width="1" height="1" fill="#fff"/>
      <!-- body -->
      <rect x="3" y="7" width="10" height="5" fill="#7a1a1a"/>
      <rect x="4" y="8" width="8" height="3" fill="#a83232"/>
      <rect x="7" y="9" width="2" height="2" fill="#f7e14b"/>
      <!-- wings -->
      <rect x="0" y="6" width="3" height="5" fill="#3a0a0a"/>
      <rect x="1" y="5" width="2" height="1" fill="#3a0a0a"/>
      <rect x="13" y="6" width="3" height="5" fill="#3a0a0a"/>
      <rect x="13" y="5" width="2" height="1" fill="#3a0a0a"/>
      <!-- legs -->
      <rect x="4" y="12" width="3" height="3" fill="#7a1a1a"/>
      <rect x="9" y="12" width="3" height="3" fill="#7a1a1a"/>
      <rect x="4" y="15" width="3" height="1" fill="#2a0000"/>
      <rect x="9" y="15" width="3" height="1" fill="#2a0000"/>
    </svg>
  `,

  trap: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <!-- base plate -->
      <rect x="1" y="12" width="14" height="3" fill="#2a2030"/>
      <rect x="1" y="12" width="14" height="1" fill="#4a3a5a"/>
      <!-- spikes -->
      <rect x="2" y="8" width="2" height="5" fill="#c0c4d2"/>
      <rect x="3" y="6" width="1" height="2" fill="#c0c4d2"/>
      <rect x="2" y="8" width="1" height="5" fill="#7a82a0"/>

      <rect x="5" y="6" width="2" height="7" fill="#c0c4d2"/>
      <rect x="6" y="3" width="1" height="3" fill="#c0c4d2"/>
      <rect x="5" y="6" width="1" height="7" fill="#7a82a0"/>

      <rect x="8" y="7" width="2" height="6" fill="#c0c4d2"/>
      <rect x="9" y="4" width="1" height="3" fill="#c0c4d2"/>
      <rect x="8" y="7" width="1" height="6" fill="#7a82a0"/>

      <rect x="11" y="6" width="2" height="7" fill="#c0c4d2"/>
      <rect x="12" y="3" width="1" height="3" fill="#c0c4d2"/>
      <rect x="11" y="6" width="1" height="7" fill="#7a82a0"/>

      <!-- blood tips -->
      <rect x="3" y="6" width="1" height="1" fill="#b02020"/>
      <rect x="6" y="3" width="1" height="1" fill="#b02020"/>
      <rect x="9" y="4" width="1" height="1" fill="#b02020"/>
      <rect x="12" y="3" width="1" height="1" fill="#b02020"/>
    </svg>
  `,

  loot_heart: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect x="3" y="3" width="3" height="2" fill="#d42a2a"/>
      <rect x="10" y="3" width="3" height="2" fill="#d42a2a"/>
      <rect x="2" y="4" width="5" height="3" fill="#d42a2a"/>
      <rect x="9" y="4" width="5" height="3" fill="#d42a2a"/>
      <rect x="2" y="5" width="12" height="3" fill="#d42a2a"/>
      <rect x="3" y="8" width="10" height="2" fill="#d42a2a"/>
      <rect x="4" y="10" width="8" height="1" fill="#d42a2a"/>
      <rect x="5" y="11" width="6" height="1" fill="#d42a2a"/>
      <rect x="6" y="12" width="4" height="1" fill="#d42a2a"/>
      <rect x="7" y="13" width="2" height="1" fill="#d42a2a"/>
      <!-- highlight -->
      <rect x="3" y="4" width="2" height="1" fill="#ff6a6a"/>
      <rect x="4" y="5" width="1" height="2" fill="#ff6a6a"/>
    </svg>
  `,

  loot_sword: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect x="7" y="1" width="2" height="9" fill="#e8eef6"/>
      <rect x="7" y="1" width="1" height="9" fill="#a8b0c0"/>
      <rect x="8" y="10" width="1" height="1" fill="#a8b0c0"/>
      <!-- tip -->
      <rect x="7" y="0" width="2" height="1" fill="#ffffff"/>
      <!-- crossguard -->
      <rect x="4" y="10" width="8" height="1" fill="#c9a24a"/>
      <rect x="4" y="11" width="8" height="1" fill="#8a6a2a"/>
      <!-- grip -->
      <rect x="7" y="12" width="2" height="3" fill="#5a3b1c"/>
      <!-- pommel -->
      <rect x="6" y="15" width="4" height="1" fill="#c9a24a"/>
    </svg>
  `,

  loot_gold: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect x="4" y="3" width="8" height="10" fill="#d9a635"/>
      <rect x="3" y="4" width="10" height="8" fill="#d9a635"/>
      <rect x="4" y="4" width="8" height="8" fill="#f4c94b"/>
      <rect x="5" y="5" width="6" height="6" fill="#f7de6a"/>
      <rect x="6" y="6" width="1" height="4" fill="#8a6a1a"/>
      <rect x="9" y="6" width="1" height="4" fill="#8a6a1a"/>
      <rect x="7" y="6" width="2" height="1" fill="#8a6a1a"/>
      <rect x="7" y="8" width="2" height="1" fill="#8a6a1a"/>
      <rect x="7" y="10" width="2" height="1" fill="#8a6a1a"/>
      <rect x="5" y="5" width="1" height="1" fill="#fff3a8"/>
    </svg>
  `,
};

// Card definitions. Keywords drive synergy engine in game.js.
// Keywords:
//   onPlay: fires when battle starts
//   onAlly{Tag}Play: fires when another ally with Tag enters (not used — static board)
//   onTurnStart / onTurnEnd: per combat tick
//   onDeath: fires when this card dies
//   onAttack: fires when this card attacks
//   passive: static modifier applied during battle setup
// Effects are structured data; engine reads them.

const TAGS = ["Fire","Water","Beast","Order","Chaos","Mech","Undead"];

const CARDS = [
  // ---- COMMON ----
  { id:"ember",    name:"Ember Imp",      tags:["Fire","Chaos"],   atk:2, hp:3,  rarity:"common",
    text:"Fire ally: +1 ATK each turn.", effects:[{trig:"onTurnStart", cond:"selfHasTag:Fire", action:"buffSelf", atk:1}] },
  { id:"wolf",     name:"Gray Wolf",      tags:["Beast"],          atk:3, hp:2,  rarity:"common",
    text:"2 Beasts: +2 ATK at start.",   effects:[{trig:"onPlay", cond:"countAllyTag:Beast>=2", action:"buffSelf", atk:2}] },
  { id:"guard",    name:"Stone Guard",    tags:["Order"],          atk:1, hp:6,  rarity:"common",
    text:"+1 HP per other Order ally.",  effects:[{trig:"onPlay", action:"buffSelfPerAllyTag", tag:"Order", hp:1, exclSelf:true}] },
  { id:"naiad",    name:"Spring Naiad",   tags:["Water"],          atk:2, hp:3,  rarity:"common",
    text:"Turn end: heal ally 1 HP.",    effects:[{trig:"onTurnEnd", action:"healAlly", hp:1}] },
  { id:"rat",      name:"Plague Rat",     tags:["Beast","Undead"], atk:2, hp:2,  rarity:"common",
    text:"Death: deal 1 to all enemies.",effects:[{trig:"onDeath", action:"aoeEnemy", dmg:1}] },
  { id:"cog",      name:"Brass Cog",      tags:["Mech"],           atk:1, hp:4,  rarity:"common",
    text:"Mech ally attacks: +1 HP self.",effects:[{trig:"onAllyAttack", cond:"srcHasTag:Mech", action:"buffSelf", hp:1}] },
  { id:"acolyte",  name:"Chaos Acolyte",  tags:["Chaos"],          atk:3, hp:2,  rarity:"common",
    text:"On play: random enemy -1 HP.", effects:[{trig:"onPlay", action:"randomEnemy", dmg:1}] },
  { id:"scribe",   name:"Order Scribe",   tags:["Order"],          atk:2, hp:3,  rarity:"common",
    text:"All allies +1 HP on play.",    effects:[{trig:"onPlay", action:"buffAllAllies", hp:1, exclSelf:true}] },
  { id:"torch",    name:"Torchbearer",    tags:["Fire"],           atk:3, hp:3,  rarity:"common",
    text:"Vanilla. Clean stats.",        effects:[] },
  { id:"skeleton", name:"Bone Skeleton",  tags:["Undead"],         atk:2, hp:2,  rarity:"common",
    text:"Death: +2 ATK random ally.",   effects:[{trig:"onDeath", action:"buffRandomAlly", atk:2}] },

  // ---- RARE ----
  { id:"inferno",  name:"Inferno Drake",  tags:["Fire","Beast"],   atk:4, hp:4,  rarity:"rare",
    text:"Attack: burn target (+1 dmg per Fire ally).", effects:[{trig:"onAttack", action:"burnTarget", dmgPerTag:"Fire"}] },
  { id:"tide",     name:"Tide Oracle",    tags:["Water","Order"],  atk:2, hp:5,  rarity:"rare",
    text:"Turn start: heal all allies 1.", effects:[{trig:"onTurnStart", action:"healAllAllies", hp:1}] },
  { id:"wildking", name:"Wild King",      tags:["Beast","Order"],  atk:3, hp:4,  rarity:"rare",
    text:"All Beasts +1/+1.",             effects:[{trig:"onPlay", action:"buffAlliesByTag", tag:"Beast", atk:1, hp:1, exclSelf:false}] },
  { id:"arsonist", name:"Arsonist",       tags:["Fire","Chaos"],   atk:3, hp:2,  rarity:"rare",
    text:"On play: 2 dmg to random enemy per Chaos ally.", effects:[{trig:"onPlay", action:"randomEnemyPerTag", tag:"Chaos", dmg:2}] },
  { id:"gearwright",name:"Gearwright",    tags:["Mech","Order"],   atk:2, hp:4,  rarity:"rare",
    text:"All Mech allies +2 ATK.",       effects:[{trig:"onPlay", action:"buffAlliesByTag", tag:"Mech", atk:2}] },
  { id:"lich",     name:"Frost Lich",     tags:["Undead","Water"], atk:3, hp:4,  rarity:"rare",
    text:"Ally dies: +1/+1 self.",        effects:[{trig:"onAllyDeath", action:"buffSelf", atk:1, hp:1}] },
  { id:"zealot",   name:"Flame Zealot",   tags:["Fire","Order"],   atk:4, hp:3,  rarity:"rare",
    text:"Fire allies +2 ATK.",           effects:[{trig:"onPlay", action:"buffAlliesByTag", tag:"Fire", atk:2, exclSelf:true}] },
  { id:"reaver",   name:"Chaos Reaver",   tags:["Chaos","Beast"],  atk:5, hp:3,  rarity:"rare",
    text:"Attack: also hits random enemy.",effects:[{trig:"onAttack", action:"splashAttack"}] },

  // ---- EPIC ----
  { id:"phoenix",  name:"Phoenix",        tags:["Fire","Beast"],   atk:4, hp:4,  rarity:"epic",
    text:"Death: revive once at 2/2.",    effects:[{trig:"onDeath", action:"reviveSelf", atk:2, hp:2, oncePerBattle:true}] },
  { id:"hydra",    name:"Tidal Hydra",    tags:["Water","Beast"],  atk:3, hp:6,  rarity:"epic",
    text:"Gain +1 ATK per turn.",         effects:[{trig:"onTurnStart", action:"buffSelf", atk:1}] },
  { id:"warden",   name:"Iron Warden",    tags:["Mech","Order"],   atk:3, hp:7,  rarity:"epic",
    text:"Other allies take 1 less dmg.", effects:[{trig:"passive", action:"allyShield", dmgReduce:1}] },
  { id:"necro",    name:"Grave Necromancer",tags:["Undead","Chaos"],atk:3,hp:5, rarity:"epic",
    text:"Turn end: +1 ATK per dead ally.",effects:[{trig:"onTurnEnd", action:"buffSelfPerDead", atk:1}] },
  { id:"archon",   name:"Order Archon",   tags:["Order"],          atk:4, hp:5,  rarity:"epic",
    text:"On play: +1/+1 all allies per Order.", effects:[{trig:"onPlay", action:"buffAllAlliesPerTag", tag:"Order", atk:1, hp:1, exclSelf:true}] },

  // ---- LEGENDARY ----
  { id:"volcanor", name:"Volcanor",       tags:["Fire","Chaos"],   atk:6, hp:6,  rarity:"legend",
    text:"Turn start: 2 dmg to all enemies.", effects:[{trig:"onTurnStart", action:"aoeEnemy", dmg:2}] },
  { id:"leviathan",name:"Leviathan",      tags:["Water","Beast"],  atk:5, hp:8,  rarity:"legend",
    text:"Turn end: heal self to full.",  effects:[{trig:"onTurnEnd", action:"healSelfFull"}] },
  { id:"doomgear", name:"Doomgear Titan", tags:["Mech","Order"],   atk:4, hp:9,  rarity:"legend",
    text:"Mech allies attack twice.",     effects:[{trig:"passive", action:"doubleAttackByTag", tag:"Mech"}] },
  { id:"voidlord", name:"Voidlord",       tags:["Undead","Chaos"], atk:7, hp:5,  rarity:"legend",
    text:"Ally dies: summon 2/2 spectre.",effects:[{trig:"onAllyDeath", action:"summonSpectre"}] },
];

const STARTING_COLLECTION = ["ember","wolf","guard","naiad","rat","cog","acolyte","scribe","torch","skeleton"];

function cardById(id){ return CARDS.find(c=>c.id===id); }

// Synergy definitions — rendered in draft preview. Thresholds inclusive.
const SYNERGIES = [
  { tag:"Fire",   thresholds:[{n:2,desc:"+1 ATK start"},{n:3,desc:"+2 ATK, +1 dmg/turn"}] },
  { tag:"Water",  thresholds:[{n:2,desc:"+2 HP start"},{n:3,desc:"heal 1 all turn end"}] },
  { tag:"Beast",  thresholds:[{n:2,desc:"+1/+1"},{n:3,desc:"+2/+2"}] },
  { tag:"Order",  thresholds:[{n:2,desc:"+1 HP all"},{n:3,desc:"+1 ATK, dmg reduce 1"}] },
  { tag:"Chaos",  thresholds:[{n:2,desc:"2 dmg random enemy/turn"},{n:3,desc:"4 dmg on play"}] },
  { tag:"Mech",   thresholds:[{n:2,desc:"+1 ATK Mechs"},{n:3,desc:"Mechs heal 1/turn"}] },
  { tag:"Undead", thresholds:[{n:2,desc:"deathrattle +1 ally"},{n:3,desc:"revive first to die"}] },
];

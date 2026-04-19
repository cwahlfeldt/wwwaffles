// ---------- Persistent state ----------
const SAVE_KEY = "cardclash.save.v1";
const state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){ return JSON.parse(raw); }
  }catch(e){}
  return {
    coins: 30,
    wins: 0,
    packs: 0,
    collection: STARTING_COLLECTION.slice(),
    tournament: { round:0, results:[] }, // pip array: "won"/"lost"
  };
}
function saveState(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

// ---------- Screen nav ----------
function show(screen){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+screen).classList.add("active");
  if(screen==="draft") startDraft();
  if(screen==="collection") renderCollection();
  if(screen==="shop") renderShop();
  if(screen==="tournament") renderTournament();
  if(screen==="menu") renderMeta();
}
document.querySelectorAll("[data-go]").forEach(b=>{
  b.addEventListener("click",()=>show(b.dataset.go));
});

function renderMeta(){
  document.getElementById("coins").textContent = "Coins: "+state.coins;
  document.getElementById("wins").textContent = "Wins: "+state.wins;
  document.getElementById("packs").textContent = "Packs: "+state.packs;
}

// ---------- Card rendering ----------
function cardEl(card, opts={}){
  const el = document.createElement("div");
  el.className = "card rarity-"+card.rarity;
  el.dataset.id = card.id;
  if(opts.instanceId!=null) el.dataset.inst = opts.instanceId;
  el.innerHTML = `
    <div class="rarity-bar"></div>
    <div class="name">${card.name}</div>
    <div class="tags">${card.tags.map(t=>`<span class="tag ${t}">${t}</span>`).join("")}</div>
    <div class="ability">${card.text}</div>
    <div class="stats"><span class="atk">⚔ ${card.atk}</span><span class="hp">♥ ${card.hp}</span></div>
  `;
  return el;
}

// ---------- Draft ----------
let draftPool=[], draftPicks=[];

function startDraft(){
  draftPicks = [];
  draftPool = rollDraftPool();
  renderDraft();
}

function rollDraftPool(){
  // 6 cards from collection, weighted by rarity. If collection <6, pad from common pool.
  const pool = [];
  const src = state.collection.map(cardById).filter(Boolean);
  const picks = sampleWeighted(src, 6);
  while(picks.length<6) picks.push(cardById("torch"));
  return picks;
}

function sampleWeighted(arr, n){
  const weights = { common:1, rare:0.8, epic:0.6, legend:0.4 };
  const copy = arr.slice();
  const out = [];
  for(let i=0;i<n && copy.length>0;i++){
    const ws = copy.map(c=>weights[c.rarity]||1);
    const total = ws.reduce((a,b)=>a+b,0);
    let r = Math.random()*total;
    let idx = 0;
    for(;idx<copy.length;idx++){ r -= ws[idx]; if(r<=0) break; }
    out.push(copy[idx]);
    copy.splice(idx,1);
  }
  return out;
}

function renderDraft(){
  const pool = document.getElementById("draft-pool");
  const board = document.getElementById("draft-board");
  pool.innerHTML = "";
  board.innerHTML = "";

  draftPool.forEach((c,i)=>{
    if(draftPicks.includes(i)) return;
    const el = cardEl(c);
    el.draggable = true;
    el.addEventListener("dragstart",e=>{
      e.dataTransfer.setData("text/plain", "pool:"+i);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend",()=>el.classList.remove("dragging"));
    el.addEventListener("click",()=>{
      if(draftPicks.length<3){ draftPicks.push(i); renderDraft(); }
    });
    pool.appendChild(el);
  });

  for(let slot=0; slot<3; slot++){
    if(draftPicks[slot]!=null){
      const card = draftPool[draftPicks[slot]];
      const el = cardEl(card);
      el.classList.add("selected");
      el.addEventListener("click",()=>{
        draftPicks.splice(slot,1);
        renderDraft();
      });
      board.appendChild(el);
    } else {
      const slotEl = document.createElement("div");
      slotEl.className = "board-slot";
      slotEl.textContent = "SLOT "+(slot+1);
      slotEl.addEventListener("dragover",e=>{e.preventDefault();slotEl.classList.add("over")});
      slotEl.addEventListener("dragleave",()=>slotEl.classList.remove("over"));
      slotEl.addEventListener("drop",e=>{
        e.preventDefault();
        slotEl.classList.remove("over");
        const data = e.dataTransfer.getData("text/plain");
        if(data.startsWith("pool:")){
          const idx = parseInt(data.slice(5));
          if(!draftPicks.includes(idx)){
            // place at this slot — grow picks list as needed
            const picks = [...draftPicks];
            while(picks.length<=slot) picks.push(null);
            picks[slot] = idx;
            draftPicks = picks.filter(x=>x!=null);
            renderDraft();
          }
        }
      });
      board.appendChild(slotEl);
    }
  }

  document.getElementById("pick-count").textContent = `(${draftPicks.length}/3)`;
  document.getElementById("btn-battle").disabled = draftPicks.length!==3;
  renderSynergyPreview();
}

function renderSynergyPreview(){
  const el = document.getElementById("synergy-preview");
  const cards = draftPicks.map(i=>draftPool[i]).filter(Boolean);
  const counts = {};
  cards.forEach(c=>c.tags.forEach(t=>counts[t]=(counts[t]||0)+1));

  const chips = SYNERGIES.map(s=>{
    const n = counts[s.tag]||0;
    const active = s.thresholds.filter(t=>n>=t.n);
    const next = s.thresholds.find(t=>n<t.n);
    if(n===0) return "";
    const activeDesc = active.length ? active[active.length-1].desc : (next?"need "+next.n:"");
    return `<span class="syn ${active.length?"active":""}">${s.tag} ×${n} — ${activeDesc}</span>`;
  }).join("");

  el.innerHTML = chips || "<i>Pick cards to see synergies</i>";
}

document.getElementById("btn-reroll").addEventListener("click",()=>{
  if(state.coins < 5){ flash("Need 5 coins"); return; }
  state.coins -= 5; saveState(); renderMeta();
  draftPool = rollDraftPool(); draftPicks = []; renderDraft();
});
document.getElementById("btn-battle").addEventListener("click",()=>{
  if(draftPicks.length!==3) return;
  startBattle(draftPicks.map(i=>draftPool[i]));
});

function flash(msg){
  // cheap toast via battle log reuse? Simpler: alert-less — repurpose button title
  const btn = document.getElementById("btn-reroll");
  const orig = btn.textContent;
  btn.textContent = msg;
  setTimeout(()=>btn.textContent=orig, 1200);
}

// ---------- Battle engine ----------
// Battle state: {player:{hp,board:[unit]}, enemy:{...}, turn}
// Unit: {card, atk, hp, maxHp, alive, flags:{revived,doubleAttack,shielded}, deathOrder}

const MAX_HP = 30;
let battleCtx = null;
let battleSkip = false;

function startBattle(playerCards){
  battleSkip = false;
  const enemyCards = pickEnemyHand(difficulty());
  battleCtx = {
    player: { hp:MAX_HP, board: playerCards.map(makeUnit) },
    enemy:  { hp:MAX_HP, board: enemyCards.map(makeUnit)  },
    turn: 0,
    log: [],
  };
  show("battle");
  renderBattle();
  runBattle().then(finishBattle);
}

function makeUnit(card){
  return {
    card,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    alive: true,
    tags: card.tags.slice(),
    flags: { revived:false, doubleAttack:false, shield:0 },
  };
}

function difficulty(){
  // scale with wins; cap at 8
  return Math.min(8, Math.floor(state.wins/2));
}

function pickEnemyHand(diff){
  // diff 0-8 → better rarity mix
  const pools = {
    0: ["ember","wolf","guard","torch","scribe"],
    1: ["ember","wolf","guard","naiad","rat","cog","acolyte","torch","skeleton","scribe"],
    2: ["ember","wolf","guard","naiad","rat","cog","acolyte","torch","skeleton","inferno","tide","zealot"],
    3: ["wolf","guard","naiad","rat","cog","inferno","tide","wildking","arsonist","gearwright","zealot","lich","reaver"],
    4: ["inferno","tide","wildking","arsonist","gearwright","zealot","lich","reaver","scribe","skeleton","cog"],
    5: ["inferno","tide","wildking","arsonist","gearwright","lich","reaver","phoenix","hydra","warden"],
    6: ["phoenix","hydra","warden","necro","archon","inferno","wildking","gearwright","lich","reaver"],
    7: ["phoenix","hydra","warden","necro","archon","volcanor","leviathan"],
    8: ["phoenix","hydra","warden","necro","archon","volcanor","leviathan","doomgear","voidlord"],
  };
  const pool = (pools[diff]||pools[0]).map(cardById);
  const out = [];
  for(let i=0;i<3;i++){
    out.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  return out;
}

function renderBattle(){
  const pb = document.getElementById("player-board");
  const eb = document.getElementById("enemy-board");
  pb.innerHTML = ""; eb.innerHTML = "";
  battleCtx.player.board.forEach((u,i)=>pb.appendChild(unitEl(u,"p",i)));
  battleCtx.enemy.board.forEach((u,i)=>eb.appendChild(unitEl(u,"e",i)));

  document.getElementById("player-hp").style.width = (battleCtx.player.hp/MAX_HP*100)+"%";
  document.getElementById("enemy-hp").style.width  = (battleCtx.enemy.hp/MAX_HP*100)+"%";
  document.getElementById("player-hp-text").textContent = battleCtx.player.hp+"/"+MAX_HP;
  document.getElementById("enemy-hp-text").textContent  = battleCtx.enemy.hp+"/"+MAX_HP;
}

function unitEl(unit, sidePrefix, idx){
  const el = cardEl(unit.card);
  el.dataset.side = sidePrefix;
  el.dataset.idx = idx;
  // override stats w/ live values
  el.querySelector(".atk").textContent = "⚔ "+unit.atk;
  el.querySelector(".hp").textContent  = "♥ "+unit.hp;
  if(!unit.alive) el.classList.add("dead");
  return el;
}

function log(msg, cls="line"){
  battleCtx.log.push({msg, cls});
  const box = document.getElementById("battle-log");
  const line = document.createElement("div");
  line.className = cls;
  line.textContent = msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

async function pause(ms){
  if(battleSkip) return Promise.resolve();
  return new Promise(r=>setTimeout(r,ms));
}
document.getElementById("btn-skip").addEventListener("click",()=>battleSkip=true);

// Effect resolver
function ctxOfSide(side){ return battleCtx[side]; }
function otherSide(side){ return side==="player"?"enemy":"player"; }
function livingBoard(side){ return battleCtx[side].board.filter(u=>u.alive); }
function countTag(side, tag, exclUnit){
  return battleCtx[side].board.filter(u=>u.alive && u!==exclUnit && u.tags.includes(tag)).length;
}

function dealDamageToUnit(target, dmg, srcSide){
  const shield = target.flags.shield||0;
  const actual = Math.max(0, dmg - shield);
  target.hp -= actual;
  log(`  ${target.card.name} takes ${actual}`, "dmg");
  if(target.hp<=0 && target.alive){
    // queue death
    target.alive = false;
    log(`  ☠ ${target.card.name} dies`, "dmg");
    return { killed:true, damage:actual };
  }
  return { killed:false, damage:actual };
}

function dealDamageToHero(targetSide, dmg){
  battleCtx[targetSide].hp = Math.max(0, battleCtx[targetSide].hp - dmg);
  log(`  → ${dmg} damage to ${targetSide}`, "dmg");
}

// Evaluate effect triggers for a side
async function fireTrigger(side, trig, payload={}){
  const board = battleCtx[side].board.slice();
  for(const unit of board){
    if(!unit.alive && trig!=="onDeath") continue;
    for(const eff of unit.card.effects){
      if(eff.trig!==trig) continue;
      if(trig==="onDeath" && payload.deadUnit!==unit) continue;
      if(trig==="onAllyDeath" && payload.deadUnit===unit) continue;
      if(trig==="onAllyAttack" && payload.srcUnit===unit) continue;
      if(trig==="onAttack" && payload.srcUnit!==unit) continue;
      if(!checkCond(eff, unit, side, payload)) continue;
      await applyEffect(eff, unit, side, payload);
    }
  }
  // Synergy-based passive triggers (tag counts)
  if(trig==="onTurnStart" || trig==="onTurnEnd") {
    await fireSynergyTurn(side, trig);
  }
}

function checkCond(eff, unit, side, payload){
  if(!eff.cond) return true;
  if(eff.cond.startsWith("selfHasTag:")){
    const tag = eff.cond.split(":")[1];
    return unit.tags.includes(tag);
  }
  if(eff.cond.startsWith("countAllyTag:")){
    const [,rest] = eff.cond.split(":");
    const m = rest.match(/(\w+)>=(\d+)/);
    if(!m) return true;
    return countTag(side, m[1]) >= parseInt(m[2]);
  }
  if(eff.cond.startsWith("srcHasTag:")){
    const tag = eff.cond.split(":")[1];
    return payload.srcUnit && payload.srcUnit.tags.includes(tag);
  }
  return true;
}

async function applyEffect(eff, unit, side, payload){
  const other = otherSide(side);
  switch(eff.action){
    case "buffSelf":
      if(eff.atk) unit.atk += eff.atk;
      if(eff.hp){ unit.hp += eff.hp; unit.maxHp += eff.hp; }
      log(`✦ ${unit.card.name} +${eff.atk||0}/+${eff.hp||0}`, "syn");
      break;
    case "buffSelfPerAllyTag": {
      const n = countTag(side, eff.tag, eff.exclSelf?unit:null);
      if(eff.atk) unit.atk += eff.atk*n;
      if(eff.hp){ unit.hp += eff.hp*n; unit.maxHp += eff.hp*n; }
      if(n>0) log(`✦ ${unit.card.name} +${(eff.atk||0)*n}/+${(eff.hp||0)*n} (${eff.tag}×${n})`, "syn");
      break;
    }
    case "buffAllAllies": {
      livingBoard(side).forEach(u=>{
        if(eff.exclSelf && u===unit) return;
        if(eff.atk) u.atk+=eff.atk;
        if(eff.hp){ u.hp+=eff.hp; u.maxHp+=eff.hp; }
      });
      log(`✦ ${unit.card.name} buffs allies +${eff.atk||0}/+${eff.hp||0}`, "syn");
      break;
    }
    case "buffAllAlliesPerTag": {
      const n = countTag(side, eff.tag, eff.exclSelf?unit:null);
      livingBoard(side).forEach(u=>{
        if(eff.atk) u.atk += eff.atk*n;
        if(eff.hp){ u.hp += eff.hp*n; u.maxHp += eff.hp*n; }
      });
      if(n>0) log(`✦ ${unit.card.name} allies +${(eff.atk||0)*n}/+${(eff.hp||0)*n} (${eff.tag}×${n})`, "syn");
      break;
    }
    case "buffAlliesByTag": {
      livingBoard(side).forEach(u=>{
        if(!u.tags.includes(eff.tag)) return;
        if(eff.exclSelf && u===unit) return;
        if(eff.atk) u.atk+=eff.atk;
        if(eff.hp){ u.hp+=eff.hp; u.maxHp+=eff.hp; }
      });
      log(`✦ ${unit.card.name} buffs ${eff.tag}s +${eff.atk||0}/+${eff.hp||0}`, "syn");
      break;
    }
    case "buffRandomAlly": {
      const allies = livingBoard(side).filter(u=>u!==unit);
      if(allies.length){
        const t = allies[Math.floor(Math.random()*allies.length)];
        if(eff.atk) t.atk+=eff.atk;
        if(eff.hp){ t.hp+=eff.hp; t.maxHp+=eff.hp; }
        log(`✦ ${unit.card.name} → ${t.card.name} +${eff.atk||0}/+${eff.hp||0}`, "syn");
      }
      break;
    }
    case "healAlly": {
      const hurt = livingBoard(side).filter(u=>u.hp<u.maxHp);
      if(hurt.length){
        const t = hurt[Math.floor(Math.random()*hurt.length)];
        t.hp = Math.min(t.maxHp, t.hp+eff.hp);
        log(`✚ ${unit.card.name} heals ${t.card.name} ${eff.hp}`, "heal");
      }
      break;
    }
    case "healAllAllies": {
      livingBoard(side).forEach(u=>{ u.hp = Math.min(u.maxHp, u.hp+eff.hp); });
      log(`✚ ${unit.card.name} heals all +${eff.hp}`, "heal");
      break;
    }
    case "healSelfFull":
      unit.hp = unit.maxHp;
      log(`✚ ${unit.card.name} heals full`, "heal");
      break;
    case "aoeEnemy": {
      livingBoard(other).forEach(u=>dealDamageToUnit(u, eff.dmg, side));
      log(`✦ ${unit.card.name} AOE ${eff.dmg}`, "syn");
      break;
    }
    case "randomEnemy": {
      const alive = livingBoard(other);
      if(alive.length){
        const t = alive[Math.floor(Math.random()*alive.length)];
        dealDamageToUnit(t, eff.dmg, side);
      }
      break;
    }
    case "randomEnemyPerTag": {
      const n = countTag(side, eff.tag);
      const alive = livingBoard(other);
      if(alive.length && n>0){
        const t = alive[Math.floor(Math.random()*alive.length)];
        dealDamageToUnit(t, eff.dmg*n, side);
        log(`✦ ${unit.card.name} × ${eff.tag}×${n}`, "syn");
      }
      break;
    }
    case "burnTarget": {
      const tgt = payload.target;
      if(tgt){
        const extra = countTag(side, eff.dmgPerTag);
        if(extra>0){
          dealDamageToUnit(tgt, extra, side);
          log(`✦ ${unit.card.name} burn +${extra}`, "syn");
        }
      }
      break;
    }
    case "splashAttack": {
      const alive = livingBoard(other).filter(u=>u!==payload.target);
      if(alive.length){
        const t = alive[Math.floor(Math.random()*alive.length)];
        dealDamageToUnit(t, Math.ceil(unit.atk/2), side);
        log(`✦ ${unit.card.name} splash`, "syn");
      }
      break;
    }
    case "reviveSelf": {
      if(eff.oncePerBattle && unit.flags.revived) break;
      unit.flags.revived = true;
      unit.alive = true;
      unit.atk = eff.atk; unit.maxHp = eff.hp; unit.hp = eff.hp;
      log(`✦ ${unit.card.name} REVIVES (${eff.atk}/${eff.hp})`, "syn");
      break;
    }
    case "buffSelfPerDead": {
      const dead = battleCtx[side].board.filter(u=>!u.alive).length;
      if(dead>0 && eff.atk) unit.atk += eff.atk*dead;
      if(dead>0) log(`✦ ${unit.card.name} +${eff.atk*dead} ATK (dead×${dead})`, "syn");
      break;
    }
    case "summonSpectre": {
      if(battleCtx[side].board.filter(u=>u.alive).length >= 5) break;
      const spectre = makeUnit({ id:"spectre", name:"Spectre", tags:["Undead"], atk:2, hp:2, rarity:"common", text:"Summoned", effects:[] });
      battleCtx[side].board.push(spectre);
      log(`✦ ${unit.card.name} summons Spectre 2/2`, "syn");
      break;
    }
  }
}

// Passive setup: allyShield, doubleAttackByTag
function applyPassives(){
  ["player","enemy"].forEach(side=>{
    battleCtx[side].board.forEach(unit=>{
      unit.card.effects.forEach(eff=>{
        if(eff.trig!=="passive") return;
        if(eff.action==="allyShield"){
          battleCtx[side].board.forEach(u=>{
            if(u===unit) return;
            u.flags.shield = (u.flags.shield||0) + (eff.dmgReduce||1);
          });
        }
        if(eff.action==="doubleAttackByTag"){
          battleCtx[side].board.forEach(u=>{
            if(u.tags.includes(eff.tag)) u.flags.doubleAttack = true;
          });
        }
      });
    });
  });
}

// Synergy-aggregate passive turn effects
async function fireSynergyTurn(side, trig){
  const counts = {};
  livingBoard(side).forEach(u=>u.tags.forEach(t=>counts[t]=(counts[t]||0)+1));

  if(trig==="onTurnStart"){
    // Fire 3+: +1 dmg/turn to random enemy
    if((counts.Fire||0)>=3){
      const alive = livingBoard(otherSide(side));
      if(alive.length){
        const t = alive[Math.floor(Math.random()*alive.length)];
        log(`✦ ${side} Fire×${counts.Fire} burns`, "syn");
        dealDamageToUnit(t,1,side);
      }
    }
    // Chaos 2+: 2 dmg random enemy
    if((counts.Chaos||0)>=2){
      const alive = livingBoard(otherSide(side));
      if(alive.length){
        const t = alive[Math.floor(Math.random()*alive.length)];
        log(`✦ ${side} Chaos×${counts.Chaos} hits`, "syn");
        dealDamageToUnit(t,2,side);
      }
    }
    // Mech 3+: heal 1 all mechs
    if((counts.Mech||0)>=3){
      livingBoard(side).filter(u=>u.tags.includes("Mech")).forEach(u=>{
        u.hp = Math.min(u.maxHp, u.hp+1);
      });
      log(`✚ ${side} Mech×${counts.Mech} regenerate`, "heal");
    }
  }
  if(trig==="onTurnEnd"){
    // Water 3+: heal 1 all
    if((counts.Water||0)>=3){
      livingBoard(side).forEach(u=>{ u.hp = Math.min(u.maxHp, u.hp+1); });
      log(`✚ ${side} Water×${counts.Water} flow heal`, "heal");
    }
  }
}

// Apply synergy-on-play
async function fireSynergyOnPlay(side){
  const counts = {};
  livingBoard(side).forEach(u=>u.tags.forEach(t=>counts[t]=(counts[t]||0)+1));

  if((counts.Fire||0)>=2){
    livingBoard(side).filter(u=>u.tags.includes("Fire")).forEach(u=>u.atk+=1);
    log(`✦ ${side} Fire×${counts.Fire} synergy: Fires +1 ATK`, "syn");
  }
  if((counts.Fire||0)>=3){
    livingBoard(side).filter(u=>u.tags.includes("Fire")).forEach(u=>u.atk+=1);
    log(`✦ ${side} Fire×3 bonus: Fires +1 ATK`, "syn");
  }
  if((counts.Water||0)>=2){
    livingBoard(side).filter(u=>u.tags.includes("Water")).forEach(u=>{ u.hp+=2; u.maxHp+=2; });
    log(`✦ ${side} Water×${counts.Water} synergy: Waters +2 HP`, "syn");
  }
  if((counts.Beast||0)>=2){
    livingBoard(side).filter(u=>u.tags.includes("Beast")).forEach(u=>{ u.atk+=1; u.hp+=1; u.maxHp+=1; });
    log(`✦ ${side} Beast×${counts.Beast} synergy: Beasts +1/+1`, "syn");
  }
  if((counts.Beast||0)>=3){
    livingBoard(side).filter(u=>u.tags.includes("Beast")).forEach(u=>{ u.atk+=1; u.hp+=1; u.maxHp+=1; });
    log(`✦ ${side} Beast×3 bonus: Beasts +1/+1`, "syn");
  }
  if((counts.Order||0)>=2){
    livingBoard(side).forEach(u=>{ u.hp+=1; u.maxHp+=1; });
    log(`✦ ${side} Order×${counts.Order} synergy: all +1 HP`, "syn");
  }
  if((counts.Order||0)>=3){
    livingBoard(side).forEach(u=>{ u.atk+=1; u.flags.shield=(u.flags.shield||0)+1; });
    log(`✦ ${side} Order×3 bonus: all +1 ATK, shield 1`, "syn");
  }
  if((counts.Chaos||0)>=3){
    const enemies = livingBoard(otherSide(side));
    if(enemies.length){
      const t = enemies[Math.floor(Math.random()*enemies.length)];
      dealDamageToUnit(t,4,side);
      log(`✦ ${side} Chaos×3 bolt!`, "syn");
    }
  }
  if((counts.Mech||0)>=2){
    livingBoard(side).filter(u=>u.tags.includes("Mech")).forEach(u=>u.atk+=1);
    log(`✦ ${side} Mech×${counts.Mech} synergy: Mechs +1 ATK`, "syn");
  }
  if((counts.Undead||0)>=3){
    // first to die will revive at 1/1 (flag on all; consumes on first)
    livingBoard(side).forEach(u=>u.flags.undeadRevive = true);
    log(`✦ ${side} Undead×3 synergy: first death revives at 1/1`, "syn");
  }
}

async function runBattle(){
  // 1. onPlay triggers
  log("— BATTLE START —","turn");
  applyPassives();
  await fireSynergyOnPlay("player");
  await fireSynergyOnPlay("enemy");
  await fireTrigger("player","onPlay");
  await fireTrigger("enemy","onPlay");
  await processDeaths();
  renderBattle();
  await pause(600);

  // 2. Turn loop — max 10 turns (10s window)
  for(let turn=1; turn<=10; turn++){
    battleCtx.turn = turn;
    log(`— Turn ${turn} —`,"turn");

    await fireTrigger("player","onTurnStart");
    await fireTrigger("enemy","onTurnStart");
    await processDeaths();
    renderBattle();
    await pause(300);

    // Attacks alternate
    await attackPhase("player");
    await processDeaths();
    renderBattle();
    if(isOver()) break;
    await pause(400);

    await attackPhase("enemy");
    await processDeaths();
    renderBattle();
    if(isOver()) break;

    await fireTrigger("player","onTurnEnd");
    await fireTrigger("enemy","onTurnEnd");
    await processDeaths();
    renderBattle();
    if(isOver()) break;
    await pause(400);
  }
}

async function attackPhase(side){
  const attackers = livingBoard(side);
  for(const u of attackers){
    if(!u.alive) continue;
    await performAttack(u, side);
    if(u.flags.doubleAttack && u.alive){
      await pause(150);
      await performAttack(u, side);
    }
  }
}

async function performAttack(unit, side){
  const other = otherSide(side);
  const alive = livingBoard(other);
  // target: lowest HP alive unit; else hero
  let target = null;
  if(alive.length){
    target = alive.reduce((a,b)=>a.hp<=b.hp?a:b);
  }
  // animate
  flashEl(unit, "attacking");
  log(`${unit.card.name} attacks ${target?target.card.name:other+" hero"}`);

  // onAttack trigger
  await fireTrigger(side, "onAttack", { srcUnit:unit, target });

  if(target){
    flashEl(target, "hit");
    const result = dealDamageToUnit(target, unit.atk, side);
    // counter (only if both alive)
    if(target.alive){
      unit.hp -= target.atk;
      log(`  ${unit.card.name} takes ${target.atk} back`, "dmg");
      if(unit.hp<=0){ unit.alive=false; log(`  ☠ ${unit.card.name} dies`,"dmg"); }
    }
    // onAllyAttack trigger (both sides trigger for their own allies)
    await fireTrigger(side, "onAllyAttack", { srcUnit:unit });
  } else {
    dealDamageToHero(other, unit.atk);
  }
  await pause(220);
}

function flashEl(unit, cls){
  const side = battleCtx.player.board.includes(unit) ? "p" : "e";
  const idx  = (side==="p"?battleCtx.player:battleCtx.enemy).board.indexOf(unit);
  const el = document.querySelector(`#${side==="p"?"player":"enemy"}-board .card:nth-child(${idx+1})`);
  if(el){
    el.classList.add(cls);
    setTimeout(()=>el.classList.remove(cls), 400);
  }
}

async function processDeaths(){
  for(const side of ["player","enemy"]){
    for(const unit of battleCtx[side].board){
      if(unit.alive) continue;
      if(unit._deathFired) continue;
      unit._deathFired = true;
      // undeadRevive synergy
      if(unit.flags.undeadRevive){
        unit.flags.undeadRevive = false;
        // consume on first across team
        battleCtx[side].board.forEach(u=>u.flags.undeadRevive=false);
        unit.alive=true; unit.atk=1; unit.hp=1; unit.maxHp=1; unit._deathFired=false;
        log(`✦ ${unit.card.name} returns 1/1 (Undead×3)`,"syn");
        continue;
      }
      await fireTrigger(side, "onDeath", { deadUnit: unit });
      await fireTrigger(side, "onAllyDeath", { deadUnit: unit });
    }
  }
}

function isOver(){
  const pAlive = livingBoard("player").length>0 || battleCtx.player.hp>0;
  const eAlive = livingBoard("enemy").length>0  || battleCtx.enemy.hp>0;
  // End conditions: hero dead OR both boards wiped (then compare stat totals next turn)
  if(battleCtx.player.hp<=0 || battleCtx.enemy.hp<=0) return true;
  if(livingBoard("player").length===0 && livingBoard("enemy").length===0) return true;
  return false;
}

function resolveOutcome(){
  // 1) If hero HP differs, higher wins
  // 2) Else total remaining unit HP
  // 3) Else tie → draw (count as loss for simplicity? → draw = small reward)
  const ph = battleCtx.player.hp, eh = battleCtx.enemy.hp;
  if(ph<=0 && eh<=0) return "draw";
  if(ph<=0) return "loss";
  if(eh<=0) return "win";
  const ps = livingBoard("player").reduce((s,u)=>s+u.hp+u.atk,0);
  const es = livingBoard("enemy").reduce((s,u)=>s+u.hp+u.atk,0);
  if(ph!==eh) return ph>eh ? "win" : "loss";
  if(ps!==es) return ps>es ? "win" : "loss";
  return "draw";
}

function finishBattle(){
  const outcome = resolveOutcome();
  const rewards = { win:12 + difficulty()*2, draw:5, loss:2 };
  const gained = rewards[outcome];
  state.coins += gained;
  if(outcome==="win") state.wins += 1;

  // Tournament tracking
  if(activeTournament){
    activeTournament = false;
    state.tournament.results.push(outcome==="win" ? "won" : "lost");
    state.tournament.round++;
    if(outcome==="win" && state.tournament.round>=5){
      state.coins += 100;
      state.packs += 1;
      state.tournament = { round:0, results:[] };
    }
    if(outcome!=="win"){
      state.tournament = { round:0, results:[] };
    }
  }

  saveState();
  renderMeta();

  document.getElementById("result-title").textContent =
    outcome==="win" ? "VICTORY" : outcome==="draw" ? "DRAW" : "DEFEAT";
  document.getElementById("result-text").textContent = `+${gained} coins`;
  show("result");
}

document.getElementById("btn-again").addEventListener("click",()=>show("draft"));

// ---------- Collection ----------
function renderCollection(){
  const grid = document.getElementById("collection-grid");
  grid.innerHTML = "";
  // Sort by rarity, then owned
  const rarityOrder = {common:0,rare:1,epic:2,legend:3};
  const owned = new Set(state.collection);
  const sorted = CARDS.slice().sort((a,b)=>{
    const ra = rarityOrder[a.rarity], rb = rarityOrder[b.rarity];
    if(ra!==rb) return ra-rb;
    return a.name.localeCompare(b.name);
  });
  sorted.forEach(c=>{
    const el = cardEl(c);
    if(!owned.has(c.id)){
      el.style.filter = "grayscale(1) opacity(.35)";
      el.title = "Not yet collected";
    }
    grid.appendChild(el);
  });
}

// ---------- Shop ----------
function renderShop(){
  document.getElementById("pack-result").innerHTML = "";
  updateShopBtns();
}
function updateShopBtns(){
  document.getElementById("buy-basic").disabled = state.coins<20;
  document.getElementById("buy-rare").disabled = state.coins<60;
  document.getElementById("buy-legend").disabled = state.coins<150;
}
function openPack(tier){
  const cost = {basic:20, rare:60, legend:150}[tier];
  if(state.coins<cost) return;
  state.coins -= cost;
  const cards = [];
  for(let i=0;i<3;i++){
    const rarity = pickPackRarity(tier, i);
    const pool = CARDS.filter(c=>c.rarity===rarity);
    cards.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  cards.forEach(c=>{ if(!state.collection.includes(c.id)) state.collection.push(c.id); });
  saveState(); renderMeta(); updateShopBtns();

  const out = document.getElementById("pack-result");
  out.innerHTML = "";
  cards.forEach(c=>out.appendChild(cardEl(c)));
}
function pickPackRarity(tier, i){
  if(tier==="basic"){
    const r = Math.random();
    if(r<0.7) return "common";
    if(r<0.92) return "rare";
    if(r<0.99) return "epic";
    return "legend";
  }
  if(tier==="rare"){
    if(i===0){
      const r = Math.random();
      if(r<0.75) return "rare";
      if(r<0.97) return "epic";
      return "legend";
    }
    const r = Math.random();
    if(r<0.5) return "common";
    if(r<0.85) return "rare";
    if(r<0.98) return "epic";
    return "legend";
  }
  // legend pack
  if(i===0){
    const r = Math.random();
    if(r<0.85) return "legend";
    return "epic";
  }
  const r = Math.random();
  if(r<0.3) return "rare";
  if(r<0.75) return "epic";
  return "legend";
}
document.getElementById("buy-basic").addEventListener("click",()=>openPack("basic"));
document.getElementById("buy-rare").addEventListener("click",()=>openPack("rare"));
document.getElementById("buy-legend").addEventListener("click",()=>openPack("legend"));

// ---------- Tournament ----------
let activeTournament = false;

function renderTournament(){
  const t = state.tournament;
  const desc = document.getElementById("tournament-desc");
  desc.textContent = `Win 5 in a row. Reward: 100 coins + 1 pack. Round ${t.round+1}/5.`;

  const prog = document.getElementById("tournament-progress");
  prog.innerHTML = "";
  for(let i=0;i<5;i++){
    const pip = document.createElement("div");
    pip.className = "pip";
    if(t.results[i]==="won") pip.classList.add("won");
    else if(t.results[i]==="lost") pip.classList.add("lost");
    else if(i===t.round) pip.classList.add("current");
    prog.appendChild(pip);
  }
}
document.getElementById("btn-tournament-start").addEventListener("click",()=>{
  activeTournament = true;
  show("draft");
});

// ---------- Init ----------
renderMeta();

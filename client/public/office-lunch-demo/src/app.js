import { coworkers, foodChoices, lunchHistory, restaurants } from "./data.js";
import { gameAudio } from "./audio.js";
import {
  BinaryVoteButtons,
  BottomNav,
  Countdown,
  FinalVoteTally,
  FoodChoiceCard,
  GameAudioControl,
  HeadToHeadCard,
  HiddenVoteStatus,
  icons,
  Lunchmate,
  RestaurantCard,
  RestaurantVoteCard,
  RoundHeader,
  SatisfactionSlider,
  SquadReadyTransition,
  SquadXpReward,
  TieBreaker,
  Toast,
  VotingProgress,
  XpProgress
} from "./components.js";

const root = document.querySelector("#app");
const gameRestaurants = restaurants.slice(0, 3);
const finalists = restaurants.slice(0, 2);
const hana = restaurants.find(restaurant => restaurant.name === "Hana Kitchen");
const recordingMode = new URLSearchParams(location.search).get("recording") === "true";
const initialScreen = { "#tie-break": "tieBreak" }[location.hash] || "home";

const state = {
  screen: initialScreen,
  previousScreen: "home",
  readyMembers: new Set([0]),
  lobbyPhase: "joining",
  foodChoice: "",
  foodPhase: "voting",
  activeRound: "food",
  votedCount: 3,
  countdown: null,
  restaurantIndex: 0,
  restaurantVotes: [],
  restaurantPhase: "voting",
  restaurantVote: "",
  finalChoice: "",
  tieChoice: "",
  revealReady: false,
  saved: false,
  satisfaction: recordingMode ? 40 : 72,
  wouldGoAgain: false,
  profileTab: "me",
  soundEnabled: true,
  toast: ""
};

let timers = [];
let finalAdvanceTimer = null;
const later = (callback, delay) => {
  const timer = window.setTimeout(callback, delay);
  timers.push(timer);
  return timer;
};
const clearTimers = () => {
  timers.forEach(window.clearTimeout);
  timers = [];
};
const reducedMotion = () => !recordingMode && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const gameScreens = new Set(["lobby", "foodRound", "restaurantVote", "roundWaiting", "finalists", "finalRound", "tieBreak", "result"]);

function currentAudioMode() {
  if (["home", "map", "profile"].includes(state.screen)) return "idle";
  if (state.screen === "lobby") return "lobby";
  if (["foodRound", "restaurantVote"].includes(state.screen)) return "round";
  if (state.screen === "finalists") return "finalists";
  if (["finalRound", "tieBreak", "roundWaiting"].includes(state.screen)) return "final";
  if (state.screen === "result") return "result";
  if (["satisfaction", "xpReward", "recordingEnd"].includes(state.screen)) return "outro";
  return "idle";
}

function syncAudioState() {
  const mode = currentAudioMode();
  gameAudio.setMode(mode, { countdown: state.screen === "roundWaiting" && Boolean(state.countdown) });
  return mode;
}

function playSound(cue) {
  if (!state.soundEnabled) return;
  gameAudio.playCue(cue);
}

function render() {
  const view = screens[state.screen] || screens.home;
  const audioMode = syncAudioState();
  const soundControl = gameScreens.has(state.screen) ? GameAudioControl(state.soundEnabled, audioMode) : "";
  root.innerHTML = `<main class="app-shell screen--${state.screen} ${recordingMode ? "is-recording" : ""}" data-recording-mode="${recordingMode}" data-audio-mode="${audioMode}" data-audio-countdown="${state.screen === "roundWaiting" && Boolean(state.countdown)}"><div class="phone-stage">${soundControl}${view()}</div></main>${state.toast ? Toast(state.toast) : ""}`;
  window.requestAnimationFrame(() => root.querySelector(".phone-stage")?.classList.add("is-ready"));
}

function navigate(screen, options = {}) {
  clearTimers();
  state.previousScreen = state.screen;
  state.screen = screen;
  if (options.reset) resetGame();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  enterScreen(screen);
}

function resetGame() {
  if (finalAdvanceTimer) window.clearTimeout(finalAdvanceTimer);
  finalAdvanceTimer = null;
  state.readyMembers = new Set([0]);
  state.lobbyPhase = "joining";
  state.foodChoice = "";
  state.foodPhase = "voting";
  state.activeRound = "food";
  state.votedCount = 3;
  state.countdown = null;
  state.restaurantIndex = 0;
  state.restaurantVotes = [];
  state.restaurantPhase = "voting";
  state.restaurantVote = "";
  state.finalChoice = "";
  state.tieChoice = "";
  state.revealReady = false;
  state.satisfaction = recordingMode ? 40 : 72;
  state.wouldGoAgain = false;
}

function enterScreen(screen) {
  if (screen === "lobby") {
    state.readyMembers = new Set([0]);
    state.lobbyPhase = "joining";
    [[1, 350], [2, 700], [3, 1050], [4, 1400]].forEach(([member, delay]) => later(() => {
      if (state.screen !== "lobby") return;
      state.readyMembers.add(member);
      playSound("join");
      render();
    }, delay));
  }

  if (screen === "roundWaiting") {
    state.votedCount = 4;
    state.countdown = null;
    later(() => {
      if (state.screen !== "roundWaiting") return;
      state.votedCount = 5;
      playSound("complete");
      render();
    }, 800);
    [3, 2, 1].forEach((value, index) => later(() => {
      if (state.screen !== "roundWaiting") return;
      state.countdown = value;
      playSound("tick");
      render();
    }, 1250 + index * 850));
    later(() => {
      if (state.screen === "roundWaiting") navigate("result");
    }, 3900);
  }

  if (screen === "finalists") {
    playSound("finalists");
    later(() => {
      if (state.screen === "finalists") {
        state.finalChoice = "";
        navigate("finalRound");
      }
    }, reducedMotion() ? 700 : 1100);
  }

  if (screen === "result") {
    state.revealReady = false;
    playSound("result");
    later(() => {
      if (state.screen === "result") {
        state.revealReady = true;
        render();
      }
    }, reducedMotion() ? 50 : 800);
  }

  if (screen === "xpReward") {
    playSound("sparkle");
    if (recordingMode) later(() => {
      if (state.screen === "xpReward") navigate("recordingEnd");
    }, 3200);
  }

  if (screen === "recordingEnd") later(() => {
    if (state.screen === "recordingEnd") gameAudio.setMode("idle");
  }, 2400);
}

function showToast(message) {
  state.toast = message;
  render();
  later(() => {
    state.toast = "";
    render();
  }, 2200);
}

function header(title = "Lunchie", back = false) {
  return `<header class="topbar">${back ? `<button class="icon-button" data-action="back" aria-label="Go back">‹</button>` : `<div class="wordmark"><span class="logo-mark">L</span>${title}</div>`}<div class="top-actions"><span class="office-pill">MEL · 12:08</span><button class="avatar mini" data-action="nav" data-target="profile" aria-label="Open profile">SO</button></div></header>`;
}

function homeScreen() {
  return `${header()}<section class="content home-content">
    <div class="greeting"><span class="eyebrow">GOOD AFTERNOON, SOEUN</span><h1>Ready for lunch?</h1><p>It looks like the crew is in.</p></div>
    <article class="hero-card"><div class="hero-copy"><span class="live-pill"><i></i> 4 available now</span><h2>Your team is<br>in today</h2><p>Start a one-minute lunch game. Everyone gets a say.</p></div><div class="hero-visual">${Lunchmate({ mood: "happy" })}<div class="hero-avatar-stack">${coworkers.slice(1).map((person, index) => `<div class="avatar" style="--avatar:${person.color};--i:${index}">${person.initials}</div>`).join("")}</div></div><button class="primary-button primary-button--sun" data-action="start">START LUNCH SQUAD <span>→</span></button></article>
    <article class="streak-card"><div class="streak-fire">🔥</div><div><span class="eyebrow">SQUAD STREAK</span><h3>3 days strong</h3><p>One more lunch to unlock a team reward</p></div><div class="streak-days"><i class="done"></i><i class="done"></i><i class="done"></i><i></i></div></article>
    <div class="section-heading"><h3>Quick bites</h3><button data-action="nav" data-target="map">See history</button></div>
    <div class="quick-grid"><button class="quick-card quick-card--recent" data-action="nav" data-target="map"><span class="quick-icon">↻</span><span><small>RECENT LUNCH</small><strong>Supernormal</strong><em>Last Wednesday</em></span>${icons.arrow}</button><button class="quick-card quick-card--favourite" data-action="nav" data-target="map"><span class="quick-icon">♥</span><span><small>TEAM FAVOURITE</small><strong>Miznon</strong><em>4 squad visits</em></span>${icons.arrow}</button><button class="surprise-card" data-action="surprise"><span>✦</span><strong>Quick lunch game</strong><small>Jump straight into round one</small><b>→</b></button></div>
  </section>${BottomNav("home")}`;
}

function lobbyScreen() {
  const ready = state.readyMembers.size;
  if (state.lobbyPhase === "ready") return `<section class="game-screen lobby-screen is-starting"><div class="lobby-orb orb-one"></div><div class="lobby-orb orb-two"></div>${SquadReadyTransition()}</section>`;
  return `<section class="game-screen lobby-screen"><div class="game-top"><button class="close-button" data-action="nav" data-target="home">×</button><span class="session-code">SQUAD · LUNCHTIME</span><button class="more-button" data-action="toast" data-message="Invite link copied">⌁</button></div><div class="lobby-orb orb-one"></div><div class="lobby-orb orb-two"></div><div class="lobby-heading"><span class="eyebrow light">LUNCH SQUAD</span><h1>Who's in<br>today?</h1><p>People join live. Start whenever the crew is ready.</p></div><div class="lobby-mascot">${Lunchmate({ mood: ready < 4 ? "wait" : "happy" })}<span class="speech-pop">${ready < 4 ? "Gathering the crew…" : ready === 5 ? "Full squad—game on!" : "Four ready—game on!"}</span></div><div class="join-count"><strong>${ready}</strong><span>/ 5 ready</span><div class="mini-progress"><i style="width:${ready * 20}%"></i></div></div><div class="member-list">${coworkers.map((person, index) => { const isReady = state.readyMembers.has(index); return `<div class="member-row ${isReady ? "has-joined" : "is-waiting"}" style="--delay:${index * 70}ms"><div class="avatar" style="--avatar:${person.color}">${person.initials}</div><div><strong>${person.name}${index === 0 ? " (you)" : ""}</strong><span>${isReady ? index === 0 ? "Ready to play" : "Joined" : "Joining…"}</span></div><i>${isReady ? "✓" : "•••"}</i></div>`; }).join("")}</div><div class="invite-row"><button data-action="toast" data-message="Invite link copied">⌁ <span>Copy link</span></button><button data-action="toast" data-message="QR invite ready">▦ <span>QR</span></button><button data-action="toast" data-message="Teams invite ready">T <span>Teams</span></button></div><div class="sticky-action"><button class="primary-button ${ready < 4 ? "is-disabled" : ""}" data-action="start-game" ${ready < 4 ? "disabled" : ""}>START THE GAME <span>→</span></button><small>${ready < 4 ? "Waiting for the crew" : "No timer · choices stay private"}</small></div></section>`;
}

function foodRoundScreen() {
  const locked = state.foodPhase !== "voting";
  const reveal = state.foodPhase === "reveal";
  const status = reveal
    ? `<div class="inline-outcome food-outcome"><span>✓ EVERYONE'S IN</span><h2>Korean made the cut! 🍜</h2></div>`
    : `<div class="inline-answer-status ${state.votedCount === 5 ? "is-complete" : ""}">${state.foodChoice ? `<span class="inline-lock">Locked 🔒</span>` : ""}${VotingProgress({ count: state.votedCount, compact: false })}${state.votedCount === 5 ? `<strong class="everyone-in">Everyone's in!</strong>` : ""}</div>`;
  return `<section class="round-game food-round phase-${state.foodPhase}">${RoundHeader({ round: 1 })}<div class="round-question"><span class="round-number">ROUND 1</span><h1>What are we<br>feeling today?</h1><p>Pick one. Your squad only sees when answers are complete.</p></div><div class="food-choice-grid">${foodChoices.map(choice => FoodChoiceCard(choice, { selected: state.foodChoice === choice.name, locked, reveal })).join("")}</div>${status}<div class="privacy-footer"><span>◉</span> Anonymous progress · answers stay hidden</div></section>`;
}

function roundWaitingScreen() {
  const lockedLabels = { food: "Locked in 🔒", restaurant: "Vote locked 🔒", final: "Choice locked 🔒", tie: "Answer locked 🔒" };
  const round = state.activeRound === "food" ? 1 : state.activeRound === "restaurant" ? 2 : 3;
  const countdownClass = state.countdown ? `countdown-${state.countdown}` : "countdown-ready";
  return `<section class="round-waiting ${state.activeRound === "final" ? "is-major-reveal" : "is-micro-reveal"} ${countdownClass}">${RoundHeader({ round, theme: "dark" })}${state.countdown ? Countdown(state.countdown, "Everyone's in.") : `${HiddenVoteStatus({ count: state.votedCount, lockedLabel: lockedLabels[state.activeRound] })}<div class="waiting-companion">${Lunchmate({ mood: state.votedCount === 5 ? "celebrate" : "wait" })}</div>`}</section>`;
}

function restaurantVoteScreen() {
  const restaurant = gameRestaurants[state.restaurantIndex];
  const advances = state.restaurantIndex < 2;
  const locked = state.restaurantPhase !== "voting";
  const reveal = state.restaurantPhase === "reveal";
  const status = reveal ? "" : `<div class="inline-answer-status restaurant-answer-status">${state.restaurantVote ? `<span class="inline-lock">Vote locked 🔒</span>` : ""}${VotingProgress({ count: state.votedCount })}</div>`;
  return `<section class="round-game restaurant-round phase-${state.restaurantPhase}">${RoundHeader({ round: 2 })}<div class="restaurant-round-top"><div><span class="round-number">ROUND 2 · PICK ${state.restaurantIndex + 1} OF ${gameRestaurants.length}</span><h1>Would you eat here?</h1></div></div><p class="private-copy">One tap locks your answer. Only anonymous completion is shown.</p>${RestaurantVoteCard(restaurant, { status: state.restaurantPhase, advances })}${BinaryVoteButtons({ selected: state.restaurantVote, locked })}${status}<p class="keyboard-hint">Use <kbd>1</kbd> Pass · <kbd>2</kbd> I'd go</p></section>`;
}

function finalistsScreen() {
  return `<section class="finalists-screen">${RoundHeader({ round: 2, label: "FINALISTS", theme: "dark" })}<span class="eyebrow light">YOUR FINALISTS</span><h1>Meet the final two</h1><p>One last choice. Head to head.</p><div class="finalist-stack">${HeadToHeadCard(finalists[0], "a", false, false)}<span class="versus-badge">VS</span>${HeadToHeadCard(finalists[1], "b", false, false)}</div><div class="finalist-loading"><i></i><span>Final round starting…</span></div></section>`;
}

function finalRoundScreen() {
  return `<section class="round-game final-round">${RoundHeader({ round: 3, label: "FINAL ROUND" })}<div class="round-question"><span class="round-number">FINAL ROUND</span><h1>Where are we<br>actually going?</h1><p>Pick one. The entire card is your answer.</p></div><div class="head-to-head">${HeadToHeadCard(finalists[0], "a", state.finalChoice === finalists[0].name)}<span class="versus-badge">VS</span>${HeadToHeadCard(finalists[1], "b", state.finalChoice === finalists[1].name)}</div><div class="privacy-footer"><span>◉</span> Final choices stay hidden until everyone is in</div></section>`;
}

function tieBreakScreen() {
  return `<section class="tie-screen">${RoundHeader({ round: 3, label: "TIE BREAK", theme: "dark" })}${TieBreaker({ selected: state.tieChoice })}</section>`;
}

function confetti() {
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, index) => `<i style="--i:${index};--x:${(index * 41) % 100}%;--d:${(index % 5) * .12}s"></i>`).join("")}</div>`;
}

function resultScreen() {
  const details = state.revealReady ? `<div class="result-details">${FinalVoteTally()}<article class="winner-card is-revealed"><div class="winner-ribbon">WHY HANA WON</div>${RestaurantCard(hana)}<div class="why-won"><h3>Best fit for the whole squad</h3><ul><li><span>✓</span> Strongest group match</li><li><span>✓</span> Within the group's budget</li><li><span>✓</span> Just a 6 minute walk</li><li><span>✓</span> Works with dietary preferences</li></ul></div></article><div class="result-actions"><button class="primary-button" data-action="directions">VIEW DIRECTIONS <span>↗</span></button><button class="secondary-button" data-action="share">SHARE TO TEAM</button><button class="secondary-button secondary-button--cream" data-action="save-result">${state.saved ? "✓ SAVED TO LUNCH MAP" : "SAVE TO LUNCH MAP"}</button><button class="text-button" data-action="satisfaction">Rate it after lunch <span>→</span></button></div></div>` : "";
  return `<section class="result-screen ${state.revealReady ? "is-detail-ready" : "is-winner-only"}">${confetti()}<div class="result-top"><span class="eyebrow light">FINAL RESULT</span><h1>LUNCH IS SORTED</h1></div><div class="result-winner-stage"><span>WINNER</span><h2>Hana Kitchen</h2><p>Korean · 6 min walk</p></div><div class="result-mascot">${Lunchmate({ mood: "celebrate" })}</div>${details}</section>`;
}

function satisfactionScreen() {
  return `<section class="satisfaction-screen">${header("Lunchie", true)}<div class="satisfaction-copy"><span class="eyebrow">AFTER LUNCH</span><h1>How was lunch?</h1><p>This helps Lunchie make better picks for your squad.</p></div>${SatisfactionSlider(state.satisfaction, state.wouldGoAgain)}<button class="primary-button" data-action="submit-satisfaction">SUBMIT FEEDBACK <span>→</span></button><button class="text-button" data-action="skip-satisfaction">Maybe later</button></section>`;
}

function xpRewardScreen() {
  return `<section class="xp-reward-screen">${confetti()}<div class="xp-lunchmate">${Lunchmate({ mood: "celebrate", accessory: "cap" })}</div>${SquadXpReward({ satisfactionBonus: true })}<button class="primary-button" data-action="save-map">${state.saved ? "VIEW OUR LUNCH MAP" : "SAVE TO OUR LUNCH MAP"} <span>→</span></button><button class="text-button" data-action="nav" data-target="home">Back home</button></section>`;
}

function recordingEndScreen() {
  return `<section class="recording-end-screen"><div class="recording-end-brand"><span class="logo-mark">L</span><strong>Lunchie</strong></div><span class="eyebrow light">OFFICE LUNCH SQUAD</span><h1>Lunch decisions,<br>made together.</h1><p>One quick game. Everyone gets a say.</p></section>`;
}

function mapScreen() {
  return `${header()}<section class="content map-screen"><div class="screen-intro compact"><span class="eyebrow">SQUAD MEMORIES</span><h1>Our Lunch Map</h1><p>The good spots your crew actually tried.</p></div><div class="map-visual"><div class="map-road road-a"></div><div class="map-road road-b"></div><span class="map-label label-a">COLLINS ST</span><span class="map-label label-b">FLINDERS LN</span>${lunchHistory.map((item, index) => `<button class="map-pin pin-${index + 1}" data-action="toast" data-message="${item.name} opened"><span>${index + 1}</span><b>${item.name}</b></button>`).join("")}<div class="you-pin">SO</div></div><div class="insight-grid"><article><span>✦</span><strong>4 new places</strong><small>tried this month</small></article><article><span>🍜</span><strong>Korean</strong><small>today's squad pick</small></article></div><div class="section-heading"><h3>Lunch memories</h3><span>${lunchHistory.length} places</span></div><div class="history-list">${lunchHistory.map((item, index) => `<button class="history-item" data-action="toast" data-message="${item.name} details opened"><span class="history-number" style="--pin:${item.color}">${index + 1}</span><div><strong>${item.name}</strong><span>${item.meta}</span><small>${item.cuisine} · ${item.visits}</small></div><em>${item.reaction}</em>${icons.arrow}</button>`).join("")}</div></section>${BottomNav("map")}`;
}

function profileScreen() {
  const squad = state.profileTab === "squad";
  return `${header()}<section class="content profile-screen"><div class="profile-head"><div class="profile-avatar">SO<span>✓</span></div><h1>${squad ? "Lunch Crew" : "Soeun Kwon"}</h1><p>${squad ? "Melbourne CBD · 5 teammates" : "Melbourne CBD · Lunch explorer"}</p></div><div class="segmented"><button class="${!squad ? "is-active" : ""}" data-action="profile-tab" data-tab="me">Me</button><button class="${squad ? "is-active" : ""}" data-action="profile-tab" data-tab="squad">Squad</button></div><div class="stat-grid">${squad ? `<div><strong>18</strong><span>lunches together</span></div><div><strong>11</strong><span>places tried</span></div><div><strong>4</strong><span>full matches</span></div>` : `<div><strong>12</strong><span>lunches</span></div><div><strong>8</strong><span>places tried</span></div><div><strong>3</strong><span>day streak</span></div>`}</div><div class="profile-lunchmate">${Lunchmate({ mood: "happy", accessory: squad ? "cap" : "" })}<div><span>${squad ? "SQUAD LEVEL 4" : "YOUR LUNCHMATE"}</span><h3>${squad ? "77 XP to level 5" : "Ready for lunch"}</h3><p>${squad ? "One more team lunch will do it." : "Three lunches this week. Nice work!"}</p></div></div>${squad ? XpProgress(77) : ""}<div class="section-heading"><h3>Badges</h3><button data-action="toast" data-message="All badges opened">See all</button></div><div class="badge-row"><div><span>🤝</span><strong>Team Player</strong></div><div><span>🧭</span><strong>Explorer</strong></div><div><span>✨</span><strong>Full Match</strong></div><div class="locked"><span>5</span><strong>5 Streak</strong></div></div><article class="weekly-card"><div><span>WEEKLY GOAL</span><h3>Lunch with 4 teammates</h3><p>${squad ? "Everybody showed up—goal complete!" : "One more teammate to go."}</p></div><strong>${squad ? "4 / 4" : "3 / 4"}</strong><div class="weekly-track"><i style="width:${squad ? 100 : 75}%"></i></div></article></section>${BottomNav("profile")}`;
}

const screens = {
  home: homeScreen,
  lobby: lobbyScreen,
  foodRound: foodRoundScreen,
  roundWaiting: roundWaitingScreen,
  restaurantVote: restaurantVoteScreen,
  finalists: finalistsScreen,
  finalRound: finalRoundScreen,
  tieBreak: tieBreakScreen,
  result: resultScreen,
  satisfaction: satisfactionScreen,
  xpReward: xpRewardScreen,
  recordingEnd: recordingEndScreen,
  map: mapScreen,
  profile: profileScreen
};

function startSquadGame() {
  if (state.screen !== "lobby" || state.lobbyPhase === "ready" || state.readyMembers.size < 4) return;
  state.lobbyPhase = "ready";
  playSound("advance");
  render();
  later(() => {
    if (state.screen !== "lobby") return;
    state.foodPhase = "voting";
    state.foodChoice = "";
    state.votedCount = 3;
    navigate("foodRound");
  }, reducedMotion() ? 120 : 900);
}

function chooseFood(value) {
  if (state.screen !== "foodRound" || state.foodPhase !== "voting") return;
  state.foodChoice = value;
  state.foodPhase = "locked";
  state.votedCount = 4;
  playSound("select");
  render();
  later(() => playSound("lock"), reducedMotion() ? 20 : 150);
  later(() => {
    if (state.screen !== "foodRound") return;
    state.foodPhase = "complete";
    state.votedCount = 5;
    playSound("complete");
    render();
  }, reducedMotion() ? 60 : 480);
  later(() => {
    if (state.screen !== "foodRound") return;
    state.foodPhase = "reveal";
    playSound("advance");
    render();
  }, reducedMotion() ? 110 : 780);
  later(() => {
    if (state.screen !== "foodRound") return;
    state.restaurantIndex = 0;
    state.restaurantPhase = "voting";
    state.restaurantVote = "";
    state.votedCount = 2;
    navigate("restaurantVote");
  }, reducedMotion() ? 220 : 1450);
}

function castBinaryVote(vote) {
  if (state.screen !== "restaurantVote" || state.restaurantPhase !== "voting") return;
  state.restaurantVotes[state.restaurantIndex] = vote;
  state.restaurantVote = vote;
  state.restaurantPhase = "locked";
  state.votedCount = 4;
  playSound("select");
  render();
  later(() => playSound("lock"), reducedMotion() ? 20 : 130);
  later(() => {
    if (state.screen !== "restaurantVote") return;
    state.restaurantPhase = "complete";
    state.votedCount = 5;
    playSound("complete");
    render();
  }, reducedMotion() ? 60 : 300);
  later(() => {
    if (state.screen !== "restaurantVote") return;
    state.restaurantPhase = "reveal";
    playSound(state.restaurantIndex < 2 ? "advance" : "eliminate");
    render();
  }, reducedMotion() ? 110 : 430);
  later(() => {
    if (state.screen !== "restaurantVote") return;
    if (state.restaurantIndex < gameRestaurants.length - 1) {
      state.restaurantIndex += 1;
      state.restaurantPhase = "voting";
      state.restaurantVote = "";
      state.votedCount = Math.min(3, 2 + state.restaurantIndex);
      navigate("restaurantVote");
    } else navigate("finalists");
  }, reducedMotion() ? 220 : 980);
}

function chooseFinal(value) {
  if (state.screen !== "finalRound" || state.finalChoice) return;
  state.finalChoice = value;
  state.activeRound = "final";
  playSound("select");
  render();
  later(() => playSound("lock"), reducedMotion() ? 20 : 140);
  if (finalAdvanceTimer) window.clearTimeout(finalAdvanceTimer);
  finalAdvanceTimer = window.setTimeout(() => {
    finalAdvanceTimer = null;
    if (state.screen === "finalRound" && state.finalChoice === value) navigate("roundWaiting");
  }, reducedMotion() ? 60 : 420);
}

root.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "start") { gameAudio.start("lobby"); playSound("select"); navigate("lobby", { reset: true }); }
  if (action === "start-game") startSquadGame();
  if (action === "surprise") { gameAudio.start("round"); playSound("select"); navigate("foodRound", { reset: true }); }
  if (action === "food-choice") chooseFood(button.dataset.value);
  if (action === "binary-vote") castBinaryVote(button.dataset.vote);
  if (action === "start-final") navigate("finalRound");
  if (action === "final-choice") chooseFinal(button.dataset.value);
  if (action === "tie-choice") {
    if (state.tieChoice) return;
    state.tieChoice = button.dataset.value;
    render();
    later(() => { state.activeRound = "tie"; navigate("roundWaiting"); }, reducedMotion() ? 60 : 420);
  }
  if (action === "toggle-sound") {
    state.soundEnabled = !state.soundEnabled;
    gameAudio.setMuted(!state.soundEnabled);
    render();
    if (state.soundEnabled) playSound("lock");
  }
  if (action === "exit-game") navigate("home");
  if (action === "satisfaction") navigate("satisfaction");
  if (action === "would-go-again") { state.wouldGoAgain = !state.wouldGoAgain; render(); }
  if (action === "submit-satisfaction") navigate("xpReward");
  if (action === "skip-satisfaction") navigate("home");
  if (action === "save-result") { state.saved = true; showToast("Hana Kitchen saved to your Lunch Map"); }
  if (action === "save-map") { state.saved = true; navigate("map"); showToast("Hana Kitchen saved to your Lunch Map"); }
  if (action === "nav") navigate(button.dataset.target === "squad" ? "lobby" : button.dataset.target, { reset: button.dataset.target === "squad" });
  if (action === "back") navigate(state.previousScreen || "home");
  if (action === "profile-tab") { state.profileTab = button.dataset.tab; render(); }
  if (action === "toast") showToast(button.dataset.message);
  if (action === "directions") window.open("https://www.google.com/maps/search/?api=1&query=Korean+restaurant+Melbourne+CBD", "_blank", "noopener");
  if (action === "share") {
    const text = "Lunch is sorted! Hana Kitchen at 12:30 — 6 min walk. 🍜";
    try {
      if (navigator.share) await navigator.share({ title: "Lunchie squad pick", text });
      else await navigator.clipboard.writeText(text);
      showToast("Lunch plan shared with the team");
    } catch { showToast("Share cancelled—your result is safe"); }
  }
});

root.addEventListener("input", event => {
  if (event.target.matches('[data-action="satisfaction"]')) {
    const value = Number(event.target.value);
    const faceValue = value < 25 ? "😕" : value < 50 ? "😐" : value < 75 ? "🙂" : "😍";
    const feeling = value < 25 ? "Not my thing" : value < 50 ? "It was okay" : value < 75 ? "Pretty good" : "Loved it";
    state.satisfaction = value;
    event.target.style.setProperty("--value", `${value}%`);
    event.target.setAttribute("aria-valuetext", feeling);
    const face = root.querySelector(".satisfaction-face");
    if (face) {
      face.textContent = faceValue;
      if (!reducedMotion() && face.animate) face.animate([{ transform: "scale(.92)" }, { transform: "scale(1)" }], { duration: 160, easing: "ease-out" });
    }
    const label = root.querySelector(".satisfaction-feeling");
    if (label) label.textContent = `${faceValue} ${feeling}`;
  }
});

window.addEventListener("keydown", event => {
  if (state.screen === "foodRound") {
    const choice = foodChoices[Number(event.key) - 1];
    if (choice) chooseFood(choice.name);
  }
  if (state.screen === "restaurantVote") {
    const vote = { "1": "pass", "2": "go", ArrowLeft: "pass", ArrowRight: "go" }[event.key];
    if (vote) castBinaryVote(vote);
  }
  if (state.screen === "finalRound") {
    const choice = { "1": finalists[0].name, "2": finalists[1].name, ArrowLeft: finalists[0].name, ArrowRight: finalists[1].name }[event.key];
    if (choice) chooseFinal(choice);
  }
});

render();

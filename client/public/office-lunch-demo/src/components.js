import { coworkers } from "./data.js";

export const icons = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>`,
  squad: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M13.5 15c.8-1 2-1.5 3.7-1.5 2.6 0 4 1.7 4.3 4.7"/></svg>`,
  map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 6 5-2 7 2 5-2v14l-5 2-7-2-5 2V6Z"/><path d="M8.5 4v14M15.5 6v14"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.6-5 3.2-7 8-7s7.4 2 8 7"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  walk: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m10 21 2-6-3-3 2-5 4 3 3 1M12 15l4 6M9 12l-4 3"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.3.9-4.6 4.4 1.1 6.2-5.5-2.9-5.5 2.9 1.1-6.2L3 9.5l6.3-.9L12 3Z"/></svg>`
};

export function Lunchmate({ mood = "happy", accessory = "" } = {}) {
  const faces = {
    happy: `<path d="M45 66c5 6 13 6 18 0"/><circle cx="43" cy="55" r="2.5"/><circle cx="65" cy="55" r="2.5"/>`,
    wait: `<path d="M45 68c5-3 12-3 17 0"/><circle cx="43" cy="55" r="2.5"/><circle cx="65" cy="55" r="2.5"/>`,
    celebrate: `<path d="M44 64c5 11 14 11 20 0Z" fill="#183B2B"/><path d="M47 55q3-4 6 0M61 55q3-4 6 0"/>`,
    think: `<path d="M47 68q7 3 13-1"/><circle cx="43" cy="55" r="2.5"/><circle cx="65" cy="55" r="2.5"/>`
  };
  return `<div class="lunchmate lunchmate--${mood}" aria-label="Lunchmate is ${mood}">
    <svg viewBox="0 0 110 110" role="img">
      ${accessory === "cap" ? `<path d="M34 31c7-13 34-15 43 0l-4 7H36l-2-7Z" fill="#F2C84B"/><path d="M72 31c8 0 14 2 17 6H70Z" fill="#D79B1D"/>` : ""}
      <path d="M29 45c0-16 12-27 27-27s27 11 27 27v36c0 10-8 17-18 17H47c-10 0-18-7-18-17V45Z" fill="#7FC499" stroke="#183B2B" stroke-width="3"/>
      <path d="M31 48c11-3 39-3 50 0" stroke="#183B2B" stroke-width="3" fill="none"/>
      <path d="M21 64q-8 8 1 17M91 64q8 8-1 17" stroke="#183B2B" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M45 98v7M67 98v7" stroke="#183B2B" stroke-width="4" stroke-linecap="round"/>
      <g fill="none" stroke="#183B2B" stroke-width="3" stroke-linecap="round">${faces[mood] || faces.happy}</g>
      <circle cx="37" cy="63" r="4" fill="#F49D67" opacity=".65"/><circle cx="73" cy="63" r="4" fill="#F49D67" opacity=".65"/>
    </svg>
  </div>`;
}

export function SquadAvatar(person, { size = "md", status = false, delay = 0 } = {}) {
  return `<div class="avatar-wrap avatar-wrap--${size}" style="--delay:${delay}ms">
    <div class="avatar" style="--avatar:${person.color}">${person.initials}</div>
    ${status ? `<span class="avatar-status" aria-label="ready">✓</span>` : ""}
    <span class="avatar-name">${person.name}</span>
  </div>`;
}

export function ProgressHeader({ current, total, label = "" }) {
  return `<header class="progress-header">
    <span class="eyebrow">${label || `${current} / ${total}`}</span>
    <div class="progress-track"><span style="width:${(current / total) * 100}%"></span></div>
    <span class="progress-count">${current} / ${total}</span>
  </header>`;
}

export function PreferenceChip(label, group, selected) {
  return `<button class="preference-chip ${selected ? "is-selected" : ""}" data-action="preference" data-group="${group}" data-value="${label}" aria-pressed="${selected}">${label}${selected ? "<span>✓</span>" : ""}</button>`;
}

function foodIllustration(type) {
  const common = `<ellipse cx="180" cy="162" rx="115" ry="23" fill="#132E21" opacity=".12"/>`;
  if (type === "dumplings") return `<svg viewBox="0 0 360 220" role="img" aria-label="Steaming dumplings">${common}<path d="M65 145c20-57 210-57 230 0l-14 33H79l-14-33Z" fill="#244B37"/><path d="M86 139c12-35 56-39 72 0" fill="#FFF1D5" stroke="#C98A52" stroke-width="4"/><path d="M145 139c12-42 60-43 77 0" fill="#FFE6BA" stroke="#C98A52" stroke-width="4"/><path d="M210 139c10-31 51-35 66 0" fill="#FFF1D5" stroke="#C98A52" stroke-width="4"/><path d="M114 126q9-15 18 0M176 124q10-17 20 0M235 127q8-13 17 0" stroke="#C98A52" stroke-width="3" fill="none"/><path d="M128 70q-14-22 2-38M183 75q-14-25 2-45M239 70q-13-20 2-35" stroke="#FFF4DF" stroke-width="8" stroke-linecap="round" fill="none" opacity=".85"/></svg>`;
  if (type === "bibimbap") return `<svg viewBox="0 0 360 220" role="img" aria-label="Colourful Korean bibimbap bowl">${common}<path d="M70 102h220c-8 58-42 87-110 87s-102-29-110-87Z" fill="#F5E4C1" stroke="#183B2B" stroke-width="5"/><ellipse cx="180" cy="103" rx="110" ry="48" fill="#FBF4E5" stroke="#183B2B" stroke-width="5"/><path d="M180 103 99 84q14-25 51-25Z" fill="#E95D43"/><path d="m180 103-30-44q38-15 63 3Z" fill="#F3C94F"/><path d="m180 103 33-41q36 5 48 27Z" fill="#4F9D6B"/><path d="m180 103 81-14q12 19-2 36Z" fill="#D97745"/><path d="m180 103 79 22q-15 24-51 29Z" fill="#7CAE57"/><path d="m180 103 28 51q-31 16-61 2Z" fill="#EFE5BD"/><path d="m180 103-33 53q-31-8-47-30Z" fill="#C95B3D"/><path d="m180 103-80 23Q86 106 99 84Z" fill="#6FA54C"/><circle cx="180" cy="103" r="31" fill="#FFF8E8"/><circle cx="180" cy="103" r="16" fill="#F3C84D"/></svg>`;
  if (type === "sushi") return `<svg viewBox="0 0 360 220" role="img" aria-label="Fresh sushi lunch">${common}<rect x="72" y="72" width="216" height="102" rx="34" fill="#244B37"/><g stroke="#183B2B" stroke-width="4"><ellipse cx="120" cy="115" rx="34" ry="27" fill="#FFF0D0"/><ellipse cx="180" cy="115" rx="34" ry="27" fill="#FFF0D0"/><ellipse cx="240" cy="115" rx="34" ry="27" fill="#FFF0D0"/></g><path d="M91 107q29-38 58 0" fill="#E96855"/><path d="M151 107q29-38 58 0" fill="#F2C94C"/><path d="M211 107q29-38 58 0" fill="#E96855"/><circle cx="120" cy="119" r="9" fill="#7AAA58"/><circle cx="180" cy="119" r="9" fill="#D96B45"/><circle cx="240" cy="119" r="9" fill="#7AAA58"/></svg>`;
  return `<svg viewBox="0 0 360 220" role="img" aria-label="Fresh salad bowl">${common}<path d="M72 111h216c-8 52-42 78-108 78S80 163 72 111Z" fill="#F1D9AD" stroke="#183B2B" stroke-width="5"/><ellipse cx="180" cy="110" rx="108" ry="44" fill="#376F4E" stroke="#183B2B" stroke-width="5"/><circle cx="125" cy="93" r="24" fill="#82B85A"/><circle cx="157" cy="112" r="27" fill="#A5CB63"/><circle cx="201" cy="88" r="27" fill="#6FAA55"/><circle cx="237" cy="111" r="26" fill="#9FC85D"/><circle cx="103" cy="116" r="14" fill="#F0C94F"/><circle cx="223" cy="82" r="13" fill="#E8654B"/><circle cx="176" cy="82" r="12" fill="#F5E8C9"/><path d="m136 119 42-45M201 130l39-48" stroke="#E8EFE2" stroke-width="12" stroke-linecap="round"/></svg>`;
}

export function RestaurantCard(restaurant, { leaving = false } = {}) {
  return `<article class="restaurant-card ${leaving ? "is-leaving" : ""}" data-tone="${restaurant.tone}">
    <div class="food-art food-art--${restaurant.tone}">${foodIllustration(restaurant.art)}<span class="art-badge">${restaurant.tags[0]}</span></div>
    <div class="restaurant-body">
      <div class="restaurant-title-row"><div><span class="eyebrow">${restaurant.cuisine}</span><h2>${restaurant.name}</h2></div><span class="rating">${icons.star} ${restaurant.rating}</span></div>
      <div class="restaurant-meta"><span>${icons.walk} ${restaurant.walk}</span><span class="price">${restaurant.price}</span></div>
      <div class="tag-row">${restaurant.tags.map(tag => `<span>${tag}</span>`).join("")}</div>
    </div>
  </article>`;
}

export function VoteButton({ kind, icon, label, keyHint }) {
  return `<button class="vote-button vote-button--${kind}" data-action="vote" data-vote="${kind}"><span class="vote-icon">${icon}</span><span>${label}</span><kbd>${keyHint}</kbd></button>`;
}

export function BottomNav(active = "home") {
  const items = [["home", "Home"], ["squad", "Squad"], ["map", "Map"], ["profile", "Profile"]];
  return `<nav class="bottom-nav" aria-label="Main navigation">${items.map(([key, label]) => `<button data-action="nav" data-target="${key}" class="${active === key ? "is-active" : ""}">${icons[key]}<span>${label}</span></button>`).join("")}</nav>`;
}

export function XpProgress(value = 72) {
  return `<div class="xp-card"><div class="xp-copy"><span>Squad level 4</span><strong>${value} / 100 XP</strong></div><div class="xp-track"><span style="width:${value}%"></span></div></div>`;
}

export function Toast(message) {
  return `<div class="toast" role="status"><span>✓</span>${message}</div>`;
}

export function joinedAvatars(count) {
  return coworkers.slice(0, count).map((person, index) => SquadAvatar(person, { status: true, delay: index * 100 })).join("");
}

export function RoundHeader({ round = 1, label = "ROUND", theme = "light" } = {}) {
  return `<header class="round-header round-header--${theme}"><span>${label === "ROUND" ? `ROUND ${round}` : label}</span><div class="round-dots" aria-label="Round ${round} of 3">${[1, 2, 3].map(value => `<i class="${value <= round ? "is-filled" : ""}"></i>`).join("")}</div><button data-action="exit-game" aria-label="Exit game">×</button></header>`;
}

export function VotingProgress({ count = 4, total = 5, compact = true } = {}) {
  return `<div class="voting-progress ${compact ? "is-compact" : ""}" aria-label="${count} of ${total} answered"><div class="answer-dots" aria-hidden="true">${Array.from({ length: total }, (_, index) => `<i class="${index < count ? "is-done" : ""}"></i>`).join("")}</div><strong>${count} / ${total} answered</strong></div>`;
}

export function HiddenVoteStatus({ count = 4, title = "Waiting for your squad…", lockedLabel = "Locked in 🔒" } = {}) {
  if (count >= coworkers.length) {
    return `<section class="hidden-vote-status is-complete"><span class="lock-pill">${lockedLabel}</span>${VotingProgress({ count, compact: false })}<h1>Everyone's in!</h1><p>All five answers are safely locked.</p></section>`;
  }
  return `<section class="hidden-vote-status"><span class="lock-pill">${lockedLabel}</span><h1>${title}</h1>${VotingProgress({ count, compact: false })}<p><span>◉</span> Answers stay hidden until everyone is in.</p></section>`;
}

export function FoodChoiceCard(choice, { selected = false, locked = false, reveal = false } = {}) {
  const winner = reveal && choice.name === "Korean";
  const dimmed = (locked && !selected) || (reveal && !winner);
  return `<button class="food-choice ${selected ? "is-locked" : ""} ${dimmed ? "is-dimmed" : ""} ${winner ? "is-winner" : ""}" data-action="food-choice" data-value="${choice.name}" data-tone="${choice.tone}" aria-pressed="${selected}" ${locked ? "disabled" : ""}><span>${choice.emoji}</span><strong>${choice.name}</strong><em>${winner ? "Made the cut!" : selected ? "Locked 🔒" : "Tap to answer"}</em></button>`;
}

export function BinaryVoteButtons({ selected = "", locked = false } = {}) {
  return `<div class="binary-votes ${locked ? "is-locked" : ""}"><button data-action="binary-vote" data-vote="pass" class="binary-vote binary-vote--pass ${selected === "pass" ? "is-selected" : ""}" aria-pressed="${selected === "pass"}" ${locked ? "disabled" : ""}><span>${selected === "pass" ? "✓" : "×"}</span><strong>${selected === "pass" ? "LOCKED" : "PASS"}</strong><kbd>1</kbd></button><button data-action="binary-vote" data-vote="go" class="binary-vote binary-vote--go ${selected === "go" ? "is-selected" : ""}" aria-pressed="${selected === "go"}" ${locked ? "disabled" : ""}><span>${selected === "go" ? "✓" : "♥"}</span><strong>${selected === "go" ? "LOCKED" : "I'D GO"}</strong><kbd>2</kbd></button></div>`;
}

export function RestaurantVoteCard(restaurant, { status = "voting", advances = false } = {}) {
  const outcome = status === "reveal" ? `<span class="restaurant-card-outcome ${advances ? "is-positive" : "is-skip"}">${advances ? "✓ Made the shortlist" : "We'll skip this one 👋"}</span>` : "";
  return `<div class="restaurant-vote-card status-${status} ${advances ? "is-advancing" : "is-eliminated"}">${RestaurantCard(restaurant)}${outcome}</div>`;
}

export function HeadToHeadCard(restaurant, side, selected = false, interactive = true) {
  const tag = interactive ? "button" : "article";
  const actionAttributes = interactive ? `data-action="final-choice" data-value="${restaurant.name}" data-side="${side}"` : "";
  return `<${tag} class="head-card ${selected ? "is-selected" : ""} ${interactive ? "is-interactive" : "is-preview"}" ${actionAttributes}><span class="head-card__art food-art--${restaurant.tone}">${foodIllustration(restaurant.art)}</span><span class="head-card__body"><small>${restaurant.cuisine}</small><strong>${restaurant.name}</strong><em>${restaurant.walk.replace(" walk", "")} · ${restaurant.price}</em></span>${selected ? `<i>✓</i>` : ""}</${tag}>`;
}

export function Countdown(value, label = "Everyone's in…") {
  return `<section class="game-countdown"><span>${label}</span><strong aria-live="polite">${value}</strong><p>Answers are locked. Reveal incoming.</p></section>`;
}

export function GameAudioControl(enabled = true, mode = "round") {
  return `<button class="game-audio-control" data-action="toggle-sound" data-audio-mode="${mode}" aria-label="${enabled ? "Mute music and game sounds" : "Turn on music and game sounds"}" aria-pressed="${!enabled}">${enabled ? "🔊" : "🔇"}</button>`;
}

export function SquadReadyTransition() {
  return `<section class="squad-ready-transition" aria-live="polite"><span class="ready-burst">✓</span><span class="eyebrow light">SQUAD READY</span><h1>5 coworkers<br>3 rounds</h1><strong>LET'S PICK LUNCH</strong></section>`;
}

export function FinalVoteTally() {
  return `<section class="final-vote-tally" aria-label="Anonymous final vote tally"><span class="eyebrow">ANONYMOUS GROUP RESULT</span><div><strong>Hana Kitchen</strong><span aria-label="4 votes">● ● ● ●</span></div><div><strong>Supernormal</strong><span aria-label="1 vote">●</span></div><p>4 / 5 squad match</p></section>`;
}

export function RoundReveal({ eyebrow, title, emoji = "", copy = "", tone = "green", action = "", actionLabel = "" } = {}) {
  return `<section class="round-reveal" data-tone="${tone}"><div class="reveal-rays"></div><span class="eyebrow light">${eyebrow}</span><div class="reveal-emoji">${emoji}</div><h1>${title}</h1><p>${copy}</p>${action ? `<button class="primary-button primary-button--sun" data-action="${action}">${actionLabel}<span>→</span></button>` : ""}</section>`;
}

export function TieBreaker({ selected = "" } = {}) {
  return `<section class="tie-breaker"><span class="tie-bolt">⚡</span><span class="eyebrow light">TIE BREAK</span><h1>What matters<br>more today?</h1><p>One tiny question. Answers still stay private.</p><div class="tie-options"><button class="${selected === "closer" ? "is-selected" : ""}" data-action="tie-choice" data-value="closer"><span>👟</span><strong>5 min closer</strong><em>Keep it quick</em></button><button class="${selected === "new" ? "is-selected" : ""}" data-action="tie-choice" data-value="new"><span>✦</span><strong>Somewhere new</strong><em>Try a fresh spot</em></button></div></section>`;
}

export function SatisfactionSlider(value = 72, wouldGoAgain = false) {
  const face = value < 25 ? "😕" : value < 50 ? "😐" : value < 75 ? "🙂" : "😍";
  const feeling = value < 25 ? "Not my thing" : value < 50 ? "It was okay" : value < 75 ? "Pretty good" : "Loved it";
  return `<div class="satisfaction-control"><div class="satisfaction-face" aria-hidden="true">${face}</div><strong class="satisfaction-feeling" aria-live="polite">${face} ${feeling}</strong><input type="range" min="0" max="100" value="${value}" data-action="satisfaction" aria-label="Lunch satisfaction" aria-valuetext="${feeling}" style="--value:${value}%"><div class="slider-labels"><span>Not my thing</span><span>Loved it</span></div><button class="again-chip ${wouldGoAgain ? "is-selected" : ""}" data-action="would-go-again" aria-pressed="${wouldGoAgain}"><span>↻</span> Would go again ${wouldGoAgain ? "✓" : ""}</button></div>`;
}

export function SquadXpReward({ satisfactionBonus = true } = {}) {
  return `<section class="squad-xp-reward"><span class="eyebrow">SQUAD REWARD</span><h1>Nice work, crew!</h1><p>Everyone had a say. One shared reward.</p><div class="xp-burst"><strong>+${satisfactionBonus ? 25 : 20}</strong><span>Squad XP</span></div><div class="reward-secondary"><div><span>🔥</span><strong>3-day streak continues</strong></div><div><span>🎁</span><strong>Lunchmate reward unlocked</strong></div></div></section>`;
}

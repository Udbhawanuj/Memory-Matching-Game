const EMOJIS = [
  "💐", "🌹", "🌻", "🌸", "🌺", "🌴",
  "🍓", "🍒", "🍉", "🍊", "🥭", "🍍",
  "🥥", "🍎", "🍇", "🍔", "🍕", "🍫",
  "🧁", "🎂", "🍩", "🎈", "⭐", "⚡"
];

const BEST_KEY = "mmg_bestScores_v1";
let rows = 4;
let cols = 4;
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let totalPairs = 0;
let timerInterval = null;
let secondsElapsed = 0;
let soundEnabled = true;
let bestScores = {};

function $(selector) {
  return document.querySelector(selector);
}

function createEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playBeep(freq = 600, duration = 120, volume = 0.08) {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration);
  } catch (e) {
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimeUI();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  stopTimer();
  secondsElapsed = 0;
  updateTimeUI();
}

function updateTimeUI() {
  $("#time").textContent = formatTime(secondsElapsed);
}

function loadBestScores() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    bestScores = raw ? JSON.parse(raw) : {};
  } catch {
    bestScores = {};
  }
}

function saveBestScores() {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(bestScores));
  } catch {
  }
}

function updateBestUI() {
  const key = `${rows}x${cols}`;
  const best = bestScores[key];
  $("#best-time").textContent = best ? formatTime(best) : "--:--";
}

function maybeUpdateBest() {
  const key = `${rows}x${cols}`;
  const prev = bestScores[key];
  if (!prev || secondsElapsed < prev) {
    bestScores[key] = secondsElapsed;
    saveBestScores();
    updateBestUI();
    return true;
  }
  return false;
}

function buildBoard() {
  const board = $("#board");
  board.innerHTML = "";

  const totalCards = rows * cols;
  totalPairs = totalCards / 2;

  const neededEmojis = shuffle(EMOJIS).slice(0, totalPairs);
  const cardValues = shuffle([...neededEmojis, ...neededEmojis]);

  board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  cardValues.forEach((emoji) => {
    const card = createEl("div", "card");
    card.dataset.value = emoji;

    const inner = createEl("div", "card-inner");

    const front = createEl("div", "card-front");
    front.textContent = "❔";

    const back = createEl("div", "card-back");
    back.textContent = emoji;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => handleCardClick(card));
    board.appendChild(card);
  });

  $("#board-label").textContent = `${rows} x ${cols}`;
}

function resetGameState() {
  moves = 0;
  matches = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  $("#moves").textContent = "0";
  resetTimer();
}

function handleCardClick(card) {
  if (lockBoard || card.classList.contains("flipped") || card.classList.contains("matched")) {
    return;
  }

  if (!timerInterval) {
    startTimer();
  }

  card.classList.add("flipped");
  playBeep(650, 90, 0.06);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;
  moves++;
  $("#moves").textContent = String(moves);

  checkForMatch();
}

function checkForMatch() {
  if (!firstCard || !secondCard) return;

  const isMatch = firstCard.dataset.value === secondCard.dataset.value;

  if (isMatch) {
    firstCard.classList.add("matched", "disabled");
    secondCard.classList.add("matched", "disabled");
    playBeep(850, 120, 0.09);

    matches++;
    resetTurn();

    if (matches === totalPairs) {
      onWin();
    }
  } else {
    setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      playBeep(420, 100, 0.05);
      resetTurn();
    }, 650);
  }
}

function resetTurn() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function onWin() {
  stopTimer();
  setTimeout(() => {
    const timeText = formatTime(secondsElapsed);
    const summary = `You finished a ${rows} x ${cols} board in ${timeText} with ${moves} moves.`;
    const isBest = maybeUpdateBest();

    $("#win-summary").textContent = summary;
    $("#win-best").textContent = isBest
      ? "🔥 New personal best for this board size!"
      : "Try again to beat your best time.";

    updateBestUI();

    $("#win-modal").classList.remove("hidden");
    playBeep(900, 220, 0.12);
    setTimeout(() => playBeep(1100, 260, 0.12), 120);
  }, 500);
}

function initTheme() {
  const storedTheme = localStorage.getItem("mmg_theme");
  if (storedTheme === "light") {
    document.body.classList.add("light");
    $("#theme-toggle").textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    $("#theme-toggle").textContent = "🌙";
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  $("#theme-toggle").textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("mmg_theme", isLight ? "light" : "dark");
}

function initSound() {
  const stored = localStorage.getItem("mmg_sound");
  if (stored === "off") {
    soundEnabled = false;
    $("#sound-toggle").textContent = "🔇";
  } else {
    soundEnabled = true;
    $("#sound-toggle").textContent = "🔊";
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  $("#sound-toggle").textContent = soundEnabled ? "🔊" : "🔇";
  localStorage.setItem("mmg_sound", soundEnabled ? "on" : "off");
}

function parseBoardSize(value) {
  const [r, c] = value.split("x").map(Number);
  return { r, c };
}

function startNewGame() {
  const select = $("#board-size");
  const { r, c } = parseBoardSize(select.value);
  rows = r;
  cols = c;

  resetGameState();
  buildBoard();
  updateBestUI();
}

function hideSplash() {
  const splash = $("#splash");
  splash.classList.add("fade-out");
  setTimeout(() => {
    splash.style.display = "none";
  }, 650);
}

document.addEventListener("DOMContentLoaded", () => {
  loadBestScores();
  initTheme();
  initSound();

  buildBoard();
  updateBestUI();

  $("#new-game").addEventListener("click", () => {
    playBeep(700, 120, 0.09);
    startNewGame();
  });

  $("#board-size").addEventListener("change", () => {
    playBeep(520, 80, 0.06);
    startNewGame();
  });

  $("#theme-toggle").addEventListener("click", () => {
    toggleTheme();
    playBeep(580, 90, 0.06);
  });

  $("#sound-toggle").addEventListener("click", () => {
    toggleSound();
    playBeep(400, 80, 0.05);
  });

  $("#splash-start").addEventListener("click", () => {
    playBeep(820, 160, 0.1);
    hideSplash();
    startNewGame();
  });

  $("#play-again").addEventListener("click", () => {
    $("#win-modal").classList.add("hidden");
    startNewGame();
  });

  $("#close-modal").addEventListener("click", () => {
    $("#win-modal").classList.add("hidden");
  });
});

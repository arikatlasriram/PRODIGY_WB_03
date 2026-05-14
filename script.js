/* ============================================================
   TIC-TAC-TOE PRO — script.js
   Author: Srira | Prodigy InfoTech Task 03
   ============================================================ */

'use strict';

/* ============================================================
   1. CONSTANTS & STATE
   ============================================================ */
const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diagonals
];

/** Central game state */
const state = {
  board:      Array(9).fill(null), // null | 'X' | 'O'
  current:    'X',
  mode:       'pvp',               // 'pvp' | 'ai'
  difficulty: 'easy',             // 'easy' | 'medium' | 'hard'
  gameOver:   false,
  scores:     { X: 0, O: 0, D: 0 },
  history:    [],
  theme:      'dark',
  musicOn:    false,
  aiThinking: false,
};

/* ============================================================
   2. DOM REFERENCES
   ============================================================ */
const $ = id => document.getElementById(id);
const cells           = Array.from(document.querySelectorAll('.cell'));
const board           = $('board');
const statusMessage   = $('status-message');
const statusIcon      = $('status-icon');
const xWinsEl         = $('x-wins');
const oWinsEl         = $('o-wins');
const drawsEl         = $('draws');
const themeToggle     = $('theme-toggle');
const themeIcon       = $('theme-icon');
const musicToggle     = $('music-toggle');
const musicIcon       = $('music-icon');
const modePvp         = $('mode-pvp');
const modeAi          = $('mode-ai');
const diffGroup       = $('difficulty-group');
const diffBtns        = document.querySelectorAll('.diff-btn');
const restartBtn      = $('restart-btn');
const resetScoresBtn  = $('reset-scores-btn');
const historyBtn      = $('history-btn');
const historyPanel    = $('history-panel');
const historyList     = $('history-list');
const clearHistoryBtn = $('clear-history-btn');
const modalOverlay    = $('modal-overlay');
const modalEmoji      = $('modal-emoji');
const modalTitle      = $('modal-title');
const modalSubtitle   = $('modal-subtitle');
const playAgainBtn    = $('play-again-btn');
const closeModalBtn   = $('close-modal-btn');
const confettiCanvas  = $('confetti-canvas');
const particlesCont   = $('particles-container');

/* ============================================================
   3. WEB AUDIO — SOUND EFFECTS (no external files needed)
   ============================================================ */
let audioCtx = null;

/** Lazy-init AudioContext on first user gesture */
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(frequency, type = 'sine', duration = 0.12, gain = 0.25) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.connect(gn);
    gn.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gn.gain.setValueAtTime(gain, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(_) {}
}

const sounds = {
  click() { playTone(440,'sine',0.1,0.2); },
  win()   {
    [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f,'triangle',0.18,0.3), i*100));
  },
  draw()  { [300,250].forEach((f,i) => setTimeout(()=>playTone(f,'sawtooth',0.2,0.2),i*150)); },
  ai()    { playTone(330,'square',0.08,0.15); },
};

/* ============================================================
   4. BACKGROUND PARTICLES
   ============================================================ */
function spawnParticles() {
  const colors = ['#a78bfa','#60a5fa','#f472b6','#34d399','#fbbf24'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 60 + 10;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      background:${color};
      animation-duration:${Math.random()*20+12}s;
      animation-delay:-${Math.random()*20}s;
    `;
    particlesCont.appendChild(p);
  }
}

/* ============================================================
   5. THEME
   ============================================================ */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('ttt_theme', theme);
}

themeToggle.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   6. BACKGROUND MUSIC (oscillator-based ambient loop)
   ============================================================ */
let musicNodes = null;

function startMusic() {
  try {
    const ctx = getAudioCtx();
    const notes = [261.63, 329.63, 392, 523.25];
    musicNodes = [];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.connect(gn); gn.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gn.gain.value = 0.03;
      osc.start();
      musicNodes.push(osc);
    });
  } catch(_) {}
}

function stopMusic() {
  if (musicNodes) {
    musicNodes.forEach(n => { try { n.stop(); } catch(_){} });
    musicNodes = null;
  }
}

musicToggle.addEventListener('click', () => {
  state.musicOn = !state.musicOn;
  musicIcon.textContent = state.musicOn ? '🔊' : '🎵';
  state.musicOn ? startMusic() : stopMusic();
});

/* ============================================================
   7. LOCALSTORAGE PERSISTENCE
   ============================================================ */
function saveToStorage() {
  localStorage.setItem('ttt_scores',  JSON.stringify(state.scores));
  localStorage.setItem('ttt_history', JSON.stringify(state.history));
}

function loadFromStorage() {
  const savedScores  = localStorage.getItem('ttt_scores');
  const savedHistory = localStorage.getItem('ttt_history');
  const savedTheme   = localStorage.getItem('ttt_theme');
  if (savedScores)  state.scores  = JSON.parse(savedScores);
  if (savedHistory) state.history = JSON.parse(savedHistory);
  if (savedTheme)   applyTheme(savedTheme);
}

/* ============================================================
   8. UI RENDER HELPERS
   ============================================================ */
function renderScores() {
  xWinsEl.textContent = state.scores.X;
  oWinsEl.textContent = state.scores.O;
  drawsEl.textContent = state.scores.D;
}

function setStatus(icon, msg) {
  statusIcon.textContent    = icon;
  statusMessage.textContent = msg;
}

function highlightWinners(combo) {
  combo.forEach(idx => cells[idx].classList.add('winning-cell'));
}

function renderBoard() {
  cells.forEach((cell, i) => {
    const val = state.board[i];
    cell.textContent = '';
    cell.className   = 'cell';
    if (val) {
      const span = document.createElement('span');
      span.className = 'mark';
      span.textContent = val === 'X' ? '✕' : '○';
      cell.appendChild(span);
      cell.classList.add('taken', val === 'X' ? 'x-cell' : 'o-cell');
    }
  });
}

/* ============================================================
   9. GAME LOGIC
   ============================================================ */
function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a,b,c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every(c => c !== null)) return { winner: 'draw', combo: [] };
  return null;
}

function handleResult(result) {
  state.gameOver = true;
  board.classList.add('disabled');

  const timestamp = new Date().toLocaleTimeString();
  const modeLabel = state.mode === 'ai' ? `vs AI (${state.difficulty})` : 'PvP';

  if (result.winner === 'draw') {
    state.scores.D++;
    setStatus('🤝', "It's a Draw!");
    sounds.draw();
    addHistory('Draw', 'draw', modeLabel, timestamp);
    showModal('🤝', "It's a Draw!", 'Well played by both sides!');
  } else {
    const winner = result.winner;
    state.scores[winner]++;
    highlightWinners(result.combo);
    sounds.win();
    const label = state.mode === 'ai' && winner === 'O' ? 'AI' : `Player ${winner}`;
    setStatus('🏆', `${label} Wins! 🎉`);
    addHistory(`${label} Wins!`, winner === 'X' ? 'x' : 'o', modeLabel, timestamp);
    showModal('🏆', `${label} Wins!`, 'Incredible play! 🎉');
    launchConfetti();
  }

  renderScores();
  saveToStorage();
}

function makeMove(index) {
  if (state.gameOver || state.board[index] || state.aiThinking) return;

  sounds.click();
  state.board[index] = state.current;
  renderBoard();

  const result = checkWinner(state.board);
  if (result) {
    handleResult(result);
    return;
  }

  // Switch player
  state.current = state.current === 'X' ? 'O' : 'X';
  updateTurnStatus();

  // AI move
  if (state.mode === 'ai' && state.current === 'O' && !state.gameOver) {
    scheduleAiMove();
  }
}

function updateTurnStatus() {
  if (state.gameOver) return;
  const isAiTurn = state.mode === 'ai' && state.current === 'O';
  if (isAiTurn) {
    setStatus('🤖', 'AI is thinking…');
  } else {
    const icon = state.current === 'X' ? '✕' : '○';
    setStatus(icon, `Player ${state.current}'s Turn`);
  }
}

/* ============================================================
   10. AI LOGIC
   ============================================================ */

/** Easy: completely random */
function aiEasy(board) {
  const empty = board.map((v,i)=>v===null?i:null).filter(v=>v!==null);
  return empty[Math.floor(Math.random() * empty.length)];
}

/** Medium: 50% chance of smart, 50% random */
function aiMedium(board) {
  if (Math.random() < 0.5) return aiHard(board);
  return aiEasy(board);
}

/** Hard: full Minimax (unbeatable) */
function minimax(board, isMaximizing) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'O') return  10;
    if (result.winner === 'X') return -10;
    return 0; // draw
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function aiHard(board) {
  let bestVal = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const val = minimax(board, false);
      board[i]  = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
  }
  return bestMove;
}

function getAiMove() {
  const b = [...state.board];
  switch (state.difficulty) {
    case 'easy':   return aiEasy(b);
    case 'medium': return aiMedium(b);
    default:       return aiHard(b);
  }
}

function scheduleAiMove() {
  state.aiThinking = true;
  const delay = state.difficulty === 'hard' ? 600 : 350;
  setTimeout(() => {
    if (!state.gameOver) {
      sounds.ai();
      const move = getAiMove();
      if (move !== -1 && move !== undefined) {
        state.board[move] = 'O';
        renderBoard();
        const result = checkWinner(state.board);
        if (result) { handleResult(result); }
        else {
          state.current = 'X';
          setStatus('✕', "Player X's Turn");
        }
      }
    }
    state.aiThinking = false;
  }, delay);
}

/* ============================================================
   11. GAME HISTORY
   ============================================================ */
function addHistory(result, type, mode, time) {
  state.history.unshift({ result, type, mode, time });
  if (state.history.length > 50) state.history.pop(); // cap at 50
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<p class="history-empty">No games played yet.</p>';
    return;
  }
  historyList.innerHTML = state.history.map((h,i) => `
    <div class="history-item">
      <span>#${state.history.length - i} &nbsp;|&nbsp; ${h.mode} &nbsp;|&nbsp; ${h.time}</span>
      <span class="result-badge badge-${h.type}">${h.result}</span>
    </div>
  `).join('');
}

historyBtn.addEventListener('click', () => {
  const isVisible = historyPanel.style.display !== 'none';
  historyPanel.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) renderHistory();
});

clearHistoryBtn.addEventListener('click', () => {
  state.history = [];
  saveToStorage();
  renderHistory();
});

/* ============================================================
   12. MODAL
   ============================================================ */
function showModal(emoji, title, subtitle) {
  modalEmoji.textContent    = emoji;
  modalTitle.textContent    = title;
  modalSubtitle.textContent = subtitle;
  modalOverlay.style.display = 'flex';
}

function hideModal() { modalOverlay.style.display = 'none'; }

playAgainBtn.addEventListener('click', () => { hideModal(); restartGame(); });
closeModalBtn.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) hideModal(); });

/* ============================================================
   13. CONFETTI ANIMATION
   ============================================================ */
let confettiAnim = null;

function launchConfetti() {
  const canvas = confettiCanvas;
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#a78bfa','#60a5fa','#f472b6','#fbbf24','#34d399','#f87171','#ffffff'];
  const pieces = Array.from({length: 150}, () => ({
    x:   Math.random() * canvas.width,
    y:   Math.random() * canvas.height - canvas.height,
    r:   Math.random() * 8 + 3,
    d:   Math.random() * 150 + 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt:  Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.04,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(p.d) + 2 + p.r / 4) * 1.1;
      p.tilt = 15 * Math.sin(p.tiltAngle);
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
    frame++;
    if (frame < 220) confettiAnim = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (confettiAnim) cancelAnimationFrame(confettiAnim);
  draw();
}

/* ============================================================
   14. RESTART & RESET
   ============================================================ */
function restartGame() {
  state.board    = Array(9).fill(null);
  state.current  = 'X';
  state.gameOver = false;
  state.aiThinking = false;
  board.classList.remove('disabled');
  renderBoard();
  setStatus('🎯', "Player X's Turn");
  if (confettiAnim) { cancelAnimationFrame(confettiAnim); confettiCanvas.getContext('2d').clearRect(0,0,confettiCanvas.width,confettiCanvas.height); }
}

restartBtn.addEventListener('click', restartGame);

resetScoresBtn.addEventListener('click', () => {
  if (confirm('Reset all scores?')) {
    state.scores = { X:0, O:0, D:0 };
    renderScores();
    saveToStorage();
  }
});

/* ============================================================
   15. CELL CLICK HANDLERS
   ============================================================ */
cells.forEach((cell, index) => {
  cell.addEventListener('click', () => makeMove(index));

  // Keyboard support (Enter / Space)
  cell.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); makeMove(index); }
  });
});

/* ============================================================
   16. MODE & DIFFICULTY TOGGLES
   ============================================================ */
modePvp.addEventListener('click', () => {
  state.mode = 'pvp';
  modePvp.classList.add('active');   modePvp.setAttribute('aria-pressed','true');
  modeAi.classList.remove('active'); modeAi.setAttribute('aria-pressed','false');
  diffGroup.style.display = 'none';
  restartGame();
});

modeAi.addEventListener('click', () => {
  state.mode = 'ai';
  modeAi.classList.add('active');     modeAi.setAttribute('aria-pressed','true');
  modePvp.classList.remove('active'); modePvp.setAttribute('aria-pressed','false');
  diffGroup.style.display = 'block';
  restartGame();
});

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');
    state.difficulty = btn.dataset.diff;
    restartGame();
  });
});

/* ============================================================
   17. WINDOW RESIZE — CONFETTI CANVAS
   ============================================================ */
window.addEventListener('resize', () => {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

/* ============================================================
   18. INITIALISE
   ============================================================ */
function init() {
  loadFromStorage();
  spawnParticles();
  renderScores();
  renderBoard();
  setStatus('🎯', "Player X's Turn");
}

init();

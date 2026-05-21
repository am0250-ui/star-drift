// =============================================================
// main.js - 메인 허브 화면, 라우팅, 모달, 사운드
// =============================================================

const App = (() => {

  // 게임 메타데이터: 카드 표시 + 라우팅에 사용
  const GAMES = [
    { id: "snake",     name: "SNAKE",      icon: "🐍", scoreKey: "snake_highscore",    scoreLabel: "HI" },
    { id: "breakout",  name: "BREAKOUT",   icon: "🧱", scoreKey: "breakout_highscore", scoreLabel: "HI" },
    { id: "2048",      name: "2048",       icon: "🔢", scoreKey: "2048_highscore",     scoreLabel: "HI" },
    { id: "memory",    name: "MEMORY",     icon: "🃏", scoreKey: "memory_bestmoves",   scoreLabel: "BEST" },
    { id: "tictactoe", name: "TIC TAC TOE", icon: "⭕", scoreKey: null,                 scoreLabel: "" },
    { id: "reaction",  name: "REACTION",   icon: "⚡", scoreKey: "reaction_besttime",  scoreLabel: "BEST ms" },
  ];

  // 게임 모듈 매핑 (각 *.js 파일이 전역으로 등록한 객체)
  const GAME_MODULES = {
    snake:     () => SnakeGame,
    breakout:  () => BreakoutGame,
    "2048":    () => Game2048,
    memory:    () => MemoryGame,
    tictactoe: () => TicTacToeGame,
    reaction:  () => ReactionGame,
  };

  // DOM
  const hubScreen = document.getElementById("hub");
  const gameScreen = document.getElementById("game-screen");
  const gameGrid = document.getElementById("game-grid");
  const gameTitle = document.getElementById("game-title");
  const gameContainer = document.getElementById("game-container");
  const backBtn = document.getElementById("back-btn");
  const currentScoreEl = document.getElementById("current-score");
  const highScoreEl = document.getElementById("high-score");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalNewRecord = document.getElementById("modal-newrecord");
  const modalRetry = document.getElementById("modal-retry");
  const modalMenu = document.getElementById("modal-menu");
  const soundToggle = document.getElementById("sound-toggle");

  // 현재 실행 중인 게임 인스턴스
  let activeGame = null;
  let activeGameId = null;

  // ---------- 사운드 ----------
  let audioCtx = null;
  let soundEnabled = Storage.get("sound_enabled");

  function getAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    return audioCtx;
  }

  // 8비트 비프음 생성
  function beep(freq = 600, duration = 0.08, type = "square", volume = 0.06) {
    if (!soundEnabled) return;
    const ac = getAudio();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(volume, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    o.connect(g); g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + duration);
  }

  // 사운드 프리셋
  const Sound = {
    click: () => beep(800, 0.05, "square", 0.05),
    score: () => beep(1200, 0.1, "square", 0.06),
    powerup: () => { beep(600, 0.08); setTimeout(() => beep(900, 0.08), 60); setTimeout(() => beep(1200, 0.12), 120); },
    gameover: () => { beep(400, 0.15); setTimeout(() => beep(200, 0.3), 120); },
    win: () => { beep(800, 0.1); setTimeout(() => beep(1000, 0.1), 100); setTimeout(() => beep(1300, 0.2), 200); },
    bad: () => beep(160, 0.2, "sawtooth", 0.08),
  };

  function updateSoundButton() {
    soundToggle.textContent = "SOUND: " + (soundEnabled ? "ON" : "OFF");
  }

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    Storage.set("sound_enabled", soundEnabled);
    updateSoundButton();
    Sound.click();
  });

  // ---------- 메인 카드 렌더링 ----------
  function renderHub() {
    gameGrid.innerHTML = "";
    GAMES.forEach((g) => {
      const card = document.createElement("button");
      card.className = "game-card";
      card.dataset.id = g.id;

      let scoreText = "";
      if (g.scoreKey) {
        const val = Storage.get(g.scoreKey);
        if (val === null || val === undefined) scoreText = `${g.scoreLabel}: ---`;
        else scoreText = `${g.scoreLabel}: ${val}`;
      } else if (g.id === "tictactoe") {
        const wins = Storage.get("tictactoe_wins");
        scoreText = `WINS: ${wins.x + wins.o}`;
      }

      card.innerHTML = `
        <div class="icon">${g.icon}</div>
        <div class="name">${g.name}</div>
        <div class="hi">${scoreText}</div>
      `;
      card.addEventListener("click", () => {
        Sound.click();
        navigateTo(g.id);
      });
      gameGrid.appendChild(card);
    });
  }

  // ---------- 라우팅 ----------
  function navigateTo(gameId) {
    if (gameId && GAME_MODULES[gameId]) {
      location.hash = "#" + gameId;
    } else {
      location.hash = "";
    }
  }

  function handleRoute() {
    const hash = location.hash.replace("#", "");
    if (hash && GAME_MODULES[hash]) {
      showGame(hash);
    } else {
      showHub();
    }
  }

  function showHub() {
    stopActiveGame();
    closeModal();
    gameScreen.classList.remove("active");
    hubScreen.classList.add("active");
    renderHub();
  }

  function showGame(gameId) {
    stopActiveGame();
    closeModal();
    activeGameId = gameId;
    const meta = GAMES.find((g) => g.id === gameId);

    hubScreen.classList.remove("active");
    gameScreen.classList.add("active");
    gameTitle.textContent = meta.name;

    // 점수 초기화
    setScore(0);
    if (meta.scoreKey) {
      const hi = Storage.get(meta.scoreKey);
      highScoreEl.textContent = (hi === null || hi === undefined) ? "---" : hi;
    } else {
      highScoreEl.textContent = "-";
    }

    // 컨테이너 비우고 게임 시작
    gameContainer.innerHTML = "";
    const mod = GAME_MODULES[gameId]();
    activeGame = mod;
    mod.start({
      container: gameContainer,
      onScore: setScore,
      onGameOver: handleGameOver,
      onWin: handleWin,
      sound: Sound,
    });
  }

  function stopActiveGame() {
    if (activeGame && typeof activeGame.stop === "function") {
      try { activeGame.stop(); } catch (e) { /* ignore */ }
    }
    activeGame = null;
    activeGameId = null;
  }

  // ---------- 점수 표시 ----------
  function setScore(score) {
    currentScoreEl.textContent = score;
  }

  // ---------- 게임 오버 / 클리어 처리 ----------
  function handleGameOver(result = {}) {
    // result: { score, isNewRecord, message, title }
    Sound.gameover();
    modalTitle.textContent = result.title || "GAME OVER";
    modalMessage.innerHTML = result.message || `SCORE: ${result.score ?? 0}`;
    if (result.isNewRecord) {
      modalNewRecord.classList.remove("hidden");
    } else {
      modalNewRecord.classList.add("hidden");
    }
    openModal();
  }

  function handleWin(result = {}) {
    Sound.win();
    modalTitle.textContent = result.title || "YOU WIN!";
    modalMessage.innerHTML = result.message || `SCORE: ${result.score ?? 0}`;
    if (result.isNewRecord) {
      modalNewRecord.classList.remove("hidden");
    } else {
      modalNewRecord.classList.add("hidden");
    }
    openModal();
  }

  function openModal() { modal.classList.remove("hidden"); }
  function closeModal() { modal.classList.add("hidden"); }

  // ---------- 모달 버튼 ----------
  modalRetry.addEventListener("click", () => {
    Sound.click();
    closeModal();
    if (activeGameId) showGame(activeGameId);
  });
  modalMenu.addEventListener("click", () => {
    Sound.click();
    navigateTo(null);
  });

  // ---------- 헤더 BACK 버튼 ----------
  backBtn.addEventListener("click", () => {
    Sound.click();
    navigateTo(null);
  });

  // ---------- 초기화 ----------
  window.addEventListener("hashchange", handleRoute);
  updateSoundButton();
  renderHub();
  handleRoute();

  // 외부에 사운드 노출 (디버그 용)
  return { Sound, navigateTo };
})();

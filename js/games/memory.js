// =============================================================
// memory.js - 메모리 카드 매칭 게임
// 4x4(8쌍) 또는 4x6(12쌍) 난이도, 시간/시도 기록
// =============================================================

const MemoryGame = (() => {
  // 픽셀 아이콘으로 쓸 이모지들 (충분히 많이 준비)
  const SYMBOLS = ["🌟","🍄","🎮","👾","💎","🚀","🎯","🎲","🍒","⚡","🌈","🦄"];

  let cards;        // [{ id, symbol, matched, flipped }]
  let firstPick;    // 현재 뒤집은 카드 (1장)
  let lock;         // 비교 중 입력 금지
  let moves;
  let matches;      // 맞춘 쌍 수
  let totalPairs;
  let startTime;
  let timerId;
  let boardEl;
  let cbs;
  let difficulty;   // 'easy' | 'hard'

  function start(callbacks) {
    cbs = callbacks;
    cbs.container.innerHTML = `
      <div class="difficulty-select">
        <button class="pixel-btn small" data-diff="easy">4x4 EASY</button>
        <button class="pixel-btn small" data-diff="hard">4x6 HARD</button>
      </div>
      <div class="game-panel">
        <div class="item"><span class="label">시도</span> <span id="m-moves">0</span></div>
        <div class="item"><span class="label">시간</span> <span id="m-time">0.0s</span></div>
        <div class="item"><span class="label">매칭</span> <span id="m-matches">0/0</span></div>
      </div>
      <div id="m-board" class="memory-board"></div>
      <div class="game-info">
        두 장을 뒤집어 같은 그림을 찾으세요
      </div>
    `;
    boardEl = document.getElementById("m-board");
    cbs.container.querySelectorAll("[data-diff]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cbs.sound.click();
        cbs.container.querySelectorAll("[data-diff]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setDifficulty(btn.dataset.diff);
      });
    });

    setDifficulty("easy");
    cbs.container.querySelector("[data-diff='easy']").classList.add("active");
  }

  function stop() {
    clearInterval(timerId);
  }

  function setDifficulty(d) {
    difficulty = d;
    if (d === "easy") {
      totalPairs = 8;
      boardEl.style.gridTemplateColumns = "repeat(4, 1fr)";
      boardEl.style.width = "min(420px, 90vw)";
    } else {
      totalPairs = 12;
      boardEl.style.gridTemplateColumns = "repeat(6, 1fr)";
      boardEl.style.width = "min(540px, 95vw)";
    }
    resetGame();
  }

  function resetGame() {
    clearInterval(timerId);
    moves = 0;
    matches = 0;
    firstPick = null;
    lock = false;
    startTime = null;

    // 카드 풀: 페어로 만들고 셔플
    const syms = SYMBOLS.slice(0, totalPairs);
    const pairs = [...syms, ...syms];
    shuffle(pairs);
    cards = pairs.map((sym, i) => ({ id: i, symbol: sym, matched: false, flipped: false }));

    updateHUD();
    renderBoard();
  }

  // Fisher-Yates 셔플
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    cards.forEach((c) => {
      const el = document.createElement("div");
      el.className = "memory-card";
      if (c.flipped) el.classList.add("flipped");
      if (c.matched) el.classList.add("matched");
      el.innerHTML = `
        <div class="face front">${c.symbol}</div>
        <div class="face back"></div>
      `;
      el.addEventListener("click", () => onCardClick(c, el));
      boardEl.appendChild(el);
    });
  }

  function onCardClick(card, el) {
    if (lock || card.flipped || card.matched) return;
    if (!startTime) startTimer();

    card.flipped = true;
    el.classList.add("flipped");
    cbs.sound.click();

    if (!firstPick) {
      firstPick = card;
      return;
    }

    // 두 번째 카드 뒤집음 → 비교
    moves++;
    updateHUD();
    if (firstPick.symbol === card.symbol) {
      // 매칭 성공: 양쪽 카드에 matched 클래스 부여 (CSS 깜빡임)
      firstPick.matched = true;
      card.matched = true;
      matches++;
      cbs.sound.score();
      updateHUD();
      el.classList.add("matched");
      boardEl.children[cards.indexOf(firstPick)].classList.add("matched");
      firstPick = null;

      if (matches === totalPairs) finish();
    } else {
      // 매칭 실패 → 잠시 후 다시 뒤집기
      lock = true;
      const wrongCard = card;
      const prev = firstPick;
      setTimeout(() => {
        prev.flipped = false;
        wrongCard.flipped = false;
        renderBoard();
        firstPick = null;
        lock = false;
      }, 800);
    }
  }

  function startTimer() {
    startTime = performance.now();
    timerId = setInterval(() => {
      const t = (performance.now() - startTime) / 1000;
      document.getElementById("m-time").textContent = t.toFixed(1) + "s";
    }, 100);
  }

  function updateHUD() {
    document.getElementById("m-moves").textContent = moves;
    document.getElementById("m-matches").textContent = `${matches}/${totalPairs}`;
    cbs.onScore(matches);
  }

  function finish() {
    clearInterval(timerId);
    const elapsed = Math.round(performance.now() - startTime);
    const elapsedSec = (elapsed / 1000).toFixed(1);

    // 난이도별로 별도 저장 (간단하게 시간 기록만 단일 키로)
    const isNewTime = Storage.setIfLower("memory_besttime", elapsed);
    const isNewMoves = Storage.setIfLower("memory_bestmoves", moves);

    cbs.sound.win();
    cbs.onWin({
      title: "ALL MATCHED!",
      score: matches,
      isNewRecord: isNewTime || isNewMoves,
      message: `시간 ${elapsedSec}s · 시도 ${moves}회<br>난이도: ${difficulty.toUpperCase()}`,
    });
  }

  return { start, stop };
})();

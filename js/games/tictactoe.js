// =============================================================
// tictactoe.js - 틱택토
// 2인 플레이 또는 AI(미니맥스) 대전 모드 지원
// =============================================================

const TicTacToeGame = (() => {
  // 승리 라인 (8가지)
  const LINES = [
    [0,1,2], [3,4,5], [6,7,8],  // 가로
    [0,3,6], [1,4,7], [2,5,8],  // 세로
    [0,4,8], [2,4,6],           // 대각
  ];

  let board;      // 길이 9 배열: '', 'x', 'o'
  let turn;       // 'x' or 'o'
  let mode;       // 'pvp' or 'ai'
  let aiSide;     // AI가 잡는 말 ('o' 기본)
  let gameOver;
  let cbs;
  let boardEl;
  let statusEl;

  function start(callbacks) {
    cbs = callbacks;
    const wins = Storage.get("tictactoe_wins");

    cbs.container.innerHTML = `
      <div class="tic-mode-select">
        <button class="pixel-btn small" data-mode="pvp">2인 플레이</button>
        <button class="pixel-btn small" data-mode="ai">VS AI</button>
      </div>
      <div id="tic-status" class="tic-status">모드를 선택하세요</div>
      <div id="tic-board" class="tic-board"></div>
      <div class="game-panel" id="tic-score">
        <div class="item"><span class="label">X 승</span> <span id="x-wins">${wins.x}</span></div>
        <div class="item"><span class="label">O 승</span> <span id="o-wins">${wins.o}</span></div>
        <div class="item"><span class="label">무승부</span> <span id="d-wins">${wins.draw}</span></div>
        <button id="tic-reset" class="pixel-btn small">RESET SCORE</button>
      </div>
      <div class="game-info">
        클릭으로 두기 · 항상 <strong>X</strong>가 먼저
      </div>
    `;

    boardEl = document.getElementById("tic-board");
    statusEl = document.getElementById("tic-status");

    // 모드 버튼
    cbs.container.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cbs.sound.click();
        const m = btn.dataset.mode;
        setMode(m);
        cbs.container.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b === btn));
      });
    });

    document.getElementById("tic-reset").addEventListener("click", () => {
      cbs.sound.click();
      Storage.set("tictactoe_wins", { x: 0, o: 0, draw: 0 });
      updateScoreboard();
    });

    setMode("pvp");
    cbs.container.querySelector("[data-mode='pvp']").classList.add("active");
  }

  function stop() {
    // 등록한 글로벌 리스너 없음
  }

  function setMode(m) {
    mode = m;
    aiSide = "o";
    resetGame();
  }

  function resetGame() {
    board = Array(9).fill("");
    turn = "x";
    gameOver = false;
    renderBoard();
    updateStatus();
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("div");
      cell.className = "tic-cell";
      if (board[i]) {
        cell.classList.add("taken", board[i]);
        cell.textContent = board[i].toUpperCase();
      }
      if (gameOver || (mode === "ai" && turn === aiSide)) cell.classList.add("no-click");
      cell.addEventListener("click", () => onCellClick(i));
      boardEl.appendChild(cell);
    }
  }

  function onCellClick(i) {
    if (gameOver || board[i]) return;
    if (mode === "ai" && turn === aiSide) return;
    placeMark(i, turn);
    afterMove();
  }

  function placeMark(i, mark) {
    board[i] = mark;
    cbs.sound.click();
  }

  // 한 수 두고 나서: 승부 체크 → 차례 변경 → (AI 차례면 AI 호출)
  function afterMove() {
    const result = checkResult(board);
    if (result.over) return finish(result);

    turn = turn === "x" ? "o" : "x";
    renderBoard();
    updateStatus();

    if (mode === "ai" && turn === aiSide && !gameOver) {
      setTimeout(aiMove, 350);
    }
  }

  // ---------- AI: 미니맥스 ----------
  function aiMove() {
    if (gameOver) return;
    const best = minimaxBest(board, aiSide);
    placeMark(best.index, aiSide);
    afterMove();
  }

  function minimaxBest(b, player) {
    // 첫 수는 모서리/중앙 중 무작위 (다양성 + 속도)
    const empties = b.map((v, i) => v === "" ? i : -1).filter((i) => i >= 0);
    if (empties.length === 9) {
      const opening = [0, 2, 4, 6, 8];
      return { index: opening[Math.floor(Math.random() * opening.length)], score: 0 };
    }

    let bestScore = -Infinity;
    let bestIndex = empties[0];
    for (const i of empties) {
      b[i] = player;
      const score = minimax(b, false, 0);
      b[i] = "";
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return { index: bestIndex, score: bestScore };
  }

  function minimax(b, isMax, depth) {
    const r = checkResult(b);
    if (r.over) {
      if (r.winner === aiSide) return 10 - depth;
      if (r.winner === otherSide(aiSide)) return depth - 10;
      return 0;
    }
    const cur = isMax ? aiSide : otherSide(aiSide);
    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== "") continue;
      b[i] = cur;
      const s = minimax(b, !isMax, depth + 1);
      b[i] = "";
      best = isMax ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }

  function otherSide(s) { return s === "x" ? "o" : "x"; }

  // ---------- 승부 판정 ----------
  function checkResult(b) {
    for (const [a, c, d] of LINES) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { over: true, winner: b[a], line: [a, c, d] };
      }
    }
    if (b.every((v) => v !== "")) return { over: true, winner: null, line: null };
    return { over: false };
  }

  function finish(result) {
    gameOver = true;
    const wins = Storage.get("tictactoe_wins");
    if (result.winner === "x") wins.x++;
    else if (result.winner === "o") wins.o++;
    else wins.draw++;
    Storage.set("tictactoe_wins", wins);
    updateScoreboard();

    renderBoard();
    if (result.line) {
      result.line.forEach((i) => boardEl.children[i].classList.add("win"));
      cbs.sound.win();
    } else {
      cbs.sound.bad();
    }

    statusEl.textContent = result.winner
      ? (result.winner.toUpperCase() + " WIN!")
      : "DRAW!";

    setTimeout(() => {
      cbs.onGameOver({
        title: result.winner ? (result.winner.toUpperCase() + " 승리!") : "무승부",
        score: 0,
        message: `다시 도전!<br>총 전적: X ${wins.x} · O ${wins.o} · 무 ${wins.draw}`,
      });
    }, 900);
  }

  function updateStatus() {
    if (gameOver) return;
    if (mode === "ai" && turn === aiSide) {
      statusEl.textContent = "AI 생각 중...";
    } else {
      statusEl.textContent = turn.toUpperCase() + " 차례";
    }
  }

  function updateScoreboard() {
    const wins = Storage.get("tictactoe_wins");
    const xw = document.getElementById("x-wins");
    const ow = document.getElementById("o-wins");
    const dw = document.getElementById("d-wins");
    if (xw) xw.textContent = wins.x;
    if (ow) ow.textContent = wins.o;
    if (dw) dw.textContent = wins.draw;
  }

  return { start, stop };
})();

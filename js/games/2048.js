// =============================================================
// 2048.js - 2048 게임
// 같은 숫자 타일을 합쳐 2048을 만드는 퍼즐 게임
// =============================================================

const Game2048 = (() => {
  const SIZE = 4;

  let grid;          // 2차원 배열 [row][col]
  let score;
  let won;           // 2048 타일 만들었는지
  let gameOver;
  let cbs;
  let boardEl;

  function start(callbacks) {
    cbs = callbacks;
    cbs.container.innerHTML = `
      <div id="grid-2048" class="grid-2048"></div>
      <div class="game-info">
        <strong>화살표 / WASD</strong> 타일 이동
      </div>
    `;
    boardEl = document.getElementById("grid-2048");

    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    won = false;
    gameOver = false;
    addRandom();
    addRandom();
    cbs.onScore(0);
    render();

    document.addEventListener("keydown", onKey);
  }

  function stop() {
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (gameOver) return;
    const k = e.key.toLowerCase();
    let moved = false;
    if (k === "arrowleft"  || k === "a") moved = move(-1, 0);
    else if (k === "arrowright" || k === "d") moved = move(1, 0);
    else if (k === "arrowup"    || k === "w") moved = move(0, -1);
    else if (k === "arrowdown"  || k === "s") moved = move(0, 1);
    else return;

    e.preventDefault();
    if (moved) {
      cbs.sound.click();
      addRandom();
      render();
      cbs.onScore(score);

      // 2048 달성 알림 (게임은 계속 진행 가능)
      if (!won && grid.some((row) => row.some((v) => v >= 2048))) {
        won = true;
        cbs.sound.win();
        showWinToast();
      }

      // 더 이상 움직일 수 없으면 게임오버
      if (!canMove()) {
        gameOver = true;
        const isNew = Storage.setIfHigher("2048_highscore", score);
        cbs.onGameOver({
          score,
          isNewRecord: isNew,
          message: `SCORE: ${score}<br>최고 타일: ${maxTile()}`,
        });
      }
    }
  }

  // 4방향 이동을 모두 "왼쪽 이동"으로 환원해서 처리
  // 1) 격자를 회전해서 왼쪽 이동 → 다시 원위치
  function move(dx, dy) {
    const dirIdx = dx === -1 ? 0 : dx === 1 ? 2 : dy === -1 ? 1 : 3;
    let rotated = grid;
    for (let i = 0; i < dirIdx; i++) rotated = rotateCW(rotated);

    let moved = false;
    for (let r = 0; r < SIZE; r++) {
      const { newRow, gained, didMove } = slideLeft(rotated[r]);
      rotated[r] = newRow;
      score += gained;
      if (didMove) moved = true;
    }

    for (let i = 0; i < (4 - dirIdx) % 4; i++) rotated = rotateCW(rotated);
    grid = rotated;
    return moved;
  }

  // 한 행을 좌측으로 밀어 합치기
  function slideLeft(row) {
    const compact = row.filter((v) => v !== 0);
    const newRow = [];
    let gained = 0;
    let i = 0;
    while (i < compact.length) {
      if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
        const merged = compact[i] * 2;
        newRow.push(merged);
        gained += merged;
        i += 2;
      } else {
        newRow.push(compact[i]);
        i++;
      }
    }
    while (newRow.length < SIZE) newRow.push(0);
    const didMove = newRow.some((v, idx) => v !== row[idx]);
    return { newRow, gained, didMove };
  }

  // 시계방향 90도 회전
  function rotateCW(m) {
    const n = m.length;
    const r = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
    return r;
  }

  // 빈 칸에 2(90%) 또는 4(10%) 추가
  function addRandom() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // 한 번이라도 움직일 수 있나?
  function canMove() {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
  }

  function maxTile() {
    let m = 0;
    for (const row of grid) for (const v of row) if (v > m) m = v;
    return m;
  }

  // ---------- 렌더 ----------
  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        const el = document.createElement("div");
        el.className = "tile-2048";
        if (v > 0) {
          el.classList.add("t" + Math.min(v, 2048));
          el.textContent = v;
          if (v >= 10000) el.classList.add("big");
        }
        boardEl.appendChild(el);
      }
    }
  }

  function showWinToast() {
    const toast = document.createElement("div");
    toast.textContent = "2048 달성! 계속 진행 가능";
    toast.style.cssText = `
      position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
      background: var(--secondary); color: var(--bg);
      padding: 12px 20px; font-size: 10px; letter-spacing: 2px;
      border: 3px solid var(--main); z-index: 2000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  return { start, stop };
})();

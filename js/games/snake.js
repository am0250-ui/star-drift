// =============================================================
// snake.js - 스네이크 게임
// 20x20 격자에서 뱀을 움직여 먹이를 먹는 클래식 게임
// =============================================================

const SnakeGame = (() => {
  const COLS = 20;
  const ROWS = 20;
  const CELL = 22;            // 셀 픽셀 크기
  const BASE_INTERVAL = 140;  // 기본 이동 간격(ms)
  const MIN_INTERVAL = 60;    // 최대 속도(작을수록 빠름)

  let canvas, ctx;
  let snake;        // [{x,y}, ...]  head = [0]
  let dir;          // {x,y}
  let nextDir;      // 다음 입력 방향 (역방향 방지)
  let food;
  let score;
  let interval;     // 현재 속도 (ms)
  let timer;        // setTimeout 핸들
  let paused;
  let gameOver;
  let cbs;          // { onScore, onGameOver, sound }

  function start(callbacks) {
    cbs = callbacks;

    // UI 구성
    const c = cbs.container;
    c.innerHTML = `
      <canvas id="snake-canvas" width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
      <div class="game-info">
        <strong>화살표 / WASD</strong> 이동 · <strong>SPACE</strong> 일시정지
      </div>
    `;
    canvas = document.getElementById("snake-canvas");
    ctx = canvas.getContext("2d");

    // 상태 초기화
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    interval = BASE_INTERVAL;
    paused = false;
    gameOver = false;
    placeFood();
    cbs.onScore(0);

    document.addEventListener("keydown", onKey);
    draw();
    scheduleTick();
  }

  function stop() {
    clearTimeout(timer);
    document.removeEventListener("keydown", onKey);
  }

  // 키보드 입력
  function onKey(e) {
    if (gameOver) return;
    const k = e.key.toLowerCase();
    if (k === "arrowleft"  || k === "a") tryDir(-1, 0);
    else if (k === "arrowright" || k === "d") tryDir(1, 0);
    else if (k === "arrowup"    || k === "w") tryDir(0, -1);
    else if (k === "arrowdown"  || k === "s") tryDir(0, 1);
    else if (k === " " || k === "spacebar") {
      paused = !paused;
      if (!paused) scheduleTick();
      draw();
    }
    if (["arrowleft","arrowright","arrowup","arrowdown"," "].includes(k)) e.preventDefault();
  }

  // 역방향 입력 거르기
  function tryDir(x, y) {
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x, y };
  }

  // 게임 진행 한 틱
  function tick() {
    if (paused || gameOver) return;
    dir = nextDir;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // 벽 충돌
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      return die();
    }
    // 자기 몸 충돌
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      return die();
    }

    snake.unshift(head);

    // 먹이 먹기
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      cbs.onScore(score);
      cbs.sound.score();
      // 속도 증가 (10점마다 약간 빨라짐, 하한 적용)
      interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - Math.floor(score / 20) * 8);
      placeFood();
    } else {
      snake.pop();
    }

    draw();
    scheduleTick();
  }

  function scheduleTick() {
    clearTimeout(timer);
    timer = setTimeout(tick, interval);
  }

  // 빈 칸 중 하나에 먹이 배치
  function placeFood() {
    const empty = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) empty.push({ x, y });
      }
    }
    if (empty.length === 0) {
      // 보드를 가득 채운 승리 (희박한 케이스)
      return win();
    }
    food = empty[Math.floor(Math.random() * empty.length)];
  }

  function die() {
    gameOver = true;
    clearTimeout(timer);
    const isNew = Storage.setIfHigher("snake_highscore", score);
    cbs.onGameOver({
      score,
      isNewRecord: isNew,
      message: `LENGTH: ${snake.length}<br>SCORE: ${score}`,
    });
  }

  function win() {
    gameOver = true;
    clearTimeout(timer);
    const isNew = Storage.setIfHigher("snake_highscore", score);
    cbs.onGameOver({
      title: "BOARD CLEARED!",
      score,
      isNewRecord: isNew,
      message: `완벽한 승리!<br>SCORE: ${score}`,
    });
  }

  // ---------- 렌더 ----------
  function draw() {
    // 배경 + 격자
    ctx.fillStyle = "#0f0f1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0, 255, 136, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(COLS * CELL, i * CELL);
      ctx.stroke();
    }

    // 먹이 (네온 핑크 사각형)
    drawCell(food.x, food.y, "#ff4081");
    ctx.fillStyle = "rgba(255, 64, 129, 0.4)";
    ctx.fillRect(food.x * CELL - 2, food.y * CELL - 2, CELL + 4, CELL + 4);
    drawCell(food.x, food.y, "#ff4081");

    // 뱀 (머리는 노랑, 몸은 그린 그라데이션)
    snake.forEach((s, i) => {
      if (i === 0) drawCell(s.x, s.y, "#ffeb3b");
      else {
        const alpha = 1 - (i / snake.length) * 0.5;
        const c = `rgba(0, 255, 136, ${alpha})`;
        drawCell(s.x, s.y, c);
      }
    });

    // 일시정지 오버레이
    if (paused) {
      ctx.fillStyle = "rgba(15, 15, 30, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffeb3b";
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }

  return { start, stop };
})();

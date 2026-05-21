// =============================================================
// breakout.js - 벽돌깨기
// 5줄 x 8개 벽돌, 3목숨, 레벨업마다 속도 증가
// =============================================================

const BreakoutGame = (() => {
  const W = 560;
  const H = 480;
  const ROWS = 5;
  const COLS = 8;
  const BRICK_GAP = 4;
  const BRICK_TOP = 60;
  const BRICK_H = 22;
  const PADDLE_W = 90;
  const PADDLE_H = 12;
  const PADDLE_Y = H - 30;
  const BALL_R = 8;

  let canvas, ctx;
  let paddleX;
  let ball;         // { x, y, vx, vy, attached }
  let bricks;       // [[ {alive, color, score}, ... ]]
  let lives;
  let score;
  let level;
  let baseSpeed;    // 현재 레벨의 기본 공 속도
  let cbs;
  let rafId;
  let running;
  let keys = {};
  let mouseX = null;

  // 줄별 색상 (위→아래)
  const ROW_COLORS = [
    { fill: "#ff4081", glow: "#ff4081", score: 50 },  // 핑크
    { fill: "#ff8800", glow: "#ff8800", score: 40 },  // 오렌지
    { fill: "#ffeb3b", glow: "#ffeb3b", score: 30 },  // 옐로우
    { fill: "#00ff88", glow: "#00ff88", score: 20 },  // 그린
    { fill: "#5599ff", glow: "#5599ff", score: 10 },  // 블루
  ];

  function start(callbacks) {
    cbs = callbacks;
    cbs.container.innerHTML = `
      <canvas id="bo-canvas" width="${W}" height="${H}"></canvas>
      <div class="game-info">
        <strong>← →</strong> 또는 마우스 이동 · <strong>SPACE/CLICK</strong>으로 발사
      </div>
    `;
    canvas = document.getElementById("bo-canvas");
    ctx = canvas.getContext("2d");

    paddleX = (W - PADDLE_W) / 2;
    lives = 3;
    score = 0;
    level = 1;
    baseSpeed = 5;
    setupLevel();

    cbs.onScore(0);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", launchBall);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", launchBall);

    running = true;
    loop();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  }

  function setupLevel() {
    // 벽돌 생성
    const totalW = COLS * (brickWidth() + BRICK_GAP) - BRICK_GAP;
    const startX = (W - totalW) / 2;
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          x: startX + c * (brickWidth() + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          alive: true,
          color: ROW_COLORS[r],
        });
      }
      bricks.push(row);
    }
    resetBall();
  }

  function brickWidth() {
    return (W - 40 - (COLS - 1) * BRICK_GAP) / COLS;
  }

  function resetBall() {
    ball = {
      x: paddleX + PADDLE_W / 2,
      y: PADDLE_Y - BALL_R - 2,
      vx: 0, vy: 0,
      attached: true,
    };
  }

  function launchBall() {
    if (!ball.attached) return;
    ball.attached = false;
    // 약간 비스듬한 위쪽 발사 (랜덤 좌우)
    const angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
    ball.vx = Math.cos(angle) * baseSpeed;
    ball.vy = Math.sin(angle) * baseSpeed;
    cbs.sound.click();
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === " " || k === "spacebar") {
      launchBall();
      e.preventDefault();
    }
    if (["arrowleft","arrowright"].includes(k)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    mouseX = (e.clientX - rect.left) * scaleX;
  }
  function onTouch(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    mouseX = (e.touches[0].clientX - rect.left) * scaleX;
  }

  // ---------- 루프 ----------
  function loop() {
    if (!running) return;
    update();
    render();
    rafId = requestAnimationFrame(loop);
  }

  function update() {
    // 패들 이동
    if (mouseX !== null) {
      paddleX = mouseX - PADDLE_W / 2;
    } else {
      if (keys["arrowleft"]  || keys["a"]) paddleX -= 8;
      if (keys["arrowright"] || keys["d"]) paddleX += 8;
    }
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX));

    if (ball.attached) {
      ball.x = paddleX + PADDLE_W / 2;
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    // 벽 충돌
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx *= -1; cbs.sound.click(); }
    if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx *= -1; cbs.sound.click(); }
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; cbs.sound.click(); }

    // 패들 충돌
    if (ball.y + BALL_R >= PADDLE_Y &&
        ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
        ball.x >= paddleX && ball.x <= paddleX + PADDLE_W && ball.vy > 0) {
      ball.y = PADDLE_Y - BALL_R;
      // 패들 위치에 따라 반사각 조정 (중심에서 멀수록 가파른 각)
      const offset = (ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2); // -1 ~ 1
      const speed = Math.hypot(ball.vx, ball.vy);
      const newAngle = -Math.PI / 2 + offset * (Math.PI / 3); // -90 ± 60도
      ball.vx = Math.cos(newAngle) * speed;
      ball.vy = Math.sin(newAngle) * speed;
      cbs.sound.click();
    }

    // 벽돌 충돌
    let hit = false;
    for (let r = 0; r < ROWS && !hit; r++) {
      for (let c = 0; c < COLS && !hit; c++) {
        const b = bricks[r][c];
        if (!b.alive) continue;
        if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + brickWidth() &&
            ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BRICK_H) {
          b.alive = false;
          score += b.color.score;
          cbs.onScore(score);
          cbs.sound.score();

          // 충돌 방향 판정 (간단히 진입 깊이 비교)
          const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + brickWidth() - (ball.x - BALL_R));
          const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BRICK_H - (ball.y - BALL_R));
          if (overlapX < overlapY) ball.vx *= -1;
          else ball.vy *= -1;
          hit = true;
        }
      }
    }

    // 모든 벽돌 깬 경우 → 레벨업
    if (bricks.every((row) => row.every((b) => !b.alive))) {
      level++;
      baseSpeed = Math.min(11, baseSpeed + 1);
      cbs.sound.powerup();
      setupLevel();
    }

    // 바닥 → 목숨 차감
    if (ball.y - BALL_R > H) {
      lives--;
      cbs.sound.bad();
      if (lives <= 0) return die();
      resetBall();
    }
  }

  function die() {
    running = false;
    const isNew = Storage.setIfHigher("breakout_highscore", score);
    cbs.onGameOver({
      score,
      isNewRecord: isNew,
      message: `SCORE: ${score}<br>LEVEL: ${level}`,
    });
  }

  // ---------- 렌더 ----------
  function render() {
    ctx.fillStyle = "#0f0f1e";
    ctx.fillRect(0, 0, W, H);

    // 상단 HUD
    ctx.fillStyle = "#e0e0e0";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("LIVES " + "♥".repeat(Math.max(0, lives)), 10, 12);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffeb3b";
    ctx.fillText("LV " + level, W - 10, 12);
    ctx.textAlign = "center";
    ctx.fillStyle = "#00ff88";
    ctx.fillText(score, W / 2, 12);

    // 벽돌
    const bw = brickWidth();
    for (const row of bricks) for (const b of row) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color.fill;
      ctx.shadowColor = b.color.glow;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, bw, BRICK_H);
      ctx.shadowBlur = 0;
      // 내부 픽셀 디테일
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(b.x + 2, b.y + 2, bw - 4, 3);
    }

    // 패들
    ctx.fillStyle = "#00ff88";
    ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 12;
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(paddleX + 4, PADDLE_Y + 2, PADDLE_W - 8, 3);

    // 공
    ctx.fillStyle = "#ffeb3b";
    ctx.shadowColor = "#ffeb3b"; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 발사 대기 안내
    if (ball.attached) {
      ctx.fillStyle = "#ffeb3b";
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText("SPACE/CLICK TO LAUNCH", W / 2, H - 60);
    }
  }

  return { start, stop };
})();

// =============================================================
// reaction.js - 반응속도 측정
// 빨간 → 초록으로 바뀌는 순간 클릭하는 게임 (5회 평균)
// =============================================================

const ReactionGame = (() => {
  const TRIALS = 5;
  const MIN_DELAY = 1000; // 1초
  const MAX_DELAY = 5000; // 5초

  let state;        // 'idle' | 'waiting' | 'go' | 'early' | 'done'
  let waitTimer;
  let startTime;
  let results;      // 이번 세션의 성공한 시도들
  let trial;
  let zoneEl;
  let cbs;
  let spacePressed = false;

  function start(callbacks) {
    cbs = callbacks;
    cbs.container.innerHTML = `
      <div id="r-zone" class="reaction-zone ready">
        <div class="reaction-text">CLICK TO START</div>
        <div class="reaction-sub" id="r-sub">5회 측정 후 평균 표시</div>
      </div>
      <div class="game-panel" style="margin-top:18px">
        <div class="item"><span class="label">시도</span> <span id="r-trial">0/${TRIALS}</span></div>
        <div class="item"><span class="label">마지막</span> <span id="r-last">--</span></div>
        <div class="item"><span class="label">평균</span> <span id="r-avg">--</span></div>
        <div class="item"><span class="label">최고</span> <span id="r-best">${formatBest()}</span></div>
      </div>
      <div class="game-info">
        초록색으로 바뀌면 즉시 클릭/스페이스<br>너무 빨리 누르면 <strong>TOO EARLY!</strong>
      </div>
    `;
    zoneEl = document.getElementById("r-zone");
    zoneEl.addEventListener("click", handleAction);
    document.addEventListener("keydown", onKey);

    results = [];
    trial = 0;
    state = "idle";
    updateHUD();
  }

  function stop() {
    clearTimeout(waitTimer);
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === " " || e.code === "Space") {
      if (spacePressed) return;
      spacePressed = true;
      e.preventDefault();
      handleAction();
    }
  }
  document.addEventListener("keyup", (e) => {
    if (e.key === " " || e.code === "Space") spacePressed = false;
  });

  function handleAction() {
    if (state === "idle" || state === "done") {
      results = [];
      trial = 0;
      nextTrial();
    } else if (state === "waiting") {
      // 너무 일찍
      clearTimeout(waitTimer);
      state = "early";
      setZone("early", "TOO EARLY!", "클릭/스페이스로 재시도");
      cbs.sound.bad();
    } else if (state === "go") {
      // 시간 측정
      const elapsed = Math.round(performance.now() - startTime);
      results.push(elapsed);
      cbs.sound.score();
      trial++;
      cbs.onScore(elapsed);
      updateHUD();

      if (trial < TRIALS) {
        // 잠깐 결과 보여주고 다음 시도
        setZone("done", `${elapsed} ms`, `${trial}/${TRIALS} 완료 · 잠시 후 다음`);
        state = "between";
        waitTimer = setTimeout(nextTrial, 900);
      } else {
        finishSession();
      }
    } else if (state === "early") {
      nextTrial();
    } else if (state === "between") {
      // 무시
    }
  }

  function nextTrial() {
    state = "waiting";
    setZone("wait", "WAIT...", "초록으로 바뀌면 클릭!");
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    waitTimer = setTimeout(() => {
      state = "go";
      startTime = performance.now();
      setZone("go", "CLICK NOW!", "");
    }, delay);
  }

  function finishSession() {
    state = "done";
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
    const best = Math.min(...results);

    const isNew = Storage.setIfLower("reaction_besttime", best);

    setZone("done", `평균 ${avg} ms`, `최고 ${best} ms · 클릭으로 재도전`);
    updateHUD(true);

    cbs.sound.win();
    cbs.onWin({
      title: "RESULTS",
      score: avg,
      isNewRecord: isNew,
      message: `평균 ${avg}ms · 최고 ${best}ms<br>기록: ${results.join(", ")} ms`,
    });
  }

  function setZone(cls, mainText, subText) {
    zoneEl.className = "reaction-zone " + cls;
    zoneEl.querySelector(".reaction-text").textContent = mainText;
    zoneEl.querySelector(".reaction-sub").textContent = subText || "";
  }

  function updateHUD(includeAvg = false) {
    document.getElementById("r-trial").textContent = `${trial}/${TRIALS}`;
    if (results.length > 0) {
      document.getElementById("r-last").textContent = results[results.length - 1] + " ms";
    }
    if (includeAvg && results.length > 0) {
      const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
      document.getElementById("r-avg").textContent = avg + " ms";
    } else if (results.length > 0) {
      const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
      document.getElementById("r-avg").textContent = avg + " ms";
    }
    document.getElementById("r-best").textContent = formatBest();
  }

  function formatBest() {
    const best = Storage.get("reaction_besttime");
    return best === null ? "--" : best + " ms";
  }

  return { start, stop };
})();

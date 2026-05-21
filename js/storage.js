// =============================================================
// storage.js - 로컬스토리지 기반 점수/설정 저장 모듈
// =============================================================

const Storage = (() => {
  // 저장소 키 접두사 (다른 사이트와 충돌 방지)
  const PREFIX = "miniarcade_";

  // 기본값
  const DEFAULTS = {
    snake_highscore: 0,
    breakout_highscore: 0,
    "2048_highscore": 0,
    memory_besttime: null,     // ms
    memory_bestmoves: null,    // 시도 횟수
    tictactoe_wins: { x: 0, o: 0, draw: 0 },
    reaction_besttime: null,   // ms
    reaction_history: [],      // 최근 시도들
    sound_enabled: true,
  };

  // 값 가져오기
  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return DEFAULTS[key] ?? null;
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULTS[key] ?? null;
    }
  }

  // 값 저장
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // 저장 실패는 무시 (사파리 프라이빗 모드 등)
    }
  }

  // 최고점이면 갱신하고 true 반환
  function setIfHigher(key, value) {
    const cur = get(key);
    if (cur === null || cur === undefined || value > cur) {
      set(key, value);
      return true;
    }
    return false;
  }

  // 최저값(시간)이면 갱신하고 true 반환
  function setIfLower(key, value) {
    const cur = get(key);
    if (cur === null || cur === undefined || value < cur) {
      set(key, value);
      return true;
    }
    return false;
  }

  return { get, set, setIfHigher, setIfLower };
})();

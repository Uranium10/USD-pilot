-- U.S.D 세션 저장 스키마
-- 자세한 설계 근거는 docs/db-schema.md 참고.
-- 이 파일은 그대로 재실행 가능해야 한다 (모두 IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS sessions (
  device_id         TEXT PRIMARY KEY,               -- 클라이언트가 최초 실행 시 생성해 localStorage에 저장하는 UUID.
                                                      -- 로그인이 없으므로 "이 브라우저의 저장 슬롯 1개"를 식별하는 용도.
  status            TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'gameover' | 'clear'
                                                      -- 타이틀 화면의 "불러오기"는 status='active'일 때만 노출한다.
  created_at        INTEGER NOT NULL,                -- unix epoch(ms)
  updated_at        INTEGER NOT NULL,

  screen            TEXT NOT NULL,                   -- 'title' | 'room' | 'monitor'
  phase             TEXT NOT NULL,                   -- 'idle'|'loading'|'dayIntro'|'premarket'|'day'|'dayReport'|'night'|'settlement'|'gameover'|'clear'
  cycle             INTEGER NOT NULL DEFAULT 1,       -- 몇 주차
  day               INTEGER NOT NULL DEFAULT 1,       -- 주차 내 며칠째 (1~7)

  market_seed       INTEGER NOT NULL,                -- generateMarketCycle({cycle, seed})로 이번 주차 시장을 그대로 재현하기 위한 시드.
                                                      -- 가격 경로·뉴스·소문 전체를 저장하지 않고 이 값 하나로 재생성한다.
  elapsed           REAL NOT NULL DEFAULT 0,         -- 낮 스테이지 경과 시간(초). 불러오기 시 이어서 재생할지 판단하는 값.

  cash              REAL NOT NULL,
  debt              REAL NOT NULL,

  selected_stock_id TEXT,                            -- 마지막으로 보고 있던 종목
  selected_rumor_id TEXT,                            -- 이번 날 구매한 소문 id (없으면 NULL)

  world_state_json  TEXT                             -- 다중 소문, 메모, 일일 요약, 에너지·인벤토리·채굴기와
                                                      -- 시장 재현 보조값 등 확장 진행 상태를 JSON으로 저장한다.
);

CREATE TABLE IF NOT EXISTS holdings (
  device_id TEXT NOT NULL REFERENCES sessions(device_id) ON DELETE CASCADE,
  stock_id  TEXT NOT NULL,
  quantity  REAL NOT NULL,
  average   REAL NOT NULL,
  PRIMARY KEY (device_id, stock_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

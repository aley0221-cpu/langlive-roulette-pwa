import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import type { Spin, SpinSource } from "./core/types";
import ReplayPage from "./pages/ReplayPage";

type Color = "red" | "black" | "green";
type Parity = "單" | "雙" | "-";
type Range = "小" | "中" | "大" | "-";

type Stats15 = {
  total: number;
  red: number;
  black: number;
  green: number; // == zeroCount
  odd: number;
  even: number;
  small: number;
  mid: number;
  large: number;
  zeroCount: number;
  zeroMiss: number; // within last15 (0=最新就是0；無則=total)
};

const LS_KEY = "langlive_roulette_history_v1";

function getMeta(n: number): { color: Color; parity: Parity; range: Range } {
  if (n === 0) return { color: "green", parity: "-", range: "-" };

  // 浪娛樂城規則：奇數紅、偶數黑
  const color: Color = n % 2 === 1 ? "red" : "black";
  const parity: Parity = n % 2 === 1 ? "單" : "雙";

  let range: Range = "大";
  if (n >= 1 && n <= 12) range = "小";
  else if (n >= 13 && n <= 24) range = "中";

  return { color, parity, range };
}

function calcStats15(last15: Spin[]): Stats15 {
  const s: Stats15 = {
    total: last15.length,
    red: 0,
    black: 0,
    green: 0,
    odd: 0,
    even: 0,
    small: 0,
    mid: 0,
    large: 0,
    zeroCount: 0,
    zeroMiss: 0,
  };

  for (let i = 0; i < last15.length; i++) {
    const n = last15[i].n;
    const m = getMeta(n);

    if (m.color === "red") s.red++;
    else if (m.color === "black") s.black++;
    else {
      s.green++;
      s.zeroCount++;
    }

    if (n !== 0) {
      if (m.parity === "單") s.odd++;
      else s.even++;

      if (m.range === "小") s.small++;
      else if (m.range === "中") s.mid++;
      else s.large++;
    }
  }

  const idxZero = last15.findIndex((x) => x.n === 0);
  s.zeroMiss = idxZero === -1 ? last15.length : idxZero;

  return s;
}

function calcZeroStatsAll(history: Spin[]) {
  // history[0] 最新
  const zeroIdxs: number[] = [];
  for (let i = 0; i < history.length; i++) if (history[i].n === 0) zeroIdxs.push(i);

  const miss = zeroIdxs.length === 0 ? history.length : zeroIdxs[0];

  let avgGap: number | null = null;
  if (zeroIdxs.length >= 2) {
    let sum = 0;
    for (let i = 0; i < zeroIdxs.length - 1; i++) sum += zeroIdxs[i + 1] - zeroIdxs[i];
    avgGap = sum / (zeroIdxs.length - 1);
  }

  return {
    miss, // 目前已連續沒出 0（全歷史）
    avgGap: avgGap === null ? null : Math.round(avgGap), // 平均幾次出 0
    zeroCount: zeroIdxs.length,
  };
}

function calcHotColdNumbers(history: Spin[], period: number = 240) {
  // 取最近 period 期
  const lastPeriod = history.slice(0, period);
  
  // 統計每個號碼出現次數（0-36）
  const countMap = new Map<number, number>();
  for (let i = 0; i <= 36; i++) {
    countMap.set(i, 0);
  }
  
  for (const item of lastPeriod) {
    const n = item.n;
    countMap.set(n, (countMap.get(n) || 0) + 1);
  }
  
  // 轉換為陣列並排序（排除0，因為0有專門統計）
  const numbers: Array<{ num: number; count: number }> = [];
  for (let i = 1; i <= 36; i++) {
    numbers.push({ num: i, count: countMap.get(i) || 0 });
  }
  
  // 冷門號：出現次數最少的4個（次數相同時按號碼大小排序）
  const coldNumbers = numbers
    .sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      return a.num - b.num; // 次數相同時，號碼小的在前
    })
    .slice(0, 4)
    .map(x => x.num);
  
  // 熱門號：出現次數最多的4個（次數相同時按號碼大小排序）
  const hotNumbers = numbers
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.num - b.num; // 次數相同時，號碼小的在前
    })
    .slice(0, 4)
    .map(x => x.num);
  
  return {
    cold: coldNumbers,
    hot: hotNumbers,
  };
}

function clampN(n: number) {
  return Math.max(0, Math.min(36, n));
}

// 將舊的 RecordItem 轉換為新的 Spin 格式（向後兼容）
function migrateToSpin(item: { n: number; ts: number }): Spin {
  const n = clampN(item.n);
  const meta = getMeta(n);
  return {
    id: `${item.ts}-${Math.random().toString(36).substr(2, 9)}`,
    ts: item.ts,
    n,
    color: meta.color,
    parity: meta.parity === "單" ? "odd" : meta.parity === "雙" ? "even" : "-",
    size: meta.range === "小" ? "small" : meta.range === "中" ? "mid" : meta.range === "大" ? "large" : "-",
    source: "live",
  };
}

export default function App() {
  const [history, setHistory] = useState<Spin[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      
      // 檢查是否為舊格式（只有 n 和 ts）
      if (parsed.length > 0 && !parsed[0].id) {
        // 舊格式，需要遷移
        return parsed
          .filter((x) => typeof x?.n === "number" && typeof x?.ts === "number")
          .map((x) => migrateToSpin(x));
      }
      
      // 新格式，直接使用
      return parsed
        .filter((x) => typeof x?.n === "number" && typeof x?.ts === "number" && typeof x?.id === "string")
        .map((x) => ({
          ...x,
          n: clampN(x.n),
        }));
    } catch {
      return [];
    }
  });

  // persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(history));
  }, [history]);

  const last20 = useMemo(() => history.slice(0, 20), [history]);
  const last120 = useMemo(() => history.slice(0, 120), [history]); // 用於統計
  const last240 = useMemo(() => history.slice(0, 240), [history]); // 用於冷熱門號統計
  const stats120 = useMemo(() => calcStats15(last120), [last120]); // 使用 calcStats15 但計算 120 期
  const zeroAll = useMemo(() => calcZeroStatsAll(history), [history]);
  const hotCold = useMemo(() => calcHotColdNumbers(last240, 240), [last240]);

  const rows20 = useMemo(() => {
    const filled: (Spin | null)[] = [...last20];
    while (filled.length < 20) filled.push(null);
    return filled;
  }, [last20]);

  function add(n: number, source: SpinSource = "live", batchId?: string) {
    const num = clampN(n);
    const meta = getMeta(num);
    const item: Spin = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ts: Date.now(),
      n: num,
      color: meta.color,
      parity: meta.parity === "單" ? "odd" : meta.parity === "雙" ? "even" : "-",
      size: meta.range === "小" ? "small" : meta.range === "中" ? "mid" : meta.range === "大" ? "large" : "-",
      source,
      batchId,
    };
    setHistory((prev) => [item, ...prev]);
    // 震動反饋
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  // 長按連打功能（用於 1-36 按鈕）
  const holdTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const holdDelays = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function handleNumButtonDown(n: number) {
    // 立即觸發一次
    const source: SpinSource = currentTab === "supplement" ? "replay" : "live";
    add(n, source);

    // 設置延遲：如果 150ms 後還沒放開，才開始連打
    const delayTimer = setTimeout(() => {
      // 開始長按連打（每 80ms 一次）
      const intervalTimer = setInterval(() => {
        add(n, source);
      }, 80);
      holdTimers.current.set(n, intervalTimer);
      holdDelays.current.delete(n);
    }, 150);

    holdDelays.current.set(n, delayTimer);
  }

  function handleNumButtonUp(n: number) {
    // 清除延遲定時器（如果還沒開始連打）
    const delayTimer = holdDelays.current.get(n);
    if (delayTimer) {
      clearTimeout(delayTimer);
      holdDelays.current.delete(n);
    }

    // 清除連打定時器（如果已經開始連打）
    const intervalTimer = holdTimers.current.get(n);
    if (intervalTimer) {
      clearInterval(intervalTimer);
      holdTimers.current.delete(n);
    }
  }

  // 清理所有定時器（組件卸載時）
  useEffect(() => {
    return () => {
      holdTimers.current.forEach((timer) => clearInterval(timer));
      holdTimers.current.clear();
      holdDelays.current.forEach((timer) => clearTimeout(timer));
      holdDelays.current.clear();
    };
  }, []);

  function undo() {
    setHistory((prev) => prev.slice(1));
  }

  function clearAll() {
    setHistory([]);
  }

  // 快速輸入號碼（用於標題後的輸入框）
  const [quickInput, setQuickInput] = useState("");
  function handleQuickInputSubmit() {
    const num = parseInt(quickInput.trim());
    if (!isNaN(num) && num >= 0 && num <= 36) {
      const source: SpinSource = currentTab === "supplement" ? "replay" : "live";
      add(num, source);
      setQuickInput("");
    }
  }

  // 補記分頁的狀態已移到 ReplayPage 組件中

  // 1–36 排列：6x6（照你圖）
  const grid = useMemo(() => Array.from({ length: 36 }, (_, i) => i + 1), []);

  // 分頁狀態
  type TabType = "record" | "supplement" | "bet" | "dashboard";
  const [currentTab, setCurrentTab] = useState<TabType>("supplement");

  const tabs: Array<{ key: TabType; label: string }> = [
    { key: "record", label: "紀錄 / 輸入" },
    { key: "supplement", label: "補記" },
    { key: "bet", label: "下注" },
    { key: "dashboard", label: "儀表板" },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="title-row">
          <div className="title">
            <span className="title-brand">浪LIVE</span>
            <span className="title-text"> 輪盤</span>
          </div>
          <div className="tabs-container">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${currentTab === tab.key ? "active" : ""}`}
                onClick={() => setCurrentTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            className="btn-0-header" 
            onClick={() => {
              const source: SpinSource = currentTab === "supplement" ? "replay" : "live";
              add(0, source);
            }}
          >
            0
          </button>
        </div>
      </header>

      <main className="content onepage">
        {currentTab === "supplement" ? (
          /* 補記分頁 - 使用 ReplayPage 組件 */
          <ReplayPage />
        ) : currentTab === "record" ? (
          /* 紀錄 / 輸入分頁 */
          <>
            {/* 1–36：6欄 */}
            <section className="pad">
              <div className="pad-grid">
                {grid.map((n) => (
                  <button
                    key={n}
                    className="btn-num"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleNumButtonDown(n);
                    }}
                    onPointerUp={() => handleNumButtonUp(n)}
                    onPointerLeave={() => handleNumButtonUp(n)}
                    onPointerCancel={() => handleNumButtonUp(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>

            {/* 操作 */}
            <section className="actions">
              <button className="btn action secondary" onClick={undo} disabled={history.length === 0}>
                ← 復原
              </button>
              <button className="btn action danger" onClick={clearAll} disabled={history.length === 0}>
                清空全部
              </button>
            </section>

            {/* 最近紀錄(20) 和 近120期統計 並排 */}
            <section className="panel two-col-panel">
          {/* 左側：最近紀錄(20) */}
          <div className="panel-col">
            <div className="panel-head-row">
              <div className="panel-head">最近紀錄 (20)</div>
              <div className="quick-input-group">
                <input
                  type="number"
                  className="quick-input"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickInputSubmit()}
                  placeholder="0-36"
                  min="0"
                  max="36"
                />
                <button className="quick-submit" onClick={handleQuickInputSubmit}>
                  輸入
                </button>
              </div>
            </div>
            <div className="recent">
              {rows20.map((it, idx) => {
                if (!it) {
                  return (
                    <div key={idx} className="recent-row empty">
                      <div className="cell num">--</div>
                      <div className="cell meta">--</div>
                      <div className="cell meta">--</div>
                    </div>
                  );
                }
                const m = getMeta(it.n);
                return (
                  <div key={it.ts} className="recent-row">
                    <div className="cell num">
                      <span className={`dot ${m.color}`} />
                      <span className="n">{it.n}</span>
                    </div>
                    <div className="cell meta">{m.parity}</div>
                    <div className="cell meta">{m.range}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右側：近120期統計 */}
          <div className="panel-col stats-col">
            <div className="panel-head">近 120 期統計</div>
            <div className="stats-lines">
              <div className="stat-line">
                <span className="k">顏色：</span>
                <span className="v-chip red">紅 {stats120.red}</span>
                <span className="v-chip black">黑 {stats120.black}</span>
                <span className="v-chip green">綠 {stats120.zeroCount}</span>
              </div>
              <div className="stat-line">
                <span className="k">單雙：</span>
                <span className="v-chip cyan">單 {stats120.odd}</span>
                <span className="v-chip cyan">雙 {stats120.even}</span>
              </div>
              <div className="stat-line">
                <span className="k">大小：</span>
                <span className="v-chip cyan">大 {stats120.large}</span>
                <span className="v-chip cyan">中 {stats120.mid}</span>
                <span className="v-chip cyan">小 {stats120.small}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 0 統計：底部青色霓虹，分為兩欄 */}
        <section className="panel cyanPanel">
          <div className="panel-head cyanHead">0 統計</div>
          <div className="zeroPanel-content">
            {/* 左欄：0統計（不變） */}
            <div className="zeroPanel-col">
              <div className="zeroLines">
                <div className="zeroLine">
                  平均幾次出 0：
                  <b>{zeroAll.avgGap === null ? "—" : `${zeroAll.avgGap} 次`}</b>
                  <span className="hint">（至少要出現 2 次 0 才能計算）</span>
                </div>
                <div className="zeroLine">
                  目前已連續沒出 0：<b>{zeroAll.miss} 期</b>
                </div>
              </div>
            </div>
            
            {/* 右欄：冷熱門號統計 */}
            <div className="zeroPanel-col hotCold-col">
              <div className="hotCold-title">冷熱門號統計 (240期)</div>
              <div className="hotCold-line">
                <span className="hotCold-label">冷門號：</span>
                <div className="hotCold-numbers">
                  {hotCold.cold.map((n) => (
                    <span key={n} className="hotCold-num cold">{n}</span>
                  ))}
                </div>
              </div>
              <div className="hotCold-line">
                <span className="hotCold-label">熱門號：</span>
                <div className="hotCold-numbers">
                  {hotCold.hot.map((n) => (
                    <span key={n} className="hotCold-num hot">{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ height: 16 }} />
          </>
        ) : (
          /* 其他分頁（下注、儀表板）待實現 */
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
            {currentTab === "bet" ? "下注分頁（待實現）" : "儀表板分頁（待實現）"}
          </div>
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type Color = "red" | "black" | "green";
type Parity = "單" | "雙" | "-";
type Range = "小" | "中" | "大" | "-";

type RecordItem = { n: number; ts: number };

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

function calcStats15(last15: RecordItem[]): Stats15 {
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

function calcZeroStatsAll(history: RecordItem[]) {
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

function clampN(n: number) {
  return Math.max(0, Math.min(36, n));
}

export default function App() {
  const [history, setHistory] = useState<RecordItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecordItem[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => typeof x?.n === "number" && typeof x?.ts === "number")
        .map((x) => ({ n: clampN(x.n), ts: x.ts }));
    } catch {
      return [];
    }
  });

  // persist
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(history));
  }, [history]);

  const last15 = useMemo(() => history.slice(0, 15), [history]);
  const stats15 = useMemo(() => calcStats15(last15), [last15]);
  const zeroAll = useMemo(() => calcZeroStatsAll(history), [history]);

  const rows15 = useMemo(() => {
    const filled: (RecordItem | null)[] = [...last15];
    while (filled.length < 15) filled.push(null);
    return filled;
  }, [last15]);

  function add(n: number) {
    const item: RecordItem = { n: clampN(n), ts: Date.now() };
    setHistory((prev) => [item, ...prev]);
    // 震動反饋
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  // 長按連打功能（用於 1-36 按鈕）
  const holdTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  function handleNumButtonDown(n: number) {
    // 立即觸發一次
    add(n);

    // 開始長按連打（每 80ms 一次）
    const timer = setInterval(() => {
      add(n);
    }, 80);

    holdTimers.current.set(n, timer);
  }

  function handleNumButtonUp(n: number) {
    const timer = holdTimers.current.get(n);
    if (timer) {
      clearInterval(timer);
      holdTimers.current.delete(n);
    }
  }

  // 清理所有定時器（組件卸載時）
  useEffect(() => {
    return () => {
      holdTimers.current.forEach((timer) => clearInterval(timer));
      holdTimers.current.clear();
    };
  }, []);

  function undo() {
    setHistory((prev) => prev.slice(1));
  }

  function clearAll() {
    setHistory([]);
  }

  // 1–36 排列：6x6（照你圖）
  const grid = useMemo(() => Array.from({ length: 36 }, (_, i) => i + 1), []);

  return (
    <div className="app">
      <header className="header">
        <div className="title">浪LIVE 輪盤紀錄</div>
      </header>

      <main className="content onepage">
        {/* 0 大按鈕：標題下方 */}
        <button className="btn0-top" onClick={() => add(0)}>
          0
        </button>

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

        {/* 最近紀錄(15) */}
        <section className="panel">
          <div className="panel-head">最近紀錄 (15)</div>
          <div className="recent">
            {rows15.map((it, idx) => {
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
        </section>

        {/* 近15統計 */}
        <section className="panel">
          <div className="panel-head">近 15 統計</div>
          <div className="stats-grid">
            <div className="stat">
              <div className="k">顏色</div>
              <div className="v">
                <span className="chip red">紅 {stats15.red}</span>
                <span className="chip black">黑 {stats15.black}</span>
                <span className="chip green">綠(0) {stats15.zeroCount}</span>
              </div>
            </div>
            <div className="stat">
              <div className="k">單雙</div>
              <div className="v">
                <span className="chip cyan">單 {stats15.odd}</span>
                <span className="chip cyan">雙 {stats15.even}</span>
              </div>
            </div>
            <div className="stat">
              <div className="k">大小</div>
              <div className="v">
                <span className="chip cyan">小 {stats15.small}</span>
                <span className="chip cyan">中 {stats15.mid}</span>
                <span className="chip cyan">大 {stats15.large}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 0 統計：底部青色霓虹 */}
        <section className="panel cyanPanel">
          <div className="panel-head cyanHead">0 統計</div>
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
        </section>

        <div style={{ height: 16 }} />
      </main>
    </div>
  );
}

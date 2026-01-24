import { useMemo, useState } from "react";
import "./App.css";

type ColorTag = "green" | "red" | "black";

function numberColor(n: number): ColorTag {
  if (n === 0) return "green";
  // 你規則：奇數紅、偶數黑
  return n % 2 === 1 ? "red" : "black";
}

function sizeTag(n: number): string {
  if (n === 0) return "—";
  if (n <= 12) return "小";
  if (n <= 24) return "中";
  return "大";
}

function oddEvenTag(n: number): string {
  if (n === 0) return "—";
  return n % 2 === 1 ? "單" : "雙";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function App() {
  const numbers1to36 = useMemo(() => Array.from({ length: 36 }, (_, i) => i + 1), []);
  const [records, setRecords] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  const addRecord = (n: number) => {
    setRecords((prev) => [n, ...prev]);
    setLastClicked(n);
    // 小小高亮一下就退回（視覺節奏）
    window.setTimeout(() => setLastClicked((cur) => (cur === n ? null : cur)), 650);
  };

  const undo = () => setRecords((prev) => prev.slice(1));
  const clearAll = () => setRecords([]);

  // 圓球：最近 8-9 顆（縮小以顯示更多）
  const balls = records.slice(0, 9);

  // 下方「最近紀錄(20)」- 只顯示前 8-9 個以適配單頁
  const recent20 = records.slice(0, 20);
  const recentDisplay = records.slice(0, 9); // 只顯示前 9 個

  // 計算真正的統計（近 120 期，但用實際資料）
  const last120 = records.slice(0, 120);
  const stats120 = useMemo(() => {
    const red = last120.filter((n) => numberColor(n) === "red").length;
    const black = last120.filter((n) => numberColor(n) === "black").length;
    const green = last120.filter((n) => n === 0).length;
    const odd = last120.filter((n) => n !== 0 && n % 2 === 1).length;
    const even = last120.filter((n) => n !== 0 && n % 2 === 0).length;
    const small = last120.filter((n) => n >= 1 && n <= 12).length;
    const mid = last120.filter((n) => n >= 13 && n <= 24).length;
    const big = last120.filter((n) => n >= 25 && n <= 36).length;
    return { red, black, green, odd, even, small, mid, big };
  }, [last120]);

  // 計算 0 統計
  const zeroStats = useMemo(() => {
    const zeroIndices: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (records[i] === 0) zeroIndices.push(i);
    }
    
    const miss = zeroIndices.length === 0 ? records.length : zeroIndices[0];
    
    let avgGap: number | null = null;
    if (zeroIndices.length >= 2) {
      let sum = 0;
      for (let i = 0; i < zeroIndices.length - 1; i++) {
        sum += zeroIndices[i + 1] - zeroIndices[i];
      }
      avgGap = sum / (zeroIndices.length - 1);
    }
    
    return {
      miss,
      avgGap: avgGap === null ? null : Math.round(avgGap),
      zeroCount: zeroIndices.length,
    };
  }, [records]);

  return (
    <div className="page">
      <div className="tableFrame">
        <div className="felt">
          {/* 上方 0（縮小版） */}
          <div className="zeroHeroWrap">
            <button
              className={`zeroHeroBtn small ${lastClicked === 0 ? "isHot" : ""}`}
              onClick={() => addRecord(0)}
              aria-label="record 0"
            >
              <span className="zeroHeroRing" />
              <span className="zeroHeroNum">0</span>
            </button>
          </div>

          {/* 1–36：固定 6×6 */}
          <div className="gridCard">
            <div className="numberGrid" role="grid" aria-label="1 to 36">
              {numbers1to36.map((n) => {
                const c = numberColor(n);
                const hot = lastClicked === n;
                return (
                  <button
                    key={n}
                    className={`numBtn ${c} ${hot ? "isHot" : ""}`}
                    onClick={() => addRecord(n)}
                    aria-label={`record ${n}`}
                  >
                    <span className="numBtnInner">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 圓球最近號碼（唯一顯示最近記錄） */}
          <div className="ballsBar">
            <div className="ballsTrack" aria-label="recent balls">
              {balls.length === 0 ? (
                <div className="ballsEmpty">尚未記錄</div>
              ) : (
                balls.map((n, idx) => {
                  const c = numberColor(n);
                  return (
                    <div key={`${n}-${idx}`} className={`ball ${c}`}>
                      {n}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 功能鍵：復原 / 清空全部（保留你說的中間下方功能） */}
          <div className="actionsRow">
            <button className="actionBtn gold" onClick={undo} disabled={records.length === 0}>
              復原
            </button>
            <button className="actionBtn red" onClick={clearAll} disabled={records.length === 0}>
              清空全部
            </button>
          </div>

          {/* 下方統計區（先做成你圖上的版面，數字可之後接真統計） */}
          <div className="statsWrap">
            <div className="statsGrid">
              <div className="panel">
                <div className="panelTitle">最近紀錄（20）</div>
                <div className="recentList compact">
                  {recentDisplay.length === 0 ? (
                    <div className="muted">—</div>
                  ) : (
                    recentDisplay.map((n, idx) => (
                      <div key={`${n}-${idx}`} className="recentRow compact">
                        <div className={`dot small ${numberColor(n)}`} />
                        <div className="recentNum small">{n}</div>
                        <div className="recentMeta compact">
                          <span className="pill small">{oddEvenTag(n)}</span>
                          <span className="pill small">{sizeTag(n)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panelTitle">近 120 期統計</div>

                <div className="kv">
                  <div className="kvRow">
                    <div className="kvKey">顏色</div>
                    <div className="kvVal">
                      <span className="chip red">紅 {stats120.red}</span>
                      <span className="chip black">黑 {stats120.black}</span>
                      <span className="chip green">綠 {stats120.green}</span>
                    </div>
                  </div>

                  <div className="kvRow">
                    <div className="kvKey">單雙</div>
                    <div className="kvVal">
                      <span className="chip">單 {stats120.odd}</span>
                      <span className="chip">雙 {stats120.even}</span>
                    </div>
                  </div>

                  <div className="kvRow">
                    <div className="kvKey">大小</div>
                    <div className="kvVal">
                      <span className="chip">小 {stats120.small}</span>
                      <span className="chip">中 {stats120.mid}</span>
                      <span className="chip">大 {stats120.big}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel span2">
                <div className="panelTitle">0 統計</div>
                <div className="zeroStats">
                  <div className="zeroStatLine">
                    <span className="muted">平均幾次出 0：</span>
                    <span className="strong">{zeroStats.avgGap === null ? "—" : `${zeroStats.avgGap} 次`}</span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">目前已連續沒出 0：</span>
                    <span className="strong">{zeroStats.miss}</span>
                    <span className="muted">期</span>
                  </div>
                </div>
              </div>

              <div className="panel span2">
                <div className="panelTitle">冷熱門號統計（240期）</div>
                <div className="hotCold">
                  <div className="hcBlock">
                    <div className="hcLabel muted">冷門號</div>
                    <div className="hcNums">
                      <span className="hcPill cool">21</span>
                      <span className="hcPill cool">22</span>
                      <span className="hcPill cool">23</span>
                      <span className="hcPill cool">24</span>
                    </div>
                  </div>
                  <div className="hcBlock">
                    <div className="hcLabel muted">熱門號</div>
                    <div className="hcNums">
                      <span className="hcPill hot">1</span>
                      <span className="hcPill hot">2</span>
                      <span className="hcPill hot">7</span>
                      <span className="hcPill hot">13</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部留白（像賭桌下緣） */}
          <div className="tableBottomPad" />
        </div>
      </div>
    </div>
  );
}

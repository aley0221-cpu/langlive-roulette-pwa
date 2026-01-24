import { useMemo, useState, useEffect } from "react";
import "./App.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// 註冊 Chart.js 組件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController
);

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

/**
 * 冷熱門權重演算法（衰減權重）
 * 最近 10 期的出現權重佔 70%，11-50 期的權重佔 30%
 */
function calculateNumberHeat(records: number[], period: number = 50): Map<number, number> {
  const heatMap = new Map<number, number>();
  
  // 初始化所有號碼（0-36）
  for (let i = 0; i <= 36; i++) {
    heatMap.set(i, 0);
  }
  
  // 只取最近 period 期（預設 50 期）
  const recentRecords = records.slice(0, period);
  
  for (let i = 0; i < recentRecords.length; i++) {
    const num = recentRecords[i];
    const currentHeat = heatMap.get(num) || 0;
    
    let weight: number;
    if (i < 10) {
      // 最近 10 期：權重 70% / 10 = 7% 每期
      weight = 0.7 / 10;
    } else if (i < 50) {
      // 11-50 期：權重 30% / 40 = 0.75% 每期
      weight = 0.3 / 40;
    } else {
      // 超過 50 期不計算
      continue;
    }
    
    heatMap.set(num, currentHeat + weight);
  }
  
  return heatMap;
}

/**
 * 計算冷熱門號碼（使用權重演算法）
 */
function calculateHotColdNumbers(records: number[]): { hot: number[]; cold: number[] } {
  const heatMap = calculateNumberHeat(records, 50);
  
  // 轉換為陣列並排序（排除 0，因為 0 有專門統計）
  const numbers: Array<{ num: number; heat: number }> = [];
  for (let i = 1; i <= 36; i++) {
    numbers.push({ num: i, heat: heatMap.get(i) || 0 });
  }
  
  // 熱門號：權重最高的 4 個
  const hot = numbers
    .sort((a, b) => {
      if (a.heat !== b.heat) return b.heat - a.heat;
      return a.num - b.num; // 權重相同時，號碼小的在前
    })
    .slice(0, 4)
    .map(x => x.num);
  
  // 冷門號：權重最低的 4 個（但至少出現過一次）
  const cold = numbers
    .filter(x => x.heat > 0) // 至少出現過一次
    .sort((a, b) => {
      if (a.heat !== b.heat) return a.heat - b.heat;
      return a.num - b.num; // 權重相同時，號碼小的在前
    })
    .slice(0, 4)
    .map(x => x.num);
  
  // 如果冷門號不足 4 個，用權重為 0 的號碼補齊
  if (cold.length < 4) {
    const zeroHeatNumbers = numbers
      .filter(x => x.heat === 0)
      .sort((a, b) => a.num - b.num)
      .slice(0, 4 - cold.length)
      .map(x => x.num);
    cold.push(...zeroHeatNumbers);
  }
  
  return { hot, cold };
}

export default function App() {
  const numbers1to36 = useMemo(() => Array.from({ length: 36 }, (_, i) => i + 1), []);
  const [records, setRecords] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [zeroAlertThreshold, setZeroAlertThreshold] = useState<number>(37); // 自定義門檻，預設 37（數學期望值）

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
    
    // 數學期望值：37 期出現一次 0（輪盤有 37 個號碼）
    const expectedGap = 37;
    
    return {
      miss,
      avgGap: avgGap === null ? null : Math.round(avgGap),
      zeroCount: zeroIndices.length,
      expectedGap,
    };
  }, [records]);

  // 0 的遺漏警報：當連續沒出 0 超過期望值或自定義門檻時，背景變色
  const zeroAlertActive = useMemo(() => {
    const threshold = Math.max(zeroStats.expectedGap, zeroAlertThreshold);
    return zeroStats.miss >= threshold;
  }, [zeroStats.miss, zeroStats.expectedGap, zeroAlertThreshold]);

  // 計算冷熱門號碼（使用權重演算法）
  const hotCold = useMemo(() => {
    return calculateHotColdNumbers(records);
  }, [records]);

  // 計算過去 100 期的出現頻率（用於 Chart.js）
  const chartData = useMemo(() => {
    const last100 = records.slice(0, 100);
    const counts = new Map<number, number>();
    
    // 初始化所有號碼（0-36）
    for (let i = 0; i <= 36; i++) {
      counts.set(i, 0);
    }
    
    // 統計出現次數
    for (const num of last100) {
      counts.set(num, (counts.get(num) || 0) + 1);
    }
    
    // 準備 Chart.js 資料
    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColors: string[] = [];
    
    for (let i = 0; i <= 36; i++) {
      labels.push(i.toString());
      const count = counts.get(i) || 0;
      data.push(count);
      
      // 根據冷熱門設定顏色
      if (hotCold.hot.includes(i)) {
        backgroundColors.push("rgba(198, 58, 58, 0.8)"); // 紅色（熱門）
      } else if (hotCold.cold.includes(i)) {
        backgroundColors.push("rgba(80, 140, 255, 0.8)"); // 藍色（冷門）
      } else if (i === 0) {
        backgroundColors.push("rgba(43, 198, 107, 0.8)"); // 綠色（0）
      } else {
        backgroundColors.push("rgba(120, 120, 120, 0.5)"); // 灰色（一般）
      }
    }
    
    return {
      labels,
      datasets: [
        {
          label: "出現頻率",
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(c => c.replace("0.8", "1").replace("0.5", "1")),
          borderWidth: 1,
        },
      ],
    };
  }, [records, hotCold]);

  // 當 0 警報啟動時，改變背景色
  useEffect(() => {
    const pageElement = document.querySelector(".page") as HTMLElement;
    if (pageElement) {
      if (zeroAlertActive) {
        pageElement.style.background = "radial-gradient(1200px 700px at 50% 10%, rgba(198, 58, 58, 0.3) 0%, var(--bg) 60%, #07070a 100%)";
        pageElement.style.transition = "background 0.5s ease";
      } else {
        pageElement.style.background = "";
      }
    }
  }, [zeroAlertActive]);

  return (
    <div className={`page ${zeroAlertActive ? "zero-alert" : ""}`}>
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
                <div className="panelTitle">0 統計 {zeroAlertActive && <span className="alert-badge">⚠️ 警報</span>}</div>
                <div className="zeroStats">
                  <div className="zeroStatLine">
                    <span className="muted">平均幾次出 0：</span>
                    <span className="strong">{zeroStats.avgGap === null ? "—" : `${zeroStats.avgGap} 次`}</span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">目前已連續沒出 0：</span>
                    <span className={`strong ${zeroAlertActive ? "alert-text" : ""}`}>{zeroStats.miss}</span>
                    <span className="muted">期</span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">期望值：</span>
                    <span className="strong">{zeroStats.expectedGap} 期</span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">警報門檻：</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={zeroAlertThreshold}
                      onChange={(e) => setZeroAlertThreshold(parseInt(e.target.value) || 37)}
                      className="threshold-input"
                      style={{ width: "60px", padding: "2px 4px", marginLeft: "8px" }}
                    />
                    <span className="muted" style={{ marginLeft: "4px" }}>期</span>
                  </div>
                </div>
              </div>

              <div className="panel span2">
                <div className="panelTitle">冷熱門號統計（權重演算法）</div>
                <div className="hotCold">
                  <div className="hcBlock">
                    <div className="hcLabel muted">冷門號</div>
                    <div className="hcNums">
                      {hotCold.cold.slice(0, 4).map((n) => (
                        <span key={n} className="hcPill cool">{n}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hcBlock">
                    <div className="hcLabel muted">熱門號</div>
                    <div className="hcNums">
                      {hotCold.hot.slice(0, 4).map((n) => (
                        <span key={n} className="hcPill hot">{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart.js 數據可視化 */}
              <div className="panel span2">
                <div className="panelTitle">號碼出現頻率圖（過去 100 期）</div>
                <div className="chart-container">
                  {records.length > 0 ? (
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          title: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                            },
                          },
                        },
                      }}
                      height={200}
                    />
                  ) : (
                    <div className="muted" style={{ padding: "20px", textAlign: "center" }}>
                      尚無資料
                    </div>
                  )}
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

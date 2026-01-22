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

  // 圓球：最近 15 顆（你說上方「賭桌最近記錄」不要，這裡就是唯一顯示）
  const balls = records.slice(0, 15);

  // 下方「最近紀錄(20)」
  const recent20 = records.slice(0, 20);

  // 這裡先給「近 120」的版面用假資料（之後你接統計邏輯再替換）
  const mock120 = {
    red: clamp(Math.floor(recent20.length * 0.5), 0, 120),
    black: clamp(recent20.length - Math.floor(recent20.length * 0.5), 0, 120),
    green: recent20.filter((n) => n === 0).length,
    odd: clamp(Math.floor(recent20.length * 0.52), 0, 120),
    even: clamp(recent20.length - Math.floor(recent20.length * 0.52), 0, 120),
    small: clamp(Math.floor(recent20.length * 0.33), 0, 120),
    mid: clamp(Math.floor(recent20.length * 0.33), 0, 120),
    big: clamp(recent20.length - Math.floor(recent20.length * 0.66), 0, 120),
  };

  return (
    <div className="page">
      <div className="tableFrame">
        <div className="felt">
          {/* 上方大 0（主角） */}
          <div className="zeroHeroWrap">
            <button
              className={`zeroHeroBtn ${lastClicked === 0 ? "isHot" : ""}`}
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
                <div className="recentList">
                  {recent20.length === 0 ? (
                    <div className="muted">—</div>
                  ) : (
                    recent20.map((n, idx) => (
                      <div key={`${n}-${idx}`} className="recentRow">
                        <div className={`dot ${numberColor(n)}`} />
                        <div className="recentNum">{n}</div>
                        <div className="recentMeta">
                          <span className="pill">{oddEvenTag(n)}</span>
                          <span className="pill">{sizeTag(n)}</span>
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
                      <span className="chip red">紅 {mock120.red}</span>
                      <span className="chip black">黑 {mock120.black}</span>
                      <span className="chip green">綠 {mock120.green}</span>
                    </div>
                  </div>

                  <div className="kvRow">
                    <div className="kvKey">單雙</div>
                    <div className="kvVal">
                      <span className="chip">單 {mock120.odd}</span>
                      <span className="chip">雙 {mock120.even}</span>
                    </div>
                  </div>

                  <div className="kvRow">
                    <div className="kvKey">大小</div>
                    <div className="kvVal">
                      <span className="chip">小 {mock120.small}</span>
                      <span className="chip">中 {mock120.mid}</span>
                      <span className="chip">大 {mock120.big}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel span2">
                <div className="panelTitle">0 統計</div>
                <div className="zeroStats">
                  <div className="zeroStatLine">
                    <span className="muted">平均幾次出 0：</span>
                    <span className="strong">—</span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">目前已連續沒出 0：</span>
                    <span className="strong">—</span>
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
                  <div className="muted tiny">
                    ※ 以上先做版面示意，你把統計接上去後再替換數字即可
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

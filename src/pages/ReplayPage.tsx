import { useState, useEffect, useRef } from "react";
import { addReplaySpin } from "../core/engine";
import { db } from "../core/engine";
import NumberPad from "../components/NumberPad";

const LS_BATCH_ID = "langlive_roulette_batch_id_v1";
const LS_RAPID_MODE = "langlive_roulette_rapid_mode_v1";

export default function ReplayPage() {
  const [batchId, setBatchId] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_BATCH_ID);
      if (saved) return saved;
      // 預設格式：YYYY-MM-DD_A1
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '-');
      return `${dateStr}_A1`;
    } catch {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '-');
      return `${dateStr}_A1`;
    }
  });

  const [fastMode, setFastMode] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_RAPID_MODE);
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [batchCount, setBatchCount] = useState(0);
  const [spinsUpdated, setSpinsUpdated] = useState(0); // 用於觸發重新計算

  // 保存 Batch ID
  useEffect(() => {
    localStorage.setItem(LS_BATCH_ID, batchId);
  }, [batchId]);

  // 保存快速連點模式
  useEffect(() => {
    localStorage.setItem(LS_RAPID_MODE, fastMode.toString());
  }, [fastMode]);

  // 計算本段已補期數
  useEffect(() => {
    const updateCount = async () => {
      if (!batchId) {
        setBatchCount(0);
        return;
      }
      try {
        const count = await db.spins.getReplayCountByBatchId(batchId);
        setBatchCount(count);
      } catch (error) {
        console.error("Failed to get batch count:", error);
        setBatchCount(0);
      }
    };
    updateCount();
  }, [batchId, spinsUpdated]);

  // 監聽 spins 更新事件
  useEffect(() => {
    const handleUpdate = () => {
      setSpinsUpdated(prev => prev + 1);
    };
    window.addEventListener("spins-updated", handleUpdate);
    return () => window.removeEventListener("spins-updated", handleUpdate);
  }, []);

  const holdTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const holdDelays = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const onTap = async (n: number) => {
    await addReplaySpin(n, batchId, fastMode);
    // 快速連點模式關閉時才顯示震動反饋
    if (!fastMode && navigator.vibrate) {
      navigator.vibrate(10);
    }
    // 觸發重新計算
    setSpinsUpdated(prev => prev + 1);
  };

  const handleNumButtonDown = (n: number) => {
    // 立即觸發一次
    onTap(n);

    if (!fastMode) return;

    // 設置延遲：如果 150ms 後還沒放開，才開始連打
    const delayTimer = setTimeout(() => {
      // 開始長按連打（每 80ms 一次）
      const intervalTimer = setInterval(() => {
        onTap(n);
      }, 80);
      holdTimers.current.set(n, intervalTimer);
      holdDelays.current.delete(n);
    }, 150);

    holdDelays.current.set(n, delayTimer);
  };

  const handleNumButtonUp = (n: number) => {
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
  };

  const undoLastSpin = async () => {
    try {
      const lastReplay = await db.spins.getLastReplay();
      if (!lastReplay) return;
      
      // 只復原最後一筆補記
      await db.spins.delete(lastReplay.id);
      
      // 通知訂閱者
      window.dispatchEvent(new CustomEvent("spins-updated"));
      setSpinsUpdated(prev => prev + 1);
    } catch (error) {
      console.error("Failed to undo last spin:", error);
    }
  };

  return (
    <div className="supplement-page">
      {/* 補記資訊 */}
      <section className="supplement-panel">
        <div className="supplement-section">
          <div className="supplement-label">補記段落（Batch ID）</div>
          <input
            type="text"
            className="batch-id-input"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="2026-01-22_A1"
          />
        </div>
        <div className="supplement-section">
          <div className="supplement-label">本段已補：</div>
          <div className="supplement-value">{batchCount} 期</div>
        </div>
        <div className="supplement-section">
          <div className="supplement-label">快速連點模式：</div>
          <button
            className={`rapid-mode-toggle ${fastMode ? "on" : "off"}`}
            onClick={() => setFastMode(!fastMode)}
          >
            {fastMode ? "開" : "關"}
          </button>
        </div>
      </section>

      {/* 數字盤（共用元件） */}
      <NumberPad onTap={onTap} fastMode={fastMode} />

      {/* 操作列 */}
      <section className="supplement-actions">
        <button
          className="btn-num btn-36-action"
          onPointerDown={(e) => {
            e.preventDefault();
            handleNumButtonDown(36);
          }}
          onPointerUp={() => handleNumButtonUp(36)}
          onPointerLeave={() => handleNumButtonUp(36)}
          onPointerCancel={() => handleNumButtonUp(36)}
        >
          36
        </button>
        <button 
          className="btn action secondary" 
          onClick={undoLastSpin}
          disabled={batchCount === 0} // 如果沒有補記記錄，禁用復原按鈕
        >
          ← 復原
        </button>
        <div className="rapid-mode-status">
          快速連點：<span className={fastMode ? "status-on" : "status-off"}>{fastMode ? "開" : "關"}</span>
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect } from "react";
import { addReplaySpin, getNextSpinIndex } from "../core/engine";
import { db } from "../core/engine";
import NumberPad from "../components/NumberPad";

const LS_BATCH_ID = "langlive_roulette_batch_id_v1";

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

  const [batchCount, setBatchCount] = useState(0);
  const [spinsUpdated, setSpinsUpdated] = useState(0); // 用於觸發重新計算
  const [nextSpinIndex, setNextSpinIndex] = useState(1); // 下一期數

  // 保存 Batch ID
  useEffect(() => {
    localStorage.setItem(LS_BATCH_ID, batchId);
  }, [batchId]);

  // 計算本段已補期數和下一期數
  useEffect(() => {
    const updateCount = async () => {
      if (!batchId) {
        setBatchCount(0);
        return;
      }
      try {
        const count = await db.spins.getReplayCountByBatchId(batchId);
        setBatchCount(count);
        
        // 更新下一期數
        const nextIndex = await getNextSpinIndex();
        setNextSpinIndex(nextIndex);
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

  const onTap = async (n: number) => {
    await addReplaySpin(n, batchId, false);
    // 顯示震動反饋
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    // 觸發重新計算
    setSpinsUpdated(prev => prev + 1);
    
    // 更新下一期數
    const nextIndex = await getNextSpinIndex();
    setNextSpinIndex(nextIndex);
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
          <div className="supplement-label">下一期數：</div>
          <div className="supplement-value">第 {nextSpinIndex} 期</div>
        </div>
      </section>

      {/* 0 號按鈕（獨立顯示在數字盤上方） */}
      <section className="supplement-zero-section">
        <button
          className="btn-0-supplement"
          onClick={() => onTap(0)}
        >
          0
        </button>
      </section>

      {/* 數字盤（固定 6 欄，1-36） */}
      <NumberPad onTap={onTap} fastMode={false} />

      {/* 操作列（只有復原按鈕） */}
      <section className="supplement-actions">
        <button 
          className="btn-action-undo" 
          onClick={undoLastSpin}
          disabled={batchCount === 0}
        >
          ← 復原
        </button>
      </section>
    </div>
  );
}

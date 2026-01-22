import type { Spin } from "./types";
import { addSpin, getAllSpins, deleteSpin, getLastReplaySpin, getReplayCountByBatchId } from "./db";

// 資料庫介面（使用 IndexedDB）
export const db = {
  spins: {
    async add(spin: Spin): Promise<void> {
      await addSpin(spin);
    },
    async getAll(): Promise<Spin[]> {
      return await getAllSpins();
    },
    async delete(id: string): Promise<void> {
      await deleteSpin(id);
    },
    async getLastReplay(): Promise<Spin | null> {
      return await getLastReplaySpin();
    },
    async getReplayCountByBatchId(batchId: string): Promise<number> {
      return await getReplayCountByBatchId(batchId);
    },
  },
};

// TODO: 實現推薦系統
async function backfillLastRecommendation(spin: Spin): Promise<void> {
  // 補記時，需要更新最後一個推薦的狀態
  // 這個功能後續實現
  console.log("backfillLastRecommendation:", spin);
}

async function generateNextRecommendations(spin: Spin): Promise<void> {
  // 根據新的 spin 生成下一個推薦
  // 這個功能後續實現
  console.log("generateNextRecommendations:", spin);
}

// TODO: 實現訂閱通知系統
function notifySubscribers(): void {
  // 通知所有訂閱者資料已更新
  // 可以使用 EventTarget 或自定義事件系統
  window.dispatchEvent(new CustomEvent("spins-updated"));
}

export async function addReplaySpin(
  n: number,
  batchId: string,
  _fastMode: boolean = false
): Promise<Spin> {
  const spin: Spin = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    n,
    color: n === 0 ? "green" : n % 2 ? "red" : "black",
    parity: n === 0 ? "-" : n % 2 ? "odd" : "even",
    size:
      n === 0 ? "-" :
      n <= 12 ? "small" :
      n <= 24 ? "mid" : "large",
    source: "replay",
    batchId
  };

  await db.spins.add(spin);

  // ✅ 補記必須照樣回填推薦命中、生成下一把推薦（無論 fastMode）
  // 但在快速連點模式下，不顯示 toast 和動畫
  await backfillLastRecommendation(spin);
  await generateNextRecommendations(spin);
  
  // 快速連點模式：不顯示 toast，但仍需通知訂閱者
  notifySubscribers();

  return spin;
}

// db 已在上面定義並導出

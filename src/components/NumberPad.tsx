import { useRef, useEffect } from "react";

interface NumberPadProps {
  onTap: (n: number) => void;
  fastMode?: boolean;
}

export default function NumberPad({ onTap, fastMode = false }: NumberPadProps) {
  const holdTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const holdDelays = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

  // 清理所有定時器（組件卸載時）
  useEffect(() => {
    return () => {
      holdTimers.current.forEach((timer) => clearInterval(timer));
      holdTimers.current.clear();
      holdDelays.current.forEach((timer) => clearTimeout(timer));
      holdDelays.current.clear();
    };
  }, []);

  // 1–36 排列：6x6
  const grid = Array.from({ length: 36 }, (_, i) => i + 1);

  return (
    <div className={fastMode ? "fast-mode" : ""}>
      {/* 0 按鈕：綠色、大顆 */}
      <section className="pad">
        <div className="pad-zero">
          <button
            className="btn-0-large"
            onClick={() => onTap(0)}
          >
            0
          </button>
        </div>
      </section>

      {/* 1–36：6x6 網格 */}
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
    </div>
  );
}

export type SpinSource = "live" | "replay";

export interface Spin {
  id: string;
  ts: number;
  n: number;          // 0-36
  color: "red" | "black" | "green";
  parity: "odd" | "even" | "-";
  size: "small" | "mid" | "large" | "-";
  source: SpinSource; // replay = 補記
  batchId?: string;   // 補記段落
}

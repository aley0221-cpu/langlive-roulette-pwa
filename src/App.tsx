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

/**
 * 獲取號碼的顏色類型（用於轉移矩陣）
 */
function getColorType(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return n % 2 === 1 ? "red" : "black";
}

function sizeTag(n: number): string {
  if (n === 0) return "—";
  if (n <= 12) return "小";
  if (n <= 24) return "中";
  return "大";
}

type SizeType = "small" | "mid" | "large" | "zero";

function getSizeType(n: number): SizeType {
  if (n === 0) return "zero";
  if (n <= 12) return "small";
  if (n <= 24) return "mid";
  return "large";
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
 * 建立馬可夫鏈轉移矩陣
 * 統計當號碼 A 出現後，下一個數字是 B 的次數
 * 只統計最近 240 期（滑動窗口）
 */
type TransitionMatrix = Map<number, Map<number, number>>;

function buildTransitionMatrix(records: number[]): TransitionMatrix {
  const matrix: TransitionMatrix = new Map();
  
  // 只使用最近 240 期（滑動窗口）
  const recent240 = records.slice(0, 240);
  
  // 初始化所有號碼（0-36）的轉移矩陣
  for (let i = 0; i <= 36; i++) {
    matrix.set(i, new Map<number, number>());
  }
  
  // 遍歷歷史記錄，建立轉移關係（從後往前，因為 records[0] 是最新的）
  for (let i = recent240.length - 1; i > 0; i--) {
    const currentNum = recent240[i];      // 當前號碼
    const nextNum = recent240[i - 1];     // 下一期號碼（時間上更早，但陣列中更前面）
    
    const transitions = matrix.get(currentNum);
    if (transitions) {
      const count = transitions.get(nextNum) || 0;
      transitions.set(nextNum, count + 1);
    }
  }
  
  return matrix;
}

/**
 * 計算轉移機率（將次數轉換為百分比）
 */
function calculateTransitionProbabilities(matrix: TransitionMatrix): Map<number, Map<number, number>> {
  const probabilities: Map<number, Map<number, number>> = new Map();
  
  for (const [fromNum, transitions] of matrix.entries()) {
    const probMap = new Map<number, number>();
    
    // 計算總次數
    let total = 0;
    for (const count of transitions.values()) {
      total += count;
    }
    
    // 轉換為機率（百分比）
    if (total > 0) {
      for (const [toNum, count] of transitions.entries()) {
        probMap.set(toNum, (count / total) * 100);
      }
    }
    
    probabilities.set(fromNum, probMap);
  }
  
  return probabilities;
}

/**
 * 計算全局出現頻率（過去 240 期，滑動窗口）
 */
function calculateGlobalFrequencies(records: number[]): Map<number, number> {
  const frequencies = new Map<number, number>();
  const last240 = records.slice(0, 240);
  
  // 初始化所有號碼
  for (let i = 0; i <= 36; i++) {
    frequencies.set(i, 0);
  }
  
  // 統計出現次數
  for (const num of last240) {
    frequencies.set(num, (frequencies.get(num) || 0) + 1);
  }
  
  // 轉換為百分比
  const total = last240.length || 1;
  for (const [num, count] of frequencies.entries()) {
    frequencies.set(num, (count / total) * 100);
  }
  
  return frequencies;
}

/**
 * 預測下期號碼（使用預測得分公式）
 * 預測得分 = (全局出現頻率 * 40%) + (馬可夫鏈轉移機率 * 60%)
 */
function predictNextNumbers(
  lastNumber: number,
  transitionProbs: Map<number, Map<number, number>>,
  globalFreqs: Map<number, number>,
  topN: number = 3
): Array<{ num: number; score: number; markovProb: number; globalFreq: number }> {
  const predictions: Array<{ num: number; score: number; markovProb: number; globalFreq: number }> = [];
  
  // 獲取當前號碼的轉移機率
  const transitions = transitionProbs.get(lastNumber) || new Map();
  
  // 計算所有號碼的預測得分
  for (let i = 0; i <= 36; i++) {
    const markovProb = transitions.get(i) || 0;  // 馬可夫鏈轉移機率（百分比）
    const globalFreq = globalFreqs.get(i) || 0;  // 全局出現頻率（百分比）
    
    // 預測得分公式
    const score = (globalFreq * 0.4) + (markovProb * 0.6);
    
    predictions.push({
      num: i,
      score,
      markovProb,
      globalFreq,
    });
  }
  
  // 按得分排序，返回前 topN 個
  return predictions
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.num - b.num; // 得分相同時，號碼小的在前
    })
    .slice(0, topN);
}

/**
 * 建立大小轉移矩陣（大中小）
 * 統計當大小 A 出現後，下一個大小是 B 的次數
 * 只統計最近 240 期
 */
type SizeTransitionMatrix = Map<SizeType, Map<SizeType, number>>;

function buildSizeTransitionMatrix(records: number[]): SizeTransitionMatrix {
  const matrix: SizeTransitionMatrix = new Map();
  
  // 只使用最近 240 期
  const recent240 = records.slice(0, 240);
  
  // 初始化所有大小的轉移矩陣
  const sizes: SizeType[] = ["small", "mid", "large", "zero"];
  for (const size of sizes) {
    matrix.set(size, new Map<SizeType, number>());
  }
  
  // 遍歷歷史記錄，建立大小轉移關係
  for (let i = recent240.length - 1; i > 0; i--) {
    const currentNum = recent240[i];
    const nextNum = recent240[i - 1];
    const currentSize = getSizeType(currentNum);
    const nextSize = getSizeType(nextNum);
    
    const transitions = matrix.get(currentSize);
    if (transitions) {
      const count = transitions.get(nextSize) || 0;
      transitions.set(nextSize, count + 1);
    }
  }
  
  return matrix;
}

/**
 * 計算大小轉移機率
 */
function calculateSizeTransitionProbabilities(matrix: SizeTransitionMatrix): Map<SizeType, Map<SizeType, number>> {
  const probabilities: Map<SizeType, Map<SizeType, number>> = new Map();
  
  for (const [fromSize, transitions] of matrix.entries()) {
    const probMap = new Map<SizeType, number>();
    
    // 計算總次數
    let total = 0;
    for (const count of transitions.values()) {
      total += count;
    }
    
    // 轉換為機率（百分比）
    if (total > 0) {
      for (const [toSize, count] of transitions.entries()) {
        probMap.set(toSize, (count / total) * 100);
      }
    }
    
    probabilities.set(fromSize, probMap);
  }
  
  return probabilities;
}

/**
 * 預測下一期的大小機率（基於當前號碼的大小）
 */
function predictNextSize(
  lastNumber: number,
  sizeTransitionProbs: Map<SizeType, Map<SizeType, number>>
): { small: number; mid: number; large: number; zero: number } {
  const currentSize = getSizeType(lastNumber);
  const transitions = sizeTransitionProbs.get(currentSize) || new Map();
  
  return {
    small: transitions.get("small") || 0,
    mid: transitions.get("mid") || 0,
    large: transitions.get("large") || 0,
    zero: transitions.get("zero") || 0,
  };
}

/**
 * 建立紅黑轉移矩陣
 * 統計當顏色 A 出現後，下一個顏色是 B 的次數
 * 只統計最近 240 期
 */
type ColorTransitionMatrix = Map<"red" | "black" | "green", Map<"red" | "black" | "green", number>>;

function buildColorTransitionMatrix(records: number[]): ColorTransitionMatrix {
  const matrix: ColorTransitionMatrix = new Map();
  
  // 只使用最近 240 期
  const recent240 = records.slice(0, 240);
  
  // 初始化所有顏色的轉移矩陣
  const colors: Array<"red" | "black" | "green"> = ["red", "black", "green"];
  for (const color of colors) {
    matrix.set(color, new Map<"red" | "black" | "green", number>());
  }
  
  // 遍歷歷史記錄，建立顏色轉移關係
  for (let i = recent240.length - 1; i > 0; i--) {
    const currentNum = recent240[i];
    const nextNum = recent240[i - 1];
    const currentColor = getColorType(currentNum);
    const nextColor = getColorType(nextNum);
    
    const transitions = matrix.get(currentColor);
    if (transitions) {
      const count = transitions.get(nextColor) || 0;
      transitions.set(nextColor, count + 1);
    }
  }
  
  return matrix;
}

/**
 * 計算顏色轉移機率
 */
function calculateColorTransitionProbabilities(
  matrix: ColorTransitionMatrix
): Map<"red" | "black" | "green", Map<"red" | "black" | "green", number>> {
  const probabilities: Map<"red" | "black" | "green", Map<"red" | "black" | "green", number>> = new Map();
  
  for (const [fromColor, transitions] of matrix.entries()) {
    const probMap = new Map<"red" | "black" | "green", number>();
    
    // 計算總次數
    let total = 0;
    for (const count of transitions.values()) {
      total += count;
    }
    
    // 轉換為機率（百分比）
    if (total > 0) {
      for (const [toColor, count] of transitions.entries()) {
        probMap.set(toColor, (count / total) * 100);
      }
    }
    
    probabilities.set(fromColor, probMap);
  }
  
  return probabilities;
}

/**
 * 預測下一期的顏色機率（基於當前號碼的顏色）
 */
function predictNextColor(
  lastNumber: number,
  colorTransitionProbs: Map<"red" | "black" | "green", Map<"red" | "black" | "green", number>>
): { red: number; black: number; green: number } {
  const currentColor = getColorType(lastNumber);
  const transitions = colorTransitionProbs.get(currentColor) || new Map();
  
  return {
    red: transitions.get("red") || 0,
    black: transitions.get("black") || 0,
    green: transitions.get("green") || 0,
  };
}

/**
 * 0 的特殊關聯分析
 * 逆向關聯：當「0」出現時，回頭看它前一期最常出現什麼號碼
 */
function analyzeZeroAssociations(records: number[]): {
  beforeZero: Map<number, number>;  // 0 出現前最常出現的號碼
  afterNumbers: Map<number, number>; // 哪些號碼後最容易出現 0
} {
  const beforeZero = new Map<number, number>();
  const afterNumbers = new Map<number, number>();
  
  // 遍歷記錄，找出 0 出現的位置
  for (let i = 0; i < records.length; i++) {
    if (records[i] === 0) {
      // 逆向關聯：0 出現前一期最常出現的號碼
      if (i < records.length - 1) {
        const beforeNum = records[i + 1];
        beforeZero.set(beforeNum, (beforeZero.get(beforeNum) || 0) + 1);
      }
      
      // 正向關聯：哪些號碼後最容易出現 0
      if (i > 0) {
        const afterNum = records[i - 1];
        afterNumbers.set(afterNum, (afterNumbers.get(afterNum) || 0) + 1);
      }
    }
  }
  
  return { beforeZero, afterNumbers };
}

/**
 * 計算冷熱門號碼（結合權重演算法 + 馬可夫鏈關聯）
 * 綜合得分 = (權重演算法得分 × 60%) + (馬可夫鏈轉移機率 × 40%)
 */
function calculateHotColdNumbers(
  records: number[],
  transitionProbabilities?: Map<number, Map<number, number>>
): { hot: number[]; cold: number[] } {
  const heatMap = calculateNumberHeat(records, 50);
  
  // 計算馬可夫鏈轉移機率（如果最新號碼存在）
  const markovScores = new Map<number, number>();
  if (records.length > 0 && transitionProbabilities) {
    const lastNumber = records[0]; // 最新一期的號碼
    const transitions = transitionProbabilities.get(lastNumber) || new Map();
    
    // 計算每個號碼的馬可夫鏈轉移機率（從最新號碼轉移到該號碼的機率）
    for (let i = 0; i <= 36; i++) {
      const markovProb = transitions.get(i) || 0;
      markovScores.set(i, markovProb);
    }
  }
  
  // 轉換為陣列並計算綜合得分（排除 0，因為 0 有專門統計）
  const numbers: Array<{ num: number; heat: number; markovScore: number; combinedScore: number }> = [];
  for (let i = 1; i <= 36; i++) {
    const heat = heatMap.get(i) || 0;
    const markovScore = markovScores.get(i) || 0;
    
    // 綜合得分 = (權重演算法得分 × 60%) + (馬可夫鏈轉移機率 × 40%)
    // 將權重值標準化到 0-100 範圍（假設最大權重約為 0.7，即最近 10 期都出現）
    const normalizedHeat = (heat / 0.7) * 100; // 標準化到 0-100
    const combinedScore = (normalizedHeat * 0.6) + (markovScore * 0.4);
    
    numbers.push({ 
      num: i, 
      heat, 
      markovScore,
      combinedScore 
    });
  }
  
  // 熱門號：綜合得分最高的 4 個
  const hot = numbers
    .sort((a, b) => {
      if (a.combinedScore !== b.combinedScore) return b.combinedScore - a.combinedScore;
      // 如果綜合得分相同，優先考慮權重演算法得分
      if (a.heat !== b.heat) return b.heat - a.heat;
      return a.num - b.num;
    })
    .slice(0, 4)
    .map(x => x.num);
  
  // 冷門號：綜合得分最低的 4 個（但至少出現過一次或馬可夫鏈有數據）
  const cold = numbers
    .filter(x => x.heat > 0 || x.markovScore > 0) // 至少出現過一次或馬可夫鏈有數據
    .sort((a, b) => {
      if (a.combinedScore !== b.combinedScore) return a.combinedScore - b.combinedScore;
      // 如果綜合得分相同，優先考慮權重演算法得分（較低）
      if (a.heat !== b.heat) return a.heat - b.heat;
      return a.num - b.num;
    })
    .slice(0, 4)
    .map(x => x.num);
  
  // 如果冷門號不足 4 個，用綜合得分為 0 的號碼補齊
  if (cold.length < 4) {
    const zeroScoreNumbers = numbers
      .filter(x => x.combinedScore === 0)
      .sort((a, b) => a.num - b.num)
      .slice(0, 4 - cold.length)
      .map(x => x.num);
    cold.push(...zeroScoreNumbers);
  }
  
  return { hot, cold };
}

/**
 * 分析最近 15 筆數據的重複情況
 * @param records 完整的記錄數組（最新的在前面）
 * @param transitionProbabilities 馬可夫鏈轉移機率（可選）
 * @returns 重複號碼列表和僅出現一次且最可能在近期重複的候選名單（帶權重/信心值）
 */
function checkRepeats(
  records: number[],
  transitionProbabilities?: Map<number, Map<number, number>>
): {
  repeated: Array<{ num: number; count: number; positions: number[] }>;
  singleOccurrence: Array<{ num: number; lastPosition: number; confidence: number }>;
} {
  // 取最近 15 筆數據
  const recent15 = records.slice(0, 15);
  
  // 統計每個號碼的出現次數和位置
  const numberStats = new Map<
    number,
    { count: number; positions: number[] }
  >();
  
  for (let i = 0; i < recent15.length; i++) {
    const num = recent15[i];
    if (!numberStats.has(num)) {
      numberStats.set(num, { count: 0, positions: [] });
    }
    const stats = numberStats.get(num)!;
    stats.count++;
    stats.positions.push(i); // i 是位置索引（0 = 最新，14 = 最舊）
  }
  
  // 找出重複的號碼（出現 2 次或以上）
  const repeated: Array<{ num: number; count: number; positions: number[] }> = [];
  for (const [num, stats] of numberStats.entries()) {
    if (stats.count >= 2) {
      repeated.push({
        num,
        count: stats.count,
        positions: stats.positions,
      });
    }
  }
  
  // 按出現次數降序排序，次數相同時按最新位置排序
  repeated.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    // 次數相同時，比較最新出現的位置（位置越小 = 越新）
    const aLatest = Math.min(...a.positions);
    const bLatest = Math.min(...b.positions);
    return aLatest - bLatest;
  });
  
  // 找出僅出現一次的號碼（最可能在近期重複的候選）
  const singleOccurrence: Array<{ num: number; lastPosition: number; confidence: number }> = [];
  
  // 獲取最新一期的號碼（用於計算馬可夫鏈關聯）
  const lastNumber = records.length > 0 ? records[0] : null;
  
  for (const [num, stats] of numberStats.entries()) {
    if (stats.count === 1) {
      const lastPosition = stats.positions[0]; // 只出現一次，所以只有一個位置
      
      // 計算信心值（權重）
      let confidence = 0;
      
      // 基礎信心值：位置越新（越小），信心值越高
      // 位置 0（最新）= 100，位置 14（最舊）= 0
      const positionScore = ((15 - lastPosition) / 15) * 50; // 最高 50 分
      confidence += positionScore;
      
      // 馬可夫鏈關聯加分：如果這個號碼是上期號碼的強關聯，大幅提升信心值
      if (lastNumber !== null && transitionProbabilities) {
        const transitions = transitionProbabilities.get(lastNumber) || new Map();
        const markovProb = transitions.get(num) || 0;
        
        // 如果馬可夫鏈轉移機率 >= 5%，認為是強關聯，給予額外 50 分
        // 如果 >= 10%，給予額外 100 分（最高）
        if (markovProb >= 10) {
          confidence += 100; // 最高權重
        } else if (markovProb >= 5) {
          confidence += 50; // 中等權重
        } else if (markovProb > 0) {
          confidence += markovProb * 2; // 按機率比例加分
        }
      }
      
      singleOccurrence.push({
        num,
        lastPosition,
        confidence, // 信心值（權重）
      });
    }
  }
  
  // 按信心值降序排序（信心值越高 = 越可能在近期重複）
  // 如果信心值相同，按位置排序（位置越小 = 越新）
  singleOccurrence.sort((a, b) => {
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    return a.lastPosition - b.lastPosition;
  });
  
  return { repeated, singleOccurrence };
}

/**
 * 區間遺漏監控：計算大、中、小、0 各自連續多少期沒有出現
 */
function calculateSizeOmissions(records: number[]): {
  small: number;
  mid: number;
  large: number;
  zero: number;
} {
  let smallOmit = 0;
  let midOmit = 0;
  let largeOmit = 0;
  let zeroOmit = 0;
  
  for (let i = 0; i < records.length; i++) {
    const num = records[i];
    const size = getSizeType(num);
    
    if (size === "small") {
      smallOmit = 0;
      midOmit++;
      largeOmit++;
      zeroOmit++;
    } else if (size === "mid") {
      smallOmit++;
      midOmit = 0;
      largeOmit++;
      zeroOmit++;
    } else if (size === "large") {
      smallOmit++;
      midOmit++;
      largeOmit = 0;
      zeroOmit++;
    } else if (size === "zero") {
      smallOmit++;
      midOmit++;
      largeOmit++;
      zeroOmit = 0;
    }
  }
  
  return {
    small: smallOmit,
    mid: midOmit,
    large: largeOmit,
    zero: zeroOmit,
  };
}

/**
 * 計算區間分佈（用於防禦性 0 預警）
 */
function calculateSizeDistribution(records: number[], windowSize: number): {
  small: number;
  mid: number;
  large: number;
  zero: number;
  isUnbalanced: boolean;
  dominantSize: SizeType | null;
} {
  const recent = records.slice(0, windowSize);
  let small = 0;
  let mid = 0;
  let large = 0;
  let zero = 0;
  
  for (const num of recent) {
    const size = getSizeType(num);
    if (size === "small") small++;
    else if (size === "mid") mid++;
    else if (size === "large") large++;
    else if (size === "zero") zero++;
  }
  
  const total = recent.length || 1;
  const smallPercent = (small / total) * 100;
  const midPercent = (mid / total) * 100;
  const largePercent = (large / total) * 100;
  
  // 檢查是否有區間佔比超過 60%
  const threshold = 60;
  let isUnbalanced = false;
  let dominantSize: SizeType | null = null;
  
  if (smallPercent >= threshold) {
    isUnbalanced = true;
    dominantSize = "small";
  } else if (midPercent >= threshold) {
    isUnbalanced = true;
    dominantSize = "mid";
  } else if (largePercent >= threshold) {
    isUnbalanced = true;
    dominantSize = "large";
  }
  
  return {
    small: smallPercent,
    mid: midPercent,
    large: largePercent,
    zero: (zero / total) * 100,
    isUnbalanced,
    dominantSize,
  };
}

/**
 * 動態權重演算法：計算信心值（0-100%）
 * 結合：馬可夫鏈機率、15期重複理論、當前區間熱度
 */
function calculateConfidence(
  num: number,
  records: number[],
  transitionProbabilities?: Map<number, Map<number, number>>,
  repeatAnalysis?: { repeated: Array<{ num: number; count: number; positions: number[] }>; singleOccurrence: Array<{ num: number; lastPosition: number; confidence: number }> },
  sizeOmissions?: { small: number; mid: number; large: number; zero: number },
  hotZone?: SizeType | null
): number {
  let confidence = 0;
  
  // 1. 馬可夫鏈機率（40% 權重）
  if (records.length > 0 && transitionProbabilities) {
    const lastNumber = records[0];
    const transitions = transitionProbabilities.get(lastNumber) || new Map();
    const markovProb = transitions.get(num) || 0;
    confidence += markovProb * 0.4; // 最高 40 分
  }
  
  // 2. 15期重複理論（30% 權重）
  if (repeatAnalysis) {
    // 檢查是否在重複號碼列表中
    const isRepeated = repeatAnalysis.repeated.some(item => item.num === num);
    if (isRepeated) {
      confidence += 30; // 重複號碼加分
    }
    
    // 檢查是否在單次出現候選名單中
    const singleItem = repeatAnalysis.singleOccurrence.find(item => item.num === num);
    if (singleItem) {
      // 使用候選名單的信心值（標準化到 0-30）
      confidence += Math.min(singleItem.confidence / 5, 30);
    }
  }
  
  // 3. 當前區間熱度（30% 權重）
  const numSize = getSizeType(num);
  if (sizeOmissions) {
    // 如果該區間遺漏期數多，增加該區間號碼的信心值
    let omissionBonus = 0;
    if (numSize === "small" && sizeOmissions.small >= 5) {
      omissionBonus = Math.min(sizeOmissions.small * 2, 20);
    } else if (numSize === "mid" && sizeOmissions.mid >= 5) {
      omissionBonus = Math.min(sizeOmissions.mid * 2, 20);
    } else if (numSize === "large" && sizeOmissions.large >= 5) {
      omissionBonus = Math.min(sizeOmissions.large * 2, 20);
    }
    confidence += omissionBonus;
    
    // 如果標記了熱投區，避開該區的號碼獲得額外加分
    if (hotZone && numSize !== hotZone && numSize !== "zero") {
      confidence += 10; // 避開熱投區加分
    }
  }
  
  return Math.min(confidence, 100); // 限制在 0-100%
}

/**
 * 根據熱投區和信心值，給出建議號碼（避開熱投區）
 */
function getRecommendedNumbers(
  records: number[],
  transitionProbabilities?: Map<number, Map<number, number>>,
  repeatAnalysis?: { repeated: Array<{ num: number; count: number; positions: number[] }>; singleOccurrence: Array<{ num: number; lastPosition: number; confidence: number }> },
  sizeOmissions?: { small: number; mid: number; large: number; zero: number },
  hotZone?: SizeType | null,
  count: number = 5
): Array<{ num: number; confidence: number; reason: string }> {
  const recommendations: Array<{ num: number; confidence: number; reason: string }> = [];
  
  // 計算所有號碼的信心值
  for (let i = 1; i <= 36; i++) {
    const numSize = getSizeType(i);
    
    // 如果標記了熱投區，優先選擇避開該區的號碼
    if (hotZone && numSize === hotZone) {
      continue; // 跳過熱投區的號碼
    }
    
    const confidence = calculateConfidence(
      i,
      records,
      transitionProbabilities,
      repeatAnalysis,
      sizeOmissions,
      hotZone
    );
    
    let reason = "";
    if (hotZone && numSize !== hotZone) {
      reason = `避開${hotZone === "small" ? "小" : hotZone === "mid" ? "中" : "大"}區`;
    } else if (sizeOmissions) {
      if (numSize === "small" && sizeOmissions.small >= 5) {
        reason = `小區遺漏${sizeOmissions.small}期`;
      } else if (numSize === "mid" && sizeOmissions.mid >= 5) {
        reason = `中區遺漏${sizeOmissions.mid}期`;
      } else if (numSize === "large" && sizeOmissions.large >= 5) {
        reason = `大區遺漏${sizeOmissions.large}期`;
      }
    }
    
    recommendations.push({ num: i, confidence, reason });
  }
  
  // 按信心值降序排序，取前 count 個
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, count);
}

export default function App() {
  const numbers1to36 = useMemo(() => Array.from({ length: 36 }, (_, i) => i + 1), []);
  const [records, setRecords] = useState<number[]>([]);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [zeroAlertThreshold, setZeroAlertThreshold] = useState<number>(120); // 自定義門檻，預設 120 期
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null); // 選中的號碼（用於顯示接續關聯表）
  const [fastWindowMode, setFastWindowMode] = useState<boolean>(false); // 快窗模式：false = 穩健模式（30期），true = 靈敏模式（8期）
  const [hotZone, setHotZone] = useState<SizeType | null>(null); // 標記的熱投區（大/中/小）

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
    
    // 計算平均間隔（所有歷史數據）
    let avgGap: number | null = null;
    if (zeroIndices.length >= 2) {
      let sum = 0;
      for (let i = 0; i < zeroIndices.length - 1; i++) {
        sum += zeroIndices[i + 1] - zeroIndices[i];
      }
      avgGap = sum / (zeroIndices.length - 1);
    }
    
    // 期望值計算：基於過去 120 期的實際數據
    // 如果過去 120 期有足夠的 0 出現，使用實際平均間隔
    // 否則使用理論期望值（37 期，因為輪盤有 37 個號碼）
    const last120 = records.slice(0, 120);
    const zeroIndices120: number[] = [];
    for (let i = 0; i < last120.length; i++) {
      if (last120[i] === 0) zeroIndices120.push(i);
    }
    
    let expectedGap: number;
    if (zeroIndices120.length >= 2) {
      // 計算過去 120 期的平均間隔
      let sum = 0;
      for (let i = 0; i < zeroIndices120.length - 1; i++) {
        sum += zeroIndices120[i + 1] - zeroIndices120[i];
      }
      expectedGap = Math.round(sum / (zeroIndices120.length - 1));
    } else {
      // 數據不足時，使用理論期望值：37 期出現一次 0（輪盤有 37 個號碼）
      expectedGap = 37;
    }
    
    return {
      miss,
      avgGap: avgGap === null ? null : Math.round(avgGap),
      zeroCount: zeroIndices.length,
      expectedGap,
      zeroCount120: zeroIndices120.length, // 過去 120 期的 0 出現次數
    };
  }, [records]);

  // 0 的遺漏警報：當連續沒出 0 超過期望值或自定義門檻時，背景變色
  const zeroAlertActive = useMemo(() => {
    const threshold = Math.max(zeroStats.expectedGap, zeroAlertThreshold);
    return zeroStats.miss >= threshold;
  }, [zeroStats.miss, zeroStats.expectedGap, zeroAlertThreshold]);

  // 建立馬可夫鏈轉移矩陣
  const transitionMatrix = useMemo(() => {
    return buildTransitionMatrix(records);
  }, [records]);

  // 計算轉移機率
  const transitionProbabilities = useMemo(() => {
    return calculateTransitionProbabilities(transitionMatrix);
  }, [transitionMatrix]);

  // 計算冷熱門號碼（結合權重演算法 + 馬可夫鏈關聯）
  const hotCold = useMemo(() => {
    return calculateHotColdNumbers(records, transitionProbabilities);
  }, [records, transitionProbabilities]);

  // 建立大小轉移矩陣（最近 240 期）
  const sizeTransitionMatrix = useMemo(() => {
    return buildSizeTransitionMatrix(records);
  }, [records]);

  // 計算大小轉移機率
  const sizeTransitionProbabilities = useMemo(() => {
    return calculateSizeTransitionProbabilities(sizeTransitionMatrix);
  }, [sizeTransitionMatrix]);

  // 建立紅黑轉移矩陣（最近 240 期）
  const colorTransitionMatrix = useMemo(() => {
    return buildColorTransitionMatrix(records);
  }, [records]);

  // 計算紅黑轉移機率
  const colorTransitionProbabilities = useMemo(() => {
    return calculateColorTransitionProbabilities(colorTransitionMatrix);
  }, [colorTransitionMatrix]);

  // 計算全局出現頻率
  const globalFrequencies = useMemo(() => {
    return calculateGlobalFrequencies(records);
  }, [records]);

  // 預測下期號碼（根據最新號碼）
  const predictions = useMemo(() => {
    if (records.length === 0) return [];
    const lastNumber = records[0]; // 最新一期的號碼
    return predictNextNumbers(lastNumber, transitionProbabilities, globalFrequencies, 3);
  }, [records, transitionProbabilities, globalFrequencies]);

  // 預測下一期的大小機率（根據最新號碼）
  const sizePrediction = useMemo(() => {
    if (records.length === 0) return null;
    const lastNumber = records[0];
    return predictNextSize(lastNumber, sizeTransitionProbabilities);
  }, [records, sizeTransitionProbabilities]);

  // 預測下一期的紅黑機率（根據最新號碼）
  const colorPrediction = useMemo(() => {
    if (records.length === 0) return null;
    const lastNumber = records[0];
    return predictNextColor(lastNumber, colorTransitionProbabilities);
  }, [records, colorTransitionProbabilities]);

  // 0 的特殊關聯分析
  const zeroAssociations = useMemo(() => {
    return analyzeZeroAssociations(records);
  }, [records]);

  // 重複分析：分析最近 15 筆數據的重複情況（結合馬可夫鏈關聯）
  const repeatAnalysis = useMemo(() => {
    return checkRepeats(records, transitionProbabilities);
  }, [records, transitionProbabilities]);

  // 區間遺漏監控
  const sizeOmissions = useMemo(() => {
    return calculateSizeOmissions(records);
  }, [records]);

  // 快窗模式：穩健模式（30期）vs 靈敏模式（8期）
  const windowSize = fastWindowMode ? 8 : 30;

  // 計算區間分佈（用於防禦性 0 預警）
  const sizeDistribution = useMemo(() => {
    return calculateSizeDistribution(records, windowSize);
  }, [records, windowSize]);

  // 防禦性 0 預警：當分佈極度不均時，調高 0 的預期機率
  const defensiveZeroAlert = useMemo(() => {
    if (sizeDistribution.isUnbalanced && sizeDistribution.dominantSize) {
      return {
        active: true,
        dominantSize: sizeDistribution.dominantSize,
        zeroBoost: 15, // 額外增加 15% 的 0 機率
      };
    }
    return { active: false, dominantSize: null, zeroBoost: 0 };
  }, [sizeDistribution]);

  // 根據熱投區和信心值，給出建議號碼
  const recommendedNumbers = useMemo(() => {
    return getRecommendedNumbers(
      records,
      transitionProbabilities,
      repeatAnalysis,
      sizeOmissions,
      hotZone,
      5
    );
  }, [records, transitionProbabilities, repeatAnalysis, sizeOmissions, hotZone]);

  // 0 號預警：檢查當前號碼是否與 0 有強烈關聯
  const zeroWarning = useMemo(() => {
    if (records.length === 0) return null;
    const lastNumber = records[0];
    const zeroProb = transitionProbabilities.get(lastNumber)?.get(0) || 0;
    // 如果轉移機率超過 10%，顯示預警
    return zeroProb >= 10 ? { number: lastNumber, probability: zeroProb } : null;
  }, [records, transitionProbabilities]);

  // 選中號碼的接續關聯表（下一把出現機率最高的 5 個號碼）
  const nextNumbersForSelected = useMemo(() => {
    if (selectedNumber === null) return [];
    const transitions = transitionProbabilities.get(selectedNumber) || new Map();
    const globalFreqs = globalFrequencies;
    
    const predictions: Array<{ num: number; score: number; markovProb: number; globalFreq: number }> = [];
    
    for (let i = 0; i <= 36; i++) {
      const markovProb = transitions.get(i) || 0;
      const globalFreq = globalFreqs.get(i) || 0;
      const score = (globalFreq * 0.4) + (markovProb * 0.6);
      
      predictions.push({ num: i, score, markovProb, globalFreq });
    }
    
    return predictions
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.num - b.num;
      })
      .slice(0, 5);
  }, [selectedNumber, transitionProbabilities, globalFrequencies]);

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
                  const isSelected = selectedNumber === n;
                  return (
                    <div
                      key={`${n}-${idx}`}
                      className={`ball ${c} ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedNumber(isSelected ? null : n)}
                      style={{ cursor: "pointer" }}
                    >
                      {n}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 馬可夫鏈預測：下期最可能的 3 個號碼 */}
          {predictions.length > 0 && (
            <div className="prediction-panel">
              <div className="prediction-title">下期預測（馬可夫鏈）</div>
              <div className="prediction-numbers">
                {predictions.map((pred, idx) => (
                  <div key={pred.num} className="prediction-item">
                    <div className="prediction-rank">#{idx + 1}</div>
                    <div className={`prediction-number ${numberColor(pred.num)}`}>{pred.num}</div>
                    <div className="prediction-score">
                      <div className="score-label">得分</div>
                      <div className="score-value">{pred.score.toFixed(2)}</div>
                    </div>
                    <div className="prediction-details">
                      <div className="detail-item">轉移: {pred.markovProb.toFixed(1)}%</div>
                      <div className="detail-item">頻率: {pred.globalFreq.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 單次出現候選名單（整合到預測面板） */}
              {repeatAnalysis.singleOccurrence.length > 0 && (
                <div className="single-occurrence-section">
                  <div className="section-subtitle">近期可能重複（僅出現一次，按信心值排序）</div>
                  <div className="candidate-numbers">
                    {repeatAnalysis.singleOccurrence.slice(0, 6).map((item) => {
                      // 根據信心值決定是否高亮顯示（信心值 >= 100 表示強關聯）
                      const isHighConfidence = item.confidence >= 100;
                      return (
                        <div 
                          key={item.num} 
                          className={`candidate-item ${isHighConfidence ? "high-confidence" : ""}`}
                        >
                          <div className={`candidate-number ${numberColor(item.num)}`}>{item.num}</div>
                          <div className="candidate-position">第 {item.lastPosition + 1} 期</div>
                          <div className="candidate-confidence">
                            信心值: {item.confidence.toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 紅黑預測：下一期紅黑的機率比例 */}
          {colorPrediction && records.length > 0 && (
            <div className="color-prediction-panel">
              <div className="prediction-title">
                紅黑預測（馬可夫鏈，240期）
                <span className="current-color-label">
                  當前：{numberColor(records[0]) === "red" ? "紅" : numberColor(records[0]) === "black" ? "黑" : "綠"}
                </span>
              </div>
              <div className="color-prediction-bars">
                <div className="color-bar-item">
                  <div className="color-bar-label">紅</div>
                  <div className="color-bar-container">
                    <div 
                      className="color-bar red" 
                      style={{ width: `${colorPrediction.red}%` }}
                    >
                      <span className="color-bar-value">{colorPrediction.red.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="color-bar-item">
                  <div className="color-bar-label">黑</div>
                  <div className="color-bar-container">
                    <div 
                      className="color-bar black" 
                      style={{ width: `${colorPrediction.black}%` }}
                    >
                      <span className="color-bar-value">{colorPrediction.black.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                {colorPrediction.green > 0 && (
                  <div className="color-bar-item">
                    <div className="color-bar-label">綠(0)</div>
                    <div className="color-bar-container">
                      <div 
                        className="color-bar green" 
                        style={{ width: `${colorPrediction.green}%` }}
                      >
                        <span className="color-bar-value">{colorPrediction.green.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 區間遺漏監控和快窗模式 */}
          {records.length > 0 && (
            <div className="omission-tracking-panel">
              <div className="prediction-title">
                區間遺漏監控
                <button
                  className={`window-mode-toggle ${fastWindowMode ? "fast" : "stable"}`}
                  onClick={() => setFastWindowMode(!fastWindowMode)}
                  title={fastWindowMode ? "切換到穩健模式（30期）" : "切換到靈敏模式（8期）"}
                >
                  {fastWindowMode ? "靈敏模式（8期）" : "穩健模式（30期）"}
                </button>
              </div>
              
              <div className="omission-stats">
                <div className={`omission-item ${sizeOmissions.small > 8 ? "alert" : ""}`}>
                  <span className="omission-label">小區：</span>
                  <span className="omission-count">{sizeOmissions.small} 期未出</span>
                  {sizeOmissions.small > 8 && <span className="alert-badge">⚠️ 失控</span>}
                </div>
                <div className={`omission-item ${sizeOmissions.mid > 8 ? "alert" : ""}`}>
                  <span className="omission-label">中區：</span>
                  <span className="omission-count">{sizeOmissions.mid} 期未出</span>
                  {sizeOmissions.mid > 8 && <span className="alert-badge">⚠️ 失控</span>}
                </div>
                <div className={`omission-item ${sizeOmissions.large > 8 ? "alert" : ""}`}>
                  <span className="omission-label">大區：</span>
                  <span className="omission-count">{sizeOmissions.large} 期未出</span>
                  {sizeOmissions.large > 8 && <span className="alert-badge">⚠️ 失控</span>}
                </div>
                <div className={`omission-item ${sizeOmissions.zero > 8 ? "alert" : ""}`}>
                  <span className="omission-label">0：</span>
                  <span className="omission-count">{sizeOmissions.zero} 期未出</span>
                  {sizeOmissions.zero > 8 && <span className="alert-badge">⚠️ 失控</span>}
                </div>
              </div>

              {/* 防禦性 0 預警 */}
              {defensiveZeroAlert.active && (
                <div className="defensive-zero-alert">
                  <div className="warning-icon">🛡️</div>
                  <div className="warning-text">
                    <strong>{defensiveZeroAlert.dominantSize === "small" ? "小" : defensiveZeroAlert.dominantSize === "mid" ? "中" : "大"}</strong>
                    區佔比超過 60%，建議提高 <strong>0</strong> 的預期機率 +{defensiveZeroAlert.zeroBoost}%
                  </div>
                </div>
              )}

              {/* 熱投區標記按鈕 */}
              <div className="hot-zone-buttons">
                <div className="hot-zone-label">標記熱投區：</div>
                <button
                  className={`hot-zone-btn ${hotZone === "small" ? "active" : ""}`}
                  onClick={() => setHotZone(hotZone === "small" ? null : "small")}
                >
                  小 (1-12)
                </button>
                <button
                  className={`hot-zone-btn ${hotZone === "mid" ? "active" : ""}`}
                  onClick={() => setHotZone(hotZone === "mid" ? null : "mid")}
                >
                  中 (13-24)
                </button>
                <button
                  className={`hot-zone-btn ${hotZone === "large" ? "active" : ""}`}
                  onClick={() => setHotZone(hotZone === "large" ? null : "large")}
                >
                  大 (25-36)
                </button>
                {hotZone && (
                  <button
                    className="hot-zone-btn clear"
                    onClick={() => setHotZone(null)}
                  >
                    清除
                  </button>
                )}
              </div>

              {/* 建議號碼（避開熱投區） */}
              {hotZone && recommendedNumbers.length > 0 && (
                <div className="recommended-numbers">
                  <div className="section-subtitle">建議號碼（避開{hotZone === "small" ? "小" : hotZone === "mid" ? "中" : "大"}區）</div>
                  <div className="recommended-list">
                    {recommendedNumbers.map((item) => (
                      <div key={item.num} className="recommended-item">
                        <div className={`recommended-number ${numberColor(item.num)}`}>{item.num}</div>
                        <div className="recommended-confidence">信心值: {item.confidence.toFixed(1)}%</div>
                        {item.reason && <div className="recommended-reason">{item.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 大小預測：下一期大中小的機率比例 */}
          {sizePrediction && records.length > 0 && (
            <div className="size-prediction-panel">
              <div className="prediction-title">
                大小預測（馬可夫鏈，240期）
                {defensiveZeroAlert.active && (
                  <span className="zero-boost-indicator">
                    +{defensiveZeroAlert.zeroBoost}% 0 機率
                  </span>
                )}
                <span className="current-size-label">
                  當前：{sizeTag(records[0])}
                </span>
              </div>
              <div className="size-prediction-bars">
                <div className="size-bar-item">
                  <div className="size-bar-label">小 (1-12)</div>
                  <div className="size-bar-container">
                    <div 
                      className="size-bar small" 
                      style={{ width: `${sizePrediction.small}%` }}
                    >
                      <span className="size-bar-value">{sizePrediction.small.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="size-bar-item">
                  <div className="size-bar-label">中 (13-24)</div>
                  <div className="size-bar-container">
                    <div 
                      className="size-bar mid" 
                      style={{ width: `${sizePrediction.mid}%` }}
                    >
                      <span className="size-bar-value">{sizePrediction.mid.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="size-bar-item">
                  <div className="size-bar-label">大 (25-36)</div>
                  <div className="size-bar-container">
                    <div 
                      className="size-bar large" 
                      style={{ width: `${sizePrediction.large}%` }}
                    >
                      <span className="size-bar-value">{sizePrediction.large.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                {sizePrediction.zero > 0 && (
                  <div className="size-bar-item">
                    <div className="size-bar-label">0</div>
                    <div className="size-bar-container">
                      <div 
                        className="size-bar zero" 
                        style={{ width: `${Math.min(sizePrediction.zero + defensiveZeroAlert.zeroBoost, 100)}%` }}
                      >
                        <span className="size-bar-value">
                          {sizePrediction.zero.toFixed(1)}%
                          {defensiveZeroAlert.active && ` (+${defensiveZeroAlert.zeroBoost}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 0 號預警 */}
          {zeroWarning && (
            <div className="zero-warning-panel">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                0 號預警：當前號碼 <strong>{zeroWarning.number}</strong> 後出現 0 的機率為 <strong>{zeroWarning.probability.toFixed(1)}%</strong>
              </div>
            </div>
          )}

          {/* 重複分析面板 */}
          {records.length >= 2 && (
            <div className="repeat-analysis-panel">
              <div className="prediction-title">重複分析（最近 15 期）</div>
              
              {/* 重複號碼列表 */}
              {repeatAnalysis.repeated.length > 0 && (
                <div className="repeat-section">
                  <div className="section-subtitle">已重複號碼</div>
                  <div className="repeat-numbers">
                    {repeatAnalysis.repeated.map((item) => (
                      <div key={item.num} className="repeat-item">
                        <div className={`repeat-number ${numberColor(item.num)}`}>{item.num}</div>
                        <div className="repeat-count">出現 {item.count} 次</div>
                        <div className="repeat-positions">
                          位置: {item.positions.map(p => `#${p + 1}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 如果沒有重複號碼，顯示提示 */}
              {repeatAnalysis.repeated.length === 0 && (
                <div className="no-repeat-message">
                  <div className="muted">最近 15 期沒有重複號碼</div>
                </div>
              )}
            </div>
          )}

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
                    recentDisplay.map((n, idx) => {
                      const isSelected = selectedNumber === n;
                      return (
                        <div
                          key={`${n}-${idx}`}
                          className={`recentRow compact ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedNumber(isSelected ? null : n)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className={`dot small ${numberColor(n)}`} />
                          <div className="recentNum small">{n}</div>
                          <div className="recentMeta compact">
                            <span className="pill small">{oddEvenTag(n)}</span>
                            <span className="pill small">{sizeTag(n)}</span>
                          </div>
                        </div>
                      );
                    })
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
                    <span className="muted">期望值（過去 120 期）：</span>
                    <span className="strong">{zeroStats.expectedGap} 期</span>
                    <span className="muted" style={{ marginLeft: "8px", fontSize: "10px" }}>
                      {zeroStats.zeroCount120 >= 2 
                        ? `（基於過去 120 期實際數據，出現 ${zeroStats.zeroCount120} 次）`
                        : "（數據不足，使用理論值 37 期）"}
                    </span>
                  </div>
                  <div className="zeroStatLine">
                    <span className="muted">警報門檻：</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={zeroAlertThreshold}
                      onChange={(e) => setZeroAlertThreshold(parseInt(e.target.value) || 120)}
                      className="threshold-input"
                      style={{ width: "60px", padding: "2px 4px", marginLeft: "8px" }}
                    />
                    <span className="muted" style={{ marginLeft: "4px" }}>期</span>
                  </div>
                </div>
              </div>

              <div className="panel span2">
                <div className="panelTitle">冷熱門號統計（權重演算法 + 馬可夫鏈）</div>
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

              {/* 接續關聯表：選中號碼的下一把預測 */}
              {selectedNumber !== null && nextNumbersForSelected.length > 0 && (
                <div className="panel span2">
                  <div className="panelTitle">
                    接續關聯表：號碼 {selectedNumber} 的下一把預測
                    <button
                      className="close-btn"
                      onClick={() => setSelectedNumber(null)}
                      style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "12px" }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="transition-chart-container">
                    <Bar
                      data={{
                        labels: nextNumbersForSelected.map(p => p.num.toString()),
                        datasets: [
                          {
                            label: "預測得分",
                            data: nextNumbersForSelected.map(p => p.score),
                            backgroundColor: nextNumbersForSelected.map(p => {
                              if (p.num === 0) return "rgba(43, 198, 107, 0.8)";
                              return numberColor(p.num) === "red" 
                                ? "rgba(198, 58, 58, 0.8)" 
                                : "rgba(80, 140, 255, 0.8)";
                            }),
                            borderColor: nextNumbersForSelected.map(p => {
                              if (p.num === 0) return "rgba(43, 198, 107, 1)";
                              return numberColor(p.num) === "red" 
                                ? "rgba(198, 58, 58, 1)" 
                                : "rgba(80, 140, 255, 1)";
                            }),
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              afterLabel: (context: any) => {
                                const index = context.dataIndex;
                                const pred = nextNumbersForSelected[index];
                                return [
                                  `轉移機率: ${pred.markovProb.toFixed(1)}%`,
                                  `全局頻率: ${pred.globalFreq.toFixed(1)}%`,
                                ];
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "預測得分",
                            },
                          },
                          x: {
                            title: {
                              display: true,
                              text: "號碼",
                            },
                          },
                        },
                      }}
                      height={180}
                    />
                  </div>
                  <div className="transition-details">
                    {nextNumbersForSelected.map((pred, idx) => (
                      <div key={pred.num} className="transition-item">
                        <span className="transition-rank">#{idx + 1}</span>
                        <span className={`transition-number ${numberColor(pred.num)}`}>{pred.num}</span>
                        <span className="transition-score">得分: {pred.score.toFixed(2)}</span>
                        <span className="transition-prob">轉移: {pred.markovProb.toFixed(1)}%</span>
                        <span className="transition-freq">頻率: {pred.globalFreq.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 0 的特殊關聯分析 */}
              {zeroAssociations.afterNumbers.size > 0 && (
                <div className="panel span2">
                  <div className="panelTitle">0 號特殊關聯分析</div>
                  <div className="zero-associations">
                    <div className="association-block">
                      <div className="association-label">最容易出現 0 的號碼：</div>
                      <div className="association-numbers">
                        {Array.from(zeroAssociations.afterNumbers.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([num, count]) => (
                            <span key={num} className="association-pill">
                              {num} ({count}次)
                            </span>
                          ))}
                      </div>
                    </div>
                    {zeroAssociations.beforeZero.size > 0 && (
                      <div className="association-block">
                        <div className="association-label">0 出現前最常出現的號碼：</div>
                        <div className="association-numbers">
                          {Array.from(zeroAssociations.beforeZero.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([num, count]) => (
                              <span key={num} className="association-pill">
                                {num} ({count}次)
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部留白（像賭桌下緣） */}
          <div className="tableBottomPad" />
        </div>
      </div>
    </div>
  );
}

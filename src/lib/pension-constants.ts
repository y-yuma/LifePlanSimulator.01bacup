// src/lib/pension-constants.ts

// 年金制度の定数（2025年度時点）
export const PENSION_CONSTANTS = {
  // 基礎年金関連
  BASIC_PENSION_FULL_AMOUNT: 780900, // 満額の基礎年金額（円/年）
  FULL_PENSION_MONTHS: 480, // 満額年金のための加入月数（40年）
  
  // 厚生年金関連
  WELFARE_PENSION_RATE_BEFORE_2003: 0.007125, // 2003年3月以前の厚生年金乗率
  WELFARE_PENSION_RATE_AFTER_2003: 0.005481, // 2003年4月以降の厚生年金乗率
  
  // 受給年齢関連
  STANDARD_PENSION_START_AGE: 65, // 標準的な年金支給開始年齢
  MIN_PENSION_START_AGE: 60, // 最低年金受給開始年齢
  MAX_PENSION_START_AGE: 75, // 最高年金受給開始年齢
  EARLY_PENSION_RATE_PER_MONTH: 0.004, // 繰上げ減額率（月あたり）
  DELAYED_PENSION_RATE_PER_MONTH: 0.007, // 繰下げ増額率（月あたり）
  
  // 在職老齢年金関連
  PENSION_REDUCTION_UNDER_65: {
    THRESHOLD: 470000, // 60～64歳の基準額（月額、円）
  },
  PENSION_REDUCTION_OVER_65: {
    THRESHOLD: 510000, // 65歳以上の基準額（月額、円）
  },
  
  // 標準報酬月額等級表
  STANDARD_REMUNERATION_TABLE: [
    { grade: 1, amount: 88000, min: 0, max: 93000 },
    { grade: 2, amount: 98000, min: 93000, max: 101000 },
    { grade: 3, amount: 104000, min: 101000, max: 107000 },
    { grade: 4, amount: 110000, min: 107000, max: 114000 },
    { grade: 5, amount: 118000, min: 114000, max: 122000 },
    { grade: 6, amount: 126000, min: 122000, max: 130000 },
    { grade: 7, amount: 134000, min: 130000, max: 138000 },
    { grade: 8, amount: 142000, min: 138000, max: 146000 },
    { grade: 9, amount: 150000, min: 146000, max: 155000 },
    { grade: 10, amount: 160000, min: 155000, max: 165000 },
    { grade: 11, amount: 170000, min: 165000, max: 175000 },
    { grade: 12, amount: 180000, min: 175000, max: 185000 },
    { grade: 13, amount: 190000, min: 185000, max: 195000 },
    { grade: 14, amount: 200000, min: 195000, max: 210000 },
    { grade: 15, amount: 220000, min: 210000, max: 230000 },
    { grade: 16, amount: 240000, min: 230000, max: 250000 },
    { grade: 17, amount: 260000, min: 250000, max: 270000 },
    { grade: 18, amount: 280000, min: 270000, max: 290000 },
    { grade: 19, amount: 300000, min: 290000, max: 310000 },
    { grade: 20, amount: 320000, min: 310000, max: 330000 },
    { grade: 21, amount: 340000, min: 330000, max: 350000 },
    { grade: 22, amount: 360000, min: 350000, max: 370000 },
    { grade: 23, amount: 380000, min: 370000, max: 395000 },
    { grade: 24, amount: 410000, min: 395000, max: 425000 },
    { grade: 25, amount: 440000, min: 425000, max: 455000 },
    { grade: 26, amount: 470000, min: 455000, max: 485000 },
    { grade: 27, amount: 500000, min: 485000, max: 515000 },
    { grade: 28, amount: 530000, min: 515000, max: 545000 },
    { grade: 29, amount: 560000, min: 545000, max: 575000 },
    { grade: 30, amount: 590000, min: 575000, max: 605000 },
    { grade: 31, amount: 620000, min: 605000, max: 635000 },
    { grade: 32, amount: 650000, min: 635000, max: Infinity }
  ],
  
  // 標準賞与額の上限
  MAX_ANNUAL_BONUS: 5730000, // 年間標準賞与額の上限（573万円）
  MAX_MONTHLY_BONUS: 1500000, // 1回あたりの標準賞与額の上限（150万円）
};
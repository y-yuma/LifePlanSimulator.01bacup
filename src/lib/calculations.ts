// Tax calculation utilities
export function calculateSalaryDeduction(annualIncome: number): number {
  // Convert from 万円 to actual yen for calculation
  const incomeInYen = annualIncome * 10000;
  
  if (incomeInYen <= 8_500_000) {
    const deduction = Math.min(Math.max((incomeInYen * 0.3) + 80_000, 550_000), 1_950_000);
    // Convert back to 万円
    return Math.floor(deduction / 10000);
  }
  // Convert 1,950,000 yen to 万円
  return 195;
}

export function calculateIncomeTax(taxableIncome: number): number {
  // Convert from 万円 to actual yen for calculation
  const taxableIncomeInYen = taxableIncome * 10000;
  
  // Tax brackets in actual yen
  const brackets = [
    { limit: 1_950_000, rate: 0.05, deduction: 0 },
    { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
    { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
    { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
    { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
    { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
    { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
  ];

  const bracket = brackets.find(b => taxableIncomeInYen <= b.limit);
  if (!bracket) return 0;

  const taxInYen = Math.floor((taxableIncomeInYen * bracket.rate) - bracket.deduction);
  // Convert back to 万円
  return Math.floor(taxInYen / 10000);
}

export function calculateSocialInsuranceRate(annualIncome: number): number {
  // 年収850万円未満は15%、以上は7.7%
  return annualIncome < 850 ? 0.15 : 0.077;
}

// Housing cost calculation utilities
export function calculateMonthlyMortgage(
  loanAmount: number,
  interestRate: number,
  termYears: number
): number {
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = termYears * 12;
  
  if (monthlyRate === 0) {
    return loanAmount / numberOfPayments;
  }

  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return Number(monthlyPayment.toFixed(1));
}

export function calculateHousingExpense(
  housingInfo: {
    type: 'rent' | 'own';
    rent?: {
      monthlyRent: number;
      annualIncreaseRate: number;
      renewalFee: number;
      renewalInterval: number;
    };
    own?: {
      purchaseYear: number;
      purchasePrice: number;
      loanAmount: number;
      interestRate: number;
      loanTermYears: number;
      maintenanceCostRate: number;
    };
  },
  currentYear: number
): number {
  if (housingInfo.type === 'rent' && housingInfo.rent) {
    const yearsSinceStart = currentYear - new Date().getFullYear();
    const annualRent = housingInfo.rent.monthlyRent * 12;
    const renewalYears = Math.floor(yearsSinceStart / housingInfo.rent.renewalInterval);
    const renewalCost = renewalYears * housingInfo.rent.renewalFee;
    const annualRentWithIncrease = annualRent * 
      Math.pow(1 + housingInfo.rent.annualIncreaseRate / 100, yearsSinceStart);
    return Number((annualRentWithIncrease + renewalCost).toFixed(1));
  } else if (housingInfo.type === 'own' && housingInfo.own) {
    if (currentYear < housingInfo.own.purchaseYear) {
      return 0;
    }

    const monthlyMortgage = calculateMonthlyMortgage(
      housingInfo.own.loanAmount,
      housingInfo.own.interestRate,
      housingInfo.own.loanTermYears
    );
    const annualMortgage = monthlyMortgage * 12;
    const maintenanceCost = housingInfo.own.purchasePrice * 
      (housingInfo.own.maintenanceCostRate / 100);
    
    const loanEndYear = housingInfo.own.purchaseYear + housingInfo.own.loanTermYears;
    if (currentYear >= loanEndYear) {
      return maintenanceCost;
    }
    
    return Number((annualMortgage + maintenanceCost).toFixed(1));
  }
  
  return 0;
}

// Pension calculation utilities
// この関数は現在使用されていませんが、念のため修正しておきます

export function calculatePension(
  annualIncome: number,
  workStartAge: number,
  workEndAge: number,
  pensionStartAge: number = 65,
  occupation: string = 'company_employee',
  willWorkAfterPension: boolean = false
): number {
  // For occupations without welfare pension, return basic pension only
  if (occupation === 'part_time_without_pension' || 
      occupation === 'self_employed' || 
      occupation === 'homemaker') {
    // 国民年金の基礎年金額のみ（約78万円/年）
    const basicPensionYearly = 780900; // 2025年度の基礎年金満額
    
    // 加入期間（月数）= 20歳から60歳または現在年齢までの期間（上限40年=480ヶ月）
    const workingYears = Math.min(workEndAge - workStartAge, 40); // 上限40年
    const workingMonths = workingYears * 12;
    
    // 加入期間比率（最大480ヶ月=40年で上限）
    const ratio = Math.min(workingMonths / 480, 1);
    
    // 基礎年金（満額×加入期間比率）
    const basicPension = basicPensionYearly * ratio;
    
    // 繰上げ・繰下げ調整
    let adjustmentRate = 1.0;
    
    // 繰上げ（60〜64歳）：1ヶ月あたり0.4%減額
    if (pensionStartAge < 65) {
      const earlyMonths = (65 - pensionStartAge) * 12;
      adjustmentRate = Math.max(1.0 - (0.004 * earlyMonths), 0.5); // 最低でも50%
    }
    // 繰下げ（66〜75歳）：1ヶ月あたり0.7%増額
    else if (pensionStartAge > 65) {
      const delayedMonths = Math.min((pensionStartAge - 65) * 12, 120); // 最大10年=120ヶ月
      adjustmentRate = 1.0 + (0.007 * delayedMonths);
    }
    
    // 調整後の基礎年金額
    const adjustedPension = basicPension * adjustmentRate;
    
    // 万円単位に変換し、小数点第一位で四捨五入
    return Math.round(adjustedPension / 10000 * 10) / 10;
  }

  // 厚生年金加入者（会社員・公務員など）
  // 基礎年金の計算
  const basicPensionYearly = 780900; // 2025年度の基礎年金満額
  
  // 加入期間（月数）
  const workingYears = Math.min(workEndAge - workStartAge, 40); // 上限40年
  const workingMonths = workingYears * 12;
  
  // 加入期間比率（最大480ヶ月=40年で上限）
  const ratio = Math.min(workingMonths / 480, 1);
  
  // 基礎年金（満額×加入期間比率）
  const basicPension = basicPensionYearly * ratio;

  // 厚生年金の計算
  // 平均標準報酬月額の計算（単純化）
  const averageMonthlySalary = (annualIncome * 10000) / 12; // 年収を月収に変換（円単位）
  
  // 標準報酬月額（上限65万円）
  const standardSalary = Math.min(getStandardRemuneration(averageMonthlySalary), 650000);
  
  // 2003年4月以前と以降の期間を考慮
  // 簡易計算のため、総月数の半分を2003年4月以前、残りを以降として計算
  const monthsBeforeApril2003 = Math.min(workingMonths / 2, 240); // 最大20年
  const monthsAfterApril2003 = workingMonths - monthsBeforeApril2003;
  
  // 2003年3月以前の計算（乗率0.007125）
  const pensionBefore2003 = standardSalary * 0.007125 * monthsBeforeApril2003;
  
  // 2003年4月以降の計算（乗率0.005481）
  const pensionAfter2003 = standardSalary * 0.005481 * monthsAfterApril2003;
  
  // 厚生年金の合計
  const welfarePension = pensionBefore2003 + pensionAfter2003;
  
  // 繰上げ・繰下げ調整
  let adjustmentRate = 1.0;
  
  // 繰上げ（60〜64歳）：1ヶ月あたり0.4%減額
  if (pensionStartAge < 65) {
    const earlyMonths = (65 - pensionStartAge) * 12;
    adjustmentRate = Math.max(1.0 - (0.004 * earlyMonths), 0.5); // 最低でも50%
  }
  // 繰下げ（66〜75歳）：1ヶ月あたり0.7%増額
  else if (pensionStartAge > 65) {
    const delayedMonths = Math.min((pensionStartAge - 65) * 12, 120); // 最大10年=120ヶ月
    adjustmentRate = 1.0 + (0.007 * delayedMonths);
  }
  
  // 調整後の総年金額
  const totalPension = (basicPension + welfarePension) * adjustmentRate;
  
  // 在職老齢年金制度による調整（年金受給後も働いている場合）
  let adjustedPension = totalPension;
  
  if (willWorkAfterPension) {
    // 月収
    const monthlyIncome = averageMonthlySalary;
    
    // 月額の年金
    const monthlyPension = totalPension / 12;
    
    // 基準額（65歳以上は51万円/月）
    const threshold = 510000;
    
    // 総収入（月収 + 月額年金）
    const totalMonthlyIncome = monthlyIncome + monthlyPension;
    
    // 基準額超過分
    const excessAmount = Math.max(0, totalMonthlyIncome - threshold);
    
    // 支給停止額：超過額の1/2（ただし厚生年金部分のみ対象）
    const welfareMonthlyPension = welfarePension * adjustmentRate / 12;
    const suspensionAmount = Math.min(welfareMonthlyPension, excessAmount / 2);
    
    // 停止後の月額年金
    const adjustedMonthlyPension = monthlyPension - suspensionAmount;
    
    // 年額に戻す
    adjustedPension = adjustedMonthlyPension * 12;
  }
  
  // 万円単位に変換し、小数点第一位で四捨五入
  return Math.round(adjustedPension / 10000 * 10) / 10;
}

// 標準報酬月額の取得（厚生年金の計算用）- 修正版
function getStandardRemuneration(monthlySalary: number): number {
  // 収入が0の場合は0を返す
  if (monthlySalary <= 0) {
    return 0;
  }

  // 標準報酬月額表に基づいて、報酬額を標準報酬月額に変換
  const standardGrades = [
    { min: 0, max: 93000, amount: 88000 },
    { min: 93000, max: 101000, amount: 98000 },
    { min: 101000, max: 107000, amount: 104000 },
    { min: 107000, max: 114000, amount: 110000 },
    { min: 114000, max: 122000, amount: 118000 },
    { min: 122000, max: 130000, amount: 126000 },
    { min: 130000, max: 138000, amount: 134000 },
    { min: 138000, max: 146000, amount: 142000 },
    { min: 146000, max: 155000, amount: 150000 },
    { min: 155000, max: 165000, amount: 160000 },
    { min: 165000, max: 175000, amount: 170000 },
    { min: 175000, max: 185000, amount: 180000 },
    { min: 185000, max: 195000, amount: 190000 },
    { min: 195000, max: 210000, amount: 200000 },
    { min: 210000, max: 230000, amount: 220000 },
    { min: 230000, max: 250000, amount: 240000 },
    { min: 250000, max: 270000, amount: 260000 },
    { min: 270000, max: 290000, amount: 280000 },
    { min: 290000, max: 310000, amount: 300000 },
    { min: 310000, max: 330000, amount: 320000 },
    { min: 330000, max: 350000, amount: 340000 },
    { min: 350000, max: 370000, amount: 360000 },
    { min: 370000, max: 395000, amount: 380000 },
    { min: 395000, max: 425000, amount: 410000 },
    { min: 425000, max: 455000, amount: 440000 },
    { min: 455000, max: 485000, amount: 470000 },
    { min: 485000, max: 515000, amount: 500000 },
    { min: 515000, max: 545000, amount: 530000 },
    { min: 545000, max: 575000, amount: 560000 },
    { min: 575000, max: 605000, amount: 590000 },
    { min: 605000, max: 635000, amount: 620000 },
    { min: 635000, max: Infinity, amount: 650000 }
  ];

  // 対応する標準報酬月額を検索
  const grade = standardGrades.find(g => monthlySalary >= g.min && monthlySalary < g.max);
  
  // 該当するグレードが見つからない場合
  if (!grade) {
    // 最低等級未満の場合は最低等級の金額
    if (monthlySalary < standardGrades[0].min) {
      return standardGrades[0].amount;
    }
    // 最高等級を超える場合は最高等級の金額
    return standardGrades[standardGrades.length - 1].amount;
  }
  
  return grade.amount;
}

export function calculateNetIncome(
  annualIncome: number, // in 万円
  occupation: string
): { 
  netIncome: number;
  deductions: {
    salaryDeduction: number;
    socialInsurance: number;
    incomeTax: number;
    residentTax: number;
    total: number;
  };
} {
  // 自営業・フリーランスまたは専業主婦・夫の場合は控除なし
  if (occupation === 'self_employed' || occupation === 'homemaker') {
    return {
      netIncome: annualIncome,
      deductions: {
        salaryDeduction: 0,
        socialInsurance: 0,
        incomeTax: 0,
        residentTax: 0,
        total: 0
      }
    };
  }

  // パート（厚生年金なし）の場合は社会保険料なし
  const hasSocialInsurance = occupation === 'company_employee' || 
                           occupation === 'part_time_with_pension';

  // 給与所得控除 (in 万円)
  const salaryDeduction = calculateSalaryDeduction(annualIncome);

  // 社会保険料（年収に応じて変動）
  const socialInsuranceRate = calculateSocialInsuranceRate(annualIncome);
  const socialInsurance = hasSocialInsurance ? Math.floor(annualIncome * socialInsuranceRate) : 0;

  // 課税所得 (in 万円)
  const taxableIncome = Math.max(0, annualIncome - (salaryDeduction + socialInsurance));

  // 所得税 (in 万円)
  const incomeTax = calculateIncomeTax(taxableIncome);

  // 住民税（課税所得の10%）
  const residentTax = Math.floor(taxableIncome * 0.10);

  // 総控除額 (in 万円)
  const totalDeductions = socialInsurance + incomeTax + residentTax;

  // 手取り収入 (in 万円)
  const netIncome = annualIncome - totalDeductions;

  return {
    netIncome,
    deductions: {
      salaryDeduction,
      socialInsurance,
      incomeTax,
      residentTax,
      total: totalDeductions
    }
  };
}

export function calculateNetIncomeWithRaise(
  baseAnnualIncome: number, // in 万円
  occupation: string,
  raiseRate: number,
  year: number,
  startYear: number,
  workStartAge?: number,
  workEndAge?: number,
  currentAge?: number,
  pensionAmount?: number,
  pensionStartAge?: number
): number {
  const raisedIncome = Math.floor(
    baseAnnualIncome * Math.pow(1 + raiseRate / 100, year - startYear)
  );
  return calculateNetIncome(raisedIncome, occupation).netIncome;
}
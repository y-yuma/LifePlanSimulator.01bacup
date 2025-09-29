// ==========================
// calculations.ts（完全差し替え版）
// ==========================

// ---- Tax calculation utilities ----
export function calculateSalaryDeduction(annualIncome: number): number {
  // 万円 → 円
  const incomeInYen = annualIncome * 10000;

  if (incomeInYen <= 8_500_000) {
    const deduction = Math.min(Math.max(incomeInYen * 0.3 + 80_000, 550_000), 1_950_000);
    // 円 → 万円（切り捨て）
    return Math.floor(deduction / 10000);
  }
  // 1,950,000 円 → 195 万円
  return 195;
}

export function calculateIncomeTax(taxableIncome: number): number {
  // 万円 → 円
  const taxableIncomeInYen = taxableIncome * 10000;

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

  const taxInYen = Math.floor(taxableIncomeInYen * bracket.rate - bracket.deduction);
  // 円 → 万円（切り捨て）
  return Math.floor(taxInYen / 10000);
}

export function calculateSocialInsuranceRate(annualIncome: number): number {
  // 年収850万円未満は15%、以上は7.7%
  return annualIncome < 850 ? 0.15 : 0.077;
}

// ---- Corporate tax (法人税) ----

export interface CorporateTaxSettings {
  corporateTaxRateLow: number;         // 800万円以下の税率（例：15%）
  corporateTaxRateHigh: number;        // 800万円超の税率（例：23.2%）
  corporateTaxThreshold: number;       // 閾値（例：800万円）
  localCorporateTaxRate: number;       // 地方法人税率（例：10.3%）
  residentTaxEqualRate: number;        // 法人住民税（均等割／万円）（例：7）
  residentTaxProportionalRate: number; // 法人住民税（法人税割）（例：7.0%）
}

export const DEFAULT_CORPORATE_TAX_SETTINGS: CorporateTaxSettings = {
  corporateTaxRateLow: 15.0,
  corporateTaxRateHigh: 23.2,
  corporateTaxThreshold: 800,
  localCorporateTaxRate: 10.3,
  residentTaxEqualRate: 7,
  residentTaxProportionalRate: 7.0,
};

export interface CorporateTaxResult {
  pretaxProfit: number;              // 税引き前利益（万円）
  corporateTax: number;              // 法人税（万円）
  localCorporateTax: number;         // 地方法人税（万円）
  residentTaxEqual: number;          // 法人住民税（均等割／万円）
  residentTaxProportional: number;   // 法人住民税（法人税割／万円）
  totalTax: number;                  // 税金合計（万円）
  aftertaxProfit: number;            // 税引き後利益（万円）
  effectiveTaxRate: number;          // 実効税率（%）
}

export function calculateCorporateTax(
  pretaxProfit: number, // 万円
  settings: CorporateTaxSettings = DEFAULT_CORPORATE_TAX_SETTINGS
): CorporateTaxResult {
  const residentTaxEqual = settings.residentTaxEqualRate;

  if (pretaxProfit <= 0) {
    return {
      pretaxProfit,
      corporateTax: 0,
      localCorporateTax: 0,
      residentTaxEqual,
      residentTaxProportional: 0,
      totalTax: residentTaxEqual,
      aftertaxProfit: pretaxProfit - residentTaxEqual,
      effectiveTaxRate: 0,
    };
  }

  let corporateTax = 0;
  if (pretaxProfit <= settings.corporateTaxThreshold) {
    corporateTax = pretaxProfit * (settings.corporateTaxRateLow / 100);
  } else {
    corporateTax =
      settings.corporateTaxThreshold * (settings.corporateTaxRateLow / 100) +
      (pretaxProfit - settings.corporateTaxThreshold) * (settings.corporateTaxRateHigh / 100);
  }

  const localCorporateTax = corporateTax * (settings.localCorporateTaxRate / 100);
  const residentTaxProportional = corporateTax * (settings.residentTaxProportionalRate / 100);

  const totalTax = corporateTax + localCorporateTax + residentTaxEqual + residentTaxProportional;
  const aftertaxProfit = pretaxProfit - totalTax;
  const effectiveTaxRate = pretaxProfit > 0 ? (totalTax / pretaxProfit) * 100 : 0;

  return {
    pretaxProfit: Math.round(pretaxProfit * 10) / 10,
    corporateTax: Math.round(corporateTax * 10) / 10,
    localCorporateTax: Math.round(localCorporateTax * 10) / 10,
    residentTaxEqual: Math.round(residentTaxEqual * 10) / 10,
    residentTaxProportional: Math.round(residentTaxProportional * 10) / 10,
    totalTax: Math.round(totalTax * 10) / 10,
    aftertaxProfit: Math.round(aftertaxProfit * 10) / 10,
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
  };
}

// ---- Housing cost calculation utilities ----

// ★元利均等の月返済額（単位は呼び出し側に合わせて：ここでは“万円”で計算）
export function calculateMonthlyMortgage(
  loanAmount: number,  // 万円（元本）
  interestRate: number, // 年利（%）
  termYears: number     // 年
): number {
  const monthlyRate = (interestRate || 0) / 100 / 12;
  const numberOfPayments = Math.max(1, termYears * 12);

  if (monthlyRate === 0) {
    return Number((loanAmount / numberOfPayments).toFixed(1));
  }

  const pow = Math.pow(1 + monthlyRate, numberOfPayments);
  const monthlyPayment = loanAmount * (monthlyRate * pow) / (pow - 1);

  return Number(monthlyPayment.toFixed(1));
}

// ★修正：第3引数 startYear を追加し、賃貸の経過年を startYear 基準に統一
export function calculateHousingExpense(
  housingInfo: {
    type: 'rent' | 'own';
    rent?: {
      monthlyRent: number;        // 万円/月
      annualIncreaseRate: number; // %
      renewalFee: number;         // 万円/回
      renewalInterval: number;    // 年
    };
    own?: {
      purchaseYear: number;
      purchasePrice: number;      // 万円
      loanAmount: number;         // 万円
      interestRate: number;       // 年利（%）
      loanTermYears: number;      // 年
      maintenanceCostRate: number;// %（購入価格×率）
    };
  },
  currentYear: number,
  startYear: number // ★追加：シミュレーション開始年
): number {
  if (housingInfo.type === 'rent' && housingInfo.rent) {
    const r = housingInfo.rent;
    const yearsSinceStart = currentYear - startYear; // ← ここが重要（実行時の西暦は使わない）
    const baseAnnualRent = (r.monthlyRent || 0) * 12;

    // 家賃の年次増加（インフレ）を startYear 基準で適用
    const annualRentWithIncrease =
      baseAnnualRent * Math.pow(1 + (r.annualIncreaseRate || 0) / 100, Math.max(0, yearsSinceStart));

    // 更新料（renewalInterval ごとに加算／0年目はなし）
    let renewalCost = 0;
    if ((r.renewalInterval || 0) > 0 && (r.renewalFee || 0) > 0) {
      const renewalCount = Math.floor(Math.max(0, yearsSinceStart) / r.renewalInterval);
      renewalCost = renewalCount * r.renewalFee;
    }

    return Number((annualRentWithIncrease + renewalCost).toFixed(1));
  }

  if (housingInfo.type === 'own' && housingInfo.own) {
    const o = housingInfo.own;

    // 購入前年は 0
    if (currentYear < o.purchaseYear) {
      return 0;
    }

    // 住宅ローン返済（元利均等）— 現行ロジック維持
    const monthlyMortgage = calculateMonthlyMortgage(
      o.loanAmount,
      o.interestRate,
      o.loanTermYears
    );
    const annualMortgage = monthlyMortgage * 12;

    // 維持費（購入価格 × 率）— 現行ロジック維持
    const maintenanceCost = o.purchasePrice * (o.maintenanceCostRate / 100);

    // 返済終了後は維持費のみ
    const loanEndYear = o.purchaseYear + o.loanTermYears;
    if (currentYear >= loanEndYear) {
      return Number(maintenanceCost.toFixed(1));
    }

    return Number((annualMortgage + maintenanceCost).toFixed(1));
  }

  return 0;
}

// ---- Pension calculation utilities（簡易版：互換維持のため残置）----

export function calculatePension(
  annualIncome: number,
  workStartAge: number,
  workEndAge: number,
  pensionStartAge: number = 65,
  occupation: string = 'company_employee',
  willWorkAfterPension: boolean = false
): number {
  // 厚生年金に加入しない職種は基礎年金のみ
  if (
    occupation === 'part_time_without_pension' ||
    occupation === 'self_employed' ||
    occupation === 'homemaker'
  ) {
    const basicPensionYearly = 780_900; // 円/年（満額）
    const workingYears = Math.min(workEndAge - workStartAge, 40);
    const workingMonths = workingYears * 12;
    const ratio = Math.min(workingMonths / 480, 1);
    const basicPension = basicPensionYearly * ratio;

    // 繰上げ・繰下げ
    let adjustmentRate = 1.0;
    if (pensionStartAge < 65) {
      const earlyMonths = (65 - pensionStartAge) * 12;
      adjustmentRate = Math.max(1.0 - 0.004 * earlyMonths, 0.5);
    } else if (pensionStartAge > 65) {
      const delayedMonths = Math.min((pensionStartAge - 65) * 12, 120);
      adjustmentRate = 1.0 + 0.007 * delayedMonths;
    }

    const adjustedPension = basicPension * adjustmentRate;
    return Math.round((adjustedPension / 10000) * 10) / 10;
  }

  // 厚生年金加入者（簡易）
  const basicPensionYearly = 780_900; // 円/年
  const workingYears = Math.min(workEndAge - workStartAge, 40);
  const workingMonths = workingYears * 12;
  const ratio = Math.min(workingMonths / 480, 1);
  const basicPension = basicPensionYearly * ratio;

  const averageMonthlySalary = (annualIncome * 10000) / 12; // 円
  const standardSalary = Math.min(getStandardRemuneration(averageMonthlySalary), 650_000);

  // 簡易：半々で前後期に分割
  const monthsBeforeApril2003 = Math.min(workingMonths / 2, 240);
  const monthsAfterApril2003 = workingMonths - monthsBeforeApril2003;

  const pensionBefore2003 = standardSalary * 0.007125 * monthsBeforeApril2003;
  const pensionAfter2003 = standardSalary * 0.005481 * monthsAfterApril2003;
  const welfarePension = pensionBefore2003 + pensionAfter2003;

  let adjustmentRate = 1.0;
  if (pensionStartAge < 65) {
    const earlyMonths = (65 - pensionStartAge) * 12;
    adjustmentRate = Math.max(1.0 - 0.004 * earlyMonths, 0.5);
  } else if (pensionStartAge > 65) {
    const delayedMonths = Math.min((pensionStartAge - 65) * 12, 120);
    adjustmentRate = 1.0 + 0.007 * delayedMonths;
  }

  const totalPension = (basicPension + welfarePension) * adjustmentRate;

  // 在職老齢（簡易）
  let adjustedPension = totalPension;
  if (willWorkAfterPension) {
    const monthlyIncome = averageMonthlySalary;
    const monthlyPension = totalPension / 12;
    const threshold = 510_000;
    const totalMonthlyIncome = monthlyIncome + monthlyPension;
    const excess = Math.max(0, totalMonthlyIncome - threshold);
    const welfareMonthlyPension = (welfarePension * adjustmentRate) / 12;
    const suspension = Math.min(welfareMonthlyPension, excess / 2);
    adjustedPension = (monthlyPension - suspension) * 12;
  }

  return Math.round((adjustedPension / 10000) * 10) / 10;
}

// 標準報酬月額（簡易表）
function getStandardRemuneration(monthlySalary: number): number {
  if (monthlySalary <= 0) return 0;
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
    { min: 635000, max: Infinity, amount: 650000 },
  ];
  const grade = standardGrades.find(g => monthlySalary >= g.min && monthlySalary < g.max);
  if (!grade) {
    if (monthlySalary < standardGrades[0].min) return standardGrades[0].amount;
    return standardGrades[standardGrades.length - 1].amount;
  }
  return grade.amount;
}

// ---- Income / Cost utilities ----

export function calculateNetIncome(
  annualIncome: number, // 万円
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
  if (occupation === 'self_employed' || occupation === 'homemaker') {
    return {
      netIncome: annualIncome,
      deductions: { salaryDeduction: 0, socialInsurance: 0, incomeTax: 0, residentTax: 0, total: 0 },
    };
  }

  const hasSocialInsurance =
    occupation === 'company_employee' || occupation === 'part_time_with_pension';

  const salaryDeduction = calculateSalaryDeduction(annualIncome);
  const socialInsuranceRate = calculateSocialInsuranceRate(annualIncome);
  const socialInsurance = hasSocialInsurance ? Math.floor(annualIncome * socialInsuranceRate) : 0;

  const taxableIncome = Math.max(0, annualIncome - (salaryDeduction + socialInsurance));
  const incomeTax = calculateIncomeTax(taxableIncome);
  const residentTax = Math.floor(taxableIncome * 0.1);

  const totalDeductions = socialInsurance + incomeTax + residentTax;
  const netIncome = annualIncome - totalDeductions;

  return {
    netIncome,
    deductions: {
      salaryDeduction,
      socialInsurance,
      incomeTax,
      residentTax,
      total: totalDeductions,
    },
  };
}

// 役員報酬（雇用保険なし）
export function calculateNetIncomeForDirector(
  annualIncome: number, // 万円（額面）
  hasSocialInsurance: boolean
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
  const salaryDeduction = calculateSalaryDeduction(annualIncome);

  let socialInsurance = 0;
  if (hasSocialInsurance) {
    // 雇用保険を除いた率：14.4%（850万以上は 7.7%）
    const directorSocialInsuranceRate = annualIncome < 850 ? 0.144 : 0.077;
    socialInsurance = Math.floor(annualIncome * directorSocialInsuranceRate);
  }

  const taxableIncome = Math.max(0, annualIncome - (salaryDeduction + socialInsurance));
  const incomeTax = calculateIncomeTax(taxableIncome);
  const residentTax = Math.floor(taxableIncome * 0.1);

  const totalDeductions = socialInsurance + incomeTax + residentTax;
  const netIncome = annualIncome - totalDeductions;

  return {
    netIncome,
    deductions: {
      salaryDeduction,
      socialInsurance,
      incomeTax,
      residentTax,
      total: totalDeductions,
    },
  };
}

// 法人の従業員コスト
export function calculateCorporateEmployeeCost(
  annualSalary: number,   // 万円（額面）
  hasSocialInsurance: boolean
): number {
  let totalCost = annualSalary;

  if (hasSocialInsurance) {
    // 会社負担分（健保+厚年の概算を労使折半相当）：14.4%（850万以上は 7.7%）
    const corporateSocialInsuranceRate = annualSalary < 850 ? 0.144 : 0.077;
    const corporateSocialInsurance = Math.floor(annualSalary * corporateSocialInsuranceRate);

    // 子ども・子育て拠出金 0.36%
    const childCareContribution = Math.floor(annualSalary * 0.0036);

    // 労災保険 0.3%（目安）
    const workAccidentInsurance = Math.floor(annualSalary * 0.003);

    totalCost = annualSalary + corporateSocialInsurance + childCareContribution + workAccidentInsurance;
  }

  return Math.round(totalCost * 10) / 10;
}

export function calculateNetIncomeWithRaise(
  baseAnnualIncome: number, // 万円
  occupation: string,
  raiseRate: number,        // %
  year: number,
  startYear: number,
  _workStartAge?: number,
  _workEndAge?: number,
  _currentAge?: number,
  _pensionAmount?: number,
  _pensionStartAge?: number
): number {
  const raisedIncome = Math.floor(
    baseAnnualIncome * Math.pow(1 + raiseRate / 100, year - startYear)
  );
  return calculateNetIncome(raisedIncome, occupation).netIncome;
}

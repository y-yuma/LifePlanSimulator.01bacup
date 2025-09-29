// store/simulator.ts
import { create } from 'zustand';
import {
  calculateNetIncome, // 未使用でも元のimport維持
  calculateHousingExpense, // ※シグネチャ: (housingInfo, currentYear, startYear)
  calculateCorporateTax,
  CorporateTaxSettings,
  DEFAULT_CORPORATE_TAX_SETTINGS,
  calculateNetIncomeForDirector,
  calculateCorporateEmployeeCost,
  calculateMonthlyMortgage, // ローン利息対応で使用（その他ローン）
} from '@/lib/calculations';
import {
  calculatePensionForYear,
  calculateSpousePensionForYear,
} from '@/lib/pension-calculations';

type Occupation =
  | 'company_employee'
  | 'part_time_with_pension'
  | 'part_time_without_pension'
  | 'self_employed'
  | 'homemaker';

export interface IncomeItem {
  id: string;
  name: string;
  type: 'income' | 'profit' | 'side';
  category?: string;
  amounts: { [year: number]: number };
  _originalAmounts?: { [year: number]: number };
  _netAmounts?: { [year: number]: number };
  investmentRatio: number;
  maxInvestmentAmount: number;
  isAutoCalculated?: boolean;
  isCorporateSalary?: boolean;
  corporateSalaryType?: 'full-time' | 'part-time';
  socialInsuranceByYear?: { [year: number]: boolean };
  linkedExpenseId?: string;
  autoSwitchIncomeIds?: string[];
  autoSwitchEnabled?: boolean;
  manualOverrideYears?: { [year: number]: boolean };
}

export interface IncomeSection {
  personal: IncomeItem[];
  corporate: IncomeItem[];
}

export interface ExpenseItem {
  id: string;
  name: string;
  type: 'living' | 'housing' | 'education' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  _rawAmounts?: { [year: number]: number };
  _costSettings?: {
    costRatio: number;
    costIncreaseRate: number;
    maxCostAmount?: number;
  };
  isLinkedFromIncome?: boolean;
  linkedIncomeId?: string;
}

export interface ExpenseSection {
  personal: ExpenseItem[];
  corporate: ExpenseItem[];
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'income_investment' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  isInvestment?: boolean;
  investmentReturn?: number;
  isIncomeInvestment?: boolean;
  linkedIncomeId?: string;
  linkedIncomeType?: 'personal' | 'corporate';
  investmentRatio?: number;
  maxInvestmentAmount?: number;
}

export interface AssetSection {
  personal: AssetItem[];
  corporate: AssetItem[];
}

export interface LiabilityItem {
  id: string;
  name: string;
  type: 'loan' | 'credit' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  interestRate?: number; // 年利（%）
  termYears?: number;
  startYear?: number;
  repaymentType?: 'equal_principal' | 'equal_payment';
  autoCalculate?: boolean;
  originalAmount?: number;
  _isCalculated?: boolean;
  _calculationHash?: string;
}

export interface LiabilitySection {
  personal: LiabilityItem[];
  corporate: LiabilityItem[];
}

export interface HistoryEntry {
  timestamp: number;
  type: 'income' | 'expense' | 'asset' | 'liability';
  section: 'personal' | 'corporate';
  itemId: string;
  year: number;
  previousValue: number;
  newValue: number;
}

export interface BasicInfo {
  currentAge: number;
  startYear: number;
  deathAge: number;
  gender: 'male' | 'female';
  monthlyLivingExpense: number;
  occupation: Occupation;
  maritalStatus: 'single' | 'married' | 'planning';
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
      interestRate: number; // 年利（%）
      loanTermYears: number;
      maintenanceCostRate: number;
    };
  };
  spouseInfo?: {
    age?: number;
    currentAge?: number;
    marriageAge?: number;
    occupation?: Occupation;
    additionalExpense?: number;
    workStartAge?: number;
    pensionStartAge?: number;
    willWorkAfterPension?: boolean;
  };
  children: {
    currentAge: number;
    educationPlan: {
      nursery: string;
      preschool: string;
      elementary: string;
      juniorHigh: string;
      highSchool: string;
      university: string;
    };
  }[];
  plannedChildren: {
    yearsFromNow: number;
    educationPlan: {
      nursery: string;
      preschool: string;
      elementary: string;
      juniorHigh: string;
      highSchool: string;
      university: string;
    };
  }[];
  workStartAge?: number;
  pensionStartAge?: number;
  willWorkAfterPension?: boolean;
}

export interface Parameters {
  inflationRate: number;
  educationCostIncreaseRate: number;
  investmentReturn: number;
  investmentRatio?: number;
  maxInvestmentAmount?: number;
  corporateTaxSettings: CorporateTaxSettings;
}

export interface CashFlowData {
  [year: number]: {
    mainIncome: number;
    sideIncome: number;
    spouseIncome: number;
    pensionIncome: number;
    spousePensionIncome: number;
    investmentIncome: number;
    livingExpense: number;
    housingExpense: number;
    educationExpense: number;
    otherExpense: number;
    loanRepayment: number;
    personalAssets: number;
    investmentAmount: number;
    totalInvestmentAssets: number;
    personalBalance: number;
    personalTotalAssets: number;
    personalLiabilityTotal: number;
    personalNetAssets: number;
    corporateIncome: number;
    corporateOtherIncome: number;
    corporateExpense: number;
    corporateOtherExpense: number;
    corporateLoanRepayment: number;
    corporateBalance: number;
    corporateTotalAssets: number;
    corporateLiabilityTotal: number;
    corporateNetAssets: number;
    corporateInvestmentAmount: number;
    corporateInvestmentIncome: number;
    corporateTotalInvestmentAssets: number;
    corporatePretaxProfit: number;
    corporateTax: number;
    localCorporateTax: number;
    residentTaxEqual: number;
    residentTaxProportional: number;
    corporateTotalTax: number;
    corporateAftertaxProfit: number;
    corporateEffectiveTaxRate: number;
  };
}

// ライフイベント
export interface LifeEvent {
  year: number;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  source:
    | 'personal'
    | 'corporate'
    | 'personal_investment'
    | 'corporate_investment';
}

interface SimulatorState {
  currentStep: number;
  basicInfo: BasicInfo;
  parameters: Parameters;
  cashFlow: CashFlowData;
  history: HistoryEntry[];
  incomeData: IncomeSection;
  expenseData: ExpenseSection;
  assetData: AssetSection;
  liabilityData: LiabilitySection;
  lifeEvents: LifeEvent[];
  setCurrentStep: (step: number) => void;
  setBasicInfo: (info: Partial<BasicInfo>) => void;
  setParameters: (params: Partial<Parameters>) => void;
  setCashFlow: (data: CashFlowData) => void;
  updateCashFlowValue: (
    year: number,
    field: keyof CashFlowData[number],
    value: number
  ) => void;
  initializeCashFlow: () => void;
  initializeFormData: () => void;
  syncCashFlowFromFormData: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  addLifeEvent: (event: LifeEvent) => void;
  removeLifeEvent: (index: number) => void;
  setIncomeData: (data: IncomeSection) => void;
  setExpenseData: (data: ExpenseSection) => void;
  setAssetData: (data: AssetSection) => void;
  setLiabilityData: (data: LiabilitySection) => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'timestamp'>) => void;
  clearHistory: () => void;
  updateCorporateTaxSettings: (
    settings: Partial<CorporateTaxSettings>
  ) => void;
}

// 仮収支（投資額を除外）計算
function calculateTentativeBalance(
  section: 'personal' | 'corporate',
  data: {
    mainIncome: number;
    sideIncome: number;
    otherSideIncome: number;
    spouseIncome: number;
    pensionIncome: number;
    spousePensionIncome: number;
    personalInvestmentIncome: number;
    personalLifeEventIncome: number;
    livingExpense: number;
    housingExpense: number;
    educationExpense: number;
    otherPersonalExpense: number;
    personalLifeEventExpense: number;
    personalLoanRepayment: number;
    corporateIncome: number;
    corporateOtherIncome: number;
    corporateInvestmentIncome: number;
    corporateLifeEventIncome: number;
    corporateExpense: number;
    corporateOtherExpense: number;
    corporateCost: number;
    corporateLifeEventExpense: number;
    corporateLoanRepayment: number;
    parameters: Parameters;
  }
): number {
  if (section === 'personal') {
    const totalIncome =
      data.mainIncome +
      data.sideIncome +
      data.otherSideIncome +
      data.spouseIncome +
      data.pensionIncome +
      data.spousePensionIncome +
      data.personalInvestmentIncome +
      data.personalLifeEventIncome;
    const totalExpense =
      data.livingExpense +
      data.housingExpense +
      data.educationExpense +
      data.otherPersonalExpense +
      data.personalLifeEventExpense +
      data.personalLoanRepayment;
    return totalIncome - totalExpense;
  } else {
    const totalIncome =
      data.corporateIncome +
      data.corporateOtherIncome +
      data.corporateInvestmentIncome +
      data.corporateLifeEventIncome;
    const totalExpense =
      data.corporateExpense +
      data.corporateOtherExpense +
      data.corporateCost +
      data.corporateLifeEventExpense +
      data.corporateLoanRepayment;
    const pretaxProfit = totalIncome - totalExpense;
    const taxResult = calculateCorporateTax(
      pretaxProfit,
      data.parameters.corporateTaxSettings
    );
    return taxResult.aftertaxProfit;
  }
}

// 教育費（現行ロジック維持）
function calculateEducationExpense(
  children: BasicInfo['children'],
  plannedChildren: BasicInfo['plannedChildren'],
  year: number,
  currentAge: number,
  startYear: number,
  educationCostIncreaseRate: number
): number {
  const yearsSinceStart = year - startYear;
  const educationInflationFactor = Math.pow(
    1 + educationCostIncreaseRate / 100,
    yearsSinceStart
  );

  const costs = {
    nursery: { '公立': 29.9, '私立': 35.3, '行かない': 0 },
    preschool: { '公立': 18.4, '私立': 34.7, '行かない': 0 },
    elementary: { '公立': 33.6, '私立': 182.8, '行かない': 0 },
    juniorHigh: { '公立': 54.2, '私立': 156, '行かない': 0 },
    highSchool: { '公立': 59.7, '私立': 103, '行かない': 0 },
    university: {
      '国立大学（文系）': 60.6,
      '国立大学（理系）': 60.6,
      '私立大学（文系）': 102.6,
      '私立大学（理系）': 135.4,
      '行かない': 0,
    },
  };

  const existingChildrenExpense = children.reduce((total, child) => {
    const childAge = child.currentAge + yearsSinceStart;
    let expense = 0;
    if (childAge >= 0 && childAge <= 2) {
      expense = (costs.nursery as any)[child.educationPlan.nursery] || 0;
    }
    if (childAge >= 3 && childAge <= 5) {
      expense = (costs.preschool as any)[child.educationPlan.preschool] || 0;
    }
    if (childAge >= 6 && childAge <= 11) {
      expense = (costs.elementary as any)[child.educationPlan.elementary] || 0;
    }
    if (childAge >= 12 && childAge <= 14) {
      expense = (costs.juniorHigh as any)[child.educationPlan.juniorHigh] || 0;
    }
    if (childAge >= 15 && childAge <= 17) {
      expense = (costs.highSchool as any)[child.educationPlan.highSchool] || 0;
    }
    if (childAge >= 18 && childAge <= 21) {
      expense =
        (costs.university as any)[child.educationPlan.university] || 0;
    }
    const inflatedExpense = expense * educationInflationFactor;
    return total + inflatedExpense;
  }, 0);

  const plannedChildrenExpense = plannedChildren.reduce((total, child) => {
    if (yearsSinceStart >= child.yearsFromNow) {
      const childAge = yearsSinceStart - child.yearsFromNow;
      let expense = 0;
      if (childAge >= 0 && childAge <= 2) {
        expense = (costs.nursery as any)[child.educationPlan.nursery] || 0;
      }
      if (childAge >= 3 && childAge <= 5) {
        expense = (costs.preschool as any)[child.educationPlan.preschool] || 0;
      }
      if (childAge >= 6 && childAge <= 11) {
        expense = (costs.elementary as any)[child.educationPlan.elementary] || 0;
      }
      if (childAge >= 12 && childAge <= 14) {
        expense = (costs.juniorHigh as any)[child.educationPlan.juniorHigh] || 0;
      }
      if (childAge >= 15 && childAge <= 17) {
        expense = (costs.highSchool as any)[child.educationPlan.highSchool] || 0;
      }
      if (childAge >= 18 && childAge <= 21) {
        expense =
          (costs.university as any)[child.educationPlan.university] || 0;
      }
      const inflatedExpense = expense * educationInflationFactor;
      return total + inflatedExpense;
    }
    return total;
  }, 0);

  return Number((existingChildrenExpense + plannedChildrenExpense).toFixed(1));
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  currentStep: 0,
  basicInfo: {
    currentAge: 30,
    startYear: new Date().getFullYear(),
    deathAge: 80,
    gender: 'male',
    monthlyLivingExpense: 0,
    occupation: 'company_employee',
    maritalStatus: 'single',
    housingInfo: {
      type: 'rent',
      rent: {
        monthlyRent: 0,
        annualIncreaseRate: 0,
        renewalFee: 0,
        renewalInterval: 2,
      },
    },
    children: [],
    plannedChildren: [],
    workStartAge: 22,
    pensionStartAge: 65,
    willWorkAfterPension: false,
  },
  parameters: {
    inflationRate: 0,
    educationCostIncreaseRate: 0,
    investmentReturn: 0,
    investmentRatio: 0,
    maxInvestmentAmount: 0,
    corporateTaxSettings: DEFAULT_CORPORATE_TAX_SETTINGS,
  },
  cashFlow: {},
  history: [],
  lifeEvents: [],

  // ===== 初期データ（法人IDは '101','102' に統一） =====
  incomeData: {
    personal: [
      {
        id: '1',
        name: '給与収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
      {
        id: '2',
        name: '事業収入',
        type: 'profit',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
      {
        id: '3',
        name: '副業収入',
        type: 'side',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
      {
        id: '4',
        name: '配偶者収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
      {
        id: '5',
        name: '年金収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
        isAutoCalculated: false,
      },
      {
        id: '6',
        name: '配偶者年金収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
        isAutoCalculated: false,
      },
    ],
    corporate: [
      {
        id: '101', // ← ここを '101' に統一
        name: '売上',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
      {
        id: '102', // ← ここを '102' に統一
        name: 'その他収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
      },
    ],
  },
  expenseData: {
    personal: [
      { id: '11', name: '生活費', type: 'living', category: 'living', amounts: {} },
      { id: '12', name: '住居費', type: 'housing', category: 'housing', amounts: {} },
      { id: '13', name: '教育費', type: 'education', category: 'education', amounts: {} },
      { id: '14', name: 'その他', type: 'other', category: 'other', amounts: {} },
    ],
    corporate: [
      { id: '111', name: '事業経費', type: 'other', category: 'business', amounts: {} },
      { id: '112', name: 'その他経費', type: 'other', category: 'other', amounts: {} },
    ],
  },
  assetData: {
    personal: [
      {
        id: '1',
        name: '現金・預金',
        type: 'cash',
        category: 'asset',
        amounts: {},
        isInvestment: false,
        investmentReturn: 0.1,
      },
      {
        id: '2',
        name: '投資資産',
        type: 'investment',
        category: 'asset',
        amounts: {},
        isInvestment: true,
        investmentReturn: 5.0,
      },
    ],
    corporate: [],
  },
  liabilityData: {
    personal: [
      {
        id: '1',
        name: 'ローン',
        type: 'loan',
        category: 'liability',
        amounts: {},
        interestRate: 1.0,
        termYears: 35,
        autoCalculate: false, // 住宅ローンは住居費で一元計上（現行維持）
      },
      { id: '2', name: 'クレジット残高', type: 'credit', category: 'liability', amounts: {} },
    ],
    corporate: [
      {
        id: '1',
        name: '借入金',
        type: 'loan',
        category: 'liability',
        amounts: {},
        interestRate: 2.0,
        termYears: 10,
        autoCalculate: true,
      },
      { id: '2', name: '未払金', type: 'other', category: 'liability', amounts: {} },
    ],
  },

  // ===== Actions =====
  setCurrentStep: (step) => set({ currentStep: step }),

  setBasicInfo: (info) => {
    set((state) => ({ basicInfo: { ...state.basicInfo, ...info } }));
    get().initializeFormData();
    get().initializeCashFlow();
  },

  setParameters: (params) => {
    set((state) => ({ parameters: { ...state.parameters, ...params } }));

    const state = get();
    const { basicInfo, expenseData } = state;
    const startYear = basicInfo.startYear;
    const newParameters = { ...state.parameters, ...params };

    let updatedExpenseData = { ...expenseData };

    (['personal', 'corporate'] as const).forEach((section) => {
      updatedExpenseData[section] = updatedExpenseData[section].map((expense) => {
        const updatedExpense = { ...expense };

        if (updatedExpense._rawAmounts) {
          Object.keys(updatedExpense._rawAmounts).forEach((yearStr) => {
            const year = parseInt(yearStr, 10);
            const rawValue = updatedExpense._rawAmounts![year];
            const yearsSinceStart = year - startYear;

            let inflationRate = 0;
            if (
              updatedExpense.category === 'living' ||
              updatedExpense.category === 'housing' ||
              updatedExpense.category === 'business' ||
              updatedExpense.category === 'office'
            ) {
              inflationRate = newParameters.inflationRate;
            } else if (updatedExpense.category === 'education') {
              inflationRate = newParameters.educationCostIncreaseRate;
            }

            const inflationFactor = Math.pow(1 + inflationRate / 100, yearsSinceStart);
            updatedExpense.amounts[year] = Math.round(rawValue * inflationFactor * 10) / 10;
          });
        }
        return updatedExpense;
      });
    });

    set({ expenseData: updatedExpenseData });
    get().initializeCashFlow();
  },

  setCashFlow: (data) => set({ cashFlow: data }),

  updateCashFlowValue: (year, field, value) => {
    const roundedValue = Number(value.toFixed(1));
    set((state) => ({
      cashFlow: {
        ...state.cashFlow,
        [year]: {
          ...state.cashFlow[year],
          [field]: roundedValue,
        },
      },
    }));
    // 現行仕様：手修正後も即再計算で上書き（仕様維持）
    get().initializeCashFlow();
  },

  // ====== 中核：現行ロジック維持 + ピンポイント修正 ======
  syncCashFlowFromFormData: () => {
    try {
      const state = get();
      const { basicInfo, parameters, incomeData, expenseData, assetData, liabilityData, lifeEvents } = state;

      const yearsUntilDeath = basicInfo.deathAge - basicInfo.currentAge;
      const years = Array.from({ length: yearsUntilDeath + 1 }, (_, i) => basicInfo.startYear + i);

      const newCashFlow: CashFlowData = {};

      // ★直接ミューテーション回避：作業用にdeep clone
      const workingIncomeData: IncomeSection = JSON.parse(JSON.stringify(incomeData));
      const workingExpenseData: ExpenseSection = JSON.parse(JSON.stringify(expenseData));
      const workingAssetData: AssetSection = JSON.parse(JSON.stringify(assetData));
      const workingLiabilityData: LiabilitySection = JSON.parse(JSON.stringify(liabilityData));

      // --- 法人給与→法人経費 連携（従来ロジック維持） ---
      workingIncomeData.personal.forEach((incomeItem) => {
        if (incomeItem.isCorporateSalary && incomeItem.corporateSalaryType) {
          let linkedExpenseItem = workingExpenseData.corporate.find(
            (e) => e.linkedIncomeId === incomeItem.id
          );
          if (!linkedExpenseItem) {
            linkedExpenseItem = {
              id: `linked_expense_${incomeItem.id}`,
              name: `従業員給与（${incomeItem.name}）`,
              type: 'other',
              category: 'employee_salary',
              amounts: {},
              _rawAmounts: {},
              isLinkedFromIncome: true,
              linkedIncomeId: incomeItem.id,
            };
            workingExpenseData.corporate.push(linkedExpenseItem);
          }

          years.forEach((year) => {
            const salaryAmount = incomeItem._originalAmounts?.[year] || incomeItem.amounts[year] || 0;
            if (salaryAmount > 0) {
              let hasSocialInsurance = false;

              if (incomeItem.corporateSalaryType === 'full-time') {
                hasSocialInsurance = incomeItem.socialInsuranceByYear?.[year] ?? true;
              } else {
                // part-time
                if (
                  incomeItem.autoSwitchEnabled &&
                  incomeItem.autoSwitchIncomeIds?.length &&
                  !incomeItem.manualOverrideYears?.[year]
                ) {
                  let targetIncomeTotal = 0;
                  incomeItem.autoSwitchIncomeIds.forEach((id) => {
                    const t = workingIncomeData.personal.find((x) => x.id === id);
                    const v = t?._originalAmounts?.[year] || t?.amounts[year] || 0;
                    targetIncomeTotal += v;
                  });
                  hasSocialInsurance = salaryAmount > targetIncomeTotal;
                  incomeItem.socialInsuranceByYear = {
                    ...(incomeItem.socialInsuranceByYear || {}),
                    [year]: hasSocialInsurance,
                  };
                } else {
                  hasSocialInsurance = incomeItem.socialInsuranceByYear?.[year] ?? false;
                }
              }

              const employeeCost = calculateCorporateEmployeeCost(salaryAmount, hasSocialInsurance);
              linkedExpenseItem.amounts[year] = employeeCost;
              linkedExpenseItem._rawAmounts![year] = employeeCost;
            } else {
              linkedExpenseItem.amounts[year] = 0;
              linkedExpenseItem._rawAmounts![year] = 0;
            }
          });

          incomeItem.linkedExpenseId = linkedExpenseItem.id;
        }
      });

      // --- ローン返済スケジュール（問題1：その他ローンだけ利息対応） ---
      const calculateLoanRepayments = (section: 'personal' | 'corporate') => {
        const repayments: { [year: number]: number } = {};

        workingLiabilityData[section].forEach((liability) => {
          if (
            liability.autoCalculate &&
            liability.originalAmount &&
            liability.termYears &&
            liability.startYear
          ) {
            // 住宅ローン（個人・名前「ローン」）は現行維持のため除外（住居費で一元計上）
            const isPersonalHousingLoan =
              section === 'personal' && liability.name === 'ローン';

            if (isPersonalHousingLoan) return;

            const start = liability.startYear;
            const endYear = liability.startYear + liability.termYears;
            const rate = liability.interestRate ?? 0; // 年利（%）
            const repaymentType = liability.repaymentType || 'equal_payment';

            let remainingPrincipal = liability.originalAmount;

            for (
              let y = start;
              y < endYear && y <= basicInfo.startYear + yearsUntilDeath;
              y++
            ) {
              let annualPayment = 0;

              if (repaymentType === 'equal_payment') {
                // 元利均等：月額（利息込み一定）×12
                const monthly = calculateMonthlyMortgage(
                  liability.originalAmount,
                  rate,
                  liability.termYears
                );
                annualPayment = monthly * 12;
              } else {
                // 元金均等：月次で概算（残高×月利 + 均等元金）
                const monthlyPrincipal =
                  liability.originalAmount / (liability.termYears * 12);
                for (let m = 0; m < 12; m++) {
                  if (remainingPrincipal <= 0) break;
                  const monthlyInterest = (remainingPrincipal * (rate / 100)) / 12;
                  const payPrincipal = Math.min(remainingPrincipal, monthlyPrincipal);
                  annualPayment += monthlyInterest + payPrincipal;
                  remainingPrincipal -= payPrincipal;
                }
              }

              repayments[y] = (repayments[y] || 0) + Number(annualPayment.toFixed(1));
            }
          }
        });

        return repayments;
      };

      const personalLoanRepayments = calculateLoanRepayments('personal');
      const corporateLoanRepayments = calculateLoanRepayments('corporate');

      // 初期総資産（現行ロジック維持）
      let personalTotalAssets = 0;
      let corporateTotalAssets = 0;
      workingAssetData.personal.forEach((a) => {
        personalTotalAssets += a.amounts[basicInfo.startYear] || 0;
      });
      workingAssetData.corporate.forEach((a) => {
        corporateTotalAssets += a.amounts[basicInfo.startYear] || 0;
      });

      // 年金（自動計算フラグ時のみ／workingIncomeDataで計算）
      const findPersonalItem = (name: string) =>
        workingIncomeData.personal.find((i) => i.name === name);
      const pensionItem = findPersonalItem('年金収入');
      const spousePensionItem = findPersonalItem('配偶者年金収入');

      if (pensionItem && pensionItem.isAutoCalculated) {
        years.forEach((year) => {
          const age = basicInfo.currentAge + (year - basicInfo.startYear);
          pensionItem.amounts[year] =
            age >= (basicInfo.pensionStartAge || 65)
              ? calculatePensionForYear(basicInfo, workingIncomeData, year)
              : 0;
        });
      }

      if (
        spousePensionItem &&
        spousePensionItem.isAutoCalculated &&
        basicInfo.maritalStatus !== 'single'
      ) {
        years.forEach((year) => {
          const ys = year - basicInfo.startYear;
          let spouseAge = 0;
          if (basicInfo.maritalStatus === 'married' && basicInfo.spouseInfo?.currentAge) {
            spouseAge = basicInfo.spouseInfo.currentAge + ys;
          } else if (
            basicInfo.maritalStatus === 'planning' &&
            basicInfo.spouseInfo?.marriageAge &&
            basicInfo.spouseInfo?.age
          ) {
            const marriageYear =
              basicInfo.startYear +
              (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
            if (year < marriageYear) {
              spousePensionItem.amounts[year] = 0;
              return;
            }
            const ageAtMarriage = basicInfo.spouseInfo.age;
            spouseAge = ageAtMarriage + (year - marriageYear);
          }
          spousePensionItem.amounts[year] =
            spouseAge >= (basicInfo.spouseInfo?.pensionStartAge || 65)
              ? calculateSpousePensionForYear(basicInfo, workingIncomeData, year)
              : 0;
        });
      }

      // 年次ループ
      years.forEach((year, yearIndex) => {
        // 1) 収入
        let mainIncome = 0;
        let sideIncome = 0;
        let otherSideIncome = 0;
        let spouseIncome = 0;
        let pensionIncome = 0;
        let spousePensionIncome = 0;
        let corporateIncome = 0;
        let corporateOtherIncome = 0;

        workingIncomeData.personal.forEach((income) => {
          let amount = income.amounts[year] || 0;

          // 役員/従業員の法人給与 → 手取り化（現行維持）
          if (income.isCorporateSalary && income._originalAmounts?.[year]) {
            const hasSI =
              income.corporateSalaryType === 'full-time'
                ? income.socialInsuranceByYear?.[year] ?? true
                : income.socialInsuranceByYear?.[year] ?? false;
            const net = calculateNetIncomeForDirector(income._originalAmounts[year], hasSI);
            amount = net.netIncome;
            income.amounts[year] = amount; // working に対してのみ
          }

          if (income.name === '給与収入') mainIncome += amount;
          else if (income.name === '副業収入') sideIncome += amount;
          else if (income.name === '配偶者収入') spouseIncome += amount;
          else if (income.name === '年金収入') pensionIncome += amount;
          else if (income.name === '配偶者年金収入') spousePensionIncome += amount;
          else otherSideIncome += amount;
        });

        workingIncomeData.corporate.forEach((income) => {
          const amount = income.amounts[year] || 0;
          if (income.name === '売上') corporateIncome += amount;
          else corporateOtherIncome += amount;
        });

        // 2) 運用収益（資産ページの運用）
        let personalInvestmentIncome = 0;
        let corporateInvestmentIncome = 0;

        if (yearIndex > 0) {
          // 個人
          workingAssetData.personal.forEach((asset) => {
            if (asset.isInvestment && asset.type !== 'income_investment') {
              const prev = asset.amounts[year - 1] || 0;
              if (prev > 0) {
                const r = asset.investmentReturn || parameters.investmentReturn || 5.0;
                const inc = prev * (r / 100);
                personalInvestmentIncome += inc;
                const inputNow = asset.amounts[year] || 0;
                asset.amounts[year] = prev + inc + inputNow;
              } else if (!asset.amounts[year]) {
                asset.amounts[year] = 0;
              }
            } else if (!asset.isInvestment && asset.type !== 'income_investment') {
              if (!asset.amounts[year]) asset.amounts[year] = asset.amounts[year - 1] || 0;
            }
          });
          // 法人
          workingAssetData.corporate.forEach((asset) => {
            if (asset.isInvestment && asset.type !== 'income_investment') {
              const prev = asset.amounts[year - 1] || 0;
              if (prev > 0) {
                const r = asset.investmentReturn || parameters.investmentReturn || 5.0;
                const inc = prev * (r / 100);
                corporateInvestmentIncome += inc;
                const inputNow = asset.amounts[year] || 0;
                asset.amounts[year] = prev + inc + inputNow;
              } else if (!asset.amounts[year]) {
                asset.amounts[year] = 0;
              }
            } else if (!asset.isInvestment && asset.type !== 'income_investment') {
              if (!asset.amounts[year]) asset.amounts[year] = asset.amounts[year - 1] || 0;
            }
          });
        } else {
          // 初年度：設定値をそのまま
          workingAssetData.personal.forEach((asset) => {
            if (!asset.amounts[year] && asset.type !== 'income_investment') {
              asset.amounts[year] = asset.amounts[basicInfo.startYear] || 0;
            }
          });
          workingAssetData.corporate.forEach((asset) => {
            if (!asset.amounts[year] && asset.type !== 'income_investment') {
              asset.amounts[year] = asset.amounts[basicInfo.startYear] || 0;
            }
          });
        }

        // 3) 支出（＋配偶者追加支出の上乗せ）
        let livingExpense = 0;
        let housingExpense = 0;
        let educationExpense = 0;
        let otherPersonalExpense = 0;
        let corporateExpense = 0;
        let corporateOtherExpense = 0;
        let corporateCost = 0;

        workingExpenseData.personal.forEach((expense) => {
          const amount = expense.amounts[year] || 0;
          if (expense.name === '生活費') {
            livingExpense += amount;

            // ★配偶者追加支出の上乗せ（結婚年以降）
            const add = basicInfo.spouseInfo?.additionalExpense || 0;
            if (add > 0 && basicInfo.maritalStatus !== 'single') {
              let effective = true;
              if (basicInfo.maritalStatus === 'planning' && basicInfo.spouseInfo?.marriageAge) {
                const marriageYear =
                  basicInfo.startYear +
                  (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
                if (year < marriageYear) effective = false;
              }
              if (effective) {
                const yearsSinceStart = year - basicInfo.startYear;
                const inflationFactor = Math.pow(
                  1 + (parameters.inflationRate || 0) / 100,
                  yearsSinceStart
                );
                livingExpense += Math.round(add * inflationFactor * 10) / 10;
              }
            }
          } else if (expense.name === '住居費') {
            housingExpense += amount;
          } else if (expense.name === '教育費') {
            educationExpense += amount;
          } else {
            otherPersonalExpense += amount;
          }
        });

        workingExpenseData.corporate.forEach((expense) => {
          if (expense.category === 'cost' && expense._costSettings) {
            const yearsSinceStart = year - basicInfo.startYear;
            let totalRevenue = 0;
            workingIncomeData.corporate.forEach((r) => {
              totalRevenue += r.amounts[year] || 0;
            });
            const adjusted = expense._costSettings.costRatio +
              expense._costSettings.costIncreaseRate * yearsSinceStart;
            let costAmount = totalRevenue * (adjusted / 100);
            if (expense._costSettings.maxCostAmount && costAmount > expense._costSettings.maxCostAmount) {
              costAmount = expense._costSettings.maxCostAmount;
            }
            corporateCost += costAmount;
            expense.amounts[year] = Math.floor(costAmount);
          } else {
            const amount = expense.amounts[year] || 0;
            if (expense.name === '事業経費') corporateExpense += amount;
            else corporateOtherExpense += amount;
          }
        });

        // 4) ライフイベント
        let personalLifeEventIncome = 0;
        let personalLifeEventExpense = 0;
        let corporateLifeEventIncome = 0;
        let corporateLifeEventExpense = 0;
        lifeEvents
          .filter((e) => e.year === year)
          .forEach((e) => {
            if (e.source === 'personal') {
              if (e.type === 'income') personalLifeEventIncome += e.amount;
              else personalLifeEventExpense += e.amount;
            } else if (e.source === 'corporate') {
              if (e.type === 'income') corporateLifeEventIncome += e.amount;
              else corporateLifeEventExpense += e.amount;
            }
          });

        // 5) ローン返済（住宅ローンは含まない）
        const personalLoanRepayment = personalLoanRepayments[year] || 0;
        const corporateLoanRepayment = corporateLoanRepayments[year] || 0;

        // 6) 収入投資（現行維持）
        let personalInvestmentAmount = 0;
        let corporateInvestmentAmount = 0;

        (['personal', 'corporate'] as const).forEach((section) => {
          workingAssetData[section].forEach((asset) => {
            if (asset.type === 'income_investment' && asset.linkedIncomeId) {
              const previousBalance = yearIndex > 0 ? asset.amounts[year - 1] || 0 : 0;

              // 収入投資の運用益（前年残高に対して）
              let assetInvestmentIncome = 0;
              if (yearIndex > 0 && previousBalance > 0) {
                const returnRate = asset.investmentReturn || 0;
                assetInvestmentIncome = previousBalance * (returnRate / 100);
                if (section === 'personal') personalInvestmentIncome += assetInvestmentIncome;
                else corporateInvestmentIncome += assetInvestmentIncome;
              }

              // リンク収入を取得（sectionまたは明示されたlinkedIncomeType）
              const linkedType = (asset.linkedIncomeType || section) as 'personal' | 'corporate';
              const linkedIncome = workingIncomeData[linkedType].find(
                (i) => i.id === asset.linkedIncomeId
              );

              if (linkedIncome) {
                const incomeAmount = linkedIncome.amounts[year] || 0;
                const ratio = asset.investmentRatio || 0;
                const maxAmt = asset.maxInvestmentAmount || Infinity;

                // 投資額を除いた仮収支がプラスのときのみ投資
                const tentative = calculateTentativeBalance(section, {
                  mainIncome,
                  sideIncome,
                  otherSideIncome,
                  spouseIncome,
                  pensionIncome,
                  spousePensionIncome,
                  personalInvestmentIncome,
                  personalLifeEventIncome,
                  livingExpense,
                  housingExpense,
                  educationExpense,
                  otherPersonalExpense,
                  personalLifeEventExpense,
                  personalLoanRepayment,
                  corporateIncome,
                  corporateOtherIncome,
                  corporateInvestmentIncome,
                  corporateLifeEventIncome,
                  corporateExpense,
                  corporateOtherExpense,
                  corporateCost,
                  corporateLifeEventExpense,
                  corporateLoanRepayment,
                  parameters,
                });

                let newInvestmentAmount = 0;
                if (tentative > 0) {
                  newInvestmentAmount = Math.min(incomeAmount * (ratio / 100), maxAmt);
                }

                if (section === 'personal') personalInvestmentAmount += newInvestmentAmount;
                else corporateInvestmentAmount += newInvestmentAmount;

                asset.amounts[year] = previousBalance + assetInvestmentIncome + newInvestmentAmount;
              } else {
                asset.amounts[year] = previousBalance + assetInvestmentIncome;
              }
            }
          });
        });

        // 7) 負債総額（現行のまま：残高未更新のため多くが0でも仕様維持）
        let personalLiabilityTotal = 0;
        let corporateLiabilityTotal = 0;
        liabilityData.personal.forEach((l) => {
          personalLiabilityTotal += Math.abs(l.amounts[year] || 0);
        });
        liabilityData.corporate.forEach((l) => {
          corporateLiabilityTotal += Math.abs(l.amounts[year] || 0);
        });

        // 8) 法人税
        const corporateTotalIncome =
          corporateIncome + corporateOtherIncome + corporateInvestmentIncome + corporateLifeEventIncome;
        const corporateTotalExpense =
          corporateExpense +
          corporateOtherExpense +
          corporateCost +
          corporateInvestmentAmount +
          corporateLifeEventExpense +
          corporateLoanRepayment;
        const corporatePretaxProfit = corporateTotalIncome - corporateTotalExpense;
        const taxResult = calculateCorporateTax(corporatePretaxProfit, parameters.corporateTaxSettings);

        // 9) 収支
        const personalTotalIncome =
          mainIncome +
          sideIncome +
          otherSideIncome +
          spouseIncome +
          pensionIncome +
          spousePensionIncome +
          personalInvestmentIncome +
          personalLifeEventIncome;
        const personalTotalExpense =
          livingExpense +
          housingExpense +
          educationExpense +
          otherPersonalExpense +
          personalInvestmentAmount +
          personalLifeEventExpense +
          personalLoanRepayment;
        const personalBalance = personalTotalIncome - personalTotalExpense;

        const corporateBalance = taxResult.aftertaxProfit;

        // 10) 総資産（現行維持。※投資益の二重乗り問題は未変更）
        personalTotalAssets += personalBalance;
        corporateTotalAssets += corporateBalance;

        let currentPersonalAssetPageTotal = 0;
        let currentCorporateAssetPageTotal = 0;
        workingAssetData.personal.forEach((a) => (currentPersonalAssetPageTotal += a.amounts[year] || 0));
        workingAssetData.corporate.forEach((a) => (currentCorporateAssetPageTotal += a.amounts[year] || 0));

        if (yearIndex > 0) {
          let prevPersonal = 0;
          let prevCorporate = 0;
          workingAssetData.personal.forEach((a) => (prevPersonal += a.amounts[year - 1] || 0));
          workingAssetData.corporate.forEach((a) => (prevCorporate += a.amounts[year - 1] || 0));

          personalTotalAssets += currentPersonalAssetPageTotal - prevPersonal;
          corporateTotalAssets += currentCorporateAssetPageTotal - prevCorporate;
        }

        const currentPersonalInvestmentAssets = currentPersonalAssetPageTotal;
        const currentCorporateInvestmentAssets = currentCorporateAssetPageTotal;

        const personalNetAssets = personalTotalAssets - personalLiabilityTotal;
        const corporateNetAssets = corporateTotalAssets - corporateLiabilityTotal;

        // 11) 保存
        newCashFlow[year] = {
          mainIncome: Math.round(mainIncome * 10) / 10,
          sideIncome: Math.round((sideIncome + otherSideIncome) * 10) / 10,
          spouseIncome: Math.round(spouseIncome * 10) / 10,
          pensionIncome: Math.round(pensionIncome * 10) / 10,
          spousePensionIncome: Math.round(spousePensionIncome * 10) / 10,
          investmentIncome: Math.round(personalInvestmentIncome * 10) / 10,
          livingExpense: Math.round(livingExpense * 10) / 10,
          housingExpense: Math.round(housingExpense * 10) / 10,
          educationExpense: Math.round(educationExpense * 10) / 10,
          otherExpense: Math.round(otherPersonalExpense * 10) / 10,
          loanRepayment: Math.round(personalLoanRepayment * 10) / 10,
          personalAssets: Math.round(personalTotalAssets * 10) / 10,
          investmentAmount: Math.round(personalInvestmentAmount * 10) / 10,
          totalInvestmentAssets: Math.round(currentPersonalInvestmentAssets * 10) / 10,
          personalBalance: Math.round(personalBalance * 10) / 10,
          personalTotalAssets: Math.round(personalTotalAssets * 10) / 10,
          personalLiabilityTotal: Math.round(personalLiabilityTotal * 10) / 10,
          personalNetAssets: Math.round(personalNetAssets * 10) / 10,
          corporateIncome: Math.round(corporateIncome * 10) / 10,
          corporateOtherIncome: Math.round(corporateOtherIncome * 10) / 10,
          corporateExpense: Math.round((corporateExpense + corporateCost) * 10) / 10,
          corporateOtherExpense: Math.round(corporateOtherExpense * 10) / 10,
          corporateLoanRepayment: Math.round(corporateLoanRepayment * 10) / 10,
          corporateBalance: Math.round(corporateBalance * 10) / 10,
          corporateTotalAssets: Math.round(corporateTotalAssets * 10) / 10,
          corporateLiabilityTotal: Math.round(corporateLiabilityTotal * 10) / 10,
          corporateNetAssets: Math.round(corporateNetAssets * 10) / 10,
          corporateInvestmentAmount: Math.round(corporateInvestmentAmount * 10) / 10,
          corporateInvestmentIncome: Math.round(corporateInvestmentIncome * 10) / 10,
          corporateTotalInvestmentAssets: Math.round(currentCorporateInvestmentAssets * 10) / 10,
          corporatePretaxProfit: taxResult.pretaxProfit,
          corporateTax: taxResult.corporateTax,
          localCorporateTax: taxResult.localCorporateTax,
          residentTaxEqual: taxResult.residentTaxEqual,
          residentTaxProportional: taxResult.residentTaxProportional,
          corporateTotalTax: taxResult.totalTax,
          corporateAftertaxProfit: taxResult.aftertaxProfit,
          corporateEffectiveTaxRate: taxResult.effectiveTaxRate,
        };
      });

      // ★最後にset：working*を正式反映（直接ミューテ禁止のため）
      set({
        incomeData: workingIncomeData,
        expenseData: workingExpenseData,
        cashFlow: newCashFlow,
      });
    } catch (error) {
      console.error('Error in syncCashFlowFromFormData:', error);
    }
  },

  initializeCashFlow: () => {
    get().syncCashFlowFromFormData();
  },

  // Form data actions
  setIncomeData: (data) => {
    set({ incomeData: data });
    get().initializeCashFlow();
  },

  setExpenseData: (data) => {
    set({ expenseData: data });
    get().initializeCashFlow();
  },

  setAssetData: (data) => {
    set({ assetData: data });
    get().initializeCashFlow();
  },

  setLiabilityData: (data) => {
    set({ liabilityData: data });
    get().initializeCashFlow();
  },

  addLifeEvent: (event) => {
    set((state) => ({ lifeEvents: [...state.lifeEvents, event] }));
    get().initializeCashFlow();
  },

  removeLifeEvent: (index) => {
    set((state) => ({
      lifeEvents: state.lifeEvents.filter((_, i) => i !== index),
    }));
    get().initializeCashFlow();
  },

  addHistoryEntry: (entry) => {
    set((state) => ({
      history: [...state.history, { ...entry, timestamp: Date.now() }],
    }));
  },

  clearHistory: () => set({ history: [] }),

  updateCorporateTaxSettings: (settings) => {
    set((state) => ({
      parameters: {
        ...state.parameters,
        corporateTaxSettings: {
          ...state.parameters.corporateTaxSettings,
          ...settings,
        },
      },
    }));
    get().initializeCashFlow();
  },

  saveToLocalStorage: () => {
    const state = get();
    try {
      const data = {
        basicInfo: state.basicInfo,
        parameters: state.parameters,
        incomeData: state.incomeData,
        expenseData: state.expenseData,
        assetData: state.assetData,
        liabilityData: state.liabilityData,
        lifeEvents: state.lifeEvents,
      };
      localStorage.setItem('simulatorState', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const savedState = localStorage.getItem('simulatorState');
      if (savedState) {
        const data = JSON.parse(savedState);
        set({
          basicInfo: data.basicInfo,
          parameters: {
            ...data.parameters,
            corporateTaxSettings:
              data.parameters?.corporateTaxSettings || DEFAULT_CORPORATE_TAX_SETTINGS,
          },
          incomeData: data.incomeData,
          expenseData: data.expenseData,
          assetData: data.assetData,
          liabilityData: data.liabilityData,
          lifeEvents: data.lifeEvents || [],
        });
        get().initializeCashFlow();
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  },

  // 初期化（元の挙動を維持しつつ、問題2/4対応 & 法人ID101/102）
  initializeFormData: () => {
    const state = get();
    const { basicInfo, parameters, incomeData: existingIncomeData, expenseData: existingExpenseData } = state;

    // 既存入力がある場合はスキップ（元の仕様）
    if (existingIncomeData?.personal?.length) {
      const hasIncomeData = existingIncomeData.personal.some(
        (item) =>
          Object.keys(item.amounts || {}).length > 0 ||
          Object.keys(item._originalAmounts || {}).length > 0
      );
      const hasExpenseData = existingExpenseData.personal.some(
        (item) =>
          Object.keys(item.amounts || {}).length > 0 ||
          Object.keys(item._rawAmounts || {}).length > 0
      );
      if (hasIncomeData || hasExpenseData) {
        console.log('既存データが検出されたため、初期化をスキップします');
        return;
      }
    }

    const yearsUntilDeath = basicInfo.deathAge - basicInfo.currentAge;
    const years = Array.from({ length: yearsUntilDeath + 1 }, (_, i) => basicInfo.startYear + i);

    // 収入（法人IDは '101','102'）
    const newIncomeData: IncomeSection = {
      personal: [
        { id: '1', name: '給与収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
        { id: '2', name: '事業収入', type: 'profit', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
        { id: '3', name: '副業収入', type: 'side', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
        { id: '4', name: '年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0, isAutoCalculated: true },
      ],
      corporate: [
        { id: '101', name: '売上', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
        { id: '102', name: 'その他収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      ],
    };

    if (basicInfo.maritalStatus !== 'single') {
      const spousePensionItem = newIncomeData.personal.find((i) => i.name === '配偶者年金収入');
      if (!spousePensionItem) {
        newIncomeData.personal.push({
          id: '5',
          name: '配偶者年金収入',
          type: 'income',
          category: 'income',
          amounts: {},
          investmentRatio: 0,
          maxInvestmentAmount: 0,
          isAutoCalculated: true,
        });
      }
    }

    if (
      basicInfo.maritalStatus !== 'single' &&
      basicInfo.spouseInfo?.occupation &&
      basicInfo.spouseInfo.occupation !== 'homemaker'
    ) {
      const spouseIncomeItem = newIncomeData.personal.find((i) => i.name === '配偶者収入');
      if (!spouseIncomeItem) {
        newIncomeData.personal.push({
          id: String(newIncomeData.personal.length + 1),
          name: '配偶者収入',
          type: 'income',
          category: 'income',
          amounts: {},
          investmentRatio: 0,
          maxInvestmentAmount: 0,
        });
      }
    }

    // 支出（住居費は startYear 基準で算出）
    const newExpenseData: ExpenseSection = { ...state.expenseData };

    years.forEach((year) => {
      const yearsSinceStart = year - basicInfo.startYear;

      const living = newExpenseData.personal.find((i) => i.name === '生活費');
      if (living) {
        const baseAmount = basicInfo.monthlyLivingExpense * 12;
        const infl = Math.pow(1 + (parameters.inflationRate || 0) / 100, yearsSinceStart);
        const inflated = Math.round(baseAmount * infl * 10) / 10;
        living._rawAmounts = { ...(living._rawAmounts || {}), [year]: baseAmount };
        living.amounts[year] = inflated;
      }

      const housing = newExpenseData.personal.find((i) => i.name === '住居費');
      if (housing) {
        // ★startYear を渡す
        const baseAmount = calculateHousingExpense(basicInfo.housingInfo, year, basicInfo.startYear);
        housing._rawAmounts = { ...(housing._rawAmounts || {}), [year]: baseAmount };
        housing.amounts[year] = baseAmount;
      }

      const education = newExpenseData.personal.find((i) => i.name === '教育費');
      if (education) {
        education.category = 'education';
        education.type = 'education';
        const base = calculateEducationExpense(
          basicInfo.children,
          basicInfo.plannedChildren,
          year,
          basicInfo.currentAge,
          basicInfo.startYear,
          parameters.educationCostIncreaseRate
        );
        education._rawAmounts = { ...(education._rawAmounts || {}), [year]: base };
        education.amounts[year] = base;
      }
    });

    // 資産（元の初期化）
    const newAssetData: AssetSection = { ...state.assetData };
    if (basicInfo.housingInfo.type === 'own' && basicInfo.housingInfo.own) {
      const realEstateItem = newAssetData.personal.find((i) => i.name === '不動産');
      if (realEstateItem) {
        realEstateItem.amounts[basicInfo.housingInfo.own.purchaseYear] =
          basicInfo.housingInfo.own.purchasePrice;
      }
    }

    // 負債（住宅ローン条件を同期、ただし autoCalculate=false は維持）
    const newLiabilityData: LiabilitySection = { ...state.liabilityData };
    if (basicInfo.housingInfo.type === 'own' && basicInfo.housingInfo.own) {
      const loanItem = newLiabilityData.personal.find((i) => i.name === 'ローン');
      if (loanItem) {
        loanItem.interestRate = basicInfo.housingInfo.own.interestRate;
        loanItem.termYears = basicInfo.housingInfo.own.loanTermYears;
        loanItem.startYear = basicInfo.housingInfo.own.purchaseYear;
        loanItem.originalAmount = basicInfo.housingInfo.own.loanAmount;
        loanItem.repaymentType = loanItem.repaymentType || 'equal_payment';
        loanItem.autoCalculate = false; // 住宅ローンは住居費で一元計上（現行維持）
        loanItem.amounts[basicInfo.housingInfo.own.purchaseYear] =
          basicInfo.housingInfo.own.loanAmount;
      }
    }

    set({
      incomeData: newIncomeData,
      expenseData: newExpenseData,
      assetData: newAssetData,
      liabilityData: newLiabilityData,
    });
  },
}));

import { create } from 'zustand';
import { calculateNetIncome, calculateHousingExpense, calculateCorporateTax, CorporateTaxSettings, DEFAULT_CORPORATE_TAX_SETTINGS, calculateNetIncomeForDirector, calculateCorporateEmployeeCost } from '@/lib/calculations';
import { 
  calculatePensionForYear, 
  calculateSpousePensionForYear 
} from '@/lib/pension-calculations';

type Occupation = 'company_employee' | 'part_time_with_pension' | 'part_time_without_pension' | 'self_employed' | 'homemaker';

export interface IncomeItem {
  id: string;
  name: string;
  type: 'income' | 'profit' | 'side';
  category?: string;
  amounts: { [year: number]: number };
  // 原本額面データを保存
  _originalAmounts?: { [year: number]: number };
  // 手取り額を保存
  _netAmounts?: { [year: number]: number };
  // 投資関連プロパティ（収入投資への移行により削除予定）
  investmentRatio: number; 
  maxInvestmentAmount: number;
  // 自動計算フラグ
  isAutoCalculated?: boolean;
  // 法人給与関連の新規プロパティ
  isCorporateSalary?: boolean;  // 法人給与フラグ
  corporateSalaryType?: 'full-time' | 'part-time';  // 専業/副業
  socialInsuranceByYear?: { [year: number]: boolean };  // 年度ごとの社保有無
  linkedExpenseId?: string;  // 連携先の法人経費ID
  // 自動切り替え用の新規プロパティ
  autoSwitchIncomeIds?: string[];  // 監視対象の収入項目IDリスト
  autoSwitchEnabled?: boolean;  // 自動切り替え機能の有効/無効
  manualOverrideYears?: { [year: number]: boolean };  // 手動で設定された年度（自動切り替えをスキップ）
}

export interface IncomeSection {
  personal: IncomeItem[];
  corporate: IncomeItem[];
}

// Expense types - 法人原価設定を追加
export interface ExpenseItem {
  id: string;
  name: string;
  type: 'living' | 'housing' | 'education' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  // 生の入力値を保存
  _rawAmounts?: { [year: number]: number };
  // 法人原価設定
  _costSettings?: {
    costRatio: number; // 売上に対する原価率（%）
    costIncreaseRate: number; // 原価上昇率（%）
    maxCostAmount?: number; // 原価上限値（万円）
  };
  // 法人給与連携フラグ
  isLinkedFromIncome?: boolean;  // 収入から自動連携されたフラグ
  linkedIncomeId?: string;  // 連携元の収入ID
}

export interface ExpenseSection {
  personal: ExpenseItem[];
  corporate: ExpenseItem[];
}

// Asset types - **修正**: 収入投資用のプロパティを追加
export interface AssetItem {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'income_investment' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  isInvestment?: boolean;
  investmentReturn?: number;
  // 収入投資用のフィールド
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

// Liability types - 修正版：計算済みフラグを追加
export interface LiabilityItem {
  id: string;
  name: string;
  type: 'loan' | 'credit' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  interestRate?: number;
  termYears?: number;
  startYear?: number;
  repaymentType?: 'equal_principal' | 'equal_payment';
  autoCalculate?: boolean;
  // 借入時の元本を記録
  originalAmount?: number;
  // 計算済みフラグ（重複計算を防ぐ）
  _isCalculated?: boolean;
  // 計算時のハッシュ（設定変更検知用）
  _calculationHash?: string;
}

export interface LiabilitySection {
  personal: LiabilityItem[];
  corporate: LiabilityItem[];
}

// History types
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
      interestRate: number;
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
    // 配偶者の年金関連情報も保存
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
  // 年金関連フィールド
  workStartAge?: number;
  pensionStartAge?: number;
  willWorkAfterPension?: boolean;
}

// **修正**: Parameters インターフェースから incomeInvestmentReturn を削除
export interface Parameters {
  inflationRate: number;
  educationCostIncreaseRate: number;
  investmentReturn: number;
  investmentRatio?: number;
  maxInvestmentAmount?: number;
  // **削除**: incomeInvestmentReturn
  // **新機能**: 法人税設定
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
    // **新機能**: 法人税関連
    corporatePretaxProfit: number;        // 税引き前利益
    corporateTax: number;                 // 法人税
    localCorporateTax: number;            // 地方法人税
    residentTaxEqual: number;             // 法人住民税（均等割）
    residentTaxProportional: number;      // 法人住民税（法人税割）
    corporateTotalTax: number;            // 税金合計
    corporateAftertaxProfit: number;      // 税引き後利益
    corporateEffectiveTaxRate: number;    // 実効税率
  };
}

// ライフイベントの型定義
export interface LifeEvent {
  year: number;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  source: 'personal' | 'corporate' | 'personal_investment' | 'corporate_investment';
}

interface SimulatorState {
  currentStep: number;
  basicInfo: BasicInfo;
  parameters: Parameters;
  cashFlow: CashFlowData;
  history: HistoryEntry[];
  
  // Form data
  incomeData: IncomeSection;
  expenseData: ExpenseSection;
  assetData: AssetSection;
  liabilityData: LiabilitySection;
  lifeEvents: LifeEvent[];

  // Actions
  setCurrentStep: (step: number) => void;
  setBasicInfo: (info: Partial<BasicInfo>) => void;
  setParameters: (params: Partial<Parameters>) => void;
  setCashFlow: (data: CashFlowData) => void;
  updateCashFlowValue: (year: number, field: keyof CashFlowData[number], value: number) => void;
  initializeCashFlow: () => void;
  initializeFormData: () => void;
  syncCashFlowFromFormData: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;

  // ライフイベント
  addLifeEvent: (event: LifeEvent) => void;
  removeLifeEvent: (index: number) => void;

  // Form data actions
  setIncomeData: (data: IncomeSection) => void;
  setExpenseData: (data: ExpenseSection) => void;
  setAssetData: (data: AssetSection) => void;
  setLiabilityData: (data: LiabilitySection) => void;
  
  // History actions
  addHistoryEntry: (entry: Omit<HistoryEntry, 'timestamp'>) => void;
  clearHistory: () => void;

  // **新機能**: 法人税設定関連のアクション
  updateCorporateTaxSettings: (settings: Partial<CorporateTaxSettings>) => void;
}

// 教育費計算関数（元のファイルから抽出）
function calculateEducationExpense(
  children: BasicInfo['children'],
  plannedChildren: BasicInfo['plannedChildren'],
  year: number,
  currentAge: number,
  startYear: number,
  educationCostIncreaseRate: number
): number {
  const yearsSinceStart = year - startYear;
  const educationInflationFactor = Math.pow(1 + educationCostIncreaseRate / 100, yearsSinceStart);
  
  const existingChildrenExpense = children.reduce((total, child) => {
    const childAge = child.currentAge + yearsSinceStart;
    let expense = 0;

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
          '行かない': 0
      }
    };

    if (childAge >= 0 && childAge <= 2) {
      expense = costs.nursery[child.educationPlan.nursery] || 0;
    }
    if (childAge >= 3 && childAge <= 5) {
      expense = costs.preschool[child.educationPlan.preschool] || 0;
    }
    if (childAge >= 6 && childAge <= 11) {
      expense = costs.elementary[child.educationPlan.elementary] || 0;
    }
    if (childAge >= 12 && childAge <= 14) {
      expense = costs.juniorHigh[child.educationPlan.juniorHigh] || 0;
    }
    if (childAge >= 15 && childAge <= 17) {
      expense = costs.highSchool[child.educationPlan.highSchool] || 0;
    }
    if (childAge >= 18 && childAge <= 21) {
      expense = costs.university[child.educationPlan.university] || 0;
    }

    const inflatedExpense = expense * educationInflationFactor;
    return total + inflatedExpense;
  }, 0);

  const plannedChildrenExpense = plannedChildren.reduce((total, child) => {
    if (yearsSinceStart >= child.yearsFromNow) {
      const childAge = yearsSinceStart - child.yearsFromNow;
      let expense = 0;

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
          '行かない': 0
        }
      };

      if (childAge >= 0 && childAge <= 2) {
        expense = costs.nursery[child.educationPlan.nursery] || 0;
      }
      if (childAge >= 3 && childAge <= 5) {
        expense = costs.preschool[child.educationPlan.preschool] || 0;
      }
      if (childAge >= 6 && childAge <= 11) {
        expense = costs.elementary[child.educationPlan.elementary] || 0;
      }
      if (childAge >= 12 && childAge <= 14) {
        expense = costs.juniorHigh[child.educationPlan.juniorHigh] || 0;
      }
      if (childAge >= 15 && childAge <= 17) {
        expense = costs.highSchool[child.educationPlan.highSchool] || 0;
      }
      if (childAge >= 18 && childAge <= 21) {
        expense = costs.university[child.educationPlan.university] || 0;
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
  // **修正**: parameters から incomeInvestmentReturn を削除
  parameters: {
    inflationRate: 0,
    educationCostIncreaseRate: 0,
    investmentReturn: 0,
    investmentRatio: 0,
    maxInvestmentAmount: 0,
    // **新機能**: デフォルトの法人税設定
    corporateTaxSettings: DEFAULT_CORPORATE_TAX_SETTINGS,
  },
  cashFlow: {},
  history: [],
  lifeEvents: [],

  // Initialize form data
  incomeData: {
    personal: [
      { id: '1', name: '給与収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      { id: '2', name: '事業収入', type: 'profit', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      { id: '3', name: '副業収入', type: 'side', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      { id: '4', name: '配偶者収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      { id: '5', name: '年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0, isAutoCalculated: false },
      { id: '6', name: '配偶者年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0, isAutoCalculated: false },
    ],
    corporate: [
      { id: '101', name: '売上', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
      { id: '102', name: 'その他収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
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
      { id: '1', name: '現金・預金', type: 'cash', category: 'asset', amounts: {}, isInvestment: false, investmentReturn: 0.1 },
      { id: '2', name: '投資資産', type: 'investment', category: 'asset', amounts: {}, isInvestment: true, investmentReturn: 5.0 },
    ],
    corporate: [],
  },
  liabilityData: {
    personal: [
      { id: '1', name: 'ローン', type: 'loan', category: 'liability', amounts: {}, interestRate: 1.0, termYears: 35 },
      { id: '2', name: 'クレジット残高', type: 'credit', category: 'liability', amounts: {} },
    ],
    corporate: [
      { id: '1', name: '借入金', type: 'loan', category: 'liability', amounts: {}, interestRate: 2.0, termYears: 10 },
      { id: '2', name: '未払金', type: 'other', category: 'liability', amounts: {} },
    ],
  },

  // Actions
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setBasicInfo: (info) => {
    set((state) => ({ basicInfo: { ...state.basicInfo, ...info } }));
    get().initializeFormData();
    get().initializeCashFlow();
  },
  
  setParameters: (params) => {
    set((state) => ({ parameters: { ...state.parameters, ...params } }));
    
    // パラメータ変更時に支出データのインフレ再計算を行う
    const state = get();
    const { basicInfo, expenseData } = state;
    const startYear = basicInfo.startYear;
    
    // 更新後のパラメータをマージ
    const newParameters = { ...state.parameters, ...params };
    
    // 支出データの全項目について再計算
    let updatedExpenseData = { ...expenseData };
    
    ['personal', 'corporate'].forEach(section => {
      updatedExpenseData[section] = updatedExpenseData[section].map(expense => {
        const updatedExpense = { ...expense };
        
        // 生データがある場合、その値からインフレ計算をやり直す
        if (updatedExpense._rawAmounts) {
          Object.keys(updatedExpense._rawAmounts).forEach(yearStr => {
            const year = parseInt(yearStr);
            const rawValue = updatedExpense._rawAmounts![year];
            const yearsSinceStart = year - startYear;
            
            let inflationRate = 0;
            if (updatedExpense.category === 'living' || updatedExpense.category === 'housing' || 
                updatedExpense.category === 'business' || updatedExpense.category === 'office') {
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
    get().initializeCashFlow();
  },
  // **完全修正版: syncCashFlowFromFormData - 法人給与連携機能追加**
  syncCashFlowFromFormData: () => {
    try {
      const state = get();
      const { basicInfo, parameters, incomeData, expenseData, assetData, liabilityData, lifeEvents } = state;
      const yearsUntilDeath = basicInfo.deathAge - basicInfo.currentAge;
      const years = Array.from(
        { length: yearsUntilDeath + 1 },
        (_, i) => basicInfo.startYear + i
      );

      const newCashFlow: CashFlowData = {};
      
      // 資産と負債のデータをディープコピーして作業用として使用
      const workingAssetData = JSON.parse(JSON.stringify(assetData));
      const workingLiabilityData = JSON.parse(JSON.stringify(liabilityData));
      const workingExpenseData = JSON.parse(JSON.stringify(expenseData));
      
      // 法人給与から法人経費への連携処理
      incomeData.personal.forEach((incomeItem) => {
        if (incomeItem.isCorporateSalary && incomeItem.corporateSalaryType) {
          // 既存の連携済み経費を探す、なければ新規作成
          let linkedExpenseItem = workingExpenseData.corporate.find(
            (expense: ExpenseItem) => expense.linkedIncomeId === incomeItem.id
          );
          
          if (!linkedExpenseItem) {
            // 新規作成
            linkedExpenseItem = {
              id: `linked_expense_${incomeItem.id}`,
              name: `従業員給与（${incomeItem.name}）`,
              type: 'other' as const,
              category: 'employee_salary',
              amounts: {},
              _rawAmounts: {},
              isLinkedFromIncome: true,
              linkedIncomeId: incomeItem.id
            };
            workingExpenseData.corporate.push(linkedExpenseItem);
          }
          
          // 各年の法人経費を計算
          years.forEach(year => {
            const salaryAmount = incomeItem._originalAmounts?.[year] || incomeItem.amounts[year] || 0;
            
            if (salaryAmount > 0) {
              // 社保設定の判定
              let hasSocialInsurance = false;
              
              if (incomeItem.corporateSalaryType === 'full-time') {
                // 専業の場合は常に社保あり（設定値がある場合はそれを使用）
                hasSocialInsurance = incomeItem.socialInsuranceByYear?.[year] ?? true;
              } else if (incomeItem.corporateSalaryType === 'part-time') {
                // 副業の場合
                if (incomeItem.autoSwitchEnabled && 
                    incomeItem.autoSwitchIncomeIds && 
                    incomeItem.autoSwitchIncomeIds.length > 0 &&
                    !incomeItem.manualOverrideYears?.[year]) {
                  // 自動切り替えが有効かつ手動設定されていない場合
                  
                  // 監視対象収入の合計を計算（額面で比較）
                  let targetIncomeTotal = 0;
                  incomeItem.autoSwitchIncomeIds.forEach(targetId => {
                    const targetIncome = incomeData.personal.find(item => item.id === targetId);
                    if (targetIncome) {
                      // 額面があれば額面を、なければ手取りを使用
                      const targetAmount = targetIncome._originalAmounts?.[year] || targetIncome.amounts[year] || 0;
                      targetIncomeTotal += targetAmount;
                    }
                  });
                  
                  // デバッグ用ログ
                  console.log(`自動切り替え判定 ${year}年:`, {
                    法人給与額面: salaryAmount,
                    監視対象収入合計: targetIncomeTotal,
                    判定結果: salaryAmount > targetIncomeTotal ? '社保あり' : '社保なし'
                  });
                  
                  // 法人給与が監視対象収入を上回った場合、社保を自動でオンにする
                  if (salaryAmount > targetIncomeTotal) {
                    hasSocialInsurance = true;
                    // socialInsuranceByYearも更新
                    if (!incomeItem.socialInsuranceByYear) {
                      incomeItem.socialInsuranceByYear = {};
                    }
                    incomeItem.socialInsuranceByYear[year] = true;
                  } else {
                    // 上回らない場合は設定値を使用（デフォルトはfalse）
                    hasSocialInsurance = false;
                    if (!incomeItem.socialInsuranceByYear) {
                      incomeItem.socialInsuranceByYear = {};
                    }
                    incomeItem.socialInsuranceByYear[year] = false;
                  }
                } else {
                  // 自動切り替えが無効または手動設定済みの場合は設定値を使用
                  hasSocialInsurance = incomeItem.socialInsuranceByYear?.[year] ?? false;
                }
              }
              
              // 法人側の従業員給与費用を計算
              const employeeCost = calculateCorporateEmployeeCost(salaryAmount, hasSocialInsurance);
              
              linkedExpenseItem.amounts[year] = employeeCost;
              linkedExpenseItem._rawAmounts![year] = employeeCost;
            } else {
              linkedExpenseItem.amounts[year] = 0;
              linkedExpenseItem._rawAmounts![year] = 0;
            }
          });
          
          // linkedExpenseIdを収入側に保存
          incomeItem.linkedExpenseId = linkedExpenseItem.id;
        }
      });
      
      // 負債の返済スケジュールを計算
      const calculateLoanRepayments = (section: 'personal' | 'corporate') => {
        let repayments: { [year: number]: number } = {};
        
        // 各負債項目の返済を計算
        workingLiabilityData[section].forEach((liability: any) => {
          if (liability.autoCalculate && liability.originalAmount && liability.termYears && liability.startYear) {
            for (let i = 0; i < liability.termYears; i++) {
              const repaymentYear = liability.startYear + i;
              if (repaymentYear >= basicInfo.startYear && repaymentYear <= basicInfo.startYear + yearsUntilDeath) {
                const monthlyPayment = liability.originalAmount / liability.termYears / 12;
                const annualPayment = monthlyPayment * 12;
                repayments[repaymentYear] = (repayments[repaymentYear] || 0) + annualPayment;
              }
            }
          }
        });
        
        return repayments;
      };

      const personalLoanRepayments = calculateLoanRepayments('personal');
      const corporateLoanRepayments = calculateLoanRepayments('corporate');

      // 投資資産と運用収益の追跡
      let personalInvestmentAssets = 0;
      let corporateInvestmentAssets = 0;
      let personalTotalAssets = 0;
      let corporateTotalAssets = 0;

      // 初期資産の設定（各資産項目の初期値を総資産に加算）
      workingAssetData.personal.forEach((asset: any) => {
        const initialAmount = asset.amounts[basicInfo.startYear] || 0;
        personalTotalAssets += initialAmount;
        if (asset.isInvestment) {
          personalInvestmentAssets += initialAmount;
        }
      });

      workingAssetData.corporate.forEach((asset: any) => {
        const initialAmount = asset.amounts[basicInfo.startYear] || 0;
        corporateTotalAssets += initialAmount;
        if (asset.isInvestment) {
          corporateInvestmentAssets += initialAmount;
        }
      });

      // 年金計算を実行 - ヘルパー関数
      const findPersonalItem = (name: string) => incomeData.personal.find(i => i.name === name);
      
      // 年金関連項目を取得
      const pensionItem = findPersonalItem('年金収入');
      const spousePensionItem = findPersonalItem('配偶者年金収入');

      // 年金計算を実行
      if (pensionItem && pensionItem.isAutoCalculated) {
        years.forEach(year => {
          const yearsSinceStart = year - basicInfo.startYear;
          const age = basicInfo.currentAge + yearsSinceStart;
          
          if (age >= (basicInfo.pensionStartAge || 65)) {
            const calculatedPensionIncome = calculatePensionForYear(basicInfo, incomeData, year);
            pensionItem.amounts[year] = calculatedPensionIncome;
          } else {
            pensionItem.amounts[year] = 0;
          }
        });
      }

      // 配偶者年金の計算
      if (spousePensionItem && spousePensionItem.isAutoCalculated && basicInfo.maritalStatus !== 'single') {
        years.forEach(year => {
          const yearsSinceStart = year - basicInfo.startYear;
          let spouseAge = 0;
          
          if (basicInfo.maritalStatus === 'married' && basicInfo.spouseInfo?.currentAge) {
            spouseAge = basicInfo.spouseInfo.currentAge + yearsSinceStart;
          } else if (basicInfo.maritalStatus === 'planning' && basicInfo.spouseInfo?.marriageAge && basicInfo.spouseInfo?.age) {
            const marriageYear = basicInfo.startYear + (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
            
            if (year < marriageYear) {
              spousePensionItem.amounts[year] = 0;
              return;
            }
            
            const ageAtMarriage = basicInfo.spouseInfo.age;
            spouseAge = ageAtMarriage + (year - marriageYear);
          }
          
          if (spouseAge >= (basicInfo.spouseInfo?.pensionStartAge || 65)) {
            const calculatedSpousePensionIncome = calculateSpousePensionForYear(basicInfo, incomeData, year);
            spousePensionItem.amounts[year] = calculatedSpousePensionIncome;
          } else {
            spousePensionItem.amounts[year] = 0;
          }
        });
      }

      years.forEach((year, yearIndex) => {
        // === 1. 収入計算（法人給与の手取り計算も含む） ===
        let mainIncome = 0;
        let sideIncome = 0;
        let otherSideIncome = 0;
        let spouseIncome = 0;
        let pensionIncome = 0;
        let spousePensionIncome = 0;
        let corporateIncome = 0;
        let corporateOtherIncome = 0;

        // 各収入項目を処理
        incomeData.personal.forEach((income: any) => {
          let amount = income.amounts[year] || 0;
          
          // 法人給与の場合は特別な手取り計算を適用
          if (income.isCorporateSalary && income._originalAmounts?.[year]) {
            let hasSocialInsurance = false;
            
            if (income.corporateSalaryType === 'full-time') {
              // 専業の場合
              hasSocialInsurance = income.socialInsuranceByYear?.[year] ?? true;
            } else if (income.corporateSalaryType === 'part-time') {
              // 副業の場合は設定値を使用（自動切り替えの結果は既に反映済み）
              hasSocialInsurance = income.socialInsuranceByYear?.[year] ?? false;
            }
            
            const netResult = calculateNetIncomeForDirector(
              income._originalAmounts[year], 
              hasSocialInsurance
            );
            amount = netResult.netIncome;
            income.amounts[year] = amount; // 手取り額を更新
          }
          
          if (income.name === '給与収入') {
            mainIncome += amount;
          } else if (income.name === '副業収入') {
            sideIncome += amount;
          } else if (income.name === '配偶者収入') {
            spouseIncome += amount;
          } else if (income.name === '年金収入') {
            pensionIncome += amount;
          } else if (income.name === '配偶者年金収入') {
            spousePensionIncome += amount;
          } else {
            otherSideIncome += amount;
          }
        });

        incomeData.corporate.forEach((income: any) => {
          const amount = income.amounts[year] || 0;
          if (income.name === '売上') {
            corporateIncome += amount;
          } else {
            corporateOtherIncome += amount;
          }
        });

        // === 2. 収入投資の計算（修正版）===
        let personalInvestmentAmount = 0;
        let corporateInvestmentAmount = 0;
        let personalInvestmentIncome = 0;  // 運用収益の変数を先に宣言
        let corporateInvestmentIncome = 0;  // 運用収益の変数を先に宣言

        // 収入投資の処理（修正版 - 運用収益をキャッシュフローに加算）
        ['personal', 'corporate'].forEach((section) => {
          workingAssetData[section].forEach((asset: any) => {
            if (asset.type === 'income_investment' && asset.linkedIncomeId) {
              // 前年の残高を取得（貯金箱の中身を確認）
              const previousBalance = yearIndex > 0 ? (asset.amounts[year - 1] || 0) : 0;
              
              // 運用収益を計算（2年目以降）
              let assetInvestmentIncome = 0;
              if (yearIndex > 0 && previousBalance > 0) {
                const returnRate = asset.investmentReturn || 0;
                assetInvestmentIncome = previousBalance * (returnRate / 100);
                
                // ★運用収益をキャッシュフローに加算★
                if (section === 'personal') {
                  personalInvestmentIncome += assetInvestmentIncome;
                } else {
                  corporateInvestmentIncome += assetInvestmentIncome;
                }
              }
              
              // 紐付けられた収入を取得
              const linkedIncomeType = asset.linkedIncomeType || section;
              const linkedIncome = incomeData[linkedIncomeType].find(
                (income: any) => income.id === asset.linkedIncomeId
              );
              
              if (linkedIncome) {
                const incomeAmount = linkedIncome.amounts[year] || 0;
                const investmentRatio = asset.investmentRatio || 0;
                const maxInvestmentAmount = asset.maxInvestmentAmount || Infinity;
                
                // 今年の新規投資額を計算
                const newInvestmentAmount = Math.min(
                  incomeAmount * (investmentRatio / 100),
                  maxInvestmentAmount
                );
                
                // 投資額を集計（キャッシュフロー表示用）
                if (section === 'personal') {
                  personalInvestmentAmount += newInvestmentAmount;
                } else {
                  corporateInvestmentAmount += newInvestmentAmount;
                }
                
                // 累積計算：前年残高 + 運用収益 + 当年新規投資
                asset.amounts[year] = previousBalance + assetInvestmentIncome + newInvestmentAmount;
              } else {
                // 収入が紐付けられていない場合でも、前年残高と運用収益は計算
                asset.amounts[year] = previousBalance + assetInvestmentIncome;
              }
            }
          });
        });

        // === 3. 運用収益計算（資産ページの資産を含む）===
        // personalInvestmentIncomeとcorporateInvestmentIncomeは既に上で宣言済み

        if (yearIndex > 0) { // 初年度は運用収益なし
          // 資産ページの個別運用利回りを適用し、資産額を更新
          workingAssetData.personal.forEach((asset: any) => {
            if (asset.isInvestment && asset.type !== 'income_investment') {
              // 収入投資以外の運用資産
              // 前年の資産額を取得
              let assetAmount = asset.amounts[year - 1] || 0;
              
              // 前年に資産がなく、当年に新規で資産が追加された場合の処理
              if (assetAmount === 0 && asset.amounts[year] && asset.amounts[year] > 0) {
                // 当年から新規で資産が追加された場合は、当年は運用収益なしで翌年から開始
              } else if (assetAmount > 0) {
                // 前年に資産があった場合、運用収益を計算
                const investmentReturn = asset.investmentReturn || parameters.investmentReturn || 5.0;
                if (investmentReturn > 0) {
                  const assetInvestmentIncome = assetAmount * (investmentReturn / 100);
                  personalInvestmentIncome += assetInvestmentIncome;
                  
                  // 資産自体の金額を運用収益分増加させる
                  const currentInputAmount = asset.amounts[year] || 0;
                  asset.amounts[year] = assetAmount + assetInvestmentIncome + currentInputAmount;
                }
              }
            } else if (!asset.isInvestment && asset.type !== 'income_investment') {
              // 運用資産でない場合は前年と同額（または設定値）
              if (!asset.amounts[year]) {
                asset.amounts[year] = asset.amounts[year - 1] || 0;
              }
            }
            // 収入投資の運用収益は既に計算済みなのでスキップ
          });

          workingAssetData.corporate.forEach((asset: any) => {
            if (asset.isInvestment && asset.type !== 'income_investment') {
              // 収入投資以外の運用資産
              // 前年の資産額を取得
              let assetAmount = asset.amounts[year - 1] || 0;
              
              // 前年に資産がなく、当年に新規で資産が追加された場合の処理
              if (assetAmount === 0 && asset.amounts[year] && asset.amounts[year] > 0) {
                // 当年から新規で資産が追加された場合は、当年は運用収益なしで翌年から開始
              } else if (assetAmount > 0) {
                // 前年に資産があった場合、運用収益を計算
                const investmentReturn = asset.investmentReturn || parameters.investmentReturn || 5.0;
                if (investmentReturn > 0) {
                  const assetInvestmentIncome = assetAmount * (investmentReturn / 100);
                  corporateInvestmentIncome += assetInvestmentIncome;
                  
                  // 資産自体の金額を運用収益分増加させる
                  const currentInputAmount = asset.amounts[year] || 0;
                  asset.amounts[year] = assetAmount + assetInvestmentIncome + currentInputAmount;
                }
              }
            } else if (!asset.isInvestment && asset.type !== 'income_investment') {
              // 運用資産でない場合は前年と同額（または設定値）
              if (!asset.amounts[year]) {
                asset.amounts[year] = asset.amounts[year - 1] || 0;
              }
            }
            // 収入投資の運用収益は既に計算済みなのでスキップ
          });
        } else {
          // 初年度は資産額をそのまま設定（収入投資以外）
          workingAssetData.personal.forEach((asset: any) => {
            if (!asset.amounts[year] && asset.type !== 'income_investment') {
              asset.amounts[year] = asset.amounts[basicInfo.startYear] || 0;
            }
          });

          workingAssetData.corporate.forEach((asset: any) => {
            if (!asset.amounts[year] && asset.type !== 'income_investment') {
              asset.amounts[year] = asset.amounts[basicInfo.startYear] || 0;
            }
          });
        }

        // === 4. 支出計算（法人原価追加、連携された従業員給与を含む）===
        let livingExpense = 0;
        let housingExpense = 0;
        let educationExpense = 0;
        let otherPersonalExpense = 0;
        let corporateExpense = 0;
        let corporateOtherExpense = 0;
        let corporateCost = 0; // 法人原価を追加

        workingExpenseData.personal.forEach((expense: any) => {
          const amount = expense.amounts[year] || 0;
          if (expense.name === '生活費') {
            livingExpense += amount;
          } else if (expense.name === '住居費') {
            housingExpense += amount;
          } else if (expense.name === '教育費') {
            educationExpense += amount;
          } else {
            otherPersonalExpense += amount;
          }
        });

        workingExpenseData.corporate.forEach((expense: any) => {
          // 法人原価の場合は自動計算
          if (expense.category === 'cost' && expense._costSettings) {
            const costSettings = expense._costSettings;
            const yearsSinceStart = year - basicInfo.startYear;
            
            // その年の法人売上合計を計算
            let totalRevenue = 0;
            incomeData.corporate.forEach(revenueItem => {
              totalRevenue += revenueItem.amounts[year] || 0;
            });
            
            // 原価率を上昇率で調整
            const adjustedCostRatio = costSettings.costRatio + (costSettings.costIncreaseRate * yearsSinceStart);
            
            // 原価を計算
            let costAmount = totalRevenue * (adjustedCostRatio / 100);
            
            // 上限値の適用
            if (costSettings.maxCostAmount && costAmount > costSettings.maxCostAmount) {
              costAmount = costSettings.maxCostAmount;
            }
            
            corporateCost += costAmount;
            
            // 計算した原価を経費データに反映（リアルタイム更新）
            expense.amounts[year] = Math.floor(costAmount);
          } else {
            const amount = expense.amounts[year] || 0;
            if (expense.name === '事業経費') {
              corporateExpense += amount;
            } else {
              corporateOtherExpense += amount;
            }
          }
        });

        // === 5. ライフイベント計算 ===
        let personalLifeEventIncome = 0;
        let personalLifeEventExpense = 0;
        let corporateLifeEventIncome = 0;
        let corporateLifeEventExpense = 0;
        let personalInvestmentLifeEventIncome = 0;
        let personalInvestmentLifeEventExpense = 0;
        let corporateInvestmentLifeEventIncome = 0;
        let corporateInvestmentLifeEventExpense = 0;

        lifeEvents.filter(event => event.year === year).forEach(event => {
          if (event.source === 'personal') {
            if (event.type === 'income') {
              personalLifeEventIncome += event.amount;
            } else {
              personalLifeEventExpense += event.amount;
            }
          } else if (event.source === 'corporate') {
            if (event.type === 'income') {
              corporateLifeEventIncome += event.amount;
            } else {
              corporateLifeEventExpense += event.amount;
            }
          } else if (event.source === 'personal_investment') {
            if (event.type === 'income') {
              personalInvestmentLifeEventIncome += event.amount;
            } else {
              personalInvestmentLifeEventExpense += event.amount;
            }
          } else if (event.source === 'corporate_investment') {
            if (event.type === 'income') {
              corporateInvestmentLifeEventIncome += event.amount;
            } else {
              corporateInvestmentLifeEventExpense += event.amount;
            }
          }
        });

        // === 6. ローン返済額取得 ===
        const personalLoanRepayment = personalLoanRepayments[year] || 0;
        const corporateLoanRepayment = corporateLoanRepayments[year] || 0;

        // === 7. 負債総額計算 ===
        let personalLiabilityTotal = 0;
        let corporateLiabilityTotal = 0;

        liabilityData.personal.forEach((liability: any) => {
          personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        liabilityData.corporate.forEach((liability: any) => {
          corporateLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        // === 8. 法人税計算（新機能） ===
        
        // 法人の税引き前利益を計算
        const corporateTotalIncome = corporateIncome + corporateOtherIncome + corporateInvestmentIncome + corporateLifeEventIncome;
        const corporateTotalExpense = corporateExpense + corporateOtherExpense + corporateCost + corporateInvestmentAmount + 
          corporateLifeEventExpense + corporateLoanRepayment;
        const corporatePretaxProfit = corporateTotalIncome - corporateTotalExpense;

        // 法人税の計算
        const taxResult = calculateCorporateTax(corporatePretaxProfit, parameters.corporateTaxSettings);

        // === 9. 収支とバランス計算（資産ページの資産を考慮） ===
        const personalTotalIncome = mainIncome + sideIncome + otherSideIncome + spouseIncome + 
          pensionIncome + spousePensionIncome + personalInvestmentIncome + personalLifeEventIncome;
        const personalTotalExpense = livingExpense + housingExpense + educationExpense + 
          otherPersonalExpense + personalInvestmentAmount + personalLifeEventExpense + personalLoanRepayment;
        const personalBalance = personalTotalIncome - personalTotalExpense;

        // 法人収支から税金を差し引く
        const corporateBalance = taxResult.aftertaxProfit;

        // === 10. 資産更新（資産ページの資産も含めて総資産を計算） ===
        personalTotalAssets += personalBalance;
        corporateTotalAssets += corporateBalance;

        // 資産ページで設定された資産の現在値を総資産に加算
        let currentPersonalAssetPageTotal = 0;
        let currentCorporateAssetPageTotal = 0;

        workingAssetData.personal.forEach((asset: any) => {
          currentPersonalAssetPageTotal += asset.amounts[year] || 0;
        });

        workingAssetData.corporate.forEach((asset: any) => {
          currentCorporateAssetPageTotal += asset.amounts[year] || 0;
        });

        // 総資産に資産ページの資産を反映
        // 初年度は初期資産がすでに加算されているので、2年目以降は差分を加算
        if (yearIndex > 0) {
          let previousPersonalAssetPageTotal = 0;
          let previousCorporateAssetPageTotal = 0;

          workingAssetData.personal.forEach((asset: any) => {
            previousPersonalAssetPageTotal += asset.amounts[year - 1] || 0;
          });

          workingAssetData.corporate.forEach((asset: any) => {
            previousCorporateAssetPageTotal += asset.amounts[year - 1] || 0;
          });

          // 資産ページの資産増加分を総資産に反映
          personalTotalAssets += (currentPersonalAssetPageTotal - previousPersonalAssetPageTotal);
          corporateTotalAssets += (currentCorporateAssetPageTotal - previousCorporateAssetPageTotal);
        }

        // 投資資産の更新（収入投資分を含む）
        const currentPersonalInvestmentAssets = currentPersonalAssetPageTotal;
        const currentCorporateInvestmentAssets = currentCorporateAssetPageTotal;

        // 純資産計算
        const personalNetAssets = personalTotalAssets - personalLiabilityTotal;
        const corporateNetAssets = corporateTotalAssets - corporateLiabilityTotal;

        // === 11. キャッシュフローデータ保存（法人税情報追加） ===
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
          corporateExpense: Math.round((corporateExpense + corporateCost) * 10) / 10, // 原価を含める
          corporateOtherExpense: Math.round(corporateOtherExpense * 10) / 10,
          corporateLoanRepayment: Math.round(corporateLoanRepayment * 10) / 10,
          corporateBalance: Math.round(corporateBalance * 10) / 10,
          corporateTotalAssets: Math.round(corporateTotalAssets * 10) / 10,
          corporateLiabilityTotal: Math.round(corporateLiabilityTotal * 10) / 10,
          corporateNetAssets: Math.round(corporateNetAssets * 10) / 10,
          corporateInvestmentAmount: Math.round(corporateInvestmentAmount * 10) / 10,
          corporateInvestmentIncome: Math.round(corporateInvestmentIncome * 10) / 10,
          corporateTotalInvestmentAssets: Math.round(currentCorporateInvestmentAssets * 10) / 10,
          // 法人税関連データ
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

      // 更新された経費データを保存
      set({ expenseData: workingExpenseData });
      set({ cashFlow: newCashFlow });
    } catch (error) {
      console.error("Error in syncCashFlowFromFormData:", error);
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

  // ライフイベント関連のアクション
  addLifeEvent: (event) => {
    set((state) => ({
      lifeEvents: [...state.lifeEvents, event],
    }));
    get().initializeCashFlow();
  },
  
  removeLifeEvent: (index) => {
    set((state) => ({
      lifeEvents: state.lifeEvents.filter((_, i) => i !== index),
    }));
    get().initializeCashFlow();
  },

  // History actions
  addHistoryEntry: (entry) => {
    set((state) => ({
      history: [
        ...state.history,
        { ...entry, timestamp: Date.now() },
      ],
    }));
  },
  
  clearHistory: () => set({ history: [] }),

  // 法人税設定の更新
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
    // 法人税設定変更時にキャッシュフローを再計算
    get().initializeCashFlow();
  },

  // LocalStorage
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
            // 法人税設定がない場合はデフォルト値を設定
            corporateTaxSettings: data.parameters?.corporateTaxSettings || DEFAULT_CORPORATE_TAX_SETTINGS,
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

  // initializeFormData 関数（インポート対応修正版）
  initializeFormData: () => {
    const state = get();
    const { basicInfo, parameters, incomeData: existingIncomeData, expenseData: existingExpenseData } = state;
    
    // インポート済みデータがある場合はスキップ
    if (existingIncomeData && existingIncomeData.personal && existingIncomeData.personal.length > 0) {
      // 既存データに値が入っている場合は初期化をスキップ
      const hasIncomeData = existingIncomeData.personal.some(item => 
        Object.keys(item.amounts || {}).length > 0 || 
        Object.keys(item._originalAmounts || {}).length > 0
      );
      const hasExpenseData = existingExpenseData.personal.some(item => 
        Object.keys(item.amounts || {}).length > 0 || 
        Object.keys(item._rawAmounts || {}).length > 0
      );
     if (hasIncomeData || hasExpenseData) {
        console.log('既存データが検出されたため、初期化をスキップします');
        return;
      }
    }
    
    const yearsUntilDeath = basicInfo.deathAge - basicInfo.currentAge;
    const years = Array.from(
      { length: yearsUntilDeath + 1 },
      (_, i) => basicInfo.startYear + i
    );

    // 収入データの初期化
    const newIncomeData = { 
      personal: [
        { 
          id: '1', 
          name: '給与収入', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0
        },
        { 
          id: '2', 
          name: '事業収入', 
          type: 'profit', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0
        },
        { 
          id: '3', 
          name: '副業収入', 
          type: 'side', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0
        },
        { 
          id: '4', 
          name: '年金収入', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0,
          isAutoCalculated: true
        },
      ],
      corporate: [
        { 
          id: '1', 
          name: '売上', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0
        },
        { 
          id: '2', 
          name: 'その他収入', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: 0,
          maxInvestmentAmount: 0
        },
      ],
    };

    // 既婚または結婚予定の場合、配偶者年金も追加
    if (basicInfo.maritalStatus !== 'single') {
      const spousePensionItem = newIncomeData.personal.find(item => item.name === '配偶者年金収入');
      
      if (!spousePensionItem) {
        newIncomeData.personal.push({
          id: '5',
          name: '配偶者年金収入',
          type: 'income',
          category: 'income',
          amounts: {},
          investmentRatio: 0,
          maxInvestmentAmount: 0,
          isAutoCalculated: true
        });
      }
    }

    // 配偶者の収入がある場合は追加
    if (basicInfo.maritalStatus !== 'single' && basicInfo.spouseInfo?.occupation 
        && basicInfo.spouseInfo.occupation !== 'homemaker') {
      const spouseIncomeItem = newIncomeData.personal.find(item => item.name === '配偶者収入');
      
      if (!spouseIncomeItem) {
        newIncomeData.personal.push({
          id: String(newIncomeData.personal.length + 1),
          name: '配偶者収入',
          type: 'income',
          category: 'income',
          amounts: {},
          investmentRatio: 0,
          maxInvestmentAmount: 0
        });
      }
    }

    // 支出データの初期化
    const newExpenseData = { ...state.expenseData };
    
    // 支出データの初期値にインフレ率を適用する処理
    years.forEach(year => {
      const yearsSinceStart = year - basicInfo.startYear;
      
      // 生活費設定
      const livingExpenseItem = newExpenseData.personal.find(item => item.name === '生活費');
      if (livingExpenseItem) {
        const baseAmount = basicInfo.monthlyLivingExpense * 12;
        const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
        const inflatedAmount = Math.round(baseAmount * inflationFactor * 10) / 10;
        
        livingExpenseItem._rawAmounts = {
          ...(livingExpenseItem._rawAmounts || {}),
          [year]: baseAmount
        };
        livingExpenseItem.amounts[year] = inflatedAmount;
      }

      // 住居費設定
      const housingExpenseItem = newExpenseData.personal.find(item => item.name === '住居費');
      if (housingExpenseItem) {
        const baseAmount = calculateHousingExpense(basicInfo.housingInfo, year);
        housingExpenseItem._rawAmounts = {
          ...(housingExpenseItem._rawAmounts || {}),
          [year]: baseAmount
        };
        housingExpenseItem.amounts[year] = baseAmount;
      }

      // 教育費設定（元のファイルから抽出した部分）
      const educationExpenseItem = newExpenseData.personal.find(item => item.name === '教育費');
      if (educationExpenseItem) {
        educationExpenseItem.category = 'education';
        educationExpenseItem.type = 'education';
        
        const baseAmount = calculateEducationExpense(
          basicInfo.children,
          basicInfo.plannedChildren,
          year,
          basicInfo.currentAge,
          basicInfo.startYear,
          parameters.educationCostIncreaseRate
        );
        educationExpenseItem._rawAmounts = {
          ...(educationExpenseItem._rawAmounts || {}),
          [year]: baseAmount
        };
        educationExpenseItem.amounts[year] = baseAmount;
      }
    });

    // 資産データの初期化
    const newAssetData = { ...state.assetData };
    if (basicInfo.housingInfo.type === 'own' && basicInfo.housingInfo.own) {
      const realEstateItem = newAssetData.personal.find(item => item.name === '不動産');
      if (realEstateItem) {
        realEstateItem.amounts[basicInfo.housingInfo.own.purchaseYear] = 
          basicInfo.housingInfo.own.purchasePrice;
      }
    }

    // 負債データの初期化
    const newLiabilityData = { ...state.liabilityData };
    if (basicInfo.housingInfo.type === 'own' && basicInfo.housingInfo.own) {
      const loanItem = newLiabilityData.personal.find(item => item.name === 'ローン');
      if (loanItem) {
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

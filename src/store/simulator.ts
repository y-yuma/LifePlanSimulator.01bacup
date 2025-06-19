import { create } from 'zustand';
import { calculateNetIncome, calculateHousingExpense } from '@/lib/calculations';
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
  // 投資関連プロパティ
  investmentRatio: number; 
  maxInvestmentAmount: number;
  // 自動計算フラグ
  isAutoCalculated?: boolean;
}

export interface IncomeSection {
  personal: IncomeItem[];
  corporate: IncomeItem[];
}

// Expense types
export interface ExpenseItem {
  id: string;
  name: string;
  type: 'living' | 'housing' | 'education' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  // 生の入力値を保存
  _rawAmounts?: { [year: number]: number };
}

export interface ExpenseSection {
  personal: ExpenseItem[];
  corporate: ExpenseItem[];
}

// Asset types - **修正**: investmentReturn プロパティを追加
export interface AssetItem {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  isInvestment?: boolean;
  investmentReturn?: number; // **追加**: 個別運用利回り
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

// **修正**: Parameters インターフェースに incomeInvestmentReturn を追加
export interface Parameters {
  inflationRate: number;
  educationCostIncreaseRate: number;
  investmentReturn: number;
  investmentRatio?: number;
  maxInvestmentAmount?: number;
  incomeInvestmentReturn: number; // **追加**: 収入からの投資運用利回り
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
}

// 教育費計算用のダミー関数（実装は別ファイルにある想定）
function calculateEducationExpense(
  children: any[],
  plannedChildren: any[],
  year: number,
  currentAge: number,
  startYear: number,
  educationCostIncreaseRate: number
): number {
  // ダミー実装
  return 0;
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
  // **修正**: parameters に incomeInvestmentReturn を追加
  parameters: {
    inflationRate: 1.0,
    educationCostIncreaseRate: 1.0,
    investmentReturn: 5.0, // デフォルト値を5.0に変更
    investmentRatio: 10.0,
    maxInvestmentAmount: 100.0,
    incomeInvestmentReturn: 5.0, // **追加**: 収入からの投資運用利回り
  },
  cashFlow: {},
  history: [],
  lifeEvents: [],

  // Initialize form data
  incomeData: {
    personal: [
      { id: '1', name: '給与収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
      { id: '2', name: '事業収入', type: 'profit', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
      { id: '3', name: '副業収入', type: 'side', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
      { id: '4', name: '配偶者収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
      { id: '5', name: '年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 5, maxInvestmentAmount: 50 },
      { id: '6', name: '配偶者年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 5, maxInvestmentAmount: 50 },
      { id: '7', name: '運用収益', type: 'income', category: 'income', amounts: {}, investmentRatio: 0, maxInvestmentAmount: 0 },
    ],
    corporate: [
      { id: '1', name: '売上', type: 'income', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
      { id: '2', name: 'その他収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 10, maxInvestmentAmount: 100 },
    ],
  },
  expenseData: {
    personal: [
      { id: '1', name: '生活費', type: 'living', category: 'living', amounts: {} },
      { id: '2', name: '住居費', type: 'housing', category: 'housing', amounts: {} },
      { id: '3', name: '教育費', type: 'education', category: 'education', amounts: {} },
      { id: '4', name: 'その他', type: 'other', category: 'other', amounts: {} },
    ],
    corporate: [
      { id: '1', name: '事業経費', type: 'other', category: 'business', amounts: {} },
      { id: '2', name: 'その他経費', type: 'other', category: 'office', amounts: {} },
    ],
  },
  // **修正**: assetData に investmentReturn プロパティを追加
  assetData: {
    personal: [
      { 
        id: '1', 
        name: '現金・預金', 
        type: 'cash', 
        category: 'asset', 
        amounts: {}, 
        isInvestment: false,
        investmentReturn: 0.1 // 銀行預金の低利回り
      },
      { 
        id: '2', 
        name: '投資資産', 
        type: 'investment', 
        category: 'asset', 
        amounts: {}, 
        isInvestment: true,
        investmentReturn: 5.0 // 株式投資の期待利回り
      },
      { 
        id: '3', 
        name: '不動産', 
        type: 'property', 
        category: 'asset', 
        amounts: {}, 
        isInvestment: false,
        investmentReturn: 3.0 // 不動産投資の期待利回り
      },
    ],
    corporate: [
      { 
        id: '1', 
        name: '現金・預金', 
        type: 'cash', 
        category: 'asset', 
        amounts: {}, 
        isInvestment: false,
        investmentReturn: 0.1
      },
      { 
        id: '2', 
        name: '投資資産', 
        type: 'investment', 
        category: 'asset', 
        amounts: {}, 
        isInvestment: true,
        investmentReturn: 5.0
      },
    ],
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

  // ライフイベント
  addLifeEvent: (event) => {
    set((state) => ({
      lifeEvents: [...state.lifeEvents, event],
    }));
  },
  
  removeLifeEvent: (index) => {
    set((state) => ({
      lifeEvents: state.lifeEvents.filter((_, i) => i !== index),
    }));
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
            
            // rawValueがない場合はスキップ
            if (rawValue === undefined || rawValue === null) return;
            
            // カテゴリに応じて適切なインフレ係数を適用
            const yearsSinceStart = year - startYear;
            let inflatedAmount = rawValue; // デフォルトは変更なし
            
            if (updatedExpense.category === 'living' || updatedExpense.type === 'living' || 
                updatedExpense.category === 'housing' || updatedExpense.type === 'housing' ||
                updatedExpense.category === 'business' || updatedExpense.type === 'business' ||
                updatedExpense.category === 'office' || updatedExpense.type === 'office') {
              // 生活費・住居費・事業運営費・オフィス設備費には新しいインフレ率を適用
              const inflationFactor = Math.pow(1 + newParameters.inflationRate / 100, yearsSinceStart);
              inflatedAmount = Math.round(rawValue * inflationFactor * 10) / 10;
            } 
            else if (updatedExpense.category === 'education' || updatedExpense.type === 'education') {
              // 教育費には新しい教育費上昇率を適用
              const educationFactor = Math.pow(1 + newParameters.educationCostIncreaseRate / 100, yearsSinceStart);
              inflatedAmount = Math.round(rawValue * educationFactor * 10) / 10;
            }
            else {
              // その他カテゴリはインフレ適用なし（生の値をそのまま使用）
              inflatedAmount = rawValue;
            }
            
            // インフレ適用後の値を設定
            updatedExpense.amounts[year] = inflatedAmount;
          });
        }
        
        return updatedExpense;
      });
    });
    
    // 更新したデータを保存
    set({ expenseData: updatedExpenseData });
    
    // キャッシュフローを再計算
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

  // **完全修正版: syncCashFlowFromFormData**
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

      // 初期資産の設定
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

      years.forEach((year, yearIndex) => {
        // === 1. 収入計算 ===
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
          const amount = income.amounts[year] || 0;
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

        // === 2. 投資額計算（修正版）===
        let personalInvestmentAmount = 0;
        let corporateInvestmentAmount = 0;

        // 個人の投資額計算
        incomeData.personal.forEach((income: any) => {
          const amount = income.amounts[year] || 0;
          const investmentRatio = income.investmentRatio || 0;
          const maxInvestmentAmount = income.maxInvestmentAmount || 0;
          
          // **修正1: 投資割合が0%の場合は投資額も0**
          if (investmentRatio > 0 && amount > 0) {
            const calculatedInvestment = Math.min(
              amount * (investmentRatio / 100),
              maxInvestmentAmount
            );
            personalInvestmentAmount += calculatedInvestment;
          }
        });

        // 法人の投資額計算
        incomeData.corporate.forEach((income: any) => {
          const amount = income.amounts[year] || 0;
          const investmentRatio = income.investmentRatio || 0;
          const maxInvestmentAmount = income.maxInvestmentAmount || 0;
          
          // **修正1: 投資割合が0%の場合は投資額も0**
          if (investmentRatio > 0 && amount > 0) {
            const calculatedInvestment = Math.min(
              amount * (investmentRatio / 100),
              maxInvestmentAmount
            );
            corporateInvestmentAmount += calculatedInvestment;
          }
        });

        // === 3. 運用収益計算（修正版）===
        let personalInvestmentIncome = 0;
        let corporateInvestmentIncome = 0;

        if (yearIndex > 0) { // 初年度は運用収益なし
          // **修正2: 資産ページの個別運用利回りを適用**
          // 運用資産フラグ付きの資産から運用収益を計算
          workingAssetData.personal.forEach((asset: any) => {
            if (asset.isInvestment) {
              const assetAmount = asset.amounts[year - 1] || 0;
              const investmentReturn = asset.investmentReturn || parameters.investmentReturn || 5.0; // 個別運用利回り
              if (assetAmount > 0 && investmentReturn > 0) {
                personalInvestmentIncome += assetAmount * (investmentReturn / 100);
              }
            }
          });

          workingAssetData.corporate.forEach((asset: any) => {
            if (asset.isInvestment) {
              const assetAmount = asset.amounts[year - 1] || 0;
              const investmentReturn = asset.investmentReturn || parameters.investmentReturn || 5.0; // 個別運用利回り
              if (assetAmount > 0 && investmentReturn > 0) {
                corporateInvestmentIncome += assetAmount * (investmentReturn / 100);
              }
            }
          });

          // **修正3: 収入からの投資による運用収益を追加**
          // 前年までに積み立てた投資資産からの収益
          if (personalInvestmentAssets > 0) {
            const incomeInvestmentReturn = parameters.incomeInvestmentReturn || 5.0;
            personalInvestmentIncome += personalInvestmentAssets * (incomeInvestmentReturn / 100);
          }

          if (corporateInvestmentAssets > 0) {
            const incomeInvestmentReturn = parameters.incomeInvestmentReturn || 5.0;
            corporateInvestmentIncome += corporateInvestmentAssets * (incomeInvestmentReturn / 100);
          }
        }

        // === 4. 支出計算 ===
        let livingExpense = 0;
        let housingExpense = 0;
        let educationExpense = 0;
        let otherPersonalExpense = 0;
        let corporateExpense = 0;
        let corporateOtherExpense = 0;

        expenseData.personal.forEach((expense: any) => {
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

        expenseData.corporate.forEach((expense: any) => {
          const amount = expense.amounts[year] || 0;
          if (expense.name === '事業経費') {
            corporateExpense += amount;
          } else {
            corporateOtherExpense += amount;
          }
        });

        // === 5. ライフイベント処理 ===
        let personalLifeEventIncome = 0;
        let personalLifeEventExpense = 0;
        let corporateLifeEventIncome = 0;
        let corporateLifeEventExpense = 0;
        let personalInvestmentLifeEventIncome = 0;
        let personalInvestmentLifeEventExpense = 0;
        let corporateInvestmentLifeEventIncome = 0;
        let corporateInvestmentLifeEventExpense = 0;

        lifeEvents.forEach((event: any) => {
          if (event.year === year) {
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
          }
        });

        // === 6. 負債返済計算 ===
        let personalLoanRepayment = personalLoanRepayments[year] || 0;
        let corporateLoanRepayment = corporateLoanRepayments[year] || 0;

        // 手動設定された負債額も加算
        workingLiabilityData.personal.forEach((liability: any) => {
          if (!liability.autoCalculate) {
            const amount = liability.amounts[year] || 0;
            personalLoanRepayment += amount;
          }
        });

        workingLiabilityData.corporate.forEach((liability: any) => {
          if (!liability.autoCalculate) {
            const amount = liability.amounts[year] || 0;
            corporateLoanRepayment += amount;
          }
        });

        // 負債総額の計算
        let personalLiabilityTotal = 0;
        let corporateLiabilityTotal = 0;

        workingLiabilityData.personal.forEach((liability: any) => {
          personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        workingLiabilityData.corporate.forEach((liability: any) => {
          corporateLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        // === 7. 収支とバランス計算 ===
        const personalTotalIncome = mainIncome + sideIncome + otherSideIncome + spouseIncome + 
          pensionIncome + spousePensionIncome + personalInvestmentIncome + personalLifeEventIncome;
        const personalTotalExpense = livingExpense + housingExpense + educationExpense + 
          otherPersonalExpense + personalInvestmentAmount + personalLifeEventExpense + personalLoanRepayment;
        const personalBalance = personalTotalIncome - personalTotalExpense;

        const corporateTotalIncome = corporateIncome + corporateOtherIncome + corporateInvestmentIncome + corporateLifeEventIncome;
        const corporateTotalExpense = corporateExpense + corporateOtherExpense + corporateInvestmentAmount + 
          corporateLifeEventExpense + corporateLoanRepayment;
        const corporateBalance = corporateTotalIncome - corporateTotalExpense;

        // === 8. 資産更新 ===
        personalTotalAssets += personalBalance;
        corporateTotalAssets += corporateBalance;

        // **修正4: 投資資産の正確な更新**
        const currentPersonalInvestmentAssets = personalInvestmentAssets + personalInvestmentAmount + 
          personalInvestmentIncome + personalInvestmentLifeEventIncome - personalInvestmentLifeEventExpense;
        const currentCorporateInvestmentAssets = corporateInvestmentAssets + corporateInvestmentAmount + 
          corporateInvestmentIncome + corporateInvestmentLifeEventIncome - corporateInvestmentLifeEventExpense;

        // 来年用に更新
        personalInvestmentAssets = currentPersonalInvestmentAssets;
        corporateInvestmentAssets = currentCorporateInvestmentAssets;

        // 純資産計算
        const personalNetAssets = personalTotalAssets - personalLiabilityTotal;
        const corporateNetAssets = corporateTotalAssets - corporateLiabilityTotal;

        // === 9. キャッシュフローデータ保存 ===
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
          corporateExpense: Math.round(corporateExpense * 10) / 10,
          corporateOtherExpense: Math.round(corporateOtherExpense * 10) / 10,
          corporateLoanRepayment: Math.round(corporateLoanRepayment * 10) / 10,
          corporateBalance: Math.round(corporateBalance * 10) / 10,
          corporateTotalAssets: Math.round(corporateTotalAssets * 10) / 10,
          corporateLiabilityTotal: Math.round(corporateLiabilityTotal * 10) / 10,
          corporateNetAssets: Math.round(corporateNetAssets * 10) / 10,
          corporateInvestmentAmount: Math.round(corporateInvestmentAmount * 10) / 10,
          corporateInvestmentIncome: Math.round(corporateInvestmentIncome * 10) / 10,
          corporateTotalInvestmentAssets: Math.round(currentCorporateInvestmentAssets * 10) / 10
        };
      });

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
          parameters: data.parameters,
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
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
        },
        { 
          id: '2', 
          name: '事業収入', 
          type: 'profit', 
          category: 'income',
          amounts: {}, 
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
        },
        { 
          id: '3', 
          name: '副業収入', 
          type: 'side', 
          category: 'income',
          amounts: {}, 
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
        },
        { 
          id: '4', 
          name: '年金収入', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: parameters.investmentRatio || 5,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 50,
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
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
        },
        { 
          id: '2', 
          name: 'その他収入', 
          type: 'income', 
          category: 'income',
          amounts: {}, 
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
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
          investmentRatio: parameters.investmentRatio || 5,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 50,
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
          investmentRatio: parameters.investmentRatio || 10,
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100
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

      // 教育費設定
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

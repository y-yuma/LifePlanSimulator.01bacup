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

// Asset types
export interface AssetItem {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'other';
  category?: string;
  amounts: { [year: number]: number };
  isInvestment?: boolean;
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

export interface Parameters {
  inflationRate: number;
  educationCostIncreaseRate: number;
  investmentReturn: number;
  investmentRatio?: number;
  maxInvestmentAmount?: number;
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
    inflationRate: 1.0,
    educationCostIncreaseRate: 1.0,
    investmentReturn: 1.0,
    investmentRatio: 10.0,
    maxInvestmentAmount: 100.0,
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
      { id: '4', name: '年金収入', type: 'income', category: 'income', amounts: {}, investmentRatio: 5, maxInvestmentAmount: 50, isAutoCalculated: true },
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
      { id: '1', name: '人件費', type: 'other', category: 'business', amounts: {} },
      { id: '2', name: '外注費', type: 'other', category: 'business', amounts: {} },
      { id: '3', name: '家賃', type: 'other', category: 'office', amounts: {} },
      { id: '4', name: '設備費', type: 'other', category: 'office', amounts: {} },
      { id: '5', name: 'その他', type: 'other', category: 'other', amounts: {} },
    ],
  },
  assetData: {
    personal: [
      { id: '1', name: '現金・預金', type: 'cash', category: 'asset', amounts: {} },
      { id: '2', name: '株式', type: 'investment', category: 'asset', amounts: {}, isInvestment: true },
      { id: '3', name: '投資信託', type: 'investment', category: 'asset', amounts: {}, isInvestment: true },
      { id: '4', name: '不動産', type: 'property', category: 'asset', amounts: {} },
    ],
    corporate: [
      { id: '1', name: '現金預金', type: 'cash', category: 'asset', amounts: {} },
      { id: '2', name: '設備', type: 'property', category: 'asset', amounts: {} },
      { id: '3', name: '在庫', type: 'other', category: 'asset', amounts: {} },
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

  // initializeFormData 関数
  initializeFormData: () => {
    const state = get();
    const { basicInfo, parameters } = state;
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

  // syncCashFlowFromFormData - 完全修正版
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
          if (liability.autoCalculate && liability._isCalculated && liability.startYear && liability.termYears) {
            const startYear = liability.startYear;
            const termYears = liability.termYears;
            const interestRate = liability.interestRate || 0;
            const repaymentType = liability.repaymentType || 'equal_payment';
            
            // 借入額を正の値として取得
            const borrowAmount = Math.abs(liability.amounts[startYear] || 0);
            
            if (borrowAmount > 0) {
              // 返済スケジュールを計算
              const schedule = calculateLoanScheduleInStore(borrowAmount, interestRate, termYears, repaymentType);
              
              // 各年の返済額を計算
              schedule.forEach((payment, index) => {
                const year = startYear + index + 1;
                if (year <= basicInfo.startYear + yearsUntilDeath) {
                  repayments[year] = (repayments[year] || 0) + payment.payment;
                }
              });
            }
          }
        });
        
        return repayments;
      };
      
      // ローン返済スケジュール計算関数（store内用）
      const calculateLoanScheduleInStore = (
        borrowAmount: number,
        interestRate: number,
        termYears: number,
        repaymentType: 'equal_principal' | 'equal_payment'
      ) => {
        const schedule: Array<{
          year: number;
          payment: number;
          principal: number;
          interest: number;
          remainingBalance: number;
        }> = [];

        if (interestRate === 0) {
          // 金利0%の場合：元金均等返済
          const yearlyPrincipalPayment = Math.round((borrowAmount / termYears) * 10) / 10;
          
          for (let year = 1; year <= termYears; year++) {
            const remainingBalance = Math.max(0, Math.round((borrowAmount - (yearlyPrincipalPayment * year)) * 10) / 10);
            
            schedule.push({
              year,
              payment: yearlyPrincipalPayment,
              principal: yearlyPrincipalPayment,
              interest: 0,
              remainingBalance
            });
          }
        } else {
          if (repaymentType === 'equal_payment') {
            // 元利均等返済
            const monthlyRate = interestRate / 100 / 12;
            const totalPayments = termYears * 12;
            
            const monthlyPayment = borrowAmount * 
              (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
              (Math.pow(1 + monthlyRate, totalPayments) - 1);
            
            const yearlyPayment = Math.round(monthlyPayment * 12 * 10) / 10;
            let remainingBalance = borrowAmount;
            
            for (let year = 1; year <= termYears; year++) {
              const yearlyInterest = Math.round(remainingBalance * (interestRate / 100) * 10) / 10;
              const principalPayment = Math.min(yearlyPayment - yearlyInterest, remainingBalance);
              
              remainingBalance = Math.max(0, remainingBalance - principalPayment);
              
              schedule.push({
                year,
                payment: yearlyPayment,
                principal: Math.round(principalPayment * 10) / 10,
                interest: yearlyInterest,
                remainingBalance: Math.round(remainingBalance * 10) / 10
              });
            }
          } else {
            // 元金均等返済
            const yearlyPrincipalPayment = Math.round((borrowAmount / termYears) * 10) / 10;
            let remainingBalance = borrowAmount;
            
            for (let year = 1; year <= termYears; year++) {
              const yearlyInterest = Math.round(remainingBalance * (interestRate / 100) * 10) / 10;
              const totalPayment = yearlyPrincipalPayment + yearlyInterest;
              
              remainingBalance = Math.max(0, remainingBalance - yearlyPrincipalPayment);
              
              schedule.push({
                year,
                payment: Math.round(totalPayment * 10) / 10,
                principal: yearlyPrincipalPayment,
                interest: yearlyInterest,
                remainingBalance: Math.round(remainingBalance * 10) / 10
              });
            }
          }
        }

        return schedule;
      };
      
      // 返済スケジュールを計算
      const personalRepayments = calculateLoanRepayments('personal');
      const corporateRepayments = calculateLoanRepayments('corporate');
      
      // 初期の総資産・負債を計算
      const getInitialAssets = (section: 'personal' | 'corporate') => {
        return workingAssetData[section].reduce((total: number, asset: any) => {
          return total + Math.abs(asset.amounts[basicInfo.startYear] || 0);
        }, 0);
      };
      
      const getInitialLiabilities = (section: 'personal' | 'corporate') => {
        return workingLiabilityData[section].reduce((total: number, liability: any) => {
          return total + Math.abs(liability.amounts[basicInfo.startYear] || 0);
        }, 0);
      };
      
      // 運用資産の初期値を計算
      const getInitialInvestmentAssets = (section: 'personal' | 'corporate') => {
        return workingAssetData[section].reduce((total: number, asset: any) => {
          if (asset.isInvestment) {
            return total + Math.abs(asset.amounts[basicInfo.startYear] || 0);
          }
          return total;
        }, 0);
      };
      
      // 初期値を取得
      let personalTotalAssets = getInitialAssets('personal');
      let corporateTotalAssets = getInitialAssets('corporate');
      let personalInvestmentAssets = getInitialInvestmentAssets('personal');
      let corporateInvestmentAssets = getInitialInvestmentAssets('corporate');
      
      // ヘルパー関数
      const findPersonalItem = (name: string) => incomeData.personal.find(i => i.name === name);
      const findCorporateItem = (name: string) => incomeData.corporate.find(i => i.name === name);
      
      // 年金関連項目を取得
      const pensionItem = findPersonalItem('年金収入');
      const spousePensionItem = findPersonalItem('配偶者年金収入');
      const salaryItem = findPersonalItem('給与収入');
      const spouseIncomeItem = findPersonalItem('配偶者収入');

      // 年金計算
      if (pensionItem) {
        years.forEach(year => {
          const yearsSinceStart = year - basicInfo.startYear;
          const age = basicInfo.currentAge + yearsSinceStart;
          
          if (age >= (basicInfo.pensionStartAge || 65) && pensionItem.isAutoCalculated) {
            const pensionIncome = calculatePensionForYear(basicInfo, incomeData, year);
            pensionItem.amounts[year] = pensionIncome;
          } else {
            pensionItem.amounts[year] = 0;
          }
        });
      }

      // 配偶者年金の計算
      if (spousePensionItem && basicInfo.maritalStatus !== 'single') {
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
          
          if (spouseAge >= (basicInfo.spouseInfo?.pensionStartAge || 65) && spousePensionItem.isAutoCalculated) {
            const spousePensionIncome = calculateSpousePensionForYear(basicInfo, incomeData, year);
            spousePensionItem.amounts[year] = spousePensionIncome;
          } else {
            spousePensionItem.amounts[year] = 0;
          }
        });
      }

      // ライフイベントの処理
      const processLifeEvents = (year: number, source: 'personal' | 'corporate' | 'personal_investment' | 'corporate_investment') => {
        let income = 0;
        let expense = 0;
        
        if (lifeEvents) {
          const events = lifeEvents.filter(event => event.year === year && event.source === source);
          
          events.forEach(event => {
            if (event.type === 'income') {
              income += event.amount;
            } else if (event.type === 'expense') {
              expense += event.amount;
            }
          });
        }
        
        return { income, expense };
      };

      // 各年のキャッシュフロー計算
      years.forEach((year) => {
        const yearsSinceStart = year - basicInfo.startYear;
        
        // 個人収入の計算
        let mainIncome = 0;
        if (salaryItem) {
          mainIncome = salaryItem.amounts[year] || 0;
        }

        const sideIncome = findPersonalItem('副業収入')?.amounts[year] || 0;

        let spouseIncome = 0;
        if (spouseIncomeItem) {
          spouseIncome = spouseIncomeItem.amounts[year] || 0;
        }

        let pensionIncome = 0;
        if (pensionItem) {
          pensionIncome = pensionItem.amounts[year] || 0;
        }

        let spousePensionIncome = 0;
        if (spousePensionItem) {
          spousePensionIncome = spousePensionItem.amounts[year] || 0;
        }

        // 法人収入の計算
        const corporateIncomeItem = findCorporateItem('売上');
        const corporateOtherIncomeItem = findCorporateItem('その他収入');

        const corporateIncome = corporateIncomeItem?.amounts[year] || 0;
        const corporateOtherIncome = corporateOtherIncomeItem?.amounts[year] || 0;

        // 支出の計算
        let livingExpense = 0;
        expenseData.personal.forEach(expense => {
          if (expense.type === 'living' || expense.category === 'living') {
            livingExpense += expense.amounts[year] || 0;
          }
        });

        let housingExpense = 0;
        expenseData.personal.forEach(expense => {
          if (expense.type === 'housing' || expense.category === 'housing') {
            housingExpense += expense.amounts[year] || 0;
          }
        });

        let educationExpense = 0;
        expenseData.personal.forEach(expense => {
          if (expense.type === 'education' || expense.category === 'education') {
            educationExpense += expense.amounts[year] || 0;
          }
        });

        let otherExpense = 0;
        expenseData.personal.forEach(expense => {
          if ((expense.type === 'other' || expense.category === 'other') 
              && expense.type !== 'education' && expense.category !== 'education') {
            otherExpense += expense.amounts[year] || 0;
          }
        });

        // 法人支出
        let corporateExpense = 0;
        expenseData.corporate.forEach(expense => {
          if (expense.category === 'business' || expense.type === 'business') {
            corporateExpense += expense.amounts[year] || 0;
          }
        });

        let corporateOtherExpense = 0;
        expenseData.corporate.forEach(expense => {
          if ((expense.category === 'other' || expense.type === 'other') ||
              (expense.category === 'office' || expense.type === 'office')) {
            corporateOtherExpense += expense.amounts[year] || 0;
          }
        });

        // ローンの返済を取得
        const personalLoanRepayment = personalRepayments[year] || 0;
        const corporateLoanRepayment = corporateRepayments[year] || 0;

        // ライフイベントの処理
        const personalEvents = processLifeEvents(year, 'personal');
        const corporateEvents = processLifeEvents(year, 'corporate');
        const personalInvestmentEvents = processLifeEvents(year, 'personal_investment');
        const corporateInvestmentEvents = processLifeEvents(year, 'corporate_investment');

        // 個人の投資への振り分け額の計算
        let personalInvestmentAmount = 0;
        incomeData.personal.forEach(incomeItem => {
          const amount = incomeItem.amounts[year] || 0;
          
          if (amount > 0 && incomeItem.investmentRatio > 0) {
            const itemInvestmentAmount = Math.min(
              amount * (incomeItem.investmentRatio / 100),
              incomeItem.maxInvestmentAmount || Infinity
            );
            personalInvestmentAmount += itemInvestmentAmount;
          }
        });

        // 法人の投資への振り分け額の計算
        let corporateInvestmentAmount = 0;
        incomeData.corporate.forEach(incomeItem => {
          const amount = incomeItem.amounts[year] || 0;
          
          if (amount > 0 && incomeItem.investmentRatio > 0) {
            const itemInvestmentAmount = Math.min(
              amount * (incomeItem.investmentRatio / 100),
              incomeItem.maxInvestmentAmount || Infinity
            );
            corporateInvestmentAmount += itemInvestmentAmount;
          }
        });

        // 前年の運用資産を取得
        const prevPersonalInvestmentAssets = yearsSinceStart > 0 ? newCashFlow[year - 1]?.totalInvestmentAssets || personalInvestmentAssets : personalInvestmentAssets;
        const prevCorporateInvestmentAssets = yearsSinceStart > 0 ? newCashFlow[year - 1]?.corporateTotalInvestmentAssets || corporateInvestmentAssets : corporateInvestmentAssets;

        // 運用収益の計算
        const personalInvestmentIncome = Math.round(prevPersonalInvestmentAssets * (parameters.investmentReturn / 100) * 10) / 10;
        const corporateInvestmentIncome = Math.round(prevCorporateInvestmentAssets * (parameters.investmentReturn / 100) * 10) / 10;

        // 運用資産への影響を計算
        const personalInvestmentEventBalance = personalInvestmentEvents.income - personalInvestmentEvents.expense;
        const corporateInvestmentEventBalance = corporateInvestmentEvents.income - corporateInvestmentEvents.expense;

        // 収支計算
        const personalTotalIncome = mainIncome + sideIncome + spouseIncome + 
                                   pensionIncome + spousePensionIncome + 
                                   personalInvestmentIncome + personalEvents.income;
        
        const personalTotalExpense = livingExpense + housingExpense + educationExpense + 
                                    otherExpense + personalEvents.expense + personalLoanRepayment;
        
        const personalBalance = personalTotalIncome - personalTotalExpense;

        const corporateTotalIncome = corporateIncome + corporateOtherIncome + 
                                    corporateInvestmentIncome + corporateEvents.income;
        
        const corporateTotalExpense = corporateExpense + corporateOtherExpense + 
                                     corporateEvents.expense + corporateLoanRepayment;
        
        const corporateBalance = corporateTotalIncome - corporateTotalExpense;

        // 現在の年の運用資産を計算
        const currentPersonalInvestmentAssets = Math.max(0, Math.round((
          prevPersonalInvestmentAssets + 
          personalInvestmentAmount + 
          personalInvestmentIncome + 
          personalInvestmentEventBalance
        ) * 10) / 10);

        const currentCorporateInvestmentAssets = Math.max(0, Math.round((
          prevCorporateInvestmentAssets + 
          corporateInvestmentAmount + 
          corporateInvestmentIncome + 
          corporateInvestmentEventBalance
        ) * 10) / 10);

        // 総資産の更新（初年度も含めて必ず収支を加算）
        // 修正点：初年度（yearsSinceStart = 0）でも収支を反映する
        personalTotalAssets = personalTotalAssets + personalBalance;
        corporateTotalAssets = corporateTotalAssets + corporateBalance;

        // 現在の負債総額を計算
        let personalLiabilityTotal = 0;
        workingLiabilityData.personal.forEach((liability: any) => {
          personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        let corporateLiabilityTotal = 0;
        workingLiabilityData.corporate.forEach((liability: any) => {
          corporateLiabilityTotal += Math.abs(liability.amounts[year] || 0);
        });

        // 純資産の計算（修正点：Math.maxを削除してマイナスも許可）
        const personalNetAssets = personalTotalAssets - personalLiabilityTotal;
        const corporateNetAssets = corporateTotalAssets - corporateLiabilityTotal;

        // 投資額を小数点第一位まで丸める
        personalInvestmentAmount = Math.round(personalInvestmentAmount * 10) / 10;
        corporateInvestmentAmount = Math.round(corporateInvestmentAmount * 10) / 10;

        // キャッシュフローデータを更新
        newCashFlow[year] = {
          mainIncome: Math.round(mainIncome * 10) / 10,
          sideIncome: Math.round(sideIncome * 10) / 10,
          spouseIncome: Math.round(spouseIncome * 10) / 10,
          pensionIncome: Math.round(pensionIncome * 10) / 10,
          spousePensionIncome: Math.round(spousePensionIncome * 10) / 10,
          investmentIncome: personalInvestmentIncome,
          livingExpense: Math.round(livingExpense * 10) / 10,
          housingExpense: Math.round(housingExpense * 10) / 10,
          educationExpense: Math.round(educationExpense * 10) / 10,
          otherExpense: Math.round(otherExpense * 10) / 10,
          loanRepayment: Math.round(personalLoanRepayment * 10) / 10,
          personalAssets: Math.round(personalTotalAssets * 10) / 10,
          investmentAmount: personalInvestmentAmount,
          totalInvestmentAssets: currentPersonalInvestmentAssets,
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
          corporateInvestmentAmount: corporateInvestmentAmount,
          corporateInvestmentIncome: corporateInvestmentIncome,
          corporateTotalInvestmentAssets: currentCorporateInvestmentAssets
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
        {
          ...entry,
          timestamp: Date.now(),
        },
      ],
    }));
  },
  
  clearHistory: () => set({ history: [] }),
}));

// 教育費計算関数
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

function getUniversityCost(universityType: string): number {
  switch (universityType) {
    case '国立大学（文系）':
      return 60.6;
    case '国立大学（理系）':
      return 60.6;
    case '私立大学（文系）':
      return 102.6;
    case '私立大学（理系）':
      return 135.4;
    default:
      return 0;
  }
}
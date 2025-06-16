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

      // 初期値を取得
      const getInitialAssets = (section: 'personal' | 'corporate') => {
        return workingAssetData[section].reduce((total: number, asset: any) => {
          if (!asset.isInvestment) {
            return total + Math.abs(asset.amounts[basicInfo.startYear] || 0);
          }
          return total;
        }, 0);
      };

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

      years.forEach(year => {
        // 各年の個人収入を集計
        const mainIncome = salaryItem?.amounts[year] || 0;
        const sideIncome = findPersonalItem('事業収入')?.amounts[year] || 0;
        const otherSideIncome = findPersonalItem('副業収入')?.amounts[year] || 0;
        const spouseIncome = spouseIncomeItem?.amounts[year] || 0;
        const pensionIncome = pensionItem?.amounts[year] || 0;
        const spousePensionIncome = spousePensionItem?.amounts[year] || 0;
        
        // 個人投資収益の計算
        const personalInvestmentIncome = personalInvestmentAssets * (parameters.investmentReturn / 100);
        
        // 個人投資額の計算（各収入からの投資額の合計）
        const personalInvestmentAmount = incomeData.personal.reduce((total, item) => {
          const itemIncome = item.amounts[year] || 0;
          const investmentRatio = item.investmentRatio || 0;
          const maxInvestmentAmount = item.maxInvestmentAmount || 0;
          const investmentFromThisItem = Math.min(itemIncome * investmentRatio / 100, maxInvestmentAmount);
          return total + investmentFromThisItem;
        }, 0);

        // 個人支出を集計
        const livingExpense = expenseData.personal.find(i => i.name === '生活費')?.amounts[year] || 0;
        const housingExpense = expenseData.personal.find(i => i.name === '住居費')?.amounts[year] || 0;
        const educationExpense = expenseData.personal.find(i => i.name === '教育費')?.amounts[year] || 0;
        const otherPersonalExpense = expenseData.personal
          .filter(i => !['生活費', '住居費', '教育費'].includes(i.name))
          .reduce((sum, item) => sum + (item.amounts[year] || 0), 0);

        // 法人収入
        const corporateIncome = incomeData.corporate.find(i => i.name === '売上')?.amounts[year] || 0;
        const corporateOtherIncome = incomeData.corporate
          .filter(i => i.name !== '売上')
          .reduce((sum, item) => sum + (item.amounts[year] || 0), 0);

        // 法人投資収益の計算
        const corporateInvestmentIncome = corporateInvestmentAssets * (parameters.investmentReturn / 100);
        
        // 法人投資額の計算
        const corporateInvestmentAmount = incomeData.corporate.reduce((total, item) => {
          const itemIncome = item.amounts[year] || 0;
          const investmentRatio = item.investmentRatio || 0;
          const maxInvestmentAmount = item.maxInvestmentAmount || 0;
          const investmentFromThisItem = Math.min(itemIncome * investmentRatio / 100, maxInvestmentAmount);
          return total + investmentFromThisItem;
        }, 0);

        // 法人支出
        const corporateExpense = expenseData.corporate
          .filter(i => i.name !== 'その他')
          .reduce((sum, item) => sum + (item.amounts[year] || 0), 0);
        const corporateOtherExpense = expenseData.corporate.find(i => i.name === 'その他')?.amounts[year] || 0;

        // ライフイベントの影響を計算
        const personalLifeEventIncome = lifeEvents
          .filter(event => event.year === year && event.type === 'income' && event.source === 'personal')
          .reduce((sum, event) => sum + event.amount, 0);
        
        const personalLifeEventExpense = lifeEvents
          .filter(event => event.year === year && event.type === 'expense' && event.source === 'personal')
          .reduce((sum, event) => sum + event.amount, 0);

        const corporateLifeEventIncome = lifeEvents
          .filter(event => event.year === year && event.type === 'income' && event.source === 'corporate')
          .reduce((sum, event) => sum + event.amount, 0);
        
        const corporateLifeEventExpense = lifeEvents
          .filter(event => event.year === year && event.type === 'expense' && event.source === 'corporate')
          .reduce((sum, event) => sum + event.amount, 0);

        // 個人投資関連ライフイベント
        const personalInvestmentLifeEventIncome = lifeEvents
          .filter(event => event.year === year && event.type === 'income' && event.source === 'personal_investment')
          .reduce((sum, event) => sum + event.amount, 0);
        
        const personalInvestmentLifeEventExpense = lifeEvents
          .filter(event => event.year === year && event.type === 'expense' && event.source === 'personal_investment')
          .reduce((sum, event) => sum + event.amount, 0);

        // 法人投資関連ライフイベント
        const corporateInvestmentLifeEventIncome = lifeEvents
          .filter(event => event.year === year && event.type === 'income' && event.source === 'corporate_investment')
          .reduce((sum, event) => sum + event.amount, 0);
        
        const corporateInvestmentLifeEventExpense = lifeEvents
          .filter(event => event.year === year && event.type === 'expense' && event.source === 'corporate_investment')
          .reduce((sum, event) => sum + event.amount, 0);

        // 個人負債返済
        const personalLoanRepayment = personalLoanRepayments[year] || 0;
        
        // 法人負債返済
        const corporateLoanRepayment = corporateLoanRepayments[year] || 0;

        // 個人負債総額を計算
        const personalLiabilityTotal = liabilityData.personal.reduce((total, liability) => {
          return total + (liability.amounts[year] || 0);
        }, 0);

        // 法人負債総額を計算
        const corporateLiabilityTotal = liabilityData.corporate.reduce((total, liability) => {
          return total + (liability.amounts[year] || 0);
        }, 0);

        // 収支計算
        const personalTotalIncome = mainIncome + sideIncome + otherSideIncome + spouseIncome + pensionIncome + spousePensionIncome + personalInvestmentIncome + personalLifeEventIncome;
        const personalTotalExpense = livingExpense + housingExpense + educationExpense + otherPersonalExpense + personalInvestmentAmount + personalLifeEventExpense + personalLoanRepayment;
        const personalBalance = personalTotalIncome - personalTotalExpense;

        const corporateTotalIncome = corporateIncome + corporateOtherIncome + corporateInvestmentIncome + corporateLifeEventIncome;
        const corporateTotalExpense = corporateExpense + corporateOtherExpense + corporateInvestmentAmount + corporateLifeEventExpense + corporateLoanRepayment;
        const corporateBalance = corporateTotalIncome - corporateTotalExpense;

        // 資産の更新
        personalTotalAssets += personalBalance;
        corporateTotalAssets += corporateBalance;

        // 投資資産の更新
        const currentPersonalInvestmentAssets = personalInvestmentAssets + personalInvestmentAmount + personalInvestmentIncome + personalInvestmentLifeEventIncome - personalInvestmentLifeEventExpense;
        const currentCorporateInvestmentAssets = corporateInvestmentAssets + corporateInvestmentAmount + corporateInvestmentIncome + corporateInvestmentLifeEventIncome - corporateInvestmentLifeEventExpense;

        // 来年用に更新
        personalInvestmentAssets = currentPersonalInvestmentAssets;
        corporateInvestmentAssets = currentCorporateInvestmentAssets;

        // 純資産計算
        const personalNetAssets = personalTotalAssets - personalLiabilityTotal;
        const corporateNetAssets = corporateTotalAssets - corporateLiabilityTotal;

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

  const plannedChildrenExpense = plannedChildren.reduce((total, plannedChild) => {
    const birthYear = startYear + plannedChild.yearsFromNow;
    const childAge = year - birthYear;
    
    if (childAge < 0) return total;
    
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
      expense = costs.nursery[plannedChild.educationPlan.nursery] || 0;
    }
    if (childAge >= 3 && childAge <= 5) {
      expense = costs.preschool[plannedChild.educationPlan.preschool] || 0;
    }
    if (childAge >= 6 && childAge <= 11) {
      expense = costs.elementary[plannedChild.educationPlan.elementary] || 0;
    }
    if (childAge >= 12 && childAge <= 14) {
      expense = costs.juniorHigh[plannedChild.educationPlan.juniorHigh] || 0;
    }
    if (childAge >= 15 && childAge <= 17) {
      expense = costs.highSchool[plannedChild.educationPlan.highSchool] || 0;
    }
    if (childAge >= 18 && childAge <= 21) {
      expense = costs.university[plannedChild.educationPlan.university] || 0;
    }

    const inflatedExpense = expense * educationInflationFactor;
    return total + inflatedExpense;
  }, 0);

  return Math.round((existingChildrenExpense + plannedChildrenExpense) * 10) / 10;
}

import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Plus, Trash2, Wand2, X, RotateCcw } from 'lucide-react';
import { 
  CategorySelect, 
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES
} from '@/components/ui/category-select';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { assetsLiabilitiesTermsContent, assetsLiabilitiesFormulasContent } from '@/utils/helpContent';

// 自動計算モーダル用のインターフェース
interface LoanCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: LoanCalculationSettings) => void;
  initialSettings?: LoanCalculationSettings;
  itemName: string;
}

interface LoanCalculationSettings {
  borrowAmount: number;
  startYear: number;
  interestRate: number;
  termYears: number;
  repaymentType: 'equal_principal' | 'equal_payment';
}

// 自動計算モーダルコンポーネント（過去借入対応版）
const LoanCalculationModal: React.FC<LoanCalculationModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSettings,
  itemName
}) => {
  const { basicInfo } = useSimulatorStore();
  const [settings, setSettings] = useState<LoanCalculationSettings>(
    initialSettings || {
      borrowAmount: 1000, // デフォルト1000万円
      startYear: basicInfo.startYear,
      interestRate: 2.0, // デフォルト2%
      termYears: 10, // デフォルト10年
      repaymentType: 'equal_payment', // デフォルトは元利均等
    }
  );

  const currentYear = new Date().getFullYear();
  
  // 過去50年から未来50年まで選択可能
  const startYearOptions = [];
  for (let year = currentYear - 50; year <= currentYear + 50; year++) {
    startYearOptions.push(year);
  }

  const modalTitle = `${itemName} 自動計算設定`;
  const isHistoricalLoan = settings.startYear < currentYear;

  if (!isOpen) return null;

  // 返済額のプレビュー計算
  const calculatePreview = () => {
    const { borrowAmount, interestRate, termYears, repaymentType } = settings;
    
    if (borrowAmount <= 0 || termYears <= 0) return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0, currentBalance: 0 };

    if (interestRate === 0) {
      // 金利0%の場合
      const yearlyPayment = borrowAmount / termYears;
      
      // 過去の借入の場合、現在の残高を計算
      let currentBalance = borrowAmount;
      if (isHistoricalLoan) {
        const elapsedYears = currentYear - settings.startYear;
        currentBalance = Math.max(0, borrowAmount - (yearlyPayment * elapsedYears));
      }
      
      return {
        monthlyPayment: Math.round(yearlyPayment / 12 * 10) / 10,
        totalPayment: borrowAmount,
        totalInterest: 0,
        currentBalance: Math.round(currentBalance * 10) / 10
      };
    }

    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = termYears * 12;

    if (repaymentType === 'equal_payment') {
      // 元利均等返済
      const monthlyPayment = borrowAmount * 
        (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      
      const totalPayment = monthlyPayment * totalPayments;
      
      // 過去の借入の場合、現在の残高を計算
      let currentBalance = borrowAmount;
      if (isHistoricalLoan) {
        const elapsedMonths = (currentYear - settings.startYear) * 12;
        for (let i = 0; i < elapsedMonths && i < totalPayments; i++) {
          const interestPayment = currentBalance * monthlyRate;
          const principalPayment = monthlyPayment - interestPayment;
          currentBalance = Math.max(0, currentBalance - principalPayment);
        }
      }
      
      return {
        monthlyPayment: Math.round(monthlyPayment * 10) / 10,
        totalPayment: Math.round(totalPayment * 10) / 10,
        totalInterest: Math.round((totalPayment - borrowAmount) * 10) / 10,
        currentBalance: Math.round(currentBalance * 10) / 10
      };
    } else {
      // 元金均等返済
      const monthlyPrincipal = borrowAmount / totalPayments;
      let totalInterest = 0;
      let remainingBalance = borrowAmount;
      
      for (let i = 0; i < totalPayments; i++) {
        const monthlyInterest = remainingBalance * monthlyRate;
        totalInterest += monthlyInterest;
        remainingBalance -= monthlyPrincipal;
      }
      
      const firstMonthPayment = monthlyPrincipal + (borrowAmount * monthlyRate);
      
      // 過去の借入の場合、現在の残高を計算
      let currentBalance = borrowAmount;
      if (isHistoricalLoan) {
        const elapsedMonths = (currentYear - settings.startYear) * 12;
        currentBalance = Math.max(0, borrowAmount - (monthlyPrincipal * elapsedMonths));
      }
      
      return {
        monthlyPayment: Math.round(firstMonthPayment * 10) / 10,
        totalPayment: Math.round((borrowAmount + totalInterest) * 10) / 10,
        totalInterest: Math.round(totalInterest * 10) / 10,
        currentBalance: Math.round(currentBalance * 10) / 10
      };
    }
  };

  const preview = calculatePreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{modalTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">借入額（万円）</label>
            <input
              type="number"
              value={settings.borrowAmount}
              onChange={(e) => setSettings({...settings, borrowAmount: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
              placeholder="例：3000"
              min="0"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">借入開始年</label>
            <select
              value={settings.startYear}
              onChange={(e) => setSettings({...settings, startYear: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            >
              {startYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              ※過去の借入や将来の借入予定も設定可能です
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">年利（%）</label>
            <input
              type="number"
              value={settings.interestRate}
              onChange={(e) => setSettings({...settings, interestRate: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
              placeholder="例：2.0"
              min="0"
              step="0.1"
            />
            <p className="text-xs text-gray-500">
              ※金利0%の場合は元金のみの計算になります
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返済期間（年）</label>
            <input
              type="number"
              value={settings.termYears}
              onChange={(e) => setSettings({...settings, termYears: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
              placeholder="例：30"
              min="1"
              max="50"
              step="1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返済方式</label>
            <select
              value={settings.repaymentType}
              onChange={(e) => setSettings({...settings, repaymentType: e.target.value as 'equal_principal' | 'equal_payment'})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            >
              <option value="equal_payment">元利均等返済（毎回の返済額が一定）</option>
              <option value="equal_principal">元金均等返済（毎回の元金返済額が一定）</option>
            </select>
          </div>

          {/* プレビュー表示 */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">返済シミュレーション</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>月額返済額: <span className="font-semibold">{preview.monthlyPayment}万円</span>
                {settings.repaymentType === 'equal_principal' && settings.interestRate > 0 && 
                  <span className="text-xs">（初回、徐々に減少）</span>}
              </p>
              <p>総返済額: <span className="font-semibold">{preview.totalPayment}万円</span></p>
              <p>総利息: <span className="font-semibold">{preview.totalInterest}万円</span></p>
              {isHistoricalLoan && (
                <p className="text-orange-600 font-semibold">
                  現在の推定残高: <span>{preview.currentBalance}万円</span>
                </p>
              )}
            </div>
          </div>

          {/* 過去の借入の場合の説明 */}
          {isHistoricalLoan && (
            <div className="bg-orange-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-orange-800 mb-1">過去の借入について</h4>
              <ul className="text-xs text-orange-700 space-y-1">
                <li>• 借入時：現金・預金への追加はありません（既に過去に借入済みのため）</li>
                <li>• 残高計算：経過年数を考慮した現在の推定残高から開始します</li>
                <li>• 返済処理：今後の返済スケジュールを自動計算します</li>
              </ul>
            </div>
          )}

          {/* 将来の借入の場合の説明 */}
          {!isHistoricalLoan && (
            <div className="bg-green-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-green-800 mb-1">将来の借入について</h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• 借入時：現金・預金に借入額が自動追加されます</li>
                <li>• 返済時：各年の返済額が現金・預金から自動減算されます</li>
                <li>• 負債残高：返済スケジュールに従って自動計算されます</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            onClick={() => onApply(settings)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            計算実行
          </button>
        </div>
      </div>
    </div>
  );
};

export function AssetsLiabilitiesForm() {
  const { 
    basicInfo, 
    setCurrentStep,
    assetData,
    setAssetData,
    liabilityData,
    setLiabilityData,
    syncCashFlowFromFormData
  } = useSimulatorStore();

  // 自動計算モーダルの状態
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [currentLiabilityId, setCurrentLiabilityId] = useState('');
  const [currentSection, setCurrentSection] = useState<'personal' | 'corporate'>('personal');

  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  const currentYear = new Date().getFullYear();

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleNext = () => {
    setCurrentStep(5);
  };

  // 資産項目を追加
  const addAssetItem = (section: 'personal' | 'corporate') => {
    const newId = Date.now().toString();
    setAssetData({
      ...assetData,
      [section]: [
        ...assetData[section],
        {
          id: newId,
          name: '',
          type: 'cash' as const,
          category: 'asset',
          amounts: {},
          isInvestment: false,
          investmentReturn: 0,
        },
      ],
    });
  };

  // 負債項目を追加
  const addLiabilityItem = (section: 'personal' | 'corporate') => {
    const newId = Date.now().toString();
    setLiabilityData({
      ...liabilityData,
      [section]: [
        ...liabilityData[section],
        {
          id: newId,
          name: '',
          type: 'loan' as const,
          category: 'liability',
          amounts: {},
          autoCalculate: false,
          interestRate: 0,
          termYears: 0,
          repaymentType: 'equal_payment',
        },
      ],
    });
  };

  // 資産項目を削除
  const removeAssetItem = (section: 'personal' | 'corporate', itemId: string) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].filter(item => item.id !== itemId),
    });
    syncCashFlowFromFormData();
  };

  // 負債項目を削除
  const removeLiabilityItem = (section: 'personal' | 'corporate', itemId: string) => {
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].filter(item => item.id !== itemId),
    });
    syncCashFlowFromFormData();
  };

  // 資産名を変更
  const handleAssetNameChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              name: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 負債名を変更
  const handleLiabilityNameChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              name: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 資産の種類を変更
  const handleAssetTypeChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: 'cash' | 'investment' | 'property' | 'other'
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              type: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 資産のカテゴリを変更
  const handleAssetCategoryChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              category: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 負債の種類を変更
  const handleLiabilityTypeChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: 'loan' | 'credit' | 'other'
  ) => {
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              type: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 負債のカテゴリを変更
  const handleLiabilityCategoryChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              category: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 資産の投資フラグを切り替える
  const toggleAssetInvestment = (
    section: 'personal' | 'corporate',
    itemId: string
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              isInvestment: !item.isInvestment,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 運用利回りを変更する関数を追加
  const handleInvestmentReturnChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: number
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              investmentReturn: value,
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  const handleAssetAmountChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              amounts: {
                ...item.amounts,
                [year]: value,
              },
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  const handleLiabilityAmountChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    // 自動計算が有効な項目は手動変更を防ぐ
    const item = liabilityData[section].find(i => i.id === itemId);
    if (item?.autoCalculate && item.startYear && year !== item.startYear) {
      return; // 自動計算項目の返済年は変更不可
    }

    // 負債は正の値で保存（借入額）
    const positiveValue = Math.abs(value);
    
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              amounts: {
                ...item.amounts,
                [year]: positiveValue,
              },
            }
          : item
      ),
    });
    syncCashFlowFromFormData();
  };

  // 過去の借入に対応したローン返済スケジュール計算
  const calculateLoanScheduleWithHistory = (
    borrowAmount: number,
    interestRate: number,
    termYears: number,
    repaymentType: 'equal_principal' | 'equal_payment',
    startYear: number
  ) => {
    const schedule: Array<{
      year: number;
      payment: number;
      principal: number;
      interest: number;
      remainingBalance: number;
    }> = [];

    const elapsedYears = Math.max(0, currentYear - startYear);
    
    if (interestRate === 0) {
      // 金利0%の場合：元金均等返済
      const yearlyPrincipalPayment = borrowAmount / termYears;
      
      // 現在の残高を計算（過去の返済分を考慮）
      let currentBalance = Math.max(0, borrowAmount - (yearlyPrincipalPayment * elapsedYears));
      
      // 現在年から将来の返済スケジュールを作成
      const remainingTermYears = Math.max(0, termYears - elapsedYears);
      
      for (let year = 1; year <= remainingTermYears; year++) {
        const actualYear = currentYear + year;
        currentBalance = Math.max(0, currentBalance - yearlyPrincipalPayment);
        
        schedule.push({
          year: actualYear,
          payment: yearlyPrincipalPayment,
          principal: yearlyPrincipalPayment,
          interest: 0,
          remainingBalance: currentBalance
        });
      }
    } else {
      const monthlyRate = interestRate / 100 / 12;
      const totalPayments = termYears * 12;
      const elapsedMonths = elapsedYears * 12;
      
      if (repaymentType === 'equal_payment') {
        // 元利均等返済
        const monthlyPayment = borrowAmount * 
          (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
          (Math.pow(1 + monthlyRate, totalPayments) - 1);
        
        // 現在の残高を計算
        let currentBalance = borrowAmount;
        for (let i = 0; i < elapsedMonths && i < totalPayments; i++) {
          const interestPayment = currentBalance * monthlyRate;
          const principalPayment = monthlyPayment - interestPayment;
          currentBalance = Math.max(0, currentBalance - principalPayment);
        }
        
        // 将来の返済スケジュールを作成
        const remainingPayments = Math.max(0, totalPayments - elapsedMonths);
        const remainingYears = Math.ceil(remainingPayments / 12);
        
        for (let year = 1; year <= remainingYears; year++) {
          const actualYear = currentYear + year;
          
          // 1年分の返済を計算
          let yearlyPayment = 0;
          let yearlyPrincipal = 0;
          let yearlyInterest = 0;
          
          for (let month = 0; month < 12 && currentBalance > 0; month++) {
            const interestPayment = currentBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, currentBalance);
            
            yearlyPayment += monthlyPayment;
            yearlyPrincipal += principalPayment;
            yearlyInterest += interestPayment;
            currentBalance = Math.max(0, currentBalance - principalPayment);
          }
          
          schedule.push({
            year: actualYear,
            payment: Math.round(yearlyPayment * 10) / 10,
            principal: Math.round(yearlyPrincipal * 10) / 10,
            interest: Math.round(yearlyInterest * 10) / 10,
            remainingBalance: Math.round(currentBalance * 10) / 10
          });
        }
      } else {
        // 元金均等返済
        const monthlyPrincipal = borrowAmount / totalPayments;
        
        // 現在の残高を計算
        let currentBalance = Math.max(0, borrowAmount - (monthlyPrincipal * elapsedMonths));
        
        // 将来の返済スケジュールを作成
        const remainingPayments = Math.max(0, totalPayments - elapsedMonths);
        const remainingYears = Math.ceil(remainingPayments / 12);
        
        for (let year = 1; year <= remainingYears; year++) {
          const actualYear = currentYear + year;
          
          // 1年分の返済を計算
          let yearlyPayment = 0;
          let yearlyInterest = 0;
          const yearlyPrincipal = Math.min(monthlyPrincipal * 12, currentBalance);
          
          for (let month = 0; month < 12 && currentBalance > 0; month++) {
            const interestPayment = currentBalance * monthlyRate;
            yearlyPayment += monthlyPrincipal + interestPayment;
            yearlyInterest += interestPayment;
            currentBalance = Math.max(0, currentBalance - monthlyPrincipal);
          }
          
          schedule.push({
            year: actualYear,
            payment: Math.round(yearlyPayment * 10) / 10,
            principal: Math.round(yearlyPrincipal * 10) / 10,
            interest: Math.round(yearlyInterest * 10) / 10,
            remainingBalance: Math.round(currentBalance * 10) / 10
          });
        }
      }
    }

    return schedule;
  };

  // ローン計算を適用（過去の借入対応版）
  const applyLoanCalculation = (settings: LoanCalculationSettings) => {
    const { borrowAmount, startYear, interestRate, termYears, repaymentType } = settings;
    
    if (!currentLiabilityId) return;

    const isHistoricalLoan = startYear < currentYear;
    
    // 現金・預金項目を取得
    const cashAssetItem = assetData[currentSection].find(asset => 
      asset.type === 'cash' || asset.name.includes('現金') || asset.name.includes('預金')
    );

    // 返済スケジュールを計算（過去の借入対応）
    const schedule = calculateLoanScheduleWithHistory(
      borrowAmount, 
      interestRate, 
      termYears, 
      repaymentType, 
      startYear
    );

    // 現在の推定残高を計算
    let currentEstimatedBalance = borrowAmount;
    if (isHistoricalLoan) {
      const elapsedYears = currentYear - startYear;
      
      if (interestRate === 0) {
        const yearlyPrincipalPayment = borrowAmount / termYears;
        currentEstimatedBalance = Math.max(0, borrowAmount - (yearlyPrincipalPayment * elapsedYears));
      } else {
        const monthlyRate = interestRate / 100 / 12;
        const totalPayments = termYears * 12;
        const elapsedMonths = elapsedYears * 12;
        
        if (repaymentType === 'equal_payment') {
          const monthlyPayment = borrowAmount * 
            (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
            (Math.pow(1 + monthlyRate, totalPayments) - 1);
          
          let balance = borrowAmount;
          for (let i = 0; i < elapsedMonths && i < totalPayments; i++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance = Math.max(0, balance - principalPayment);
          }
          currentEstimatedBalance = balance;
        } else {
          const monthlyPrincipal = borrowAmount / totalPayments;
          currentEstimatedBalance = Math.max(0, borrowAmount - (monthlyPrincipal * elapsedMonths));
        }
      }
    }

    // 負債データを更新
    const updatedLiabilityData = {
      ...liabilityData,
      [currentSection]: liabilityData[currentSection].map(item => {
        if (item.id === currentLiabilityId) {
          const newAmounts: { [year: number]: number } = {};
          
          if (isHistoricalLoan) {
            // 過去の借入の場合、現在年に推定残高を設定
            newAmounts[currentYear] = Math.round(currentEstimatedBalance * 10) / 10;
          } else {
            // 将来の借入の場合、借入年に元本を設定
            newAmounts[startYear] = borrowAmount;
          }
          
          // 将来の各年の残高を設定
          schedule.forEach((payment) => {
            newAmounts[payment.year] = payment.remainingBalance;
          });

          return {
            ...item,
            amounts: newAmounts,
            startYear,
            interestRate,
            termYears,
            repaymentType,
            autoCalculate: true,
            borrowAmount
          };
        }
        return item;
      })
    };

    // 現金・預金を更新
    let updatedAssetData = assetData;
    if (cashAssetItem) {
      updatedAssetData = {
        ...assetData,
        [currentSection]: assetData[currentSection].map(item => {
          if (item.id === cashAssetItem.id) {
            const newAmounts = { ...item.amounts };
            
            if (!isHistoricalLoan) {
              // 将来の借入の場合のみ、借入年に現金を増加
              newAmounts[startYear] = (newAmounts[startYear] || 0) + borrowAmount;
            }
            
            // 返済による現金減算を各年に適用
            schedule.forEach(payment => {
              newAmounts[payment.year] = (newAmounts[payment.year] || 0) - payment.payment;
            });

            return {
              ...item,
              amounts: newAmounts
            };
          }
          return item;
        })
      };
    }

    setLiabilityData(updatedLiabilityData);
    setAssetData(updatedAssetData);
    syncCashFlowFromFormData();
    setLoanModalOpen(false);
  };

  // ローン計算モーダルを開く
  const openLoanCalculationModal = (liabilityId: string, section: 'personal' | 'corporate') => {
    setCurrentLiabilityId(liabilityId);
    setCurrentSection(section);
    setLoanModalOpen(true);
  };

  // ローン計算を取消
  const cancelLoanCalculation = (section: 'personal' | 'corporate', liabilityId: string) => {
    const item = liabilityData[section].find(i => i.id === liabilityId);
    if (!item || !item.autoCalculate) return;

    // 現金・預金項目から借入額を減額
    if (item.startYear && item.borrowAmount && item.startYear >= currentYear) {
      const cashAssetItem = assetData[section].find(asset => 
        asset.type === 'cash' || asset.name.includes('現金') || asset.name.includes('預金')
      );

      if (cashAssetItem) {
        setAssetData({
          ...assetData,
          [section]: assetData[section].map(asset =>
            asset.id === cashAssetItem.id
              ? {
                  ...asset,
                  amounts: {
                    ...asset.amounts,
                    [item.startYear!]: Math.max(0, (asset.amounts[item.startYear!] || 0) - item.borrowAmount!),
                  },
                }
              : asset
          ),
        });
      }
    }

    // 負債データをリセット
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].map(item =>
        item.id === liabilityId
          ? {
              ...item,
              amounts: {},
              interestRate: 0,
              termYears: 0,
              autoCalculate: false,
              repaymentType: 'equal_payment',
              startYear: undefined,
              borrowAmount: undefined,
            }
          : item
      ),
    });

    syncCashFlowFromFormData();
  };

  // 資産テーブルのレンダリング
  const renderAssetTable = (section: 'personal' | 'corporate') => {
    const items = assetData[section];
    const title = section === 'personal' ? '個人' : '法人';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => addAssetItem(section)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            項目を追加
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[110px]">
                  項目
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  種類
                  <TermTooltip term="" width="narrow">
                    資産の種類です。現金・預金/投資/不動産/その他から選択できます。
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  カテゴリ
                  <TermTooltip term="" width="narrow">
                    資産の分類です。資産/その他から選択できます。
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px]">
                  運用資産
                  <TermTooltip term="" width="narrow">
                    チェックを入れると、この資産に運用利回りが適用され、複利で増加していきます。
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px]">
                  運用利回り(%)
                  <TermTooltip term="" width="narrow">
                    運用資産にチェックが入っている場合の年間利回りです。複利で計算されます。
                  </TermTooltip>
                </th>
                {years.map(year => (
                  <th key={year} className="px-4 py-2 text-right text-sm font-medium text-gray-500 min-w-[95px]">
                    {year}年
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[60px]">
                  削除
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 sticky left-0 bg-white">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleAssetNameChange(section, item.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={item.type}
                      onChange={(e) => handleAssetTypeChange(section, item.id, e.target.value as 'cash' | 'investment' | 'property' | 'other')}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">現金・預金</option>
                      <option value="investment">投資</option>
                      <option value="property">不動産</option>
                      <option value="other">その他</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <CategorySelect
                      value={item.category}
                      onChange={(value) => handleAssetCategoryChange(section, item.id, value)}
                      categories={ASSET_CATEGORIES}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.isInvestment}
                      onChange={() => toggleAssetInvestment(section, item.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.investmentReturn || ''}
                      onChange={(e) => handleInvestmentReturnChange(section, item.id, Number(e.target.value))}
                      disabled={!item.isInvestment}
                      className={`w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        !item.isInvestment ? 'bg-gray-100 text-gray-400' : ''
                      }`}
                      placeholder="0.0"
                    />
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <input
                        type="number"
                        value={item.amounts[year] || ''}
                        onChange={(e) => handleAssetAmountChange(section, item.id, year, Number(e.target.value))}
                        className="w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeAssetItem(section, item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 負債テーブルのレンダリング関数
  const renderLiabilityTable = (section: 'personal' | 'corporate') => {
    const items = liabilityData[section];
    const title = section === 'personal' ? '個人' : '法人';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          <button
            type="button"
            onClick={() => addLiabilityItem(section)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            項目を追加
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[110px]">
                  項目
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  種類
                  <TermTooltip term="" width="narrow">
                    負債の種類です。ローン/クレジット/その他から選択できます。
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  カテゴリ
                  <TermTooltip term="" width="narrow">
                    負債の分類です。負債/その他から選択できます。
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px]">
                  自動計算
                  <TermTooltip term="" width="narrow">
                    借入条件から返済スケジュールを自動計算します。
                  </TermTooltip>
                </th>
                {years.map(year => (
                  <th key={year} className="px-4 py-2 text-right text-sm font-medium text-gray-500 min-w-[95px]">
                    {year}年
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[60px]">
                  削除
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 sticky left-0 bg-white">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleLiabilityNameChange(section, item.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={item.type}
                      onChange={(e) => handleLiabilityTypeChange(section, item.id, e.target.value as 'loan' | 'credit' | 'other')}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="loan">ローン</option>
                      <option value="credit">クレジット</option>
                      <option value="other">その他</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <CategorySelect
                      value={item.category}
                      onChange={(value) => handleLiabilityCategoryChange(section, item.id, value)}
                      categories={LIABILITY_CATEGORIES}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex flex-col gap-1">
                      {item.autoCalculate ? (
                        <button
                          type="button"
                          onClick={() => cancelLoanCalculation(section, item.id)}
                          className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                          title="自動計算を取消"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>取消</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openLoanCalculationModal(item.id, section)}
                          className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                        >
                          <Wand2 className="h-3 w-3 mr-1" />
                          <span>設定</span>
                        </button>
                      )}
                    </div>
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <input
                        type="number"
                        value={item.amounts[year] || ''}
                        onChange={(e) => handleLiabilityAmountChange(section, item.id, year, Number(e.target.value))}
                        disabled={item.autoCalculate && item.startYear && year !== item.startYear}
                        className={`w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          item.autoCalculate && item.startYear && year !== item.startYear 
                            ? 'bg-gray-100 text-gray-600' 
                            : ''
                        }`}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLiabilityItem(section, item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 説明セクション */}
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>資産・負債情報について</span>
        </h3>
        <p className="text-sm text-blue-700">
          資産（プラスの財産）と負債（マイナスの財産）を個人・法人別に入力します。運用資産にチェックを入れた項目は、
          設定した運用利回りで増加していきます。負債には「自動計算」機能があり、借入条件を設定すると返済スケジュールを自動作成できます。
        </p>
      </div>

      <div className="bg-purple-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-purple-800 mb-2 flex items-center">
          <span>負債の自動計算機能について</span>
          <Wand2 className="h-4 w-4 ml-2" />
        </h3>
        <div className="text-sm text-purple-700 space-y-2">
          <p><strong>使用方法：</strong></p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>「設定」ボタンをクリック</li>
            <li>借入額、開始年、金利、返済期間、返済方式を設定</li>
            <li>「計算実行」で返済スケジュールを自動作成</li>
            <li>間違えた場合は「取消」ボタンで完全にリセット</li>
          </ol>
          <p><strong>自動処理：</strong>借入時に現金・預金が自動で増加し、各年の返済で現金から返済額が自動で減算されます。</p>
          <p><strong>過去の借入：</strong>開始年が現在より前の場合、経過年数を考慮した現在残高から計算を開始します。</p>
        </div>
      </div>

      {/* 運用利回り設定についての説明を追加 */}
      <div className="bg-green-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-green-800 mb-2 flex items-center">
          <span>運用資産利回り設定について</span>
        </h3>
        <div className="text-sm text-green-700 space-y-2">
          <p><strong>設定方法：</strong></p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>運用資産欄にチェックを入れる</li>
            <li>運用利回り欄に年間の期待利回り（%）を入力</li>
            <li>各年の資産額を入力</li>
          </ol>
          <p><strong>計算方法：</strong>運用資産は毎年、設定した利回りで複利計算されます。</p>
        </div>
      </div>

      {/* 資産セクション */}
      <div className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            資産
          </h3>
          <div className="text-sm text-gray-500">
            ※運用資産にチェックを入れた項目には、設定した運用利回りが適用されます
          </div>
        </div>
        {renderAssetTable('personal')}
        {renderAssetTable('corporate')}
      </div>

      {/* 負債セクション */}
      <div className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            負債
          </h3>
          <div className="text-sm text-gray-500">
            ※自動計算機能を使うと、借入条件から返済スケジュールを自動作成できます
          </div>
        </div>
        {renderLiabilityTable('personal')}
        {renderLiabilityTable('corporate')}
      </div>

      <div className="bg-yellow-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-yellow-800 mb-2">運用資産と複利効果</h3>
        <p className="text-sm text-yellow-700 mb-2">
          運用資産として設定した資産は、毎年の運用利回りで複利計算されます。長期間の運用では、複利効果により大きな資産形成が期待できます。
        </p>
        <div className="text-sm text-yellow-700">
          <p className="font-medium">複利効果の例：</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>100万円の資産を年利3%で20年運用 → 約180万円（+80%）</li>
            <li>100万円の資産を年利5%で20年運用 → 約265万円（+165%）</li>
            <li>100万円の資産を年利7%で20年運用 → 約387万円（+287%）</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          次へ
        </button>
      </div>
      
      {/* 自動計算モーダル */}
      <LoanCalculationModal
        isOpen={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        onApply={applyLoanCalculation}
        itemName={
          liabilityData[currentSection].find(i => i.id === currentLiabilityId)?.name || '負債'
        }
      />
      
      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: assetsLiabilitiesTermsContent },
          { id: 'formulas', label: '計算式', content: assetsLiabilitiesFormulasContent }
        ]} 
      />
    </div>
  );
}

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

// 自動計算モーダルコンポーネント
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

  // 利用可能な年の配列
  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  const modalTitle = `${itemName} 自動計算設定`;

  if (!isOpen) return null;

  // 返済額のプレビュー計算
  const calculatePreview = () => {
    const { borrowAmount, interestRate, termYears, repaymentType } = settings;
    
    if (borrowAmount <= 0 || termYears <= 0) return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };

    if (interestRate === 0) {
      // 金利0%の場合
      const yearlyPayment = borrowAmount / termYears;
      return {
        monthlyPayment: Math.round(yearlyPayment / 12 * 10) / 10,
        totalPayment: borrowAmount,
        totalInterest: 0
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
      
      return {
        monthlyPayment: Math.round(monthlyPayment * 10) / 10,
        totalPayment: Math.round(totalPayment * 10) / 10,
        totalInterest: Math.round((totalPayment - borrowAmount) * 10) / 10
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
      
      return {
        monthlyPayment: Math.round(firstMonthPayment * 10) / 10,
        totalPayment: Math.round((borrowAmount + totalInterest) * 10) / 10,
        totalInterest: Math.round(totalInterest * 10) / 10
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
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">借入開始年</label>
            <select
              value={settings.startYear}
              onChange={(e) => setSettings({...settings, startYear: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">年利（%）</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={settings.interestRate}
              onChange={(e) => setSettings({...settings, interestRate: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返済期間（年）</label>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.termYears}
              onChange={(e) => setSettings({...settings, termYears: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返済方式</label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="equal_payment"
                  checked={settings.repaymentType === 'equal_payment'}
                  onChange={() => setSettings({...settings, repaymentType: 'equal_payment'})}
                  className="mr-2"
                />
                <label htmlFor="equal_payment">元利均等</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="equal_principal"
                  checked={settings.repaymentType === 'equal_principal'}
                  onChange={() => setSettings({...settings, repaymentType: 'equal_principal'})}
                  className="mr-2"
                />
                <label htmlFor="equal_principal">元金均等</label>
              </div>
            </div>
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
            </div>
          </div>
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

  // 自動計算モーダルを開く
  const openLoanCalculationModal = (itemId: string, section: 'personal' | 'corporate') => {
    setCurrentLiabilityId(itemId);
    setCurrentSection(section);
    setLoanModalOpen(true);
  };

  // 自動計算を実行
  const applyLoanCalculation = (settings: LoanCalculationSettings) => {
    if (!currentLiabilityId) return;

    const { borrowAmount, startYear, interestRate, termYears, repaymentType } = settings;

    // 現金・預金項目を取得
    const cashAsset = assetData[currentSection].find(asset => 
      asset.type === 'cash' || asset.name.includes('現金')
    );

    // 返済スケジュールを計算
    const schedule = calculateLoanSchedule(borrowAmount, interestRate, termYears, repaymentType);

    // 負債データを更新
    const updatedLiabilityData = {
      ...liabilityData,
      [currentSection]: liabilityData[currentSection].map(item => {
        if (item.id === currentLiabilityId) {
          const newAmounts: { [year: number]: number } = {};
          
          // 借入年に元本を設定
          newAmounts[startYear] = borrowAmount;
          
          // 各年の残高を設定
          schedule.forEach((payment, index) => {
            const year = startYear + index + 1;
            newAmounts[year] = payment.remainingBalance;
          });

          return {
            ...item,
            amounts: newAmounts,
            startYear,
            interestRate,
            termYears,
            repaymentType,
            autoCalculate: true,
            originalAmount: borrowAmount,
            _isCalculated: true,
            _calculationHash: `${startYear}_${termYears}_${interestRate}_${repaymentType}_${borrowAmount}`
          };
        }
        return item;
      })
    };

    // 現金・預金を更新（借入時に増加）
    let updatedAssetData = assetData;
    if (cashAsset) {
      updatedAssetData = {
        ...assetData,
        [currentSection]: assetData[currentSection].map(item => {
          if (item.id === cashAsset.id) {
            return {
              ...item,
              amounts: {
                ...item.amounts,
                [startYear]: (item.amounts[startYear] || 0) + borrowAmount
              }
            };
          }
          return item;
        })
      };
    }

    setLiabilityData(updatedLiabilityData);
    setAssetData(updatedAssetData);
    setLoanModalOpen(false);
    syncCashFlowFromFormData();
  };

  // 自動計算を取り消し
  const cancelLoanCalculation = (section: 'personal' | 'corporate', itemId: string) => {
    const item = liabilityData[section].find(i => i.id === itemId);
    if (!item || !item.autoCalculate || !item.startYear || !item.originalAmount) return;

    // 現金・預金項目を取得
    const cashAsset = assetData[section].find(asset => 
      asset.type === 'cash' || asset.name.includes('現金')
    );

    // 負債データをリセット
    const updatedLiabilityData = {
      ...liabilityData,
      [section]: liabilityData[section].map(liability => {
        if (liability.id === itemId) {
          return {
            ...liability,
            amounts: {}, // 全ての年度データをクリア
            autoCalculate: false,
            startYear: undefined,
            originalAmount: undefined,
            _isCalculated: false,
            _calculationHash: undefined
          };
        }
        return liability;
      })
    };

    // 現金・預金から借入額を減額
    let updatedAssetData = assetData;
    if (cashAsset && item.startYear) {
      updatedAssetData = {
        ...assetData,
        [section]: assetData[section].map(asset => {
          if (asset.id === cashAsset.id) {
            return {
              ...asset,
              amounts: {
                ...asset.amounts,
                [item.startYear!]: Math.max(0, (asset.amounts[item.startYear!] || 0) - item.originalAmount!)
              }
            };
          }
          return asset;
        })
      };
    }

    setLiabilityData(updatedLiabilityData);
    setAssetData(updatedAssetData);
    syncCashFlowFromFormData();
  };

  // ローン返済スケジュール計算関数
  const calculateLoanSchedule = (
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

  const addAssetItem = (section: 'personal' | 'corporate') => {
    const newId = String(Math.max(...assetData[section].map(i => Number(i.id) || 0), 0) + 1);
    setAssetData({
      ...assetData,
      [section]: [
        ...assetData[section],
        {
          id: newId,
          name: 'その他',
          type: 'other',
          category: 'asset',
          amounts: {},
          isInvestment: false,
        },
      ],
    });
    syncCashFlowFromFormData();
  };

  const addLiabilityItem = (section: 'personal' | 'corporate') => {
    const newId = String(Math.max(...liabilityData[section].map(i => Number(i.id) || 0), 0) + 1);
    setLiabilityData({
      ...liabilityData,
      [section]: [
        ...liabilityData[section],
        {
          id: newId,
          name: 'その他',
          type: 'other',
          category: 'liability',
          amounts: {},
          interestRate: 0,
          termYears: 0,
          autoCalculate: false,
          repaymentType: 'equal_payment',
        },
      ],
    });
    syncCashFlowFromFormData();
  };

  const removeAssetItem = (section: 'personal' | 'corporate', id: string) => {
    setAssetData({
      ...assetData,
      [section]: assetData[section].filter(item => item.id !== id),
    });
    syncCashFlowFromFormData();
  };

  const removeLiabilityItem = (section: 'personal' | 'corporate', id: string) => {
    setLiabilityData({
      ...liabilityData,
      [section]: liabilityData[section].filter(item => item.id !== id),
    });
    syncCashFlowFromFormData();
  };

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
                {years.map(year => (
                  <th key={year} className="px-4 py-2 text-right text-sm font-medium text-gray-500 min-w-[95px]">
                    {year}年
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 sticky left-0 bg-white">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleAssetNameChange(section, item.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
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
                      value={item.category || 'asset'}
                      onChange={(value) => handleAssetCategoryChange(section, item.id, value)}
                      categories={ASSET_CATEGORIES}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.isInvestment}
                      onChange={() => toggleAssetInvestment(section, item.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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

  // 修正版：負債テーブルのレンダリング関数
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
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px]">
                  自動計算
                  <TermTooltip term="" width="narrow">
                    ボタンをクリックすると借入条件を設定して返済スケジュールを自動計算します。
                  </TermTooltip>
                </th>
                {years.map(year => (
                  <th key={year} className="px-4 py-2 text-right text-sm font-medium text-gray-500 min-w-[95px]">
                    {year}年
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 sticky left-0 bg-white">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleLiabilityNameChange(section, item.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
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
                      value={item.category || 'liability'}
                      onChange={(value) => handleLiabilityCategoryChange(section, item.id, value)}
                      categories={LIABILITY_CATEGORIES}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {item.autoCalculate ? (
                      <button
                        type="button"
                        onClick={() => cancelLoanCalculation(section, item.id)}
                        className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        title="自動計算を取り消し"
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
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <input
                        type="number"
                        value={item.amounts[year] || ''}
                        onChange={(e) => handleLiabilityAmountChange(section, item.id, year, Number(e.target.value))}
                        className={`w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          item.autoCalculate && item.startYear && year !== item.startYear ? 'bg-gray-100' : ''
                        }`}
                        placeholder="0"
                        disabled={item.autoCalculate && item.startYear && year !== item.startYear}
                      />
                      {item.autoCalculate && item.startYear === year && (
                        <div className="text-xs text-blue-600 mt-1">
                          借入年
                        </div>
                      )}
                      {item.autoCalculate && item.startYear && year > item.startYear && item.amounts[year] !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          自動計算
                        </div>
                      )}
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

  const handleNext = () => {
    syncCashFlowFromFormData();
    setCurrentStep(5);
  };

  const handleBack = () => {
    syncCashFlowFromFormData();
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">資産・負債情報</h2>
        <div className="text-sm text-gray-500">
          ※金額は万円単位で入力してください
        </div>
      </div>

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
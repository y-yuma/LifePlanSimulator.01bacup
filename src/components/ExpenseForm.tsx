import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Plus, Trash2, Info, Wand2, X, Settings } from 'lucide-react';
import { 
  CategorySelect, 
  EXPENSE_CATEGORIES,
  CORPORATE_EXPENSE_CATEGORIES 
} from '@/components/ui/category-select';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { expenseTermsContent, expenseFormulasContent } from '@/utils/helpContent';

// 自動入力設定のインターフェースに上限値を追加
interface AutofillSettings {
  initialAmount: number;
  endAge: number;
  maxAmount?: number; // 上限値を追加
}

// 原価設定のインターフェース
interface CostSettings {
  costRatio: number; // 売上に対する原価率（%）
  costIncreaseRate: number; // 原価上昇率（%）
  maxCostAmount?: number; // 原価上限値（万円）
  targetIncomeIds?: string[]; // 参照する収入項目のIDリスト
}

// 自動入力モーダル用のインターフェース
interface AutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: AutofillSettings) => void;
  initialSettings?: AutofillSettings;
  itemName: string;
  category: string; // カテゴリ情報を追加
}

// 原価設定モーダル用のインターフェース
interface CostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: CostSettings) => void;
  initialSettings?: CostSettings;
  itemName: string;
}

// 社会保険料計算関数（役員用、雇用保険除外）
const calculateDirectorSocialInsurance = (annualSalary: number): number => {
  if (annualSalary <= 0) return 0;
  // 役員の場合、雇用保険を除いた社会保険料率を適用
  const directorSocialInsuranceRate = annualSalary < 850 ? 0.144 : 0.077;
  return Math.floor(annualSalary * directorSocialInsuranceRate);
};

// 原価設定モーダルコンポーネント
const CostSettingsModal: React.FC<CostSettingsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSettings,
  itemName
}) => {
  const { incomeData } = useSimulatorStore();
  
  const [settings, setSettings] = useState<CostSettings>(
    initialSettings || {
      costRatio: 60, // デフォルト60%
      costIncreaseRate: 1.0, // デフォルト1%
      maxCostAmount: undefined,
      targetIncomeIds: [], // デフォルトは空配列
    }
  );

  if (!isOpen) return null;

  const toggleIncomeSelection = (incomeId: string) => {
    const currentIds = settings.targetIncomeIds || [];
    setSettings({
      ...settings,
      targetIncomeIds: currentIds.includes(incomeId)
        ? currentIds.filter(id => id !== incomeId)
        : [...currentIds, incomeId]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{itemName} 原価設定</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 参照する収入項目の選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">原価計算対象の収入項目を選択</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
              {incomeData.corporate.length > 0 ? (
                incomeData.corporate.map(item => (
                  <label key={item.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={(settings.targetIncomeIds || []).includes(item.id)}
                      onChange={() => toggleIncomeSelection(item.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{item.name || '無名の収入項目'}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">法人収入項目がありません</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              選択された項目の合計売上に対して原価率が適用されます。複数選択可能です。
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">売上に対する原価率（%）</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.costRatio}
              onChange={(e) => setSettings({ ...settings, costRatio: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="60"
            />
            <p className="text-xs text-gray-500">
              選択した売上の何%を原価として計算するかを設定します（例：60%なら売上1000万円に対して原価600万円）
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">原価上昇率（%/年）</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.costIncreaseRate}
              onChange={(e) => setSettings({ ...settings, costIncreaseRate: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="1.0"
            />
            <p className="text-xs text-gray-500">
              原価率が毎年上昇する割合を設定します（例：1%なら原価率が毎年1%ずつ上昇）
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">原価上限値（万円/年）（オプション）</label>
            <input
              type="number"
              min="0"
              value={settings.maxCostAmount || ''}
              onChange={(e) => setSettings({ 
                ...settings, 
                maxCostAmount: e.target.value ? Number(e.target.value) : undefined 
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="未設定"
            />
            <p className="text-xs text-gray-500">
              原価の年間上限額を設定できます。計算結果がこの値を超えた場合、この上限が適用されます
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-1">計算例</h4>
            <p className="text-xs text-blue-700">
              選択した売上合計1000万円、原価率60%、上昇率1%の場合：<br/>
              1年目: 1000万円 × 60% = 600万円<br/>
              2年目: 1000万円 × 61% = 610万円<br/>
              3年目: 1000万円 × 62% = 620万円
            </p>
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
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

// 自動入力モーダルコンポーネント
const AutofillModal: React.FC<AutofillModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSettings,
  itemName,
  category
}) => {
  const [settings, setSettings] = useState<AutofillSettings>(
    initialSettings || {
      initialAmount: 100, // デフォルト100万円
      endAge: 60, // デフォルト60歳
      maxAmount: undefined, // 上限値のデフォルトは未設定
    }
  );

  const amountLabel = '初期費用（万円/年）';
  const ageLabel = '終了年齢';
  const maxAmountLabel = '経費上限値（万円/年）';
  const modalTitle = `${itemName}自動入力設定`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{modalTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{amountLabel}</label>
            <input
              type="number"
              value={settings.initialAmount}
              onChange={(e) => setSettings({...settings, initialAmount: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{ageLabel}</label>
            <input
              type="number"
              value={settings.endAge}
              onChange={(e) => setSettings({...settings, endAge: Number(e.target.value)})}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          {/* 上限値設定を追加 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              {maxAmountLabel}
              <TermTooltip term="" width="narrow">
                経費が増加していく際の上限値を設定します。上昇率適用後の金額がこの値を超える場合、上限値で制限されます。未設定の場合は制限なしです。
              </TermTooltip>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableMaxAmount"
                checked={settings.maxAmount !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSettings({...settings, maxAmount: 500}); // デフォルト500万円
                  } else {
                    setSettings({...settings, maxAmount: undefined});
                  }
                }}
                className="rounded"
              />
              <label htmlFor="enableMaxAmount" className="text-sm">上限値を設定する</label>
            </div>
            {settings.maxAmount !== undefined && (
              <input
                type="number"
                value={settings.maxAmount}
                onChange={(e) => setSettings({...settings, maxAmount: Number(e.target.value)})}
                className="w-full rounded-md border border-gray-200 px-3 py-2"
                placeholder="500"
              />
            )}
          </div>

          {/* 上限値設定時の説明 */}
          {settings.maxAmount !== undefined && (
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">上限値制限: </span>
                上昇率適用後の金額が{settings.maxAmount}万円を超える年は、{settings.maxAmount}万円で制限されます。
              </p>
            </div>
          )}

          <div className="bg-gray-100 p-3 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">適用される上昇率: </span>
              {category === 'education' ? '教育費上昇率' : 
               category === 'living' || category === 'housing' || category === 'business' || category === 'office' ? 'インフレ率' :
               'なし'}
            </p>
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
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export function ExpenseForm() {
  const { 
    basicInfo, 
    parameters,
    setParameters,
    setCurrentStep,
    expenseData,
    setExpenseData,
    incomeData
  } = useSimulatorStore();

  // 自動入力モーダルの状態
  const [autofillModalOpen, setAutofillModalOpen] = useState(false);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentSection, setCurrentSection] = useState<'personal' | 'corporate'>('personal');
  const [autofillSettings, setAutofillSettings] = useState<{[key: string]: AutofillSettings}>({});

  // 原価設定モーダルの状態
  const [costSettingsModalOpen, setCostSettingsModalOpen] = useState(false);
  const [costSettings, setCostSettings] = useState<{[key: string]: CostSettings}>({});

  // 上昇率の編集モード状態
  const [editingRates, setEditingRates] = useState({
    inflation: false,
    education: false
  });
  
  // 編集中の上昇率の値
  const [editRates, setEditRates] = useState({
    inflation: parameters.inflationRate,
    education: parameters.educationCostIncreaseRate
  });

  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  // 初期化：法人経費にデフォルトの法人原価行を追加
  React.useEffect(() => {
    const hasDefaultCostItem = expenseData.corporate.some(item => 
      item.name === '法人原価' && item.category === 'cost'
    );
    
    if (!hasDefaultCostItem) {
      const defaultCostItem = {
        id: `corporate_cost_default_${Date.now()}`,
        name: '法人原価',
        category: 'cost',
        amounts: {} as {[year: number]: number},
        _rawAmounts: {} as {[year: number]: number}
      };

      setExpenseData({
        ...expenseData,
        corporate: [...expenseData.corporate, defaultCostItem]
      });
    }
  }, []);

  // 従業員給与かどうかを判定する関数
  const isEmployeeSalary = (itemName: string, section: 'personal' | 'corporate'): boolean => {
    return section === 'corporate' && 
           (itemName.includes('従業員給与') || itemName.includes('給与') || itemName.includes('人件費'));
  };

  // 自動入力モーダルを開く
  const openAutofillModal = (itemId: string, section: 'personal' | 'corporate') => {
    setCurrentItemId(itemId);
    setCurrentSection(section);
    setAutofillModalOpen(true);
  };

  // 原価設定モーダルを開く
  const openCostSettingsModal = (itemId: string, section: 'personal' | 'corporate') => {
    setCurrentItemId(itemId);
    setCurrentSection(section);
    setCostSettingsModalOpen(true);
  };

  // 原価設定の適用
  const applyCostSettings = (settings: CostSettings) => {
    // 設定を保存
    setCostSettings({
      ...costSettings,
      [currentItemId]: settings
    });

    // 各年の原価を計算
    const newAmounts: {[year: number]: number} = {};
    const newRawAmounts: {[year: number]: number} = {};
    
    years.forEach(year => {
      const yearsSinceStart = year - basicInfo.startYear;
      
      // 選択された収入項目の合計を計算（修正点）
      let totalRevenue = 0;
      if (settings.targetIncomeIds && settings.targetIncomeIds.length > 0) {
        // 選択された項目のみの合計
        settings.targetIncomeIds.forEach(incomeId => {
          const incomeItem = incomeData.corporate.find(item => item.id === incomeId);
          if (incomeItem) {
            totalRevenue += incomeItem.amounts[year] || 0;
          }
        });
      } else {
        // 選択項目がない場合は従来通り法人収入全体の合計
        incomeData.corporate.forEach(revenueItem => {
          totalRevenue += revenueItem.amounts[year] || 0;
        });
      }
      
      // 原価率を上昇率で調整
      const adjustedCostRatio = settings.costRatio + (settings.costIncreaseRate * yearsSinceStart);
      
      // 原価を計算
      let costAmount = totalRevenue * (adjustedCostRatio / 100);
      
      // 上限値の適用
      if (settings.maxCostAmount && costAmount > settings.maxCostAmount) {
        costAmount = settings.maxCostAmount;
      }
      
      newRawAmounts[year] = costAmount;
      newAmounts[year] = Math.floor(costAmount);
    });
    
    // 経費データを更新
    setExpenseData({
      ...expenseData,
      [currentSection]: expenseData[currentSection].map(i => {
        if (i.id === currentItemId) {
          return {
            ...i,
            amounts: {...i.amounts, ...newAmounts},
            _rawAmounts: {...i._rawAmounts, ...newRawAmounts},
            _costSettings: settings // 原価設定を保存
          };
        }
        return i;
      })
    });
    
    setCostSettingsModalOpen(false);
  };

  // 自動入力設定を適用する（上限値制限機能付き）
  const applyAutofillSettings = (settings: AutofillSettings) => {
    if (!currentItemId) return;

    // 設定を保存
    setAutofillSettings({
      ...autofillSettings,
      [currentItemId]: settings
    });

    // 対象のアイテムを取得
    const item = expenseData[currentSection].find(i => i.id === currentItemId);
    
    if (!item) return;

    // 自動入力する年の範囲を計算
    const endYear = basicInfo.startYear + (settings.endAge - basicInfo.currentAge);
    const filledYears = years.filter(year => year <= endYear);
    
    // 各年の金額を計算と上昇率の適用
    const newAmounts: {[year: number]: number} = {};
    const newRawAmounts: {[year: number]: number} = {};
    
    filledYears.forEach((year, index) => {
      const yearsSinceStart = year - basicInfo.startYear;
      const baseAmount = settings.initialAmount;
      
      // 生のデータ（上昇率適用前）を保存
      newRawAmounts[year] = baseAmount;
      
      // カテゴリに応じて上昇率を適用
      let inflatedAmount = baseAmount;
      
      if (item.category === 'living' || item.type === 'living' || 
          item.category === 'housing' || item.type === 'housing' ||
          item.category === 'business' || item.type === 'business' ||
          item.category === 'office' || item.type === 'office') {
        // インフレ率を適用
        inflatedAmount = baseAmount * Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
      } else if (item.category === 'education' || item.type === 'education') {
        // 教育費上昇率を適用
        inflatedAmount = baseAmount * Math.pow(1 + parameters.educationCostIncreaseRate / 100, yearsSinceStart);
      }
      
      // 上限値制限を適用
      if (settings.maxAmount !== undefined && inflatedAmount > settings.maxAmount) {
        inflatedAmount = settings.maxAmount;
      }
      
      // 小数点以下を切り捨て
      newAmounts[year] = Math.floor(inflatedAmount);
    });
    
    // 経費データを更新
    setExpenseData({
      ...expenseData,
      [currentSection]: expenseData[currentSection].map(i => {
        if (i.id === currentItemId) {
          return {
            ...i,
            amounts: {...i.amounts, ...newAmounts},
            _rawAmounts: {...i._rawAmounts, ...newRawAmounts}
          };
        }
        return i;
      })
    });
    
    setAutofillModalOpen(false);
  };

  // インフレ率の編集開始
  const startEditingInflationRate = () => {
    setEditingRates({ ...editingRates, inflation: true });
    setEditRates({ ...editRates, inflation: parameters.inflationRate });
  };

  // 教育費上昇率の編集開始
  const startEditingEducationRate = () => {
    setEditingRates({ ...editingRates, education: true });
    setEditRates({ ...editRates, education: parameters.educationCostIncreaseRate });
  };

  // 上昇率の適用
  const applyRateChanges = () => {
    // パラメータを更新
    setParameters({
      ...parameters,
      inflationRate: editRates.inflation,
      educationCostIncreaseRate: editRates.education
    });

    // 既存のすべての経費項目に新しい上昇率を適用
    const updatedExpenseData = { ...expenseData };
    
    ['personal', 'corporate'].forEach(section => {
      updatedExpenseData[section as 'personal' | 'corporate'] = expenseData[section as 'personal' | 'corporate'].map(item => {
        const newAmounts: {[year: number]: number} = {};
        
        years.forEach(year => {
          const yearsSinceStart = year - basicInfo.startYear;
          const rawAmount = item._rawAmounts?.[year] || item.amounts[year] || 0;
          
          if (rawAmount > 0) {
            let inflatedAmount = rawAmount;
            
            if (item.category === 'living' || item.type === 'living' || 
                item.category === 'housing' || item.type === 'housing' ||
                item.category === 'business' || item.type === 'business' ||
                item.category === 'office' || item.type === 'office') {
              // インフレ率を適用
              inflatedAmount = rawAmount * Math.pow(1 + editRates.inflation / 100, yearsSinceStart);
            } else if (item.category === 'education' || item.type === 'education') {
              // 教育費上昇率を適用
              inflatedAmount = rawAmount * Math.pow(1 + editRates.education / 100, yearsSinceStart);
            }
            
            newAmounts[year] = Math.floor(inflatedAmount);
          } else {
            newAmounts[year] = item.amounts[year] || 0;
          }
        });
        
        return {
          ...item,
          amounts: newAmounts
        };
      });
    });
    
    setExpenseData(updatedExpenseData);
    
    // 編集モードを終了
    setEditingRates({ inflation: false, education: false });
  };

  // 編集のキャンセル
  const cancelRateChanges = () => {
    setEditRates({
      inflation: parameters.inflationRate,
      education: parameters.educationCostIncreaseRate
    });
    setEditingRates({ inflation: false, education: false });
  };

  const addExpenseItem = (section: 'personal' | 'corporate') => {
    const newItem = {
      id: `${section}_${Date.now()}`,
      name: '',
      category: '',
      amounts: {} as {[year: number]: number},
      _rawAmounts: {} as {[year: number]: number}
    };

    setExpenseData({
      ...expenseData,
      [section]: [...expenseData[section], newItem]
    });
  };

  const removeExpenseItem = (section: 'personal' | 'corporate', id: string) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].filter(item => item.id !== id)
    });
  };

  const handleNameChange = (section: 'personal' | 'corporate', id: string, name: string) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === id ? { ...item, name } : item
      )
    });
  };

  const handleAmountChange = (section: 'personal' | 'corporate', id: string, year: number, amount: number) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === id 
          ? { 
              ...item, 
              amounts: { ...item.amounts, [year]: amount || 0 },
              _rawAmounts: { ...item._rawAmounts, [year]: amount || 0 }
            }
          : item
      )
    });
  };

  const handleCategoryChange = (section: 'personal' | 'corporate', id: string, value: string) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === id
          ? {
              ...item,
              category: value,
            }
          : item
      ),
    });
  };

  const renderExpenseTable = (section: 'personal' | 'corporate') => {
    const items = expenseData[section];
    const title = section === 'personal' ? '個人' : '法人';
    const categories = section === 'personal' ? EXPENSE_CATEGORIES : CORPORATE_EXPENSE_CATEGORIES;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={() => addExpenseItem(section)}
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
                  <div className="flex items-center justify-center">
                    <span>カテゴリ</span>
                    <TermTooltip term="" width="narrow">
                      {section === 'personal' 
                        ? '支出の分類です。生活費/住居費/教育費/その他から選択できます。' 
                        : '支出の分類です。事業運営費/オフィス・設備費/法人原価/その他から選択できます。「法人原価」を選択すると売上に比例した原価を設定できます。'}
                    </TermTooltip>
                  </div>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  上昇率
                  <TermTooltip term="" width="narrow">
                    カテゴリに応じた上昇率です。生活費・住居費・事業運営費・オフィス設備費はインフレ率、教育費は教育費上昇率、法人原価は独立した上昇率が適用されます。その他カテゴリは上昇率適用なしです。
                  </TermTooltip>
                </th>
                {/* 自動入力ボタン列を追加 */}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px] min-w-[80px]">
                  <div className="flex items-center justify-center">
                    <span>設定</span>
                    <TermTooltip term="" width="narrow">
                      {section === 'personal' 
                        ? '初期費用、終了年齢、上限値を設定して経費を自動入力します。'
                        : '法人原価は売上比例設定、その他は自動入力設定ができます。'}
                    </TermTooltip>
                  </div>
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
                      onChange={(e) => handleNameChange(section, item.id, e.target.value)}
                      className="w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <CategorySelect
                      value={item.category || 'other'}
                      onChange={(value) => handleCategoryChange(section, item.id, value)}
                      categories={categories}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center">
                      {item.category === 'cost' ? (
                        <span className="text-xs text-green-600">個別設定</span>
                      ) : item.category === 'education' ? (
                        editingRates.education ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editRates.education}
                            onChange={(e) => setEditRates({...editRates, education: Number(e.target.value)})}
                            className="w-16 text-center rounded border border-gray-200 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{parameters.educationCostIncreaseRate}%</span>
                        )
                      ) : (item.category === 'living' || item.category === 'housing' || 
                           item.category === 'business' || item.category === 'office') ? (
                        editingRates.inflation ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editRates.inflation}
                            onChange={(e) => setEditRates({...editRates, inflation: Number(e.target.value)})}
                            className="w-16 text-center rounded border border-gray-200 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{parameters.inflationRate}%</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  {/* 設定ボタン列 */}
                  <td className="px-4 py-2 text-center">
                    {item.category === 'cost' ? (
                      <button
                        type="button"
                        onClick={() => openCostSettingsModal(item.id, section)}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        <span>原価</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAutofillModal(item.id, section)}
                        className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        <span>設定</span>
                      </button>
                    )}
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => handleAmountChange(section, item.id, year, Number(e.target.value))}
                          disabled={item.category === 'cost' && item._costSettings} // 原価設定済みの場合は手動入力を無効化
                          className={`w-full text-right rounded-md border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            item.category === 'cost' && item._costSettings 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : 'border-gray-200'
                          }`}
                          placeholder="0"
                        />
                        {/* ★社会保険料表示機能追加★ */}
                        {section === 'corporate' && isEmployeeSalary(item.name, section) && item.amounts[year] && item.amounts[year] > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            社保: {calculateDirectorSocialInsurance(item.amounts[year])}万円 ({item.amounts[year] < 850 ? '14.4' : '7.7'}%)
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeExpenseItem(section, item.id)}
                      className="text-red-500 hover:text-red-700"
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

  const handleBack = () => {
    setCurrentStep(2);
  };

  const handleNext = () => {
    setCurrentStep(4);
  };

  const syncCashFlowFromFormData = () => {
    // キャッシュフロー同期のロジックは既存のものを使用
    // この部分は元のコードから移植してください
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">経費情報</h2>
        <div className="text-sm text-gray-500">
          ※金額は万円単位で入力してください
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>経費情報について</span>
        </h3>
        <p className="text-sm text-blue-700">
          個人と法人の支出を別々に管理します。個人経費は「生活費」「住居費」「教育費」「その他」のカテゴリに、
          法人経費は「事業運営費」「オフィス・設備費」「法人原価」「その他」のカテゴリに分けて入力することができます。
          「法人原価」は売上に応じて自動計算され、独立した上昇率を設定できます。
          その他のカテゴリには自動的にパラメータで設定したインフレ率や教育費上昇率が適用されます。
        </p>
      </div>

      {/* 法人従業員給与について */}
      <div className="bg-indigo-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-indigo-800 mb-2 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          <span>法人従業員給与について</span>
        </h3>
        <div className="text-sm text-indigo-700 space-y-2">
          <p><strong>社会保険料の自動表示：</strong></p>
          <ul className="list-disc pl-4 space-y-1">
            <li>法人経費で「従業員給与」「給与」「人件費」を含む項目名の場合、社会保険料が自動表示されます</li>
            <li>役員は雇用保険の対象外のため、雇用保険を除外した社会保険料（年収850万円未満：14.4%、850万円以上：7.7%）で計算されます</li>
            <li>表示される社会保険料は個人負担分のみです（法人負担分は別途自動計算されます）</li>
            <li>健康保険、厚生年金保険、介護保険（40歳以上）が含まれます</li>
          </ul>
          <p><strong>使用例：</strong> 項目名を「従業員給与（田中）」「役員報酬」などにすると社保が自動表示されます</p>
        </div>
      </div>

      {/* 法人原価について */}
      <div className="bg-green-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-green-800 mb-2 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          <span>法人原価機能について</span>
        </h3>
        <div className="text-sm text-green-700 space-y-2">
          <p><strong>特徴：</strong></p>
          <ul className="list-disc pl-4 space-y-1">
            <li>売上に対する割合（%）で原価を自動計算</li>
            <li>原価率の年間上昇率を個別に設定可能</li>
            <li>原価の上限値を設定可能（オプション）</li>
            <li>売上がない年は原価も0になります</li>
          </ul>
          <p><strong>使用例：</strong> 製造業や小売業など、売上に比例して材料費や仕入れ原価が発生する事業</p>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-purple-800 mb-2 flex items-center">
          <span>自動入力機能と上限値設定について</span>
          <Wand2 className="h-4 w-4 ml-2" />
        </h3>
        <p className="text-sm text-purple-700">
          すべての経費項目に自動入力機能があります。初期費用、終了年齢、
          <span className="font-bold text-purple-900">上限値</span>を設定すると、
          金額を終了年齢まで自動的に計算します。上限値を設定することで、予算を超えないように制限できます。
          上昇率（インフレ率や教育費上昇率）も自動的に適用されます。
          上昇率は表内で直接編集することもできます。変更後は「適用」ボタンをクリックすると、
          すべての項目に新しい上昇率が適用されます。
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-yellow-800 mb-2 flex items-center">
          <span>インフレ適用について</span>
        </h3>
        <p className="text-sm text-yellow-700">
          カテゴリに応じて自動的に上昇率が適用されます。例えば、初年度に生活費10万円/月を入力した場合、
          インフレ率1%なら2年目は実質的に10.1万円/月として計算されます。長期間になるほどインフレの影響は複利で大きくなります。
        </p>
        <div className="mt-2 text-sm text-yellow-700">
          <ul className="list-disc pl-4 space-y-1">
            <li>生活費・住居費・事業運営費・オフィス・設備費: インフレ率（{parameters.inflationRate}%）を適用</li>
            <li>教育費: 教育費上昇率（{parameters.educationCostIncreaseRate}%）を適用</li>
            <li>法人原価: 独立した上昇率設定が可能</li>
            <li>その他: 上昇率適用なし（入力値がそのまま使用されます）</li>
          </ul>
        </div>
      </div>

      {/* 上昇率編集コントロール */}
      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-medium text-gray-800">上昇率設定</h3>
          <div className="flex space-x-2">
            {(editingRates.inflation || editingRates.education) ? (
              <>
                <button
                  onClick={applyRateChanges}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  適用
                </button>
                <button
                  onClick={cancelRateChanges}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEditingInflationRate}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  インフレ率編集
                </button>
                <button
                  onClick={startEditingEducationRate}
                  className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  教育費上昇率編集
                </button>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">インフレ率</label>
            <div className="text-sm text-gray-600">
              現在: {parameters.inflationRate}%
              {editingRates.inflation && (
                <span className="text-blue-600"> → {editRates.inflation}%</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">教育費上昇率</label>
            <div className="text-sm text-gray-600">
              現在: {parameters.educationCostIncreaseRate}%
              {editingRates.education && (
                <span className="text-orange-600"> → {editRates.education}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {renderExpenseTable('personal')}
        {renderExpenseTable('corporate')}
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

      {/* 自動入力モーダル */}
      <AutofillModal
        isOpen={autofillModalOpen}
        onClose={() => setAutofillModalOpen(false)}
        onApply={applyAutofillSettings}
        initialSettings={currentItemId ? autofillSettings[currentItemId] : undefined}
        itemName={
          expenseData[currentSection].find(i => i.id === currentItemId)?.name || '経費'
        }
        category={
          expenseData[currentSection].find(i => i.id === currentItemId)?.category || 'other'
        }
      />

      {/* 原価設定モーダル */}
      <CostSettingsModal
        isOpen={costSettingsModalOpen}
        onClose={() => setCostSettingsModalOpen(false)}
        onApply={applyCostSettings}
        initialSettings={costSettings[currentItemId] ? costSettings[currentItemId] : undefined}
        itemName={
          expenseData[currentSection].find(i => i.id === currentItemId)?.name || '原価'
        }
      />

      {/* コンテキストヘルプ追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: expenseTermsContent },
          { id: 'formulas', label: '計算式', content: expenseFormulasContent }
        ]} 
      />
    </div>
  );
}

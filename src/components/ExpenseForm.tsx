import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Plus, Trash2, Info, Wand2, X } from 'lucide-react';
import { 
  CategorySelect, 
  EXPENSE_CATEGORIES,
  CORPORATE_EXPENSE_CATEGORIES 
} from '@/components/ui/category-select';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { expenseTermsContent, expenseFormulasContent } from '@/utils/helpContent';

// 自動入力モーダル用のインターフェース
interface AutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: AutofillSettings) => void;
  initialSettings?: AutofillSettings;
  itemName: string;
  category: string; // カテゴリ情報を追加
}

interface AutofillSettings {
  initialAmount: number;
  endAge: number;
}

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
    }
  );

  const amountLabel = '初期費用（万円/年）';
  const ageLabel = '終了年齢';
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
    setExpenseData
  } = useSimulatorStore();

  // 自動入力モーダルの状態
  const [autofillModalOpen, setAutofillModalOpen] = useState(false);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentSection, setCurrentSection] = useState<'personal' | 'corporate'>('personal');
  const [autofillSettings, setAutofillSettings] = useState<{[key: string]: AutofillSettings}>({});

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

  // 自動入力モーダルを開く
  const openAutofillModal = (itemId: string, section: 'personal' | 'corporate') => {
    setCurrentItemId(itemId);
    setCurrentSection(section);
    setAutofillModalOpen(true);
  };

  // 自動入力設定を適用する
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
        // 生活費・住居費・事業運営費・オフィス設備費にはインフレ率を適用
        const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
        inflatedAmount = Math.round(baseAmount * inflationFactor * 10) / 10;
      } 
      else if (item.category === 'education' || item.type === 'education') {
        // 教育費には教育費上昇率を適用
        const educationFactor = Math.pow(1 + parameters.educationCostIncreaseRate / 100, yearsSinceStart);
        inflatedAmount = Math.round(baseAmount * educationFactor * 10) / 10;
      }
      
      // 上昇率適用後の値をセット
      newAmounts[year] = inflatedAmount;
    });
    
    // 支出データを更新
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
    
    // モーダルを閉じる
    setAutofillModalOpen(false);
  };

  // 入力値変更時のハンドラ - 生データと表示データを両方更新
  const handleAmountChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              // 入力時には表示用のamountsのみ更新
              amounts: {
                ...item.amounts,
                [year]: value,
              },
            }
          : item
      ),
    });
  };

  // 支出データのフォーカス喪失時ハンドラ - インフレ計算を行う
  const handleExpenseBlur = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    // 該当の項目を取得
    const item = expenseData[section].find(i => i.id === itemId);
    if (!item) return;

    // 生データを保存
    const updatedItem = {
      ...item,
      _rawAmounts: {
        ...(item._rawAmounts || {}),
        [year]: value,
      }
    };

    // カテゴリに応じて適切なインフレ係数を適用
    const yearsSinceStart = year - basicInfo.startYear;
    let inflatedAmount = value; // デフォルトは変更なし

    if (updatedItem.category === 'living' || updatedItem.type === 'living') {
      // 生活費にはインフレ率を適用
      const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
      inflatedAmount = Math.round(value * inflationFactor * 10) / 10;
    } 
    else if (updatedItem.category === 'housing' || updatedItem.type === 'housing') {
      // 住居費にはインフレ率を適用
      const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
      inflatedAmount = Math.round(value * inflationFactor * 10) / 10;
    }
    else if (updatedItem.category === 'education' || updatedItem.type === 'education') {
      // 教育費には教育費上昇率を適用
      const educationFactor = Math.pow(1 + parameters.educationCostIncreaseRate / 100, yearsSinceStart);
      inflatedAmount = Math.round(value * educationFactor * 10) / 10;
    }
    else if (updatedItem.category === 'business' || updatedItem.type === 'business') {
      // 事業運営費にはインフレ率を適用
      const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
      inflatedAmount = Math.round(value * inflationFactor * 10) / 10;
    }
    else if (updatedItem.category === 'office' || updatedItem.type === 'office') {
      // オフィス・設備費にはインフレ率を適用
      const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
      inflatedAmount = Math.round(value * inflationFactor * 10) / 10;
    }
    else {
      // その他カテゴリはインフレ適用なし（入力値をそのまま使用）
      inflatedAmount = value;
    }

    // インフレ適用後の値を設定
    updatedItem.amounts = {
      ...updatedItem.amounts,
      [year]: inflatedAmount
    };

    // 更新した項目をステートに反映
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === itemId ? updatedItem : item
      )
    });
    
    // キャッシュフローを再計算
    syncCashFlowFromFormData();
  };

  // 上昇率の変更を適用するハンドラ
  const applyRateChange = (rateType: 'inflation' | 'education') => {
    const newRate = rateType === 'inflation' ? editRates.inflation : editRates.education;
    
    if (rateType === 'inflation') {
      setParameters({
        ...parameters,
        inflationRate: newRate
      });
    } else {
      setParameters({
        ...parameters,
        educationCostIncreaseRate: newRate
      });
    }
    
    // 編集モードをオフ
    setEditingRates({
      ...editingRates,
      [rateType]: false
    });
    
    // キャッシュフローを再計算して上昇率を反映
    syncCashFlowFromFormData();
  };

  const addExpenseItem = (section: 'personal' | 'corporate') => {
    const newId = String(Math.max(...expenseData[section].map(i => Number(i.id)), 0) + 1);
    setExpenseData({
      ...expenseData,
      [section]: [
        ...expenseData[section],
        {
          id: newId,
          name: 'その他',
          type: 'other',
          category: 'other', // デフォルトカテゴリ
          amounts: {},
          _rawAmounts: {}, // 生データ保存用
        },
      ],
    });
  };

  const removeExpenseItem = (section: 'personal' | 'corporate', id: string) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].filter(item => item.id !== id),
    });
  };

  const handleNameChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              name: value,
            }
          : item
      ),
    });
  };

  // カテゴリーを変更するハンドラを追加
  const handleCategoryChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setExpenseData({
      ...expenseData,
      [section]: expenseData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              category: value,
              // 種類も同時に更新（オプション）
              type: value === 'living' ? 'living' : 
                   value === 'housing' ? 'housing' : 
                   value === 'education' ? 'education' :
                   value === 'business' ? 'business' :
                   value === 'office' ? 'office' : 'other',
            }
          : item
      ),
    });
    
    // カテゴリ変更後、すべての入力済み値に新しいインフレ率を適用
    const item = expenseData[section].find(i => i.id === itemId);
    if (item && item._rawAmounts) {
      const updatedItem = {
        ...item,
        category: value,
        type: value === 'living' ? 'living' : 
             value === 'housing' ? 'housing' : 
             value === 'education' ? 'education' :
             value === 'business' ? 'business' :
             value === 'office' ? 'office' : 'other',
      };
      
      // 各年の値について再計算
      Object.keys(item._rawAmounts).forEach(yearStr => {
        const year = parseInt(yearStr);
        const rawValue = item._rawAmounts![year];
        if (rawValue !== undefined) {
          // 上記の handleAmountBlur と同じロジックで再計算
          const yearsSinceStart = year - basicInfo.startYear;
          let inflatedAmount = rawValue;
          
          if (value === 'living') {
            const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
            inflatedAmount = Math.round(rawValue * inflationFactor * 10) / 10;
          } 
          else if (value === 'housing') {
            const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
            inflatedAmount = Math.round(rawValue * inflationFactor * 10) / 10;
          }
          else if (value === 'education') {
            const educationFactor = Math.pow(1 + parameters.educationCostIncreaseRate / 100, yearsSinceStart);
            inflatedAmount = Math.round(rawValue * educationFactor * 10) / 10;
          }
          else if (value === 'business') {
            const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
            inflatedAmount = Math.round(rawValue * inflationFactor * 10) / 10;
          }
          else if (value === 'office') {
            const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
            inflatedAmount = Math.round(rawValue * inflationFactor * 10) / 10;
          }
          else {
            // その他カテゴリはインフレ適用なし
            inflatedAmount = rawValue;
          }
          
          // 更新した項目のamountsも更新
          updatedItem.amounts = {
            ...updatedItem.amounts,
            [year]: inflatedAmount
          };
        }
      });
      
      // 更新した項目をステートに反映
      setExpenseData({
        ...expenseData,
        [section]: expenseData[section].map(item =>
          item.id === itemId ? updatedItem : item
        )
      });
    }
  };

  // インフレ率の表示を整形する関数
  const formatInflationRate = (category: string) => {
    if (category === 'education') {
      return `${parameters.educationCostIncreaseRate}%`;
    } else if (category === 'living' || category === 'housing' || category === 'business' || category === 'office') {
      return `${parameters.inflationRate}%`;
    } else {
      return '0%';  // その他カテゴリは適用なし
    }
  };

  const renderExpenseTable = (section: 'personal' | 'corporate') => {
    const items = expenseData[section];
    const title = section === 'personal' ? '個人' : '法人';
    // セクションに応じたカテゴリー選択肢を選択
    const categories = section === 'personal' ? EXPENSE_CATEGORIES : CORPORATE_EXPENSE_CATEGORIES;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
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
                  カテゴリ
                  <TermTooltip term="" width="narrow">
                    {section === 'personal' ? '支出の分類です。生活費/住居費/教育費/その他から選択できます。' : '支出の分類です。事業運営費/オフィス・設備費/その他から選択できます。'}
                  </TermTooltip>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[100px] min-w-[100px]">
                  上昇率
                  <TermTooltip term="" width="narrow">
                    カテゴリに応じた上昇率です。生活費・住居費・事業運営費・オフィス設備費はインフレ率、教育費は教育費上昇率が適用されます。その他カテゴリは上昇率適用なしです。
                  </TermTooltip>
                </th>
                {/* 自動入力ボタン列を追加 */}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px] min-w-[80px]">
                  <div className="flex items-center justify-center">
                    <span>自動入力</span>
                    <TermTooltip term="" width="narrow">
                      初期費用と終了年齢を設定して、経費を自動入力します。金額には適切な上昇率が自動的に適用されます。
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
                      {item.category === 'education' ? (
                        editingRates.education ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editRates.education}
                              onChange={(e) => setEditRates({...editRates, education: Number(e.target.value)})}
                              className="w-16 text-right rounded-md border border-blue-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => applyRateChange('education')}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              適用
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingRates({...editingRates, education: true})}
                            className="text-sm hover:underline text-blue-600"
                          >
                            {formatInflationRate(item.category)}
                          </button>
                        )
                      ) : (item.category === 'living' || item.category === 'housing' || 
                          item.category === 'business' || item.category === 'office') ? (
                        editingRates.inflation ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={editRates.inflation}
                              onChange={(e) => setEditRates({...editRates, inflation: Number(e.target.value)})}
                              className="w-16 text-right rounded-md border border-blue-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => applyRateChange('inflation')}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              適用
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingRates({...editingRates, inflation: true})}
                            className="text-sm hover:underline text-blue-600"
                          >
                            {formatInflationRate(item.category)}
                          </button>
                        )
                      ) : (
                        <span className="text-sm">
                          {formatInflationRate(item.category)}
                        </span>
                      )}
                      <Info className="h-4 w-4 ml-1 text-blue-500" />
                    </div>
                  </td>
                  {/* 自動入力ボタン列 */}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => openAutofillModal(item.id, section)}
                      className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      <span>設定</span>
                    </button>
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <input
                        type="number"
                        value={item.amounts[year] || ''}
                        onChange={(e) => handleAmountChange(section, item.id, year, Number(e.target.value))}
                        onBlur={(e) => handleExpenseBlur(section, item.id, year, Number(e.target.value))}
                        className="w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                      {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                       item._rawAmounts[year] !== item.amounts[year] && (
                        <div className="text-xs text-gray-500 mt-1">
                          元の値: {item._rawAmounts[year]}万円
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeExpenseItem(section, item.id)}
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
    setCurrentStep(4);
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  const syncCashFlowFromFormData = () => {
    // useSimulatorStoreからsyncCashFlowFromFormData関数を呼び出す
    const { syncCashFlowFromFormData } = useSimulatorStore.getState();
    syncCashFlowFromFormData();
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
          法人経費は「事業運営費」「オフィス・設備費」「その他」のカテゴリに分けて入力することができます。
          入力した値には自動的にパラメータで設定したインフレ率（生活費・住居費・事業運営費・オフィス・設備費）や教育費上昇率（教育費）が適用されます。
          「その他」カテゴリには上昇率は適用されません。
        </p>
      </div>

      <div className="bg-purple-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-purple-800 mb-2 flex items-center">
          <span>自動入力機能と上昇率設定について</span>
          <Wand2 className="h-4 w-4 ml-2" />
        </h3>
        <p className="text-sm text-purple-700">
          すべての経費項目に自動入力機能があります。初期費用と終了年齢を設定すると、
          金額を終了年齢まで自動的に計算します。上昇率（インフレ率や教育費上昇率）も自動的に適用されます。
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
            <li>その他: 上昇率適用なし（入力値がそのまま使用されます）</li>
          </ul>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-yellow-800 mb-2 flex items-center">
          <span>支出項目の例</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-800">
          <div>
            <h4 className="font-medium mb-1">生活費</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>食費</li>
              <li>日用品費</li>
              <li>光熱費</li>
              <li>水道代</li>
              <li>スマホ代</li>
              <li>お小遣い</li>
            　<li>交通費</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">住居費</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>家賃 / ローン返済</li>
              <li>管理費</li>
              <li>固定資産税</li>
              <li>修繕費・リフォーム</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">事業運営費</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>人件費</li>
              <li>外注費</li>
              <li>販売費</li>
              <li>広告宣伝費</li>
              <li>旅費交通費</li>
            </ul>
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
          expenseData[currentSection].find(i => i.id === currentItemId)?.name || '支出'
        }
        category={
          expenseData[currentSection].find(i => i.id === currentItemId)?.category || 'other'
        }
      />
      
      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: expenseTermsContent },
          { id: 'formulas', label: '計算式', content: expenseFormulasContent }
        ]} 
      />
    </div>
  );
}
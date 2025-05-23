import React, { useEffect, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Download, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { 
  MAIN_CATEGORIES,
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES,
  CORPORATE_EXPENSE_CATEGORIES,
  ASSET_CATEGORIES, 
  LIABILITY_CATEGORIES 
} from '@/components/ui/category-select';
// ES Modules形式でインポート
import { calculateNetIncome } from '@/lib/calculations';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { cashFlowTermsContent, cashFlowFormulasContent } from '@/utils/helpContent';

function calculateAge(startYear: number, currentAge: number, targetYear: number) {
  return currentAge + (targetYear - startYear);
}

// getLifeEventDescription関数の修正
function getLifeEventDescription(
  year: number,
  basicInfo: any,
  lifeEvents: any[],
  source: 'personal' | 'corporate' | 'personal_investment' | 'corporate_investment' = 'personal'
): string {
  const events: string[] = [];
  
  // Only include marriage and children events in personal section
  if (source === 'personal') {
    // Marriage event
    if (basicInfo.maritalStatus === 'planning' && basicInfo.spouseInfo?.marriageAge) {
      const marriageYear = basicInfo.startYear + (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
      if (year === marriageYear) {
        events.push('結婚');
      }
    }

    // Children birth events
    if (basicInfo.children) {
      basicInfo.children.forEach((child: any, index: number) => {
        const birthYear = basicInfo.startYear - child.currentAge;
        if (year === birthYear) {
          events.push(`第${index + 1}子誕生`);
        }
      });
    }

    // Planned children birth events
    if (basicInfo.plannedChildren) {
      basicInfo.plannedChildren.forEach((child: any, index: number) => {
        const birthYear = basicInfo.startYear + child.yearsFromNow;
        if (year === birthYear) {
          events.push(`第${(basicInfo.children?.length || 0) + index + 1}子誕生`);
        }
      });
    }
  }

  // Life events based on source
  if (lifeEvents) {
    const yearEvents = lifeEvents.filter(event => event.year === year && event.source === source);
    yearEvents.forEach(event => {
      events.push(`${event.description}（${event.type === 'income' ? '+' : '-'}${event.amount}万円）`);
    });
  }

  return events.join('、');
}

export function CashFlowForm() {
  const { 
    basicInfo, 
    parameters,
    cashFlow,
    lifeEvents,
    incomeData,
    setIncomeData,
    expenseData,
    setExpenseData,
    assetData,
    liabilityData,
    setCurrentStep,
    syncCashFlowFromFormData,
  } = useSimulatorStore();
  
  // コンポーネントの状態
  const [expandedSections, setExpandedSections] = useState({
    personalIncome: true,
    personalExpense: true,
    personalAsset: true,
    personalLiability: true,
    corporateIncome: true,
    corporateExpense: true,
    corporateAsset: true,
    corporateLiability: true,
  });

  // カテゴリ表示管理の状態
  const [categoryVisibility, setCategoryVisibility] = useState({
    income: { income: true, other: true },
    expense: { living: true, housing: true, education: true, other: true },
    corporateExpense: { business: true, office: true, other: true },
    asset: { asset: true, other: true },
    liability: { liability: true, other: true }
  });
  
  const yearsUntilDeath = basicInfo.deathAge - basicInfo.currentAge;
  const years = Array.from(
    { length: yearsUntilDeath + 1 },
    (_, i) => basicInfo.startYear + i
  );

  useEffect(() => {
    syncCashFlowFromFormData();
  }, []);

  // 給与収入が手取り計算対象かどうか判定する関数
  const isNetIncomeTarget = (itemName: string) => {
    return (
      (itemName === '給与収入' && 
       (basicInfo.occupation === 'company_employee' || basicInfo.occupation === 'part_time_with_pension')) ||
      (itemName === '配偶者収入' && basicInfo.spouseInfo?.occupation && 
       (basicInfo.spouseInfo.occupation === 'company_employee' || basicInfo.spouseInfo.occupation === 'part_time_with_pension'))
    );
  };

  // 入力フォーカスが外れたときのハンドラ - 手取り計算を行う
  const handleAmountBlur = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    if (section === 'personal') {
      const item = incomeData[section].find(i => i.id === itemId);
      
      // 給与収入で会社員または厚生年金ありのパートの場合のみ手取り計算を行う
      if (item && isNetIncomeTarget(item.name)) {
        // 職業を判断
        const occupation = item.name === '給与収入' ? basicInfo.occupation : basicInfo.spouseInfo?.occupation;
        
        // 手取り計算
        const netResult = calculateNetIncome(value, occupation);
        const netIncome = netResult.netIncome;
        
        // 額面は_originalAmountsに保存、表示用のamountsは手取り額に更新
        setIncomeData({
          ...incomeData,
          [section]: incomeData[section].map(i => {
            if (i.id === itemId) {
              return {
                ...i,
                _originalAmounts: { ...(i._originalAmounts || {}), [year]: value },
                amounts: { ...(i.amounts || {}), [year]: netIncome }
              };
            }
            return i;
          })
        });

        // キャッシュフロー再計算
        syncCashFlowFromFormData();
      }
    }
  };

  const handleAmountChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    year: number,
    value: number
  ) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
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

  // 支出データの入力値変更時のハンドラ - 表示用のみ更新
  const handleExpenseChange = (
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

  const handleExportCSV = () => {
    // ヘッダー行の作成
    const headers = [
      '年度',
      '年齢',
      'イベント（個人）',
      'イベント（法人）',
      ...incomeData.personal.map(item => `${item.name}（万円）`),
      ...incomeData.corporate.map(item => `${item.name}（万円）`),
      ...expenseData.personal.map(item => `${item.name}（万円）`),
      ...expenseData.corporate.map(item => `${item.name}（万円）`),
      '個人収支（万円）',
      '個人総資産（万円）',
      '法人収支（万円）',
      '法人総資産（万円）',
    ];

    // データ行の作成
    const rows = years.map(year => {
      const cf = cashFlow[year] || {
        personalBalance: 0,
        personalTotalAssets: 0,
        corporateBalance: 0,
        corporateTotalAssets: 0
      };

      return [
        year,
        calculateAge(basicInfo.startYear, basicInfo.currentAge, year),
        getLifeEventDescription(year, basicInfo, lifeEvents, 'personal'),
        getLifeEventDescription(year, basicInfo, lifeEvents, 'corporate'),
        ...incomeData.personal.map(item => item.amounts[year] || 0),
        ...incomeData.corporate.map(item => item.amounts[year] || 0),
        ...expenseData.personal.map(item => item.amounts[year] || 0),
        ...expenseData.corporate.map(item => item.amounts[year] || 0),
        cf.personalBalance,
        cf.personalTotalAssets,
        cf.corporateBalance,
        cf.corporateTotalAssets,
      ];
    });

    // CSVデータの作成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // BOMを追加してExcelで文字化けを防ぐ
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `キャッシュフロー_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNext = () => {
    setCurrentStep(7);
  };

  const handleBack = () => {
    setCurrentStep(5);
  };

  // インフレ率の表示整形用関数
  const formatInflationRate = (category: string): string => {
    if (category === 'education') {
      return `${parameters.educationCostIncreaseRate}%`;
    } else if (category === 'living' || category === 'housing' || category === 'business' || category === 'office') {
      return `${parameters.inflationRate}%`;
    } else {
      return '0%';  // その他カテゴリは適用なし
    }
  };

  // 入力フィールドのスタイル - コンパクトに調整
  const inputStyle = "w-20 text-right border border-gray-200 rounded-md px-1 py-0.5 text-xs";

  // カテゴリーの色を取得する関数
  const getCategoryColor = (categoryId: string): string => {
    // カテゴリーごとに異なる色を返す
    const colorMap: {[key: string]: string} = {
      // 大枠カテゴリー
      'income': '#4CAF50',     // 緑
      'living': '#F44336',     // 赤
      'housing': '#FF9800',    // オレンジ
      'education': '#9C27B0',  // 紫
      'business': '#2196F3',   // 青
      'office': '#00BCD4',     // 水色
      'asset': '#2196F3',      // 青
      'liability': '#9C27B0',  // 紫
      'other': '#9E9E9E',      // グレー
    };
    
    return colorMap[categoryId] || '#9E9E9E'; // デフォルトはグレー
  };

  // カテゴリの表示・非表示を切り替える関数
  const toggleCategoryVisibility = (dataType: keyof typeof categoryVisibility, categoryId: string) => {
    setCategoryVisibility(prev => ({
      ...prev,
      [dataType]: {
        ...prev[dataType],
        [categoryId]: !prev[dataType][categoryId]
      }
    }));
  };

  // すべてのカテゴリの表示・非表示を設定する関数
  const setAllCategoriesVisibility = (dataType: keyof typeof categoryVisibility, visible: boolean) => {
    const categories = { ...categoryVisibility[dataType] };
    
    Object.keys(categories).forEach(key => {
      categories[key] = visible;
    });
    
    setCategoryVisibility(prev => ({
      ...prev,
      [dataType]: categories
    }));
  };

  // セクションの展開・折りたたみを切り替える
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // 指定されたカテゴリに属する項目を取得する関数
  const getItemsByCategory = (
    section: 'personal' | 'corporate',
    dataType: 'income' | 'expense' | 'asset' | 'liability',
    categoryId: string
  ) => {
    const dataMap = {
      'income': incomeData,
      'expense': expenseData,
      'asset': assetData,
      'liability': liabilityData,
    };
    
    const data = dataMap[dataType][section];
    return data.filter(item => (item.category || 'other') === categoryId);
  };

  // インフレ率情報の表示
  const renderInflationInfo = () => {
    const yearsSinceStart = 10; // 例として10年後の値を表示
    const inflationFactor = Math.pow(1 + parameters.inflationRate / 100, yearsSinceStart);
    const educationInflationFactor = Math.pow(1 + parameters.educationCostIncreaseRate / 100, yearsSinceStart);
    
    return (
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>インフレ計算情報</span>
          <h3 className="h-4 w-4 ml-1" />
        </h3>
        <div className="text-sm text-blue-700">
          <p className="mb-2">各項目にはインフレ率が適用されます。例として10年後の価値を表示します：</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>現在100万円の生活費や事業運営費は10年後、実質<strong>{Math.round(100 * inflationFactor)}万円</strong>の価値になります（インフレ率{parameters.inflationRate}%適用）</li>
            <li>現在100万円の教育費は10年後、実質<strong>{Math.round(100 * educationInflationFactor)}万円</strong>の価値になります（教育費上昇率{parameters.educationCostIncreaseRate}%適用）</li>
          </ul>
        </div>
      </div>
    );
  };

  {/* 個人キャッシュフローテーブルのレンダリング関数を修正 */}
const renderPersonalTable = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        個人キャッシュフロー
       </h3>
      
      <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-2">
        <p>※ 会社員・公務員（または厚生年金あり）の給与収入は手取り金額で表示・計算されます。</p>
        <p>※ 表示されている金額には自動的にインフレ率・教育費上昇率が適用されています。</p>
        <p>※ ローンの自動計算が設定されている場合、資産・負債の残高は自動計算されます。</p>
      </div>

      {/* インフレ情報の表示 */}
      {renderInflationInfo()}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[150px]">項目</th>
              {years.map(year => (
                <th key={year} className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                  {year}年
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">年齢</td>
              {years.map(year => (
                <td key={year} className="px-2 py-1 text-right text-xs text-gray-900">
                  {calculateAge(basicInfo.startYear, basicInfo.currentAge, year)}歳
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                個人イベント
              </td>
              {years.map(year => (
                <td key={year} className="px-2 py-1 text-right text-xs text-gray-600">
                  {getLifeEventDescription(year, basicInfo, lifeEvents, 'personal')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                個人運用資産イベント
              </td>
              {years.map(year => (
                <td key={year} className="px-2 py-1 text-right text-xs text-gray-600">
                  {getLifeEventDescription(year, basicInfo, lifeEvents, 'personal_investment')}
                </td>
              ))}
            </tr>
            
            {/* 収入セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('personalIncome')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    収入
                  </span>
                  {expandedSections.personalIncome ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.personalIncome && (
              <>
                {/* 収入カテゴリ別アイテム */}
                {Object.entries(categoryVisibility.income).map(([categoryId, isVisible]) => {
                  if (!isVisible) return null;
                  
                  const items = getItemsByCategory('personal', 'income', categoryId);
                  if (items.length === 0) return null;
                  
                  return items.map(item => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                        <div className="flex items-center">
                          <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                          {item.name}（万円）
                          {isNetIncomeTarget(item.name) && (
                            <span className="ml-1 text-xs text-blue-600">※手取り</span>
                          )}
                        </div>
                      </td>
                      {years.map(year => (
                        <td key={year} className="px-1 py-1 text-right text-xs">
                          <input
                            type="number"
                            value={item.amounts[year] || ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              if (!isNaN(value)) {
                                handleAmountChange('personal', item.id, year, value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              if (!isNaN(value)) {
                                handleAmountBlur('personal', item.id, year, value);
                              }
                            }}
                            className={inputStyle}
                          />
                          {isNetIncomeTarget(item.name) && item._originalAmounts && item._originalAmounts[year] > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              額面: {item._originalAmounts[year]}万円
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ));
                })}
              </>
            )}
            
            {/* 支出セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('personalExpense')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    支出
                    </span>
                  {expandedSections.personalExpense ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.personalExpense && (
              <>
                {/* 生活費 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('living') }}></span>
                      生活費 <span className="text-xs text-blue-600 ml-1">（インフレ率: {parameters.inflationRate}%）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('personal', 'expense', 'living').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('living') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('personal', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('personal', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* 住居費 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('housing') }}></span>
                      住居費 <span className="text-xs text-blue-600 ml-1">（インフレ率: {parameters.inflationRate}%）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('personal', 'expense', 'housing').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('housing') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('personal', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('personal', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* 教育費 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('education') }}></span>
                      教育費 <span className="text-xs text-blue-600 ml-1">（教育費上昇率: {parameters.educationCostIncreaseRate}%）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('personal', 'expense', 'education').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('education') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('personal', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('personal', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                
               {/* ローン返済 */}
<tr className="bg-gray-100">
  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
    <div className="flex items-center">
      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('liability') }}></span>
      ローン返済（支出）
      <TermTooltip term="" width="wide">
        負債の返済額です。この金額は支出として計上され、資産（現金）と負債（ローン残高）からそれぞれ同額が減少します。
      </TermTooltip>
    </div>
  </td>
</tr>
<tr>
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
    <div className="flex items-center">
      <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('liability') }}></span>
      ローン返済（万円）
    </div>
  </td>
  {years.map(year => (
    <td key={year} className="px-2 py-1 text-right text-xs text-red-600 font-semibold">
      {cashFlow[year]?.loanRepayment ? `-${cashFlow[year].loanRepayment}` : '0'}
    </td>
  ))}
</tr>
                
                {/* その他支出 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('other') }}></span>
                      その他 <span className="text-xs text-blue-600 ml-1">（インフレ率適用なし）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('personal', 'expense', 'other').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('other') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('personal', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('personal', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            
            {/* 資産セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('personalAsset')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    資産
                    </span>
                  {expandedSections.personalAsset ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.personalAsset && (
              <>
                {Object.entries(categoryVisibility.asset).map(([categoryId, isVisible]) => {
                  if (!isVisible) return null;
                  
                  const items = getItemsByCategory('personal', 'asset', categoryId);
                  if (items.length === 0) return null;
                  
                  return (
                    <React.Fragment key={categoryId}>
                      <tr className="bg-gray-100">
                        <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                            {categoryId === 'asset' ? '資産' : 'その他'}
                          </div>
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                              {item.name}（万円）
                            </div>
                          </td>
                          {years.map(year => (
                            <td key={year} className="px-1 py-1 text-right text-xs">
                              <input
                                type="number"
                                value={item.amounts[year] || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                                  if (!isNaN(value)) {
                                    item.amounts[year] = value;
                                    syncCashFlowFromFormData();
                                  }
                                }}
                                className={inputStyle}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
            
           {/* 負債セクション */}
<tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('personalLiability')}>
  <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
    <div className="flex items-center justify-between">
      <span className="font-semibold text-blue-800 text-xs">
        負債
       </span>
      {expandedSections.personalLiability ? 
         <ChevronUp className="h-3 w-3 text-blue-800" /> : 
        <ChevronDown className="h-3 w-3 text-blue-800" />
      }
    </div>
  </td>
</tr>

{expandedSections.personalLiability && (
  <>
    {Object.entries(categoryVisibility.liability).map(([categoryId, isVisible]) => {
      if (!isVisible) return null;
      
      const items = getItemsByCategory('personal', 'liability', categoryId);
      if (items.length === 0) return null;
      
      return (
        <React.Fragment key={categoryId}>
          <tr className="bg-gray-100">
            <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                {categoryId === 'liability' ? '負債' : 'その他'}
              </div>
            </td>
          </tr>
          {items.map(item => (
            <tr key={item.id}>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                  {item.name}（万円）
                  {item.autoCalculate && <span className="ml-1 text-xs text-blue-600">※自動計算</span>}
                </div>
              </td>
              {years.map(year => (
                <td key={year} className="px-1 py-1 text-right text-xs">
                  <input
                    type="number"
                    value={item.amounts[year] || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value);
                      if (!isNaN(value)) {
                        // 引き継ぎの場合、マイナス表示せず、正の値で保存する
                        const absValue = Math.abs(value);
                        item.amounts[year] = absValue;
                        syncCashFlowFromFormData();
                      }
                    }}
                    className={`${inputStyle} ${item.autoCalculate && item.startYear && year > item.startYear ? 'bg-gray-100' : ''}`}
                    disabled={item.autoCalculate && item.startYear && year > item.startYear}
                  />
                </td>
              ))}
            </tr>
          ))}
        </React.Fragment>
      );
    })}
  </>
)}
            
            {/* 合計値 */}
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                収支
               </td>
              {years.map(year => {
                const balance = cashFlow[year]?.personalBalance || 0;
                return (
                  <td key={year} className={`px-2 py-1 text-right text-xs ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {balance}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                投資額
                <TermTooltip term="" width="narrow" icon={false}>
                  その年に投資に回した金額
                </TermTooltip>
              </td>
              {years.map(year => {
                const investmentAmount = cashFlow[year]?.investmentAmount || 0;
                return (
                  <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
                    {investmentAmount}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                運用資産
                </td>
              {years.map(year => {
                const investmentAssets = cashFlow[year]?.totalInvestmentAssets || 0;
                return (
                  <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
                    {investmentAssets}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                運用収益
                </td>
              {years.map(year => {
                const investmentIncome = cashFlow[year]?.investmentIncome || 0;
                return (
                  <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
                    {investmentIncome}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                総資産
                </td>
              {years.map(year => {
                const assets = cashFlow[year]?.personalTotalAssets || 0;
                return (
                  <td key={year} className={`px-2 py-1 text-right text-xs ${assets >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {assets}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                負債総額
                </td>
              {years.map(year => {
                const liabilityTotal = cashFlow[year]?.personalLiabilityTotal || 0;
                return (
                  <td key={year} className="px-2 py-1 text-right text-xs text-red-600">
                    {liabilityTotal > 0 ? liabilityTotal : 0}万円
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
                純資産
                </td>
              {years.map(year => {
                const netAssets = cashFlow[year]?.personalNetAssets || 0;
                return (
                  <td key={year} className={`px-2 py-1 text-right text-xs font-bold ${netAssets >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netAssets}万円
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

{/* 法人キャッシュフローテーブルの修正も同様に行う */}
const renderCorporateTable = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        法人キャッシュフロー
       </h3>
      
      <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-2">
        <p>※ 表示されている金額には自動的にインフレ率が適用されています。</p>
        <p>※ ローンの自動計算が設定されている場合、資産・負債の残高は自動計算されます。</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[150px]">項目</th>
              {years.map(year => (
                <th key={year} className="px-2 py-1 text-right text-xs font-medium text-gray-500">
                  {year}年
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                法人イベント
                </td>
              {years.map(year => (
                <td key={year} className="px-2 py-1 text-right text-xs text-gray-600">
                  {getLifeEventDescription(year, basicInfo, lifeEvents, 'corporate')}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                法人運用資産イベント
                </td>
              {years.map(year => (
                <td key={year} className="px-2 py-1 text-right text-xs text-gray-600">
                  {getLifeEventDescription(year, basicInfo, lifeEvents, 'corporate_investment')}
                </td>
              ))}
            </tr>
            
            {/* 収入セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('corporateIncome')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    収入
                    </span>
                  {expandedSections.corporateIncome ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.corporateIncome && (
              <>
                {Object.entries(categoryVisibility.income).map(([categoryId, isVisible]) => {
                  if (!isVisible) return null;
                  
                  const items = getItemsByCategory('corporate', 'income', categoryId);
                  if (items.length === 0) return null;
                  
                  return items.map(item => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                        <div className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                          {item.name}（万円）
                        </div>
                      </td>
                      {years.map(year => (
                        <td key={year} className="px-1 py-1 text-right text-xs">
                          <input
                            type="number"
                            value={item.amounts[year] || ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : Number(e.target.value);
                              if (!isNaN(value)) {
                                item.amounts[year] = value;
                                syncCashFlowFromFormData();
                              }
                            }}
                            className={inputStyle}
                          />
                        </td>
                      ))}
                    </tr>
                  ));
                })}
              </>
            )}
            
            {/* 支出セクション - 法人用 */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('corporateExpense')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    支出
                    </span>
                  {expandedSections.corporateExpense ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.corporateExpense && (
              <>
                {/* 事業運営費 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('business') }}></span>
                      事業運営費 <span className="text-xs text-blue-600 ml-1">（インフレ率: {parameters.inflationRate}%）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('corporate', 'expense', 'business').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('business') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('corporate', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('corporate', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* オフィス・設備費 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('office') }}></span>
                      オフィス・設備費 <span className="text-xs text-blue-600 ml-1">（インフレ率: {parameters.inflationRate}%）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('corporate', 'expense', 'office').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('office') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('corporate', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('corporate', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* ローン返済 - 法人 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('liability') }}></span>
                      ローン返済
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                    <div className="flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('liability') }}></span>
                      ローン返済（万円）
                    </div>
                  </td>
                  {years.map(year => (
                    <td key={year} className="px-2 py-1 text-right text-xs text-red-600 font-semibold">
                      {cashFlow[year]?.corporateLoanRepayment ? `-${cashFlow[year].corporateLoanRepayment}` : 0}
                    </td>
                  ))}
                </tr>
                
                {/* その他支出 - 法人 */}
                <tr className="bg-gray-100">
                  <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('other') }}></span>
                      その他 <span className="text-xs text-blue-600 ml-1">（インフレ率適用なし）</span>
                    </div>
                  </td>
                </tr>
                {getItemsByCategory('corporate', 'expense', 'other').map(item => (
                  <tr key={item.id}>
                    <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor('other') }}></span>
                        {item.name}（万円）
                      </div>
                    </td>
                    {years.map(year => (
                      <td key={year} className="px-1 py-1 text-right text-xs">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseChange('corporate', item.id, year, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            if (!isNaN(value)) {
                              handleExpenseBlur('corporate', item.id, year, value);
                            }
                          }}
                          className={inputStyle}
                        />
                        {item._rawAmounts && item._rawAmounts[year] !== undefined && 
                        item._rawAmounts[year] !== item.amounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            元の値: {item._rawAmounts[year]}万円
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            
            {/* 法人資産セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('corporateAsset')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    資産
                     </span>
                  {expandedSections.corporateAsset ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.corporateAsset && (
              <>
                {Object.entries(categoryVisibility.asset).map(([categoryId, isVisible]) => {
                  if (!isVisible) return null;
                  
                  const items = getItemsByCategory('corporate', 'asset', categoryId);
                  if (items.length === 0) return null;
                  
                  return (
                    <React.Fragment key={categoryId}>
                      <tr className="bg-gray-100">
                        <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                            {categoryId === 'asset' ? '資産' : 'その他'}
                          </div>
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                              {item.name}（万円）
                            </div>
                          </td>
                          {years.map(year => (
                            <td key={year} className="px-1 py-1 text-right text-xs">
                              <input
                                type="number"
                                value={item.amounts[year] || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                                  if (!isNaN(value)) {
                                    item.amounts[year] = value;
                                    syncCashFlowFromFormData();
                                  }
                                }}
                                className={inputStyle}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
            
            {/* 法人負債セクション */}
            <tr className="bg-blue-50 cursor-pointer" onClick={() => toggleSection('corporateLiability')}>
              <td colSpan={years.length + 1} className="px-2 py-1 sticky left-0 bg-blue-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-800 text-xs">
                    負債
                    </span>
                  {expandedSections.corporateLiability ? 
                    <ChevronUp className="h-3 w-3 text-blue-800" /> : 
                    <ChevronDown className="h-3 w-3 text-blue-800" />
                  }
                </div>
              </td>
            </tr>
            
            {expandedSections.corporateLiability && (
              <>
               {Object.entries(categoryVisibility.liability).map(([categoryId, isVisible]) => {
                  if (!isVisible) return null;
                  
                  const items = getItemsByCategory('corporate', 'liability', categoryId);
                  if (items.length === 0) return null;
                  
                  return (
                    <React.Fragment key={categoryId}>
                      <tr className="bg-gray-100">
                        <td colSpan={years.length + 1} className="px-2 py-1 font-medium text-gray-700 text-xs">
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                            {categoryId === 'liability' ? '負債' : 'その他'}
                          </div>
                        </td>
                      </tr>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-white">
                            <div className="flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: getCategoryColor(categoryId) }}></span>
                              {item.name}（万円）
                              {item.autoCalculate && <span className="ml-1 text-xs text-blue-600">※自動計算</span>}
                            </div>
                          </td>
                          {years.map(year => (
                            <td key={year} className="px-1 py-1 text-right text-xs">
                              <input
                                type="number"
                                value={item.amounts[year] || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                                  if (!isNaN(value)) {
                                    item.amounts[year] = value;
                                    syncCashFlowFromFormData();
                                  }
                                }}
                                className={`${inputStyle} ${item.autoCalculate && item.startYear && year > item.startYear ? 'bg-gray-100' : ''}`}
                                disabled={item.autoCalculate && item.startYear && year > item.startYear}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            )}
            
{/* 法人合計値 */}
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    収支
    </td>
  {years.map(year => {
    const balance = cashFlow[year]?.corporateBalance || 0;
    return (
      <td key={year} className={`px-2 py-1 text-right text-xs ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {balance}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    投資額
    <TermTooltip term="" width="narrow" icon={false}>
      その年に投資に回した金額
    </TermTooltip>
  </td>
  {years.map(year => {
    const investmentAmount = cashFlow[year]?.corporateInvestmentAmount || 0;
    return (
      <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
        {investmentAmount}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    運用資産
    </td>
  {years.map(year => {
    const investmentAssets = cashFlow[year]?.corporateTotalInvestmentAssets || 0;
    return (
      <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
        {investmentAssets}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    運用収益
    </td>
  {years.map(year => {
    const investmentIncome = cashFlow[year]?.corporateInvestmentIncome || 0;
    return (
      <td key={year} className="px-2 py-1 text-right text-xs text-blue-600">
        {investmentIncome}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    総資産
  </td>
  {years.map(year => {
    const assets = cashFlow[year]?.corporateTotalAssets || 0;
    return (
      <td key={year} className={`px-2 py-1 text-right text-xs ${assets >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {assets}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    負債総額
    </td>
  {years.map(year => {
    const liabilityTotal = cashFlow[year]?.corporateLiabilityTotal || 0;
    return (
      <td key={year} className="px-2 py-1 text-right text-xs text-red-600">
        {liabilityTotal > 0 ? liabilityTotal : 0}万円
      </td>
    );
  })}
</tr>
<tr className="bg-gray-50 font-medium">
  <td className="px-2 py-1 text-xs text-gray-900 sticky left-0 bg-gray-50">
    純資産
    </td>
  {years.map(year => {
    const netAssets = cashFlow[year]?.corporateNetAssets || 0;
    return (
      <td key={year} className={`px-2 py-1 text-right text-xs font-bold ${netAssets >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {netAssets}万円
      </td>
    );
  })}
</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          キャッシュフロー
          </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Download className="h-4 w-4" />
            CSVエクスポート
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {renderPersonalTable()}
        {renderCorporateTable()}
      </div>

      <div className="flex justify-between space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          次へ
        </button>
      </div>

      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: cashFlowTermsContent },
          { id: 'formulas', label: '計算式', content: cashFlowFormulasContent }
        ]} 
      />
    </div>
  );
}
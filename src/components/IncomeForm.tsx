import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Plus, Trash2, HelpCircle, Wand2, X } from 'lucide-react';
import { CategorySelect, INCOME_CATEGORIES } from '@/components/ui/category-select';
// 直接インポートするように修正
import { calculateNetIncome } from '@/lib/calculations';
// ツールチップと計算式表示コンポーネントをインポート
import { TermTooltip } from './common/TermTooltip';
import { FormulaAccordion } from './common/FormulaAccordion';
import { FormulaSyntax } from './common/FormulaSyntax';
import { ContextHelp } from './common/ContextHelp';

// 自動入力モーダル用のインターフェース
interface AutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: AutofillSettings) => void;
  initialSettings?: AutofillSettings;
  itemName: string;
  section: 'personal' | 'corporate'; // セクション情報を追加
}

interface AutofillSettings {
  initialAmount: number;
  endAge: number;
  raiseType: 'percentage' | 'amount';
  raisePercentage: number;
  raiseAmount: number;
}

// 自動入力モーダルコンポーネント
const AutofillModal: React.FC<AutofillModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSettings,
  itemName,
  section
}) => {
  const [settings, setSettings] = useState<AutofillSettings>(
    initialSettings || {
      initialAmount: 400, // デフォルト400万円
      endAge: 60, // デフォルト60歳
      raiseType: 'percentage', // デフォルトは割合方式
      raisePercentage: 1.0, // デフォルト1.0%
      raiseAmount: 10, // デフォルト10万円
    }
  );

  // 項目名と所属セクションに基づいてラベルをカスタマイズ
  const isGivenSalary = (section === 'personal' && (itemName === '給与収入' || itemName === '配偶者収入'));
  const amountLabel = isGivenSalary ? '初期額面給与（万円/年）' : '初期金額（万円/年）';
  const ageLabel = isGivenSalary ? '就職終了年齢' : '終了年齢';
  const raiseLabelPercent = isGivenSalary ? '昇給率（%）' : '増加率（%）';
  const raiseLabelAmount = isGivenSalary ? '昇給額（万円/年）' : '増加額（万円/年）';
  const raiseTypeLabel = isGivenSalary ? '昇給タイプ' : '増加タイプ';
  const raiseTypePercentLabel = isGivenSalary ? '昇給率（%）' : '増加率（%）';
  const raiseTypeAmountLabel = isGivenSalary ? '昇給額（万円）' : '増加額（万円）';
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

          <div className="space-y-2">
            <label className="text-sm font-medium">{raiseTypeLabel}</label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="raiseTypePercentage"
                  checked={settings.raiseType === 'percentage'}
                  onChange={() => setSettings({...settings, raiseType: 'percentage'})}
                  className="mr-2"
                />
                <label htmlFor="raiseTypePercentage">{raiseTypePercentLabel}</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="raiseTypeAmount"
                  checked={settings.raiseType === 'amount'}
                  onChange={() => setSettings({...settings, raiseType: 'amount'})}
                  className="mr-2"
                />
                <label htmlFor="raiseTypeAmount">{raiseTypeAmountLabel}</label>
              </div>
            </div>
          </div>

          {settings.raiseType === 'percentage' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{raiseLabelPercent}</label>
              <input
                type="number"
                step="0.1"
                value={settings.raisePercentage}
                onChange={(e) => setSettings({...settings, raisePercentage: Number(e.target.value)})}
                className="w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <p className="text-xs text-gray-500">毎年の金額に対する増加割合</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">{raiseLabelAmount}</label>
              <input
                type="number"
                value={settings.raiseAmount}
                onChange={(e) => setSettings({...settings, raiseAmount: Number(e.target.value)})}
                className="w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <p className="text-xs text-gray-500">毎年の固定増加額</p>
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
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export function IncomeForm() {
  const { 
    basicInfo, 
    parameters,
    setCurrentStep,
    incomeData,
    setIncomeData
  } = useSimulatorStore();

  // 自動入力モーダルの状態
  const [autofillModalOpen, setAutofillModalOpen] = useState(false);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentSection, setCurrentSection] = useState<'personal' | 'corporate'>('personal');
  const [autofillSettings, setAutofillSettings] = useState<{[key: string]: AutofillSettings}>({});

  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  // 用語解説コンテンツ
  const termsContent = (
    <div className="space-y-4 text-sm">
      <h4 className="font-bold text-gray-800">収入関連の用語</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">給与収入</span>: 会社員・公務員などが得る給料やボーナスなどの収入</li>
        <li><span className="font-bold">事業収入</span>: 自営業者やフリーランスが得る事業による収入</li>
        <li><span className="font-bold">副業収入</span>: 本業以外から得られる収入</li>
        <li><span className="font-bold">年金収入</span>: 国民年金や厚生年金からの給付金</li>
        <li><span className="font-bold">投資割合</span>: 収入のうち、何%を投資に回すかの割合</li>
        <li><span className="font-bold">最大投資額</span>: 年間に投資できる金額の上限(万円)</li>
      </ul>
      
      <h4 className="font-bold text-gray-800">給与計算関連</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">額面収入</span>: 税金や社会保険料が引かれる前の総収入</li>
        <li><span className="font-bold">手取り収入</span>: 税金や社会保険料が引かれた後の実際に受け取る金額</li>
        <li><span className="font-bold">給与所得控除</span>: 給与所得から一定額を控除する制度。収入額に応じて控除額が変わる</li>
        <li><span className="font-bold">社会保険料</span>: 健康保険、厚生年金保険、雇用保険、介護保険などの保険料の総称</li>
      </ul>

      <h4 className="font-bold text-gray-800">自動入力関連</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">初期金額</span>: 最初の年の金額（万円/年）</li>
        <li><span className="font-bold">終了年齢</span>: その収入が発生する最終年齢</li>
        <li><span className="font-bold">増加率</span>: 毎年の金額が前年に対して増加する割合（%）</li>
        <li><span className="font-bold">増加額</span>: 毎年の金額が前年から増加する固定金額（万円/年）</li>
      </ul>
    </div>
  );

  // 計算式コンテンツ
  const formulasContent = (
    <div className="space-y-4">
      <FormulaAccordion 
        title="給与収入の手取り計算式" 
        bgColor="bg-green-50" 
        textColor="text-green-800" 
        borderColor="border-green-200"
      >
        <FormulaSyntax formula={`給与所得控除 = 
  - 収入 ≤ 850万円の場合: min(max((収入 × 0.3) + 8万円, 55万円), 195万円)
  - 収入 > 850万円の場合: 195万円

社会保険料 = 
  - 収入 < 850万円の場合: 収入 × 0.15
  - 収入 ≥ 850万円の場合: 収入 × 0.077

課税所得 = 収入 - 給与所得控除 - 社会保険料

所得税 = 
  - 課税所得 ≤ 195万円: 課税所得 × 0.05
  - 課税所得 ≤ 330万円: 課税所得 × 0.10 - 9.75万円
  - 課税所得 ≤ 695万円: 課税所得 × 0.20 - 42.75万円
  - 課税所得 ≤ 900万円: 課税所得 × 0.23 - 63.6万円
  - 課税所得 ≤ 1800万円: 課税所得 × 0.33 - 153.6万円
  - 課税所得 ≤ 4000万円: 課税所得 × 0.40 - 279.6万円
  - 課税所得 > 4000万円: 課税所得 × 0.45 - 479.6万円

住民税 = 課税所得 × 0.10

手取り収入 = 収入 - 社会保険料 - 所得税 - 住民税`} />
      </FormulaAccordion>

      <FormulaAccordion 
        title="収入増加計算式（割合方式）" 
        bgColor="bg-green-50" 
        textColor="text-green-800" 
        borderColor="border-green-200"
      >
        <FormulaSyntax formula={`n年目の金額 = 初期金額 × (1 + 増加率/100)^(n-1)

例: 初期金額400万円、増加率2%の場合
1年目: 400万円
2年目: 400 × (1 + 2/100) = 408万円
3年目: 400 × (1 + 2/100)^2 = 416.16万円`} />
      </FormulaAccordion>

      <FormulaAccordion 
        title="収入増加計算式（固定額方式）" 
        bgColor="bg-green-50" 
        textColor="text-green-800" 
        borderColor="border-green-200"
      >
        <FormulaSyntax formula={`n年目の金額 = 初期金額 + 増加額 × (n-1)

例: 初期金額400万円、増加額10万円の場合
1年目: 400万円
2年目: 400 + 10 = 410万円
3年目: 400 + 10 × 2 = 420万円`} />
      </FormulaAccordion>

      <FormulaAccordion 
        title="資産運用計算式" 
        bgColor="bg-blue-50" 
        textColor="text-blue-800" 
        borderColor="border-blue-200"
      >
        <FormulaSyntax formula={`投資額 = min(収入額 × (投資割合/100), 最大投資額)
投資収益 = 前年の運用資産 × (運用利回り/100)
当年の運用資産 = 前年の運用資産 + 当年の総投資額 + 当年の投資収益`} />
      </FormulaAccordion>
    </div>
  );

  // 給与収入が手取り計算対象かどうか判定する関数
  const isNetIncomeTarget = (itemName: string) => {
    return (
      (itemName === '給与収入' && 
       (basicInfo.occupation === 'company_employee' || basicInfo.occupation === 'part_time_with_pension')) ||
      (itemName === '配偶者収入' && basicInfo.spouseInfo?.occupation && 
       (basicInfo.spouseInfo.occupation === 'company_employee' || basicInfo.spouseInfo.occupation === 'part_time_with_pension'))
    );
  };

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
    const item = incomeData[currentSection].find(i => i.id === currentItemId);
    
    if (!item) return;

    // 自動入力する年の範囲を計算
    const endYear = basicInfo.startYear + (settings.endAge - basicInfo.currentAge);
    const filledYears = years.filter(year => year <= endYear);
    
    // 各年の金額を計算
    const newAmounts: {[year: number]: number} = {};
    const newOriginalAmounts: {[year: number]: number} = {};
    
    filledYears.forEach((year, index) => {
      let amount: number;
      
      if (settings.raiseType === 'percentage') {
        // 増加率方式
        amount = settings.initialAmount * Math.pow(1 + settings.raisePercentage / 100, index);
      } else {
        // 増加額方式
        amount = settings.initialAmount + (settings.raiseAmount * index);
      }
      
      // 小数点以下を切り捨て
      amount = Math.floor(amount);
      
      // 額面金額を保存
      newOriginalAmounts[year] = amount;
      
      // 給与収入で会社員または厚生年金ありのパートの場合は手取り計算
      if (currentSection === 'personal' && isNetIncomeTarget(item.name)) {
        const occupation = item.name === '給与収入' ? basicInfo.occupation : basicInfo.spouseInfo?.occupation;
        const netResult = calculateNetIncome(amount, occupation);
        newAmounts[year] = netResult.netIncome;
      } else {
        newAmounts[year] = amount;
      }
    });
    
    // 収入データを更新
    setIncomeData({
      ...incomeData,
      [currentSection]: incomeData[currentSection].map(i => {
        if (i.id === currentItemId) {
          return {
            ...i,
            amounts: {...i.amounts, ...newAmounts},
            _originalAmounts: currentSection === 'personal' && isNetIncomeTarget(i.name) 
              ? {...i._originalAmounts, ...newOriginalAmounts} 
              : undefined
          };
        }
        return i;
      })
    });
    
    // モーダルを閉じる
    setAutofillModalOpen(false);
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
  };

  // 投資割合の変更を処理する関数
  const handleInvestmentRatioChange = (
    section: 'personal' | 'corporate', 
    itemId: string, 
    value: number
  ) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              investmentRatio: value,
            }
          : item
      ),
    });
  };

  // 最大投資額の変更を処理する関数
  const handleMaxInvestmentAmountChange = (
    section: 'personal' | 'corporate', 
    itemId: string, 
    value: number
  ) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              maxInvestmentAmount: value,
            }
          : item
      ),
    });
  };

  const addIncomeItem = (section: 'personal' | 'corporate') => {
    const newId = String(Math.max(...incomeData[section].map(i => Number(i.id)), 0) + 1);
    setIncomeData({
      ...incomeData,
      [section]: [
        ...incomeData[section],
        {
          id: newId,
          name: 'その他',
          type: 'income',
          category: 'income', // デフォルトカテゴリ
          amounts: {},
          investmentRatio: parameters.investmentRatio || 10, // デフォルト投資割合
          maxInvestmentAmount: parameters.maxInvestmentAmount || 100, // デフォルト最大投資額
        },
      ],
    });
  };

  const removeIncomeItem = (section: 'personal' | 'corporate', id: string) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].filter(item => item.id !== id),
    });
  };

  const handleNameChange = (
    section: 'personal' | 'corporate',
    itemId: string,
    value: string
  ) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
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
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
        item.id === itemId
          ? {
              ...item,
              category: value,
            }
          : item
      ),
    });
  };

  const renderIncomeTable = (section: 'personal' | 'corporate') => {
    const items = incomeData[section];
    const title = section === 'personal' ? '個人' : '法人';

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={() => addIncomeItem(section)}
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
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[70px] min-w-[70px]">
                  <div className="flex items-center justify-center">
                    <span>投資割合(%)</span>
                    <TermTooltip term="" width="narrow">
                      収入のうち、何%を投資に回すかの割合です。この割合に基づいて自動的に投資が行われます。
                    </TermTooltip>
                  </div>
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[90px] min-w-[90px]">
                  <div className="flex items-center justify-center">
                    <span>最大投資額</span>
                    <TermTooltip term="" width="narrow">
                      年間に投資できる金額の上限(万円)です。投資割合に基づく金額がこの値を超える場合、この上限が適用されます。
                    </TermTooltip>
                  </div>
                </th>
                {/* 自動入力ボタン列 */}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px] min-w-[80px]">
                  <div className="flex items-center justify-center">
                    <span>自動入力</span>
                    <TermTooltip term="" width="narrow">
                      {section === 'personal' 
                        ? '給与を就職終了年齢まで自動計算します。昇給率または昇給額を指定できます。'
                        : '収入を終了年齢まで自動計算します。増加率または増加額を指定できます。'}
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
                      value={item.category || 'income'}
                      onChange={(value) => handleCategoryChange(section, item.id, value)}
                      categories={INCOME_CATEGORIES}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.investmentRatio || 0}
                      onChange={(e) => handleInvestmentRatioChange(section, item.id, Number(e.target.value))}
                      className="w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={item.maxInvestmentAmount || 0}
                      onChange={(e) => handleMaxInvestmentAmountChange(section, item.id, Number(e.target.value))}
                      className="w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                        onBlur={(e) => handleAmountBlur(section, item.id, year, Number(e.target.value))}
                        className="w-full text-right rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                      {section === 'personal' && isNetIncomeTarget(item.name) && item._originalAmounts && item._originalAmounts[year] > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          額面: {item._originalAmounts[year]}万円
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeIncomeItem(section, item.id)}
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
    setCurrentStep(3);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">収入情報</h2>
        <div className="text-sm text-gray-500">
          ※金額は万円単位で入力してください
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>投資設定について</span>
        </h3>
        <p className="text-sm text-blue-700">
          各収入項目ごとに投資設定を行うことができます。投資割合(%)は収入のうち何%を投資に回すかを、
          最大投資額は年間いくらまで投資するかの上限を設定します。
          これらの設定は自動的に運用資産に反映され、設定した運用利回りで収益が発生します。
        </p>
      </div>

      <div className="bg-purple-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-purple-800 mb-2 flex items-center">
          <span>自動入力機能について</span>
          <Wand2 className="h-4 w-4 ml-2" />
        </h3>
        <p className="text-sm text-purple-700">
          全ての収入項目に自動入力機能があります。初期金額、終了年齢、増加タイプ（増加率または増加額）を設定すると、
          金額を終了年齢まで自動的に計算します。計算後も各年の値は個別に編集可能です。
          給与収入の場合は、会社員・公務員（または厚生年金あり）は引き続き手取り金額に自動変換されます。
        </p>
      </div>

      {/* 手取り計算の説明を常に表示 - section変数を使わない */}
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>手取り計算について</span>
        </h3>
        <p className="text-sm text-blue-700">
          会社員・公務員（または厚生年金あり）の給与収入は、入力後自動的に手取り金額に変換されます。
          元の額面金額は保存され、年金計算などに使用されます。
        </p>
           <p className="text-blue-700 mb-1">手取り計算は以下のような流れで行われます：</p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>額面給与から給与所得控除を差し引く</li>
              <li>社会保険料（健康保険・厚生年金等）を差し引く</li>
              <li>所得税（累進課税率）を差し引く</li>
              <li>住民税（一律10%）を差し引く</li>
        </ol>
      </div>

      <div className="space-y-8">
        {renderIncomeTable('personal')}
        {renderIncomeTable('corporate')}
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
          incomeData[currentSection].find(i => i.id === currentItemId)?.name || '収入'
        }
        section={currentSection}
      />

      {/* コンテキストヘルプ追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: termsContent },
          { id: 'formulas', label: '計算式', content: formulasContent }
        ]} 
      />
    </div>
  );
}
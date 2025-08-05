import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { Plus, X, Wand2, Trash2, Building2, Settings } from 'lucide-react';
import { CategorySelect, INCOME_CATEGORIES } from '@/components/ui/category-select';
import { calculateNetIncome, calculateNetIncomeForDirector } from '@/lib/calculations';
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { FormulaAccordion } from '@/components/common/FormulaAccordion';
import { FormulaSyntax } from '@/components/common/FormulaSyntax';

interface AutofillSettings {
  initialAmount: number;
  endAge: number;
  raiseType: 'percentage' | 'amount';
  raisePercentage: number;
  raiseAmount: number;
  maxAmount?: number;
}

// 法人給与設定モーダル用の型定義
interface CorporateSalarySettings {
  corporateSalaryType: 'full-time' | 'part-time';
  socialInsuranceByYear: { [year: number]: boolean };
  // 自動切り替え用の新規プロパティ
  autoSwitchEnabled?: boolean;
  autoSwitchIncomeIds?: string[];
  // モーダル内で手動変更した年度を記録
  manuallyChangedYears?: { [year: number]: boolean };
}

// 法人給与設定モーダルコンポーネント
const CorporateSalaryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: CorporateSalarySettings) => void;
  years: number[];
  currentSettings?: CorporateSalarySettings;
  itemName: string;
}> = ({ isOpen, onClose, onApply, years, currentSettings, itemName }) => {
  const { incomeData } = useSimulatorStore();
  
  const [settings, setSettings] = useState<CorporateSalarySettings>(() => {
    // デフォルト設定
    const defaultSettings: CorporateSalarySettings = {
      corporateSalaryType: 'full-time',
      socialInsuranceByYear: years.reduce((acc, year) => {
        acc[year] = true;
        return acc;
      }, {} as { [year: number]: boolean }),
      autoSwitchEnabled: false,
      autoSwitchIncomeIds: [],
      manuallyChangedYears: {}
    };

    // currentSettingsが存在する場合はマージ
    if (currentSettings) {
      return {
        ...defaultSettings,
        ...currentSettings,
        // socialInsuranceByYearが存在しない場合はデフォルト値を使用
        socialInsuranceByYear: currentSettings.socialInsuranceByYear || defaultSettings.socialInsuranceByYear,
        manuallyChangedYears: {}  // モーダルを開くたびにリセット
      };
    }

    return defaultSettings;
  });

  if (!isOpen) return null;

  const toggleSocialInsurance = (year: number) => {
    setSettings({
      ...settings,
      socialInsuranceByYear: {
        ...settings.socialInsuranceByYear,
        [year]: !settings.socialInsuranceByYear[year]
      },
      manuallyChangedYears: {
        ...settings.manuallyChangedYears,
        [year]: true  // この年度は手動で変更されたことを記録
      }
    });
  };

  const setAllYearsSocialInsurance = (value: boolean) => {
    const newSocialInsuranceByYear = years.reduce((acc, year) => {
      acc[year] = value;
      return acc;
    }, {} as { [year: number]: boolean });
    
    // すべて有り/無しを押した場合、全年度を手動変更扱いにする
    const newManuallyChangedYears = years.reduce((acc, year) => {
      acc[year] = true;
      return acc;
    }, {} as { [year: number]: boolean });
    
    setSettings({
      ...settings,
      socialInsuranceByYear: newSocialInsuranceByYear,
      manuallyChangedYears: newManuallyChangedYears
    });
  };

  const toggleAutoSwitch = () => {
    setSettings({
      ...settings,
      autoSwitchEnabled: !settings.autoSwitchEnabled
    });
  };

  const toggleIncomeSelection = (incomeId: string) => {
    const currentIds = settings.autoSwitchIncomeIds || [];
    setSettings({
      ...settings,
      autoSwitchIncomeIds: currentIds.includes(incomeId)
        ? currentIds.filter(id => id !== incomeId)
        : [...currentIds, incomeId]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{itemName} - 法人給与設定</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 専業/副業選択 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">雇用形態</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="full-time"
                  checked={settings.corporateSalaryType === 'full-time'}
                  onChange={(e) => setSettings({ ...settings, corporateSalaryType: 'full-time' })}
                  className="text-blue-600"
                />
                <span>専業（役員）</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="part-time"
                  checked={settings.corporateSalaryType === 'part-time'}
                  onChange={(e) => setSettings({ ...settings, corporateSalaryType: 'part-time' })}
                  className="text-blue-600"
                />
                <span>副業（業務委託等）</span>
              </label>
            </div>
          </div>

          {/* 社保設定説明 */}
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>専業（役員）の場合：</strong>原則として社会保険加入が必要です。法人負担分も含めて計算されます。<br/>
              <strong>副業（業務委託等）の場合：</strong>本業で社保加入済みの場合は、社保なしで計算されます。
            </p>
          </div>

          {/* 副業選択時の自動切り替え設定 */}
          {settings.corporateSalaryType === 'part-time' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSwitch"
                  checked={settings.autoSwitchEnabled}
                  onChange={toggleAutoSwitch}
                  className="rounded text-blue-600"
                />
                <label htmlFor="autoSwitch" className="text-sm font-medium">
                  自動切り替え機能を有効にする
                </label>
              </div>

              {settings.autoSwitchEnabled && (
                <div className="ml-6 space-y-2">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-2">監視対象の収入項目を選択してください：</p>
                    <p className="text-xs text-gray-500 mb-3">
                      法人給与が選択した収入項目の合計を上回った年度は、自動的に社会保険ありに切り替わります。
                    </p>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
                    {incomeData.personal
                      .filter(item => !item.isCorporateSalary) // 法人給与以外を表示
                      .map(item => (
                        <label key={item.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(settings.autoSwitchIncomeIds || []).includes(item.id)}
                            onChange={() => toggleIncomeSelection(item.id)}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">{item.name}</span>
                        </label>
                      ))}
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-xs text-yellow-700">
                      <strong>注意：</strong>手動で社保設定を変更した年度は、自動切り替えが無効になります。
                      自動切り替えを再度有効にするには、その年度の設定をリセットしてください。
                    </p>
                    {settings.autoSwitchIncomeIds && settings.autoSwitchIncomeIds.length > 0 && (
                      <div className="mt-2 text-xs text-yellow-700">
                        <strong>選択した収入項目：</strong>
                        {settings.autoSwitchIncomeIds.map(id => {
                          const income = incomeData.personal.find(item => item.id === id);
                          return income ? income.name : '';
                        }).filter(name => name).join('、')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 年度ごとの社保設定 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">年度ごとの社会保険設定</label>
              <div className="space-x-2">
                <button
                  onClick={() => setAllYearsSocialInsurance(true)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  すべて有り
                </button>
                <button
                  onClick={() => setAllYearsSocialInsurance(false)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  すべて無し
                </button>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">年度</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">社会保険</th>
                    {settings.autoSwitchEnabled && settings.corporateSalaryType === 'part-time' && (
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">自動/手動</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {years.map(year => (
                    <tr key={year} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{year}年</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={settings.socialInsuranceByYear[year] || false}
                          onChange={() => toggleSocialInsurance(year)}
                          className="rounded text-blue-600"
                          disabled={settings.corporateSalaryType === 'full-time'}
                        />
                      </td>
                      {settings.autoSwitchEnabled && settings.corporateSalaryType === 'part-time' && (
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-500">
                            {settings.manuallyChangedYears?.[year] 
                              ? <span className="text-orange-600 font-medium">手動</span>
                              : <span className="text-green-600 font-medium">自動</span>}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {settings.corporateSalaryType === 'part-time' && !settings.autoSwitchEnabled && (
              <p className="text-xs text-gray-500">
                ※ 副業の場合、基本的に社会保険は適用されません
              </p>
            )}
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
const AutofillModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: AutofillSettings) => void;
  itemName: string;
  currentAge: number;
  isGivenSalary: boolean;
}> = ({ isOpen, onClose, onApply, itemName, currentAge, isGivenSalary }) => {
  const [settings, setSettings] = useState<AutofillSettings>({
    initialAmount: 0,
    endAge: 65,
    raiseType: 'percentage',
    raisePercentage: 0,
    raiseAmount: 0,
    maxAmount: undefined,
  });

  const amountLabel = isGivenSalary ? '初期額面給与（万円/年）' : '初期金額（万円/年）';
  const ageLabel = isGivenSalary ? '就職終了年齢' : '終了年齢';
  const raiseLabelPercent = isGivenSalary ? '昇給率（%）' : '増加率（%）';
  const raiseLabelAmount = isGivenSalary ? '昇給額（万円/年）' : '増加額（万円/年）';
  const raiseTypeLabel = isGivenSalary ? '昇給タイプ' : '増加タイプ';
  const raiseTypePercentLabel = isGivenSalary ? '昇給率（%）' : '増加率（%）';
  const raiseTypeAmountLabel = isGivenSalary ? '昇給額（万円）' : '増加額（万円）';
  const maxAmountLabel = isGivenSalary ? '年収上限値（万円/年）' : '収入上限値（万円/年）';
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
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableMaxAmount"
                checked={settings.maxAmount !== undefined}
                onChange={(e) => setSettings({
                  ...settings,
                  maxAmount: e.target.checked ? 1000 : undefined
                })}
                className="rounded border-gray-300"
              />
              <label htmlFor="enableMaxAmount" className="text-sm">上限値を設定する</label>
            </div>
            {settings.maxAmount !== undefined && (
              <input
                type="number"
                value={settings.maxAmount}
                onChange={(e) => setSettings({...settings, maxAmount: Number(e.target.value)})}
                className="w-full rounded-md border border-gray-200 px-3 py-2"
                placeholder="1000"
              />
            )}
          </div>

          {/* 上限値設定時の説明 */}
          {settings.maxAmount !== undefined && (
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">上限値制限: </span>
                計算された金額が{settings.maxAmount}万円を超える年は、{settings.maxAmount}万円で制限されます。
              </p>
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
    setParameters,
    setCurrentStep,
    incomeData,
    setIncomeData,
    syncCashFlowFromFormData
  } = useSimulatorStore();

  // 自動入力モーダルの状態
  const [autofillModalOpen, setAutofillModalOpen] = useState(false);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentSection, setCurrentSection] = useState<'personal' | 'corporate'>('personal');
  const [autofillSettings, setAutofillSettings] = useState<{[key: string]: AutofillSettings}>({});

  // 法人給与設定モーダルの状態
  const [corporateSalaryModalOpen, setCorporateSalaryModalOpen] = useState(false);
  const [corporateSalarySettings, setCorporateSalarySettings] = useState<{[key: string]: CorporateSalarySettings}>({});

  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  // ストアに年金項目が存在しない場合は追加する
  React.useEffect(() => {
    const personalIncomes = incomeData.personal;
    const hasPensionIncome = personalIncomes.some(item => item.name === '年金収入');
    const hasSpousePensionIncome = personalIncomes.some(item => item.name === '配偶者年金収入');

    let needsUpdate = false;
    const updatedPersonalIncomes = [...personalIncomes];

    // 年金収入がない場合は追加
    if (!hasPensionIncome) {
      updatedPersonalIncomes.push({
        id: 'pension_' + Date.now(),
        name: '年金収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
        isAutoCalculated: true
      });
      needsUpdate = true;
    }

    // 配偶者年金収入がない場合は追加（既婚または結婚予定の場合のみ）
    if (!hasSpousePensionIncome && basicInfo.maritalStatus !== 'single') {
      updatedPersonalIncomes.push({
        id: 'spouse_pension_' + Date.now(),
        name: '配偶者年金収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0,
        isAutoCalculated: true
      });
      needsUpdate = true;
    }

    // 配偶者収入がない場合は追加（既婚または結婚予定で配偶者が働く場合）
    const hasSpouseIncome = personalIncomes.some(item => item.name === '配偶者収入');
    if (!hasSpouseIncome && basicInfo.maritalStatus !== 'single' && 
        basicInfo.spouseInfo?.occupation && basicInfo.spouseInfo.occupation !== 'homemaker') {
      updatedPersonalIncomes.push({
        id: 'spouse_income_' + Date.now(),
        name: '配偶者収入',
        type: 'income',
        category: 'income',
        amounts: {},
        investmentRatio: 0,
        maxInvestmentAmount: 0
      });
      needsUpdate = true;
    }

    if (needsUpdate) {
      setIncomeData({
        ...incomeData,
        personal: updatedPersonalIncomes
      });
    }
  }, [basicInfo.maritalStatus, basicInfo.spouseInfo?.occupation]);

  // 年金自動計算を実行する効果
  React.useEffect(() => {
    // 年金計算をトリガー
    syncCashFlowFromFormData();
  }, [
    basicInfo.currentAge,
    basicInfo.pensionStartAge,
    basicInfo.occupation,
    basicInfo.spouseInfo?.pensionStartAge,
    basicInfo.spouseInfo?.occupation,
    basicInfo.workStartAge,
    basicInfo.workEndAge,
    basicInfo.willWorkAfterPension,
    basicInfo.spouseInfo?.willWorkAfterPension
  ]);

  // 用語解説コンテンツ
  const termsContent = (
    <div className="space-y-4 text-sm">
      <h4 className="font-bold text-gray-800">収入関連の用語</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">給与収入</span>: 会社員・公務員などが得る給料やボーナスなどの収入</li>
        <li><span className="font-bold">法人給与</span>: 自身の法人から受け取る役員報酬や給与。法人経費に自動連携されます</li>
        <li><span className="font-bold">事業収入</span>: 自営業者やフリーランスが得る事業による収入</li>
        <li><span className="font-bold">副業収入</span>: 本業以外から得られる収入</li>
        <li><span className="font-bold">年金収入</span>: 国民年金や厚生年金からの給付金</li>
        <li><span className="font-bold">収入上限値</span>: 自動入力時に設定する年間収入の最大値(万円)</li>
      </ul>
      
      <h4 className="font-bold text-gray-800">給与計算関連</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">額面収入</span>: 税金や社会保険料が引かれる前の総収入</li>
        <li><span className="font-bold">手取り収入</span>: 税金や社会保険料が引かれた後の実際に受け取る金額</li>
        <li><span className="font-bold">給与所得控除</span>: 給与所得から一定額を控除する制度。収入額に応じて控除額が変わる</li>
        <li><span className="font-bold">社会保険料</span>: 健康保険、厚生年金保険、雇用保険、介護保険などの保険料の総称</li>
      </ul>

      <h4 className="font-bold text-gray-800">法人給与関連</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">専業（役員）</span>: 法人の役員として専業で働く場合。社会保険加入が必要</li>
        <li><span className="font-bold">副業（業務委託等）</span>: 本業がある状態で法人から報酬を受け取る場合</li>
        <li><span className="font-bold">法人負担社保</span>: 法人が負担する社会保険料。個人負担分とほぼ同額</li>
        <li><span className="font-bold">自動切り替え</span>: 法人給与が監視対象収入を上回った場合に自動で社保ありに切り替える機能</li>
      </ul>

      <h4 className="font-bold text-gray-800">自動入力関連</h4>
      <ul className="space-y-2">
        <li><span className="font-bold">初期金額</span>: 最初の年の金額（万円/年）</li>
        <li><span className="font-bold">終了年齢</span>: その収入が発生する最終年齢</li>
        <li><span className="font-bold">増加率</span>: 毎年の金額が前年に対して増加する割合（%）</li>
        <li><span className="font-bold">増加額</span>: 毎年の金額が前年から増加する固定金額（万円/年）</li>
        <li><span className="font-bold">上限値</span>: 収入の最大値。計算結果がこの値を超えた場合に制限される（万円/年）</li>
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
        title="法人給与の計算式" 
        bgColor="bg-blue-50" 
        textColor="text-blue-800" 
        borderColor="border-blue-200"
      >
        <FormulaSyntax formula={`【個人側】
役員報酬手取り = 額面 - 給与所得控除 - 社保(雇用保険除く) - 所得税 - 住民税

【法人側】
従業員給与費用 = 役員報酬額面 + 法人負担社保 + 子ども・子育て拠出金 + 労災保険

法人負担社保 = 
  - 年収850万円未満: 額面 × 14.4%
  - 年収850万円以上: 額面 × 7.7%

子ども・子育て拠出金 = 額面 × 0.36%
労災保険料 = 額面 × 0.3%（業種により異なる）`} />
      </FormulaAccordion>

      <FormulaAccordion 
        title="収入増加計算式（割合方式）" 
        bgColor="bg-green-50" 
        textColor="text-green-800" 
        borderColor="border-green-200"
      >
        <FormulaSyntax formula={`n年目の金額 = 初期金額 × (1 + 増加率/100)^(n-1)
上限値制限後 = min(n年目の金額, 上限値)

例: 初期金額400万円、増加率2%、上限値1000万円の場合
1年目: 400万円
2年目: min(400 × (1 + 2/100), 1000) = min(408, 1000) = 408万円
3年目: min(400 × (1 + 2/100)^2, 1000) = min(416.16, 1000) = 416.16万円`} />
      </FormulaAccordion>

      <FormulaAccordion 
        title="収入増加計算式（固定額方式）" 
        bgColor="bg-green-50" 
        textColor="text-green-800" 
        borderColor="border-green-200"
      >
        <FormulaSyntax formula={`n年目の金額 = 初期金額 + 増加額 × (n-1)
上限値制限後 = min(n年目の金額, 上限値)

例: 初期金額400万円、増加額10万円、上限値1000万円の場合
1年目: 400万円
2年目: min(400 + 10, 1000) = min(410, 1000) = 410万円
3年目: min(400 + 10 × 2, 1000) = min(420, 1000) = 420万円`} />
      </FormulaAccordion>
    </div>
  );

  // 給与収入が手取り計算対象かどうか判定する関数
  const isNetIncomeTarget = (itemName: string, item?: any) => {
    // 法人給与の場合は別判定
    if (item?.isCorporateSalary) {
      return true;
    }
    
    return (
      (itemName === '給与収入' && 
       (basicInfo.occupation === 'company_employee' || basicInfo.occupation === 'part_time_with_pension')) ||
      (itemName === '配偶者収入' && basicInfo.spouseInfo?.occupation && 
       (basicInfo.spouseInfo.occupation === 'company_employee' || basicInfo.spouseInfo.occupation === 'part_time_with_pension'))
    );
  };

  // 法人給与設定モーダルを開く
  const openCorporateSalaryModal = (itemId: string) => {
    setCurrentItemId(itemId);
    setCorporateSalaryModalOpen(true);
  };

  // 法人給与設定を適用
  const applyCorporateSalarySettings = (settings: CorporateSalarySettings) => {
    const item = incomeData[currentSection].find(i => i.id === currentItemId);
    if (!item) return;

    // 設定を保存
    setCorporateSalarySettings({
      ...corporateSalarySettings,
      [currentItemId]: settings
    });

    // 手動で変更された年度のみmanualOverrideYearsに追加
    let manualOverrideYears = { ...(item.manualOverrideYears || {}) };
    
    // モーダル内で手動変更された年度のみ手動フラグを立てる
    if (settings.manuallyChangedYears) {
      Object.keys(settings.manuallyChangedYears).forEach(yearStr => {
        const year = parseInt(yearStr);
        if (settings.manuallyChangedYears![year]) {
          manualOverrideYears[year] = true;
        }
      });
    }

    // アイテムに法人給与フラグと設定を追加
    setIncomeData({
      ...incomeData,
      [currentSection]: incomeData[currentSection].map(i => {
        if (i.id === currentItemId) {
          return {
            ...i,
            isCorporateSalary: true,
            corporateSalaryType: settings.corporateSalaryType,
            socialInsuranceByYear: settings.socialInsuranceByYear,
            autoSwitchEnabled: settings.autoSwitchEnabled,
            autoSwitchIncomeIds: settings.autoSwitchIncomeIds,
            manualOverrideYears: manualOverrideYears
          };
        }
        return i;
      })
    });

    setCorporateSalaryModalOpen(false);
    syncCashFlowFromFormData();
  };

  // 自動入力モーダルを開く
  const openAutofillModal = (itemId: string, section: 'personal' | 'corporate') => {
    setCurrentItemId(itemId);
    setCurrentSection(section);
    setAutofillModalOpen(true);
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
      
      // 上限値制限を適用
      if (settings.maxAmount !== undefined && amount > settings.maxAmount) {
        amount = settings.maxAmount;
      }
      
      // 小数点以下を切り捨て
      amount = Math.floor(amount);
      
      // 額面金額を保存
      newOriginalAmounts[year] = amount;
      
      // 給与収入で会社員または厚生年金ありのパートの場合は手取り計算
      if (currentSection === 'personal' && isNetIncomeTarget(item.name, item)) {
        let netResult;
        
        if (item.isCorporateSalary) {
          // 法人給与の場合
          const hasSocialInsurance = item.corporateSalaryType === 'full-time' && 
                                    (item.socialInsuranceByYear?.[year] ?? true);
          netResult = calculateNetIncomeForDirector(amount, hasSocialInsurance);
        } else {
          // 通常の給与収入の場合
          const occupation = item.name === '給与収入' ? basicInfo.occupation : basicInfo.spouseInfo?.occupation;
          netResult = calculateNetIncome(amount, occupation);
        }
        
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
            _originalAmounts: currentSection === 'personal' && isNetIncomeTarget(i.name, i) 
              ? {...(i._originalAmounts || {}), ...newOriginalAmounts}
              : undefined
          };
        }
        return i;
      })
    });
    
    setAutofillModalOpen(false);
    syncCashFlowFromFormData();
  };

  // アイテムを追加
  const addIncomeItem = (section: 'personal' | 'corporate') => {
    const newId = String(Date.now());
    setIncomeData({
      ...incomeData,
      [section]: [
        ...incomeData[section],
        {
          id: newId,
          name: 'その他収入',
          type: 'income',
          category: 'other',
          amounts: {},
          investmentRatio: 0,
          maxInvestmentAmount: 0,
        },
      ],
    });
  };

  // アイテムを削除
  const removeIncomeItem = (section: 'personal' | 'corporate', id: string) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].filter(item => item.id !== id),
    });
    syncCashFlowFromFormData();
  };

  // 項目名を変更
  const handleNameChange = (section: 'personal' | 'corporate', id: string, value: string) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
        item.id === id ? { ...item, name: value } : item
      ),
    });
  };

  // 金額を変更
  const handleAmountChange = (section: 'personal' | 'corporate', id: string, year: number, value: number) => {
    setIncomeData({
      ...incomeData,
      [section]: incomeData[section].map(item =>
        item.id === id
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

  // 金額入力後の処理（手取り計算）
  const handleAmountBlur = (section: 'personal' | 'corporate', id: string, year: number, amount: number) => {
    const item = incomeData[section].find(i => i.id === id);
    if (!item) return;

    // 給与収入で会社員または厚生年金ありのパートの場合は手取り計算
    if (section === 'personal' && isNetIncomeTarget(item.name, item)) {
      let netResult;
      
      if (item.isCorporateSalary) {
        // 法人給与の場合
        const hasSocialInsurance = item.corporateSalaryType === 'full-time' && 
                                  (item.socialInsuranceByYear?.[year] ?? true);
        netResult = calculateNetIncomeForDirector(amount, hasSocialInsurance);
        
        // 手動変更フラグは社保設定を手動で変更した場合のみ立てる
        // 金額入力だけでは手動フラグを立てない
        setIncomeData({
          ...incomeData,
          [section]: incomeData[section].map(i =>
            i.id === id 
              ? { 
                  ...i, 
                  amounts: { ...i.amounts, [year]: netResult.netIncome },
                  _originalAmounts: { ...(i._originalAmounts || {}), [year]: amount }
                }
              : i
          )
        });
      } else {
        // 通常の給与収入の場合
        const occupation = item.name === '給与収入' ? basicInfo.occupation : basicInfo.spouseInfo?.occupation;
        netResult = calculateNetIncome(amount, occupation);
        
        setIncomeData({
          ...incomeData,
          [section]: incomeData[section].map(i =>
            i.id === id 
              ? { 
                  ...i, 
                  amounts: { ...i.amounts, [year]: netResult.netIncome },
                  _originalAmounts: { ...(i._originalAmounts || {}), [year]: amount }
                }
              : i
          )
        });
      }
    }
    
    syncCashFlowFromFormData();
  };

  const handleCategoryChange = (section: 'personal' | 'corporate', id: string, value: string) => {
    // カテゴリーが法人給与に変更された場合、フラグだけ立てる（モーダルは開かない）
    if (value === 'corporate_salary') {
      // デフォルト設定で法人給与フラグを立てる
      setIncomeData({
        ...incomeData,
        [section]: incomeData[section].map(item =>
          item.id === id
            ? {
                ...item,
                category: value,
                isCorporateSalary: true,
                corporateSalaryType: 'full-time', // デフォルトは専業
                socialInsuranceByYear: years.reduce((acc, year) => {
                  acc[year] = true;
                  return acc;
                }, {} as { [year: number]: boolean }),
                autoSwitchEnabled: false,
                autoSwitchIncomeIds: [],
                manualOverrideYears: {}
              }
            : item
        ),
      });
    } else {
      // 法人給与以外が選択された場合はフラグをクリア
      setIncomeData({
        ...incomeData,
        [section]: incomeData[section].map(item =>
          item.id === id
            ? {
                ...item,
                category: value,
                isCorporateSalary: false,
                corporateSalaryType: undefined,
                socialInsuranceByYear: undefined,
                autoSwitchEnabled: undefined,
                autoSwitchIncomeIds: undefined,
                manualOverrideYears: undefined,
              }
            : item
        ),
      });
    }
    syncCashFlowFromFormData();
  };

  const renderIncomeTable = (section: 'personal' | 'corporate') => {
    const items = incomeData[section];
    const title = section === 'personal' ? '個人' : '法人';
    
    // 個人の場合は法人給与カテゴリーを追加
    const categories = section === 'personal' 
      ? [...INCOME_CATEGORIES, { value: 'corporate_salary', label: '法人給与' }]
      : INCOME_CATEGORIES;

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
                {/* 自動入力ボタン列 */}
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px] min-w-[80px]">
                  <div className="flex items-center justify-center">
                    <span>自動入力</span>
                    <TermTooltip term="" width="narrow">
                      {section === 'personal' 
                        ? '個人収入の自動入力設定です。初期金額、終了年齢、増加方式、上限値を設定できます。'
                        : '法人収入の自動入力設定です。初期金額、終了年齢、増加方式、上限値を設定できます。'}
                    </TermTooltip>
                  </div>
                </th>
                {/* 法人給与設定列（個人のみ） */}
                {section === 'personal' && (
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-500 w-[80px] min-w-[80px]">
                    <div className="flex items-center justify-center">
                      <span>法人設定</span>
                      <TermTooltip term="" width="narrow">
                        法人給与の場合、専業/副業の選択と年度ごとの社保設定ができます。副業の場合は自動切り替え機能も利用可能です。
                      </TermTooltip>
                    </div>
                  </th>
                )}
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
                  {/* 法人給与設定ボタン（個人のみ） */}
                  {section === 'personal' && (
                    <td className="px-4 py-2 text-center">
                      {item.isCorporateSalary ? (
                        <button
                          type="button"
                          onClick={() => openCorporateSalaryModal(item.id)}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          <span>{item.corporateSalaryType === 'full-time' ? '専業' : '副業'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {years.map(year => (
                    <td key={year} className="px-4 py-2">
                      <div className="relative">
                        <input
                          type="number"
                          value={item.amounts[year] || ''}
                          onChange={(e) => handleAmountChange(section, item.id, year, Number(e.target.value))}
                          onBlur={(e) => handleAmountBlur(section, item.id, year, Number(e.target.value))}
                          className={`w-full text-right rounded-md border text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            item.isCorporateSalary && item.linkedExpenseId 
                              ? 'border-blue-300 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                          placeholder="0"
                        />
                        {/* 手取り計算対象の場合は額面を表示 */}
                        {section === 'personal' && isNetIncomeTarget(item.name, item) && item._originalAmounts && item._originalAmounts[year] && (
                          <div className="text-xs text-gray-500 mt-1">
                            額面: {item._originalAmounts[year]}万円
                            {item.isCorporateSalary && (
                              <div className="text-xs text-blue-600">
                                {item.corporateSalaryType === 'full-time' 
                                  ? '専業・社保あり'
                                  : item.socialInsuranceByYear?.[year] 
                                    ? '副業・社保あり' 
                                    : '副業・社保なし'}
                                {item.autoSwitchEnabled && item.manualOverrideYears?.[year] && (
                                  <span className="text-orange-600 ml-1">(手動)</span>
                                )}
                                {item.autoSwitchEnabled && !item.manualOverrideYears?.[year] && item.corporateSalaryType === 'part-time' && (
                                  <span className="text-green-600 ml-1">(自動)</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-blue-800 mb-2">収入情報について</h3>
        <p className="text-sm text-blue-700">
          収入を個人・法人別に入力します。給与収入の場合、手取り計算が適用され、実際の可処分所得が表示されます。
          年金収入は、基本情報で設定した職業・年金受給開始年齢などに基づいて自動計算されます。
          投資設定は資産ページの「収入投資」で行えます。
        </p>
      </div>

      {/* 法人給与機能の説明セクション */}
      <div className="bg-indigo-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-indigo-800 mb-2 flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          法人給与機能について
        </h3>
        <p className="text-sm text-indigo-700 mb-2">
          個人収入でカテゴリ「法人給与」を選択すると、自身の法人から受け取る役員報酬として設定できます。
        </p>
        <ul className="text-sm text-indigo-700 list-disc pl-5 space-y-1">
          <li><strong>専業（役員）：</strong>社会保険加入。法人側に社保込みの従業員給与が自動計上</li>
          <li><strong>副業（業務委託等）：</strong>社会保険なし。法人側に給与のみが自動計上</li>
          <li>年度ごとに社保の有無を設定可能（副業から本業への移行に対応）</li>
          <li>役員は雇用保険対象外のため、雇用保険料は計算されません</li>
          <li><strong>自動切り替え機能：</strong>副業選択時、法人給与が指定した収入を上回ると自動で社保ありに切り替え</li>
        </ul>
      </div>

      {/* 自動入力機能の説明セクション */}
      <div className="bg-purple-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-purple-800 mb-2">自動入力機能と上限値設定について</h3>
        <p className="text-sm text-purple-700 mb-2">
          全ての収入項目に自動入力機能があります。初期金額、終了年齢、増加タイプ（増加率または増加額）、<strong>上限値</strong>を設定すると、
          金額を終了年齢まで自動的に計算します。上限値を設定することで、売上目標を超えないように制限できます。
          計算後も各年の値は個別に編集可能です。
          給与収入の場合は、会社員・公務員（または厚生年金あり）は引き続き手取り金額に自動変換されます。
        </p>
      </div>

      {/* 手取り計算の説明セクション */}
      <div className="bg-green-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-green-800 mb-2">手取り計算について</h3>
        <p className="text-sm text-green-700 mb-2">
          会社員・公務員（または厚生年金あり）の給与収入は、入力後自動的に手取り金額に変換されます。
          元の額面金額は保存され、年金計算などに使用されます。
        </p>
        <p className="text-sm text-green-700 mb-2">手取り計算は以下のような流れで行われます：</p>
        <ol className="list-decimal pl-4 text-sm text-green-700 space-y-1">
          <li>額面給与から給与所得控除を差し引く</li>
          <li>社会保険料（健康保険・厚生年金等）を差し引く</li>
          <li>所得税（累進課税率）を差し引く</li>
          <li>住民税（一律10%）を差し引く</li>
        </ol>
      </div>

      {/* 年金自動計算についての説明セクション */}
      <div className="bg-amber-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-amber-800 mb-2">年金自動計算について</h3>
        <p className="text-sm text-amber-700 mb-2">
          年金収入は、基本情報で設定した職業・就職開始年齢・年金受給開始年齢・在職老齢年金制度などの設定と、
          給与収入の履歴に基づいて自動的に計算されます。
        </p>
        <p className="text-sm text-amber-700 mb-2">年金の計算に含まれる要素：</p>
        <ul className="list-disc pl-4 text-sm text-amber-700 space-y-1">
          <li>国民年金（基礎年金）: 全ての方が対象</li>
          <li>厚生年金: 会社員・公務員の方が対象</li>
          <li>繰上げ・繰下げ受給による調整</li>
          <li>在職老齢年金制度による調整（年金受給中の就労収入がある場合）</li>
        </ul>
      </div>
      
      {renderIncomeTable('personal')}
      {renderIncomeTable('corporate')}

      <div className="bg-yellow-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-yellow-800 mb-2">収入からの投資について</h3>
        <p className="text-sm text-yellow-700 mb-2">
          収入の一部を投資に回したい場合は、資産ページで「収入投資」を追加してください。
          収入投資では、選択した収入項目から自動的に一定割合を投資に回し、設定した運用利回りで複利運用できます。
        </p>
      </div>

      <div className="flex justify-between">
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
        itemName={
          incomeData[currentSection].find(i => i.id === currentItemId)?.name || '収入'
        }
        currentAge={basicInfo.currentAge}
        isGivenSalary={
          incomeData[currentSection].find(i => i.id === currentItemId)?.name === '給与収入' ||
          incomeData[currentSection].find(i => i.id === currentItemId)?.name === '配偶者収入' ||
          incomeData[currentSection].find(i => i.id === currentItemId)?.isCorporateSalary
        }
      />

      {/* 法人給与設定モーダル */}
      <CorporateSalaryModal
        isOpen={corporateSalaryModalOpen}
        onClose={() => setCorporateSalaryModalOpen(false)}
        onApply={applyCorporateSalarySettings}
        years={years}
        currentSettings={(() => {
          const item = incomeData[currentSection].find(i => i.id === currentItemId);
          if (item?.isCorporateSalary) {
            return {
              corporateSalaryType: item.corporateSalaryType || 'full-time',
              socialInsuranceByYear: item.socialInsuranceByYear || {},
              autoSwitchEnabled: item.autoSwitchEnabled || false,
              autoSwitchIncomeIds: item.autoSwitchIncomeIds || []
            };
          }
          return undefined;
        })()}
        itemName={
          incomeData[currentSection].find(i => i.id === currentItemId)?.name || '法人給与'
        }
      />

      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: termsContent },
          { id: 'formulas', label: '計算式', content: formulasContent }
        ]} 
      />
    </div>
  );
}

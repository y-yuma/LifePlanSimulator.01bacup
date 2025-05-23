import React, { useEffect } from 'react';
import { useSimulatorStore } from './store/simulator';
import { Progress } from './components/ui/progress';
import { BasicInfoForm } from './components/BasicInfoForm';
import { IncomeForm } from './components/IncomeForm';
import { ExpenseForm } from './components/ExpenseForm';
import { LifeEventForm } from './components/LifeEventForm';
import { AssetsLiabilitiesForm } from './components/AssetsLiabilitiesForm';
import { CashFlowForm } from './components/CashFlowForm';
import { SimulationResults } from './components/SimulationResults';
import { GuidePage } from './components/GuidePage';
import { HelpProvider } from './context/HelpContext';

const STEPS = [
  'はじめに',
  '基本情報',
  '収入',
  '経費',
  '資産・負債',
  'ライフイベント',
  'キャッシュフロー',
  'シミュレーション結果'
];

function App() {
  const { currentStep } = useSimulatorStore();
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // currentStepが変更されたときに画面の一番上にスクロールする
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <GuidePage />;
      case 1:
        return <BasicInfoForm />;
      case 2:
        return <IncomeForm />;
      case 3:
        return <ExpenseForm />;
      case 4:
        return <AssetsLiabilitiesForm />;
      case 5:
        return <LifeEventForm />;
      case 6:
        return <CashFlowForm />;
      case 7:
        return <SimulationResults />;
      default:
        return <GuidePage />;
    }
  };

  // 最初のステップ（ガイドページ）ではプログレスバーを表示しない
  const showProgress = currentStep > 0;

  return (
    <HelpProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">ライフプランシミュレーター</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {showProgress && (
            <div className="mb-8">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-2">
                {STEPS.map((step, index) => (
                  <div
                    key={step}
                    className={`text-sm ${
                      index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {index}. {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg p-6">
            {renderStep()}
          </div>
        </main>
      </div>
    </HelpProvider>
  );
}

export default App;
import React, { useEffect, useState } from 'react';
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

// 共有レポート表示コンポーネント
function SharedReportViewer({ encodedData }: { encodedData: string }) {
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      console.log('デコード開始, データ長:', encodedData.length);
      
      // データ長チェック
      if (encodedData.length > 2000000) { // 2MB制限
        throw new Error('データが大きすぎます');
      }
      
      // Base64文字の妥当性チェック
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encodedData)) {
        console.error('無効なBase64文字が含まれています');
        throw new Error('URLが破損しています');
      }
      
      // Base64デコード（シンプルで確実な方法）
      let decodedHtml;
      try {
        console.log('標準的なデコード開始');
        
        // 最もシンプルで確実な方法
        const binaryString = atob(encodedData);
        console.log('atob成功, バイナリ長:', binaryString.length);
        
        // UTF-8デコード
        decodedHtml = decodeURIComponent(escape(binaryString));
        console.log('decodeURIComponent成功, HTML長:', decodedHtml.length);
        
      } catch (decodeError) {
        console.error('標準デコードエラー:', decodeError);
        
        // フォールバック: 代替方法
        try {
          console.log('フォールバック方法を試行');
          const binaryString = atob(encodedData);
          
          // TextDecoderを使用した方法
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decoder = new TextDecoder('utf-8');
          decodedHtml = decoder.decode(bytes);
          console.log('TextDecoder成功, HTML長:', decodedHtml.length);
          
        } catch (fallbackError) {
          console.error('フォールバックデコードエラー:', fallbackError);
          throw new Error('データのデコードに失敗しました');
        }
      }
      
      // HTMLの妥当性チェック
      if (!decodedHtml || decodedHtml.length < 100) {
        throw new Error('デコードされたデータが無効です');
      }
      
      console.log('デコード完全成功');
      setReportHtml(decodedHtml);
      setIsLoading(false);
      
    } catch (err) {
      console.error('共有データのデコードに失敗:', err);
      console.error('エンコードデータ（最初の100文字）:', encodedData.substring(0, 100));
      console.error('エンコードデータ（最後の100文字）:', encodedData.substring(encodedData.length - 100));
      
      let errorMessage = '共有データの読み込みに失敗しました。';
      
      if (err.message.includes('大きすぎます')) {
        errorMessage += '\nデータサイズが制限を超えています。';
      } else if (err.message.includes('破損')) {
        errorMessage += '\nURLが破損している可能性があります。';
      } else if (err.message.includes('無効')) {
        errorMessage += '\nデータ形式が正しくありません。';
      } else {
        errorMessage += `\nエラー詳細: ${err.message}`;
      }
      
      errorMessage += `\nデータ長: ${encodedData.length}文字`;
      
      // デバッグ情報を追加
      errorMessage += '\n\nデバッグ情報:';
      errorMessage += `\n- データ開始: ${encodedData.substring(0, 50)}...`;
      errorMessage += `\n- データ終了: ...${encodedData.substring(encodedData.length - 50)}`;
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [encodedData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">共有レポートを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-6">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // 共有レポートを直接表示（ナビゲーションバーなし）
  return (
    <div 
      className="w-full h-full min-h-screen"
      dangerouslySetInnerHTML={{ __html: reportHtml }}
    />
  );
}

function App() {
  const { currentStep } = useSimulatorStore();
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const [sharedData, setSharedData] = useState<string | null>(null);

  // URLハッシュを監視して共有データを検出
  useEffect(() => {
    const checkForSharedData = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share=')) {
        const encodedData = hash.substring(7); // '#share='の部分を除去
        setSharedData(encodedData);
      } else {
        setSharedData(null);
      }
    };

    // 初回チェック
    checkForSharedData();

    // ハッシュ変更を監視
    const handleHashChange = () => {
      checkForSharedData();
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // currentStepが変更されたときに画面の一番上にスクロールする
  useEffect(() => {
    if (!sharedData) {
      window.scrollTo(0, 0);
    }
  }, [currentStep, sharedData]);

  // 共有データがある場合は共有レポートを表示
  if (sharedData) {
    return <SharedReportViewer encodedData={sharedData} />;
  }

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

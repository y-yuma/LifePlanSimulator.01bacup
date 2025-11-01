import React, { useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { simulationResultsTermsContent, simulationResultsFormulasContent } from '@/utils/helpContent';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function SimulationResults() {
  const store = useSimulatorStore();
  const { 
    basicInfo, 
    cashFlow,
    parameters,
    incomeData,
    expenseData,
    lifeEvents,
    assetData,
    liabilityData,
    setCurrentStep,
    initializeCashFlow 
  } = store;
  
  // チャートの参照を保存するためのref
  const personalChartRef = useRef<any>(null);
  const corporateChartRef = useRef<any>(null);
  
  // 共有URL生成の状態管理
  const [shareUrlStatus, setShareUrlStatus] = useState<'idle' | 'generating' | 'copied' | 'error'>('idle');
  
  // 結果表示前に最新のデータでキャッシュフローを同期
  useEffect(() => {
    initializeCashFlow();
  }, []);
  
  const years = Array.from(
    { length: basicInfo.deathAge - basicInfo.currentAge + 1 },
    (_, i) => basicInfo.startYear + i
  );

  // ライフイベント取得関数（結婚、子供の誕生、その他すべてのイベントを含む）
  const getLifeEventDescription = (
    year: number,
    basicInfo: any,
    lifeEvents: any[],
    source: 'personal' | 'corporate' | 'personal_investment' | 'corporate_investment' = 'personal'
  ): string => {
    const events: string[] = [];
    
    // 個人イベントの場合は結婚と子供の誕生も含める
    if (source === 'personal') {
      // 結婚イベント
      if (basicInfo.maritalStatus === 'planning' && basicInfo.spouseInfo?.marriageAge) {
        const marriageYear = basicInfo.startYear + (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
        if (year === marriageYear) {
          events.push('結婚');
        }
      }

      // 既存の子供の誕生イベント
      if (basicInfo.children) {
        basicInfo.children.forEach((child: any, index: number) => {
          const birthYear = basicInfo.startYear - child.currentAge;
          if (year === birthYear) {
            events.push(`第${index + 1}子誕生`);
          }
        });
      }

      // 予定されている子供の誕生イベント
      if (basicInfo.plannedChildren) {
        basicInfo.plannedChildren.forEach((child: any, index: number) => {
          const birthYear = basicInfo.startYear + child.yearsFromNow;
          if (year === birthYear) {
            events.push(`第${(basicInfo.children?.length || 0) + index + 1}子誕生`);
          }
        });
      }
    }

    // ライフイベントデータからイベントを取得
    if (lifeEvents) {
      const yearEvents = lifeEvents.filter(event => event.year === year && event.source === source);
      yearEvents.forEach(event => {
        const amountStr = event.amount !== undefined ? 
          `（${event.type === 'income' ? '+' : ''}${event.amount}万円）` : '';
        events.push(`${event.description}${amountStr}`);
      });
    }
    
    return events.join('、');
  };

  // 年齢計算関数
  const calculateAge = (startYear: number, currentAge: number, targetYear: number) => {
    return currentAge + (targetYear - startYear);
  };

  // グラフ用オプション（共通）
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + '万円';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return value + '万円';
          }
        }
      },
      x: {
        ticks: {
          maxRotation: 0,
          callback: function(value: any, index: number) {
            const year = years[index];
            const age = basicInfo.currentAge + (year - basicInfo.startYear);
            return `${year}年\n${age}歳`;
          }
        }
      }
    }
  };

  // 個人キャッシュフロー - 要求に合わせた表示項目
  const personalData = {
    labels: years,
    datasets: [
      {
        label: '総収入',
        data: years.map(year => {
          const cf = cashFlow[year] || {};
          let personalIncome = 0;
          if (cf.mainIncome) personalIncome += cf.mainIncome;
          if (cf.sideIncome) personalIncome += cf.sideIncome;
          if (cf.spouseIncome) personalIncome += cf.spouseIncome;
          if (cf.pensionIncome) personalIncome += cf.pensionIncome;
          if (cf.spousePensionIncome) personalIncome += cf.spousePensionIncome;
          if (cf.investmentIncome) personalIncome += cf.investmentIncome;
          
          // 追加の個人収入
          incomeData.personal.forEach(item => {
            const basicIncomeTypes = ['給与収入', '副業収入', '配偶者収入', '年金収入', '配偶者年金収入', '運用収益'];
            if (!basicIncomeTypes.includes(item.name)) {
              personalIncome += item.amounts[year] || 0;
            }
          });
          
          return personalIncome;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: '生活費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.livingExpense || 0 : 0;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: '住居費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.housingExpense || 0 : 0;
        }),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
      {
        label: '教育費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.educationExpense || 0 : 0;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'その他支出',
        data: years.map(year => {
          const cf = cashFlow[year];
          let otherExpenses = cf ? (cf.otherExpense || 0) : 0;
          if (cf && cf.loanRepayment) {
            otherExpenses += cf.loanRepayment;
          }
          expenseData.personal.forEach(item => {
            const basicExpenseTypes = ['生活費', '住居費', '教育費'];
            if (!basicExpenseTypes.includes(item.name) && item.name !== 'その他') {
              otherExpenses += item.amounts[year] || 0;
            }
          });
          return otherExpenses;
        }),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
      },
      {
        label: '純資産',
        data: years.map(year => {
          const cf = cashFlow[year];
          let personalLiabilityTotal = 0;
          store.liabilityData.personal.forEach(liability => {
            personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
          });
          const personalNetAssets = cf ? 
            (cf.personalNetAssets || (cf.personalTotalAssets - personalLiabilityTotal)) : 0;
          return personalNetAssets;
        }),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      }
    ],
  };

  // 法人キャッシュフロー - 要求に合わせた表示項目
  const corporateData = {
    labels: years,
    datasets: [
      {
        label: '売上',
        data: years.map(year => {
          // 法人の全ての収入項目を合計
          let totalIncome = 0;
          incomeData.corporate.forEach(item => {
            totalIncome += item.amounts[year] || 0;
          });
          return totalIncome;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: '経費',
        data: years.map(year => {
          // 法人の全ての支出項目を合計
          let totalExpense = 0;
          expenseData.corporate.forEach(item => {
            totalExpense += item.amounts[year] || 0;
          });
          return totalExpense;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: '総資産',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.corporateTotalAssets : 0;
        }),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
      {
        label: '総負債',
        data: years.map(year => {
          const cf = cashFlow[year];
          // 法人の負債総額を計算
          let totalLiability = 0;
          
          // store内の負債データを使用
          store.liabilityData.corporate.forEach(liability => {
            totalLiability += Math.abs(liability.amounts[year] || 0);
          });
          
          // cashFlowにある場合はそれを使用
          if (cf && cf.corporateLiabilityTotal !== undefined) {
            return cf.corporateLiabilityTotal;
          }
          
          return totalLiability;
        }),
        borderColor: 'rgb(255, 99, 71)',
        backgroundColor: 'rgba(255, 99, 71, 0.5)',
      },
      {
        label: '純資産',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? (cf.corporateNetAssets || (cf.corporateTotalAssets - (cf.corporateLiabilityTotal || 0))) : 0;
        }),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      }
    ],
  };

  // 設定条件のサマリーを生成する関数
  const getConditionSummary = () => {
    const mainIncome = incomeData.personal.find(item => item.name === '給与収入')?.amounts[basicInfo.startYear] || 0;
    const conditions = [
      `開始年齢: ${basicInfo.currentAge}歳`,
      `職業: ${basicInfo.occupation === 'company_employee' ? 
        '会社員・公務員' : 
        basicInfo.occupation === 'self_employed' ? '自営業・フリーランス' :
        basicInfo.occupation === 'part_time_with_pension' ? 'パート（厚生年金あり）' :
        basicInfo.occupation === 'part_time_without_pension' ? 'パート（厚生年金なし）' :
        '専業主婦・夫'}`,
      `年収${mainIncome}万円`,
      `配偶者の有無：${basicInfo.maritalStatus !== 'single' ? 'あり' : 'なし'}`,
      `結婚の予定：${basicInfo.maritalStatus === 'planning' ? 'あり' : 'なし'}`,
      `子どもの有無：${basicInfo.children.length > 0 ? 'あり' : 'なし'}`,
      `子どもを持つ予定：${basicInfo.plannedChildren.length > 0 ? 'あり' : 'なし'}`,
      `生活費：${basicInfo.monthlyLivingExpense}万円/月`,
      `インフレ率：${parameters.inflationRate}%`,
      `資産運用利回り：${parameters.investmentReturn}%`,
    ];

    return conditions.join(' | ');
  };

  // 全体データのエクスポート機能
  const handleExportAllData = () => {
    const data = {
      basicInfo: store.basicInfo,
      incomeData: store.incomeData,
      expenseData: store.expenseData,
      assetData: store.assetData,
      liabilityData: store.liabilityData,
      lifeEvents: store.lifeEvents,
      parameters: store.parameters,
      cashFlow: store.cashFlow,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ライフプランデータ_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // 共有URL生成機能（データサイズ最適化版）
  const handleGenerateShareUrl = async () => {
    setShareUrlStatus('generating');

    try {
      // HTMLコンテンツを生成
      console.log('[共有URL] HTML生成開始');
      const htmlContent = generateShareableHTML();
      
      console.log('[共有URL] 生成されたHTMLサイズ:', htmlContent.length, '文字');
      console.log('[共有URL] HTMLに表が含まれているか:', htmlContent.includes('詳細キャッシュフロー表'));
      console.log('[共有URL] 個人キャッシュフロー詳細:', htmlContent.includes('個人キャッシュフロー詳細'));
      console.log('[共有URL] 法人キャッシュフロー詳細:', htmlContent.includes('法人キャッシュフロー詳細'));
      
      // データサイズチェック（制限を1MBに拡大）
      if (htmlContent.length > 1000000) { // 1MB制限
        throw new Error('生成されるデータが大きすぎます（1MB超過）。年数を短縮するか、項目を減らしてください。');
      }
      
      // HTMLをBase64エンコード（シンプルで確実な方法）
      let encodedData;
      try {
        // 最もシンプルで確実な方法
        encodedData = btoa(unescape(encodeURIComponent(htmlContent)));
        console.log('[共有URL] エンコード成功, サイズ:', encodedData.length, '文字');
        
      } catch (encodeError) {
        console.error('[共有URL] エンコードエラー:', encodeError);
        throw new Error('データのエンコードに失敗しました。データが大きすぎる可能性があります。');
      }
      
      // 現在のURLのベース部分を取得
      const baseUrl = window.location.origin + window.location.pathname;
      
      // 共有URLを生成
      const shareUrl = `${baseUrl}#share=${encodedData}`;
      
      console.log('[共有URL] 最終URL長:', shareUrl.length, '文字');
      
      // URL長チェック（実用的な制限）
      if (shareUrl.length > 2000000) { // 2MB制限
        throw new Error('生成されたURLが長すぎます（2MB超過）。データ量を減らしてください。');
      }
      
      // クリップボードにコピー
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareUrlStatus('copied');
        console.log('[共有URL] URLをクリップボードにコピーしました');
      } catch (clipboardError) {
        console.error('[共有URL] クリップボードコピーエラー:', clipboardError);
        // フォールバック: 手動コピー用のプロンプト
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShareUrlStatus('copied');
        console.log('[共有URL] フォールバック方式でコピーしました');
      }
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        setShareUrlStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('[共有URL] 共有URL生成エラー:', error);
      setShareUrlStatus('error');
      
      // エラーメッセージを表示
      alert(`共有URL生成エラー: ${error.message}`);
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        setShareUrlStatus('idle');
      }, 3000);
    }
  };

  // キャッシュフローページと同じ詳細テーブルを生成（完全版 - すべての項目を表示）
  const generateDetailedCashFlowTable = () => {
    console.log('[テーブル生成] 開始');
    console.log('[テーブル生成] 年数:', years.length);
    console.log('[テーブル生成] 個人収入項目数:', incomeData.personal.length);
    console.log('[テーブル生成] 個人支出項目数:', expenseData.personal.length);
    console.log('[テーブル生成] 法人収入項目数:', incomeData.corporate.length);
    console.log('[テーブル生成] 法人支出項目数:', expenseData.corporate.length);
    
    // 値のフォーマット（0は'-'で表示）
    const formatValue = (value: number) => {
      const rounded = Math.round(value || 0);
      return rounded === 0 ? '-' : `${rounded.toLocaleString()}万円`;
    };

    // イベントテキストのフォーマット
    const formatEvent = (eventText: string) => {
      return eventText || '-';
    };

    const tableHtml = `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1f2937;">個人キャッシュフロー詳細</h3>
        <div style="background-color: #dbeafe; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #1e40af;">
          ※ 手取り計算・インフレ率・ローン自動計算適用済み
        </div>
        <div style="overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 800px;">
            <thead style="background-color: #f9fafb;">
              <tr>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; position: sticky; left: 0; background-color: #f9fafb; min-width: 180px; z-index: 10; font-weight: bold;">項目</th>
                ${years.map(year => `<th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; min-width: 90px; font-weight: bold;">${year}年</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <!-- 年齢行 -->
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; font-weight: bold; z-index: 5;">年齢</td>
                ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold;">${calculateAge(basicInfo.startYear, basicInfo.currentAge, year)}歳</td>`).join('')}
              </tr>
              
              <!-- 個人イベント行 -->
              <tr style="background-color: #fef3c7;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #fef3c7; font-weight: bold; z-index: 5;">個人イベント</td>
                ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; color: #92400e; background-color: #fef3c7;">${formatEvent(getLifeEventDescription(year, basicInfo, lifeEvents, 'personal'))}</td>`).join('')}
              </tr>
              
              <!-- 個人運用資産イベント行 -->
              <tr style="background-color: #fef3c7;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #fef3c7; font-weight: bold; z-index: 5;">個人運用資産イベント</td>
                ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; color: #92400e; background-color: #fef3c7;">${formatEvent(getLifeEventDescription(year, basicInfo, lifeEvents, 'personal_investment'))}</td>`).join('')}
              </tr>
              
              <!-- 収入セクションヘッダー -->
              <tr style="background-color: #dbeafe;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #1e40af; font-size: 14px;">【収入】</td>
              </tr>
              
              <!-- すべての個人収入項目 -->
              ${incomeData.personal.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 支出セクションヘッダー -->
              <tr style="background-color: #fee2e2;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #991b1b; font-size: 14px;">【支出】</td>
              </tr>
              
              <!-- すべての個人支出項目 -->
              ${expenseData.personal.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- ローン返済項目 -->
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">ローン返済</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const loanRepayment = cf ? cf.loanRepayment || 0 : 0;
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(loanRepayment)}</td>`;
                }).join('')}
              </tr>
              
              <!-- 資産セクションヘッダー -->
              <tr style="background-color: #d1fae5;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #065f46; font-size: 14px;">【資産】</td>
              </tr>
              
              <!-- すべての個人資産項目 -->
              ${assetData.personal.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 負債セクションヘッダー -->
              <tr style="background-color: #fee2e2;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #991b1b; font-size: 14px;">【負債】</td>
              </tr>
              
              <!-- すべての個人負債項目 -->
              ${liabilityData.personal.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: #dc2626;">${formatValue(Math.abs(item.amounts[year] || 0))}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 計算結果行（グレー背景） -->
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">収支</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const balance = cf ? cf.personalBalance || 0 : 0;
                  const color = balance >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(balance)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">総資産</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const assets = cf ? cf.personalTotalAssets || 0 : 0;
                  const color = assets >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(assets)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">負債総額</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const liabilityTotal = cf ? cf.personalLiabilityTotal || 0 : 0;
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">${formatValue(liabilityTotal)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">純資産</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const netAssets = cf ? cf.personalNetAssets || 0 : 0;
                  const color = netAssets >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(netAssets)}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1f2937;">法人キャッシュフロー詳細</h3>
        <div style="background-color: #dbeafe; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #1e40af;">
          ※ インフレ率・ローン自動計算・法人税計算適用済み
        </div>
        <div style="overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 800px;">
            <thead style="background-color: #f9fafb;">
              <tr>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; position: sticky; left: 0; background-color: #f9fafb; min-width: 180px; z-index: 10; font-weight: bold;">項目</th>
                ${years.map(year => `<th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; min-width: 90px; font-weight: bold;">${year}年</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <!-- 法人イベント行 -->
              <tr style="background-color: #fef3c7;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #fef3c7; font-weight: bold; z-index: 5;">法人イベント</td>
                ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; color: #92400e; background-color: #fef3c7;">${formatEvent(getLifeEventDescription(year, basicInfo, lifeEvents, 'corporate'))}</td>`).join('')}
              </tr>
              
              <!-- 法人運用資産イベント行 -->
              <tr style="background-color: #fef3c7;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #fef3c7; font-weight: bold; z-index: 5;">法人運用資産イベント</td>
                ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10px; color: #92400e; background-color: #fef3c7;">${formatEvent(getLifeEventDescription(year, basicInfo, lifeEvents, 'corporate_investment'))}</td>`).join('')}
              </tr>
              
              <!-- 収入セクションヘッダー -->
              <tr style="background-color: #dbeafe;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #1e40af; font-size: 14px;">【収入】</td>
              </tr>
              
              <!-- すべての法人収入項目 -->
              ${incomeData.corporate.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 支出セクションヘッダー -->
              <tr style="background-color: #fee2e2;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #991b1b; font-size: 14px;">【支出】</td>
              </tr>
              
              <!-- すべての法人支出項目 -->
              ${expenseData.corporate.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 法人ローン返済項目 -->
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">法人ローン返済</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const loanRepayment = cf ? cf.corporateLoanRepayment || 0 : 0;
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(loanRepayment)}</td>`;
                }).join('')}
              </tr>
              
              <!-- 資産セクションヘッダー -->
              <tr style="background-color: #d1fae5;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #065f46; font-size: 14px;">【資産】</td>
              </tr>
              
              <!-- すべての法人資産項目 -->
              ${assetData.corporate.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${formatValue(item.amounts[year])}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 負債セクションヘッダー -->
              <tr style="background-color: #fee2e2;">
                <td colspan="${years.length + 1}" style="border: 1px solid #e5e7eb; padding: 8px; font-weight: bold; color: #991b1b; font-size: 14px;">【負債】</td>
              </tr>
              
              <!-- すべての法人負債項目 -->
              ${liabilityData.corporate.map(item => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: white; z-index: 5;">${item.name}</td>
                  ${years.map(year => `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: #dc2626;">${formatValue(Math.abs(item.amounts[year] || 0))}</td>`).join('')}
                </tr>
              `).join('')}
              
              <!-- 計算結果行（グレー背景） -->
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">収支</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const balance = cf ? cf.corporateBalance || 0 : 0;
                  const color = balance >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(balance)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">総資産</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const assets = cf ? cf.corporateTotalAssets || 0 : 0;
                  const color = assets >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(assets)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">負債総額</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const liabilityTotal = cf ? cf.corporateLiabilityTotal || 0 : 0;
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: #dc2626; font-weight: bold;">${formatValue(liabilityTotal)}</td>`;
                }).join('')}
              </tr>
              
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="border: 1px solid #e5e7eb; padding: 8px; position: sticky; left: 0; background-color: #f3f4f6; z-index: 5; font-weight: bold;">純資産</td>
                ${years.map(year => {
                  const cf = cashFlow[year];
                  const netAssets = cf ? cf.corporateNetAssets || 0 : 0;
                  const color = netAssets >= 0 ? '#059669' : '#dc2626';
                  return `<td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; color: ${color}; font-weight: bold;">${formatValue(netAssets)}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    console.log('[テーブル生成] 完了、HTML長:', tableHtml.length, '文字');
    return tableHtml;
  };

  // 共有用HTML生成関数（グラフ画像埋め込み版）
  const generateShareableHTML = () => {
    console.log('[HTML生成] 開始');
    
    // チャートから画像データを取得
    const getChartImageData = (chartRef: any, fallbackText: string) => {
      try {
        if (chartRef.current && chartRef.current.canvas) {
          const canvas = chartRef.current.canvas;
          const imageData = canvas.toDataURL('image/png', 0.8); // 品質80%で軽量化
          console.log('[HTML生成] チャート画像取得成功:', imageData.substring(0, 50) + '...');
          return imageData;
        } else {
          console.warn('[HTML生成] チャート参照が無効:', chartRef.current);
          return null;
        }
      } catch (error) {
        console.error('[HTML生成] チャート画像取得エラー:', error);
        return null;
      }
    };

    // 個人・法人グラフの画像データを取得
    const personalChartImage = getChartImageData(personalChartRef, '個人キャッシュフローグラフ');
    const corporateChartImage = getChartImageData(corporateChartRef, '法人キャッシュフローグラフ');

    console.log('[HTML生成] 個人グラフ画像:', personalChartImage ? '取得成功' : '取得失敗');
    console.log('[HTML生成] 法人グラフ画像:', corporateChartImage ? '取得成功' : '取得失敗');

    // キャッシュフロー表を生成
    const cashFlowTableHtml = generateDetailedCashFlowTable();
    console.log('[HTML生成] キャッシュフロー表HTML長:', cashFlowTableHtml.length, '文字');

    // 完全なHTMLドキュメントを生成
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ライフプランシミュレーション結果</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
            color: #374151;
            line-height: 1.6;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 14px;
            color: #6b7280;
          }
          .conditions {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
          }
          .conditions-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            color: #374151;
          }
          .conditions-text {
            font-size: 14px;
            color: #6b7280;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            margin: 30px 0 20px 0;
            color: #1f2937;
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
          }
          .chart-container {
            margin: 20px 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
          }
          .chart-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .chart-fallback {
            padding: 40px;
            background-color: #f9fafb;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            color: #6b7280;
            font-style: italic;
          }
          .table-note {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 15px;
            font-style: italic;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
          @media print {
            .page-break {
              page-break-before: always;
            }
          }
          @media (max-width: 768px) {
            body {
              padding: 10px;
            }
            .container {
              padding: 15px;
            }
            .title {
              font-size: 24px;
            }
            .chart-container {
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">ライフプランシミュレーション結果</h1>
            <p class="subtitle">生成日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>

          <div class="conditions">
            <div class="conditions-title">設定条件</div>
            <div class="conditions-text">${getConditionSummary()}</div>
          </div>

          <div class="section-title">個人キャッシュフロー推移</div>
          <div class="chart-container">
            ${personalChartImage ? 
              `<img src="${personalChartImage}" alt="個人キャッシュフローグラフ" class="chart-image">` :
              `<div class="chart-fallback">
                <p>個人キャッシュフローグラフ</p>
                <p>グラフの生成に失敗しました。詳細データは下記の表をご確認ください。</p>
              </div>`
            }
          </div>

          <div class="section-title">法人キャッシュフロー推移</div>
          <div class="chart-container">
            ${corporateChartImage ? 
              `<img src="${corporateChartImage}" alt="法人キャッシュフローグラフ" class="chart-image">` :
              `<div class="chart-fallback">
                <p>法人キャッシュフローグラフ</p>
                <p>グラフの生成に失敗しました。詳細データは下記の表をご確認ください。</p>
              </div>`
            }
          </div>

          <div class="page-break"></div>

          <div class="section-title">詳細キャッシュフロー表</div>
          <div class="table-note">※ 金額の単位：万円　※ 横スクロールで全項目を確認できます</div>
          ${cashFlowTableHtml}
        
          <div class="footer">
            <p>このレポートはライフプランシミュレーターで自動生成されました。</p>
            <p>共有用URL生成機能（グラフ画像埋め込み版）を使用して作成されています。</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    console.log('[HTML生成] 完了、全体HTML長:', fullHtml.length, '文字');
    return fullHtml;
  };

  // PDF エクスポート機能（印刷向け）
  const handleExportPDF = () => {
    // 印刷用HTMLを生成
    const printHTML = generateShareableHTML().replace(
      '<div class="footer">',
      '<div class="page-break"></div><div class="footer">'
    );

    // 新しいウィンドウを開いて印刷
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      // 画像の読み込みを待ってから印刷
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
    }
  };

  // HTML エクスポート機能
  const handleExportHTML = () => {
    // 共有用HTMLと同じ内容を生成
    const htmlContent = generateShareableHTML();

    // HTMLファイルの保存
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ライフプラン_レポート_${new Date().toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBack = () => {
    setCurrentStep(6);
  };

  // ボタンのテキストを状態に応じて変更
  const getShareButtonText = () => {
    switch (shareUrlStatus) {
      case 'generating': return '生成中...';
      case 'copied': return 'URLをコピーしました！';
      case 'error': return 'エラーが発生しました';
      default: return '共有URLを生成';
    }
  };

  // ボタンの色を状態に応じて変更
  const getShareButtonClass = () => {
    switch (shareUrlStatus) {
      case 'generating': return 'px-6 py-2 bg-gray-500 text-white rounded-md cursor-not-allowed';
      case 'copied': return 'px-6 py-2 bg-green-500 text-white rounded-md';
      case 'error': return 'px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600';
      default: return 'px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center gap-2';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">
        シミュレーション結果
       </h2>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium mb-2">
          設定条件
          <TermTooltip term="" width="narrow">
            シミュレーションで使用した主な設定条件のサマリーです。
          </TermTooltip>
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          {getConditionSummary()}
        </p>
      </div>

      <div className="space-y-8">
        {/* 個人のグラフ */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            個人キャッシュフロー
            <TermTooltip term="" width="medium">
              個人の財務状況を表示します。総収入（給与・副業・配偶者収入・年金など）、生活費、住居費、教育費、その他支出（ローン返済を含む生活費・住居費・教育費以外の支出）、純資産（総資産-総負債）を表示しています。
            </TermTooltip>
          </h3>
          <div className="h-[50vh] md:h-[60vh]">
            <Line 
              ref={personalChartRef}
              options={{...options, plugins: {...options.plugins,
                title: {
                  display: true,
                  text: '個人キャッシュフロー推移',
                  font: {
                    size: window.innerWidth < 768 ? 14 : 16,
                  },
                },
              }}} 
              data={personalData} 
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            <p>※ 総収入：給与、副業、配偶者収入、年金、運用収益など全ての収入の合計</p>
            <p>※ 生活費：食費、日用品、光熱費など基本的な生活に必要な支出</p>
            <p>※ 住居費：家賃、住宅ローン、管理費など住居に関する支出</p>
            <p>※ 教育費：学費、塾代、習い事など教育に関する支出</p>
            <p>※ その他支出：ローン返済を含む上記以外の支出</p>
            <p>※ 純資産：総資産から負債を差し引いた実質的な自己資産</p>
          </div>
        </div>

        {/* 法人のグラフ */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            法人キャッシュフロー
            <TermTooltip term="" width="medium">
              法人（企業・事業）の収入、支出、資産の推移を表示します。売上、経費、資産の変化などが含まれます。
            </TermTooltip>
          </h3>
          <div className="h-[50vh] md:h-[60vh]">
            <Line 
              ref={corporateChartRef}
              options={{...options, plugins: {...options.plugins,
                title: {
                  display: true,
                  text: '法人キャッシュフロー推移',
                  font: {
                    size: window.innerWidth < 768 ? 14 : 16,
                  },
                },
              }}} 
              data={corporateData} 
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            <p>※ 売上：法人の全ての収入の合計</p>
            <p>※ 経費：法人の全ての支出の合計</p>
            <p>※ 純資産：総資産から負債を差し引いた実質的な自己資産</p>
          </div>
        </div>
      </div>

      {/* エクスポートボタン */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">エクスポート</h3>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExportAllData}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
          >
            全体を保存
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2"
          >
            PDF形式でエクスポート（印刷）
          </button>
          <button
            type="button"
            onClick={handleExportHTML}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
          >
            HTML形式でエクスポート
          </button>
          <button
            type="button"
            onClick={handleGenerateShareUrl}
            disabled={shareUrlStatus === 'generating'}
            className={getShareButtonClass()}
          >
            {shareUrlStatus === 'idle' && (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </>
            )}
            {getShareButtonText()}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          全体を保存：すべての入力データと結果をJSONファイルで保存します（続きから始める際に使用）<br/>
          PDF形式：キャッシュフロー表とグラフを含むレポートを印刷機能でPDF出力します<br/>
          HTML形式：グラフとデータを含むレポートをHTMLファイルとして保存します（ブラウザで閲覧可能）<br/>
          <span className="text-purple-600 font-medium">共有URL生成：URLを生成してクリップボードにコピーします（誰でもブラウザで閲覧可能）</span>
        </p>
      </div>

      <div className="flex justify-between space-x-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          戻る
        </button>
      </div>

      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: simulationResultsTermsContent },
          { id: 'formulas', label: '計算式', content: simulationResultsFormulasContent }
        ]} 
      />
    </div>
  );
}

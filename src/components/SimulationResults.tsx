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

  // 共有URL生成機能（新機能）
  const handleGenerateShareUrl = async () => {
    setShareUrlStatus('generating');

    try {
      // HTMLコンテンツを生成
      const htmlContent = generateShareableHTML();
      
      // HTMLをBase64エンコード
      const encodedData = btoa(unescape(encodeURIComponent(htmlContent)));
      
      // 現在のURLのベース部分を取得
      const baseUrl = window.location.origin + window.location.pathname;
      
      // 共有URLを生成
      const shareUrl = `${baseUrl}#share=${encodedData}`;
      
      // クリップボードにコピー
      await navigator.clipboard.writeText(shareUrl);
      
      setShareUrlStatus('copied');
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        setShareUrlStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('共有URL生成エラー:', error);
      setShareUrlStatus('error');
      
      // 3秒後にステータスをリセット
      setTimeout(() => {
        setShareUrlStatus('idle');
      }, 3000);
    }
  };

  // 共有用HTML生成関数
  const generateShareableHTML = () => {
    // キャッシュフローテーブルのHTMLを生成
    const generateCashFlowTable = () => {
      return `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">年度</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">年齢</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">総収入<br>(個人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">生活費</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">住居費</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">教育費</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">その他支出</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">純資産<br>(個人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">売上<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">経費<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">総資産<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">総負債<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">純資産<br>(法人)</th>
            </tr>
          </thead>
          <tbody>
            ${years.map(year => {
              const cf = cashFlow[year] || {};
              const age = basicInfo.currentAge + (year - basicInfo.startYear);
              
              // 個人の総収入計算
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

              // その他支出計算
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

              // 法人の総収入計算
              let corporateIncome = 0;
              incomeData.corporate.forEach(item => {
                corporateIncome += item.amounts[year] || 0;
              });

              // 法人の総支出計算
              let corporateExpense = 0;
              expenseData.corporate.forEach(item => {
                corporateExpense += item.amounts[year] || 0;
              });
              
              // 負債総額の計算
              let personalLiabilityTotal = cf.personalLiabilityTotal || 0;
              if (personalLiabilityTotal === 0) {
                store.liabilityData.personal.forEach(liability => {
                  personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
                });
              }
              
              let corporateLiabilityTotal = cf.corporateLiabilityTotal || 0;
              if (corporateLiabilityTotal === 0) {
                store.liabilityData.corporate.forEach(liability => {
                  corporateLiabilityTotal += Math.abs(liability.amounts[year] || 0);
                });
              }
              
              // 純資産の計算
              const personalNetAssets = cf.personalNetAssets || (cf.personalTotalAssets - personalLiabilityTotal);
              const corporateNetAssets = cf.corporateNetAssets || (cf.corporateTotalAssets - corporateLiabilityTotal);
              
              return `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${year}</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${age}歳</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(personalIncome)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(cf.livingExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(cf.housingExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(cf.educationExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(otherExpenses)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${Math.round(personalNetAssets)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(corporateIncome)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(corporateExpense)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(cf.corporateTotalAssets || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${Math.round(corporateLiabilityTotal)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${Math.round(corporateNetAssets)}万円</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    };

    // Chart.jsグラフを生成するスクリプト
    const generateChartScripts = () => {
      return `
        // Chart.jsライブラリの読み込み
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = function() {
          // 個人キャッシュフローグラフ
          const personalCtx = document.getElementById('personalChart').getContext('2d');
          new Chart(personalCtx, {
            type: 'line',
            data: ${JSON.stringify(personalData)},
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: '個人キャッシュフロー推移'
                },
                legend: {
                  position: 'top'
                }
              },
              scales: {
                y: {
                  ticks: {
                    callback: function(value) {
                      return value + '万円';
                    }
                  }
                }
              }
            }
          });

          // 法人キャッシュフローグラフ
          const corporateCtx = document.getElementById('corporateChart').getContext('2d');
          new Chart(corporateCtx, {
            type: 'line',
            data: ${JSON.stringify(corporateData)},
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: '法人キャッシュフロー推移'
                },
                legend: {
                  position: 'top'
                }
              },
              scales: {
                y: {
                  ticks: {
                    callback: function(value) {
                      return value + '万円';
                    }
                  }
                }
              }
            }
          });
        };
        document.head.appendChild(script);
      `;
    };

    // 完全なHTMLドキュメントを生成
    return `
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
            max-width: 1200px;
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
            height: 400px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
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
              height: 300px;
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
            <canvas id="personalChart"></canvas>
          </div>

          <div class="section-title">法人キャッシュフロー推移</div>
          <div class="chart-container">
            <canvas id="corporateChart"></canvas>
          </div>

          <div class="page-break"></div>

          <div class="section-title">キャッシュフロー表</div>
          <div class="table-note">※ 金額の単位：万円　※ 赤字はマイナス、緑字はプラスを表示</div>
          ${generateCashFlowTable()}
        
          <div class="footer">
            <p>このレポートはライフプランシミュレーターで自動生成されました。</p>
            <p>共有用URL生成機能を使用して作成されています。</p>
          </div>
        </div>
        
        <script>
          ${generateChartScripts()}
        </script>
      </body>
      </html>
    `;
  };

  // PDF エクスポート機能（印刷向け）
  const handleExportPDF = () => {
    // キャッシュフローテーブルのHTMLを生成
    const generateCashFlowTable = () => {
      return `
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">年度</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">年齢</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">総収入<br>(個人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">生活費</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">住居費</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">教育費</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">その他支出</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">純資産<br>(個人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">売上<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">経費<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">総資産<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">総負債<br>(法人)</th>
              <th style="border: 1px solid #ddd; padding: 4px; text-align: center;">純資産<br>(法人)</th>
            </tr>
          </thead>
          <tbody>
            ${years.map(year => {
              const cf = cashFlow[year] || {};
              const age = basicInfo.currentAge + (year - basicInfo.startYear);
              
              // 個人の総収入計算
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

              // その他支出計算
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

              // 法人の総収入計算
              let corporateIncome = 0;
              incomeData.corporate.forEach(item => {
                corporateIncome += item.amounts[year] || 0;
              });

              // 法人の総支出計算
              let corporateExpense = 0;
              expenseData.corporate.forEach(item => {
                corporateExpense += item.amounts[year] || 0;
              });
              
              // 負債総額の計算
              let personalLiabilityTotal = cf.personalLiabilityTotal || 0;
              if (personalLiabilityTotal === 0) {
                store.liabilityData.personal.forEach(liability => {
                  personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
                });
              }
              
              let corporateLiabilityTotal = cf.corporateLiabilityTotal || 0;
              if (corporateLiabilityTotal === 0) {
                store.liabilityData.corporate.forEach(liability => {
                  corporateLiabilityTotal += Math.abs(liability.amounts[year] || 0);
                });
              }
              
              // 純資産の計算
              const personalNetAssets = cf.personalNetAssets || (cf.personalTotalAssets - personalLiabilityTotal);
              const corporateNetAssets = cf.corporateNetAssets || (cf.corporateTotalAssets - corporateLiabilityTotal);
              
              return `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: center; font-weight: bold;">${year}</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">${age}歳</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(personalIncome)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(cf.livingExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(cf.housingExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(cf.educationExpense || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(otherExpenses)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right; font-weight: bold;">${Math.round(personalNetAssets)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(corporateIncome)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(corporateExpense)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(cf.corporateTotalAssets || 0)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right;">${Math.round(corporateLiabilityTotal)}万円</td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: right; font-weight: bold;">${Math.round(corporateNetAssets)}万円</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    };

    // 印刷用HTMLを生成
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ライフプランシミュレーション結果</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 14px; color: #666; }
          .conditions { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
          .table-note { font-size: 12px; color: #666; margin-bottom: 10px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
          @media print { .page-break { page-break-before: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">ライフプランシミュレーション結果</h1>
          <p class="subtitle">生成日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div class="conditions">
          <strong>設定条件:</strong><br>
          ${getConditionSummary()}
        </div>

        <div class="page-break"></div>
        
        <h2 class="section-title">キャッシュフロー表</h2>
        <div class="table-note">※ 金額の単位：万円　※ 赤字はマイナス、緑字はプラスを表示</div>
        ${generateCashFlowTable()}

        <div class="page-break"></div>
        
        <div class="section-title">個人キャッシュフロー推移</div>
        <div class="chart-container">
          <img src="${personalChartRef.current?.canvas?.toDataURL('image/png') || ''}" alt="個人キャッシュフローグラフ" style="max-width: 100%; height: auto;" />
        </div>

        <div class="section-title">法人キャッシュフロー推移</div>
        <div class="chart-container">
          <img src="${corporateChartRef.current?.canvas?.toDataURL('image/png') || ''}" alt="法人キャッシュフローグラフ" style="max-width: 100%; height: auto;" />
        </div>
      </body>
      </html>
    `;

    // 新しいウィンドウを開いて印刷
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      // 画像の読み込みを待ってから印刷
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
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

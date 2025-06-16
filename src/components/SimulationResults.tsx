import React, { useEffect, useRef } from 'react';
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
          const cf = cashFlow[year];
          if (!cf) return 0;
          
          // 全ての収入項目を合計（新しい収入項目も動的に含める）
          let totalIncome = 0;
          
          // 基本収入
          if (cf.mainIncome) totalIncome += cf.mainIncome;
          if (cf.sideIncome) totalIncome += cf.sideIncome;
          if (cf.spouseIncome) totalIncome += cf.spouseIncome;
          if (cf.pensionIncome) totalIncome += cf.pensionIncome;
          if (cf.spousePensionIncome) totalIncome += cf.spousePensionIncome;
          if (cf.investmentIncome) totalIncome += cf.investmentIncome;
          
          // 追加の収入項目があれば合計に加える
          incomeData.personal.forEach(item => {
            // すでに計上されている基本項目以外の収入を追加
            const basicIncomeTypes = ['給与収入', '副業収入', '配偶者収入', '年金収入', '配偶者年金収入', '運用収益'];
            if (!basicIncomeTypes.includes(item.name)) {
              totalIncome += item.amounts[year] || 0;
            }
          });
          
          return totalIncome;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: '生活費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.livingExpense : 0;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: '住居費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.housingExpense : 0;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: '教育費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.educationExpense : 0;
        }),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
      {
        label: 'その他支出',
        data: years.map(year => {
          const cf = cashFlow[year];
          
          // 基本のその他支出
          let otherExpenses = cf ? (cf.otherExpense || 0) : 0;
          
          // ローン返済があれば加算
          if (cf && cf.loanRepayment) {
            otherExpenses += cf.loanRepayment;
          }
          
          // 追加の支出項目（生活費、住居費、教育費以外）
          expenseData.personal.forEach(item => {
            const basicExpenseTypes = ['生活費', '住居費', '教育費'];
            if (!basicExpenseTypes.includes(item.name) && item.name !== 'その他') {
              otherExpenses += item.amounts[year] || 0;
            }
          });
          
          return otherExpenses;
        }),
        borderColor: 'rgb(255, 99, 71)',
        backgroundColor: 'rgba(255, 99, 71, 0.5)',
      },
      {
        label: '純資産',
        data: years.map(year => {
          const cf = cashFlow[year];
          // 個人の負債総額を計算
          let personalLiabilityTotal = 0;
          
          // store内の負債データを使用
          store.liabilityData.personal.forEach(liability => {
            personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
          });
          
          // cashFlowにある場合はそれを使用
          if (cf && cf.personalLiabilityTotal !== undefined) {
            personalLiabilityTotal = cf.personalLiabilityTotal;
          }
          
          const personalNetAssets = cf ? (cf.personalNetAssets || (cf.personalTotalAssets - personalLiabilityTotal)) : 0;
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
        <meta charset="utf-8">
        <style>
          body { 
            font-family: sans-serif; 
            margin: 20px;
            font-size: 12px;
          }
          .header { 
            margin-bottom: 20px; 
          }
          .conditions { 
            margin-bottom: 20px; 
            background-color: #f9fafb; 
            padding: 10px;
            border-radius: 5px;
          }
          .chart-container { 
            margin: 20px 0; 
            text-align: center;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin: 20px 0 10px 0; 
            color: #1f2937;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
          }
          .condition-item { 
            margin: 4px 0; 
            font-size: 11px; 
          }
          .table-section {
            margin: 20px 0;
            page-break-inside: avoid;
          }
          .table-note {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 10px;
            font-style: italic;
          }
          .page-break {
            page-break-after: always;
          }
          @page { 
            margin: 15mm; 
            size: A4 landscape;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #1f2937; margin-bottom: 5px;">ライフプランシミュレーション結果</h1>
          <p style="margin: 0; color: #6b7280;">作成日: ${new Date().toLocaleDateString('ja-JP')}</p>
        </div>
        
        <div class="conditions">
          <h2 class="section-title" style="margin-top: 0;">設定条件</h2>
          ${getConditionSummary().split(' | ').map(condition => 
            `<div class="condition-item">• ${condition}</div>`
          ).join('')}
        </div>

        <div class="table-section">
          <h2 class="section-title">キャッシュフロー表</h2>
          <div class="table-note">※ 金額の単位：万円　※ 赤字はマイナス、緑字はプラスを表示</div>
          ${generateCashFlowTable()}
        </div>

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

    // Chart.jsグラフをインタラクティブに表示するためのJavaScriptコード
    const generateChartScripts = () => {
      // 年齢計算用の値
      const currentAge = basicInfo.currentAge;
      const startYear = basicInfo.startYear;
      
      // HTMLの中に埋め込むJavaScript
      return `
        // 年度データと年齢の計算用の値
        const years = ${JSON.stringify(years)};
        const currentAge = ${currentAge};
        const startYear = ${startYear};
        
        // 個人キャッシュフローグラフ用データ
        const personalData = {
          labels: years,
          datasets: [
            {
              label: '総収入',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                if (!cf) return 0;
                
                let totalIncome = 0;
                if (cf.mainIncome) totalIncome += cf.mainIncome;
                if (cf.sideIncome) totalIncome += cf.sideIncome;
                if (cf.spouseIncome) totalIncome += cf.spouseIncome;
                if (cf.pensionIncome) totalIncome += cf.pensionIncome;
                if (cf.spousePensionIncome) totalIncome += cf.spousePensionIncome;
                if (cf.investmentIncome) totalIncome += cf.investmentIncome;
                
                incomeData.personal.forEach(item => {
                  const basicIncomeTypes = ['給与収入', '副業収入', '配偶者収入', '年金収入', '配偶者年金収入', '運用収益'];
                  if (!basicIncomeTypes.includes(item.name)) {
                    totalIncome += item.amounts[year] || 0;
                  }
                });
                
                return totalIncome;
              }))},
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
              label: '生活費',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                return cf ? cf.livingExpense : 0;
              }))},
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: '住居費',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                return cf ? cf.housingExpense : 0;
              }))},
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: '教育費',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                return cf ? cf.educationExpense : 0;
              }))},
              borderColor: 'rgb(255, 159, 64)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
            },
            {
              label: 'その他支出',
              data: ${JSON.stringify(years.map(year => {
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
              }))},
              borderColor: 'rgb(255, 99, 71)',
              backgroundColor: 'rgba(255, 99, 71, 0.5)',
            },
            {
              label: '純資産',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                let personalLiabilityTotal = 0;
                
                store.liabilityData.personal.forEach(liability => {
                  personalLiabilityTotal += Math.abs(liability.amounts[year] || 0);
                });
                
                if (cf && cf.personalLiabilityTotal !== undefined) {
                  personalLiabilityTotal = cf.personalLiabilityTotal;
                }
                
                const personalNetAssets = cf ? (cf.personalNetAssets || (cf.personalTotalAssets - personalLiabilityTotal)) : 0;
                return personalNetAssets;
              }))},
              borderColor: 'rgb(153, 102, 255)',
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
            }
          ]
        };
        
        // 法人キャッシュフローグラフ用データ
        const corporateData = {
          labels: years,
          datasets: [
            {
              label: '売上',
              data: ${JSON.stringify(years.map(year => {
                let totalIncome = 0;
                incomeData.corporate.forEach(item => {
                  totalIncome += item.amounts[year] || 0;
                });
                return totalIncome;
              }))},
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
              label: '経費',
              data: ${JSON.stringify(years.map(year => {
                let totalExpense = 0;
                expenseData.corporate.forEach(item => {
                  totalExpense += item.amounts[year] || 0;
                });
                return totalExpense;
              }))},
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: '総資産',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                return cf ? cf.corporateTotalAssets : 0;
              }))},
              borderColor: 'rgb(255, 159, 64)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
            },
            {
              label: '総負債',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                let totalLiability = 0;
                
                store.liabilityData.corporate.forEach(liability => {
                  totalLiability += Math.abs(liability.amounts[year] || 0);
                });
                
                if (cf && cf.corporateLiabilityTotal !== undefined) {
                  return cf.corporateLiabilityTotal;
                }
                
                return totalLiability;
              }))},
              borderColor: 'rgb(255, 99, 71)',
              backgroundColor: 'rgba(255, 99, 71, 0.5)',
            },
            {
              label: '純資産',
              data: ${JSON.stringify(years.map(year => {
                const cf = cashFlow[year];
                return cf ? (cf.corporateNetAssets || (cf.corporateTotalAssets - (cf.corporateLiabilityTotal || 0))) : 0;
              }))},
              borderColor: 'rgb(153, 102, 255)',
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
            }
          ]
        };
        
        // グラフの共通オプション
        const options = {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                padding: 10,
              },
            },
            tooltip: {
              callbacks: {
                label: function(context) {
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
                callback: function(value) {
                  return value + '万円';
                }
              }
            },
            x: {
              ticks: {
                maxRotation: 0,
                callback: function(value, index) {
                  const year = years[index];
                  const age = currentAge + (year - startYear);
                  return year + '年\\n' + age + '歳';
                }
              }
            }
          }
        };
        
        // ページ読み込み時にグラフを描画
        window.onload = function() {
          // 個人キャッシュフローグラフ
          const personalCtx = document.getElementById('personal-chart').getContext('2d');
          new Chart(personalCtx, {
            type: 'line',
            data: personalData,
            options: options
          });
          
          // 法人キャッシュフローグラフ
          const corporateCtx = document.getElementById('corporate-chart').getContext('2d');
          new Chart(corporateCtx, {
            type: 'line',
            data: corporateData,
            options: options
          });
        };
      `;
    };

    // HTMLページの生成
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ライフプランシミュレーション結果</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            margin-bottom: 30px;
          }
          h1 {
            color: #2563eb;
            margin-bottom: 10px;
          }
          h2 {
            color: #1f2937;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
            margin-top: 30px;
          }
          .summary {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
          }
          .summary-title {
            font-weight: bold;
            margin-bottom: 10px;
          }
          .chart-container {
            height: 500px;
            margin-bottom: 30px;
            position: relative;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
          }
          th {
            background-color: #f3f4f6;
            text-align: center;
            font-weight: bold;
          }
          td {
            text-align: right;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .notes {
            font-size: 12px;
            color: #6b7280;
            margin-top: 10px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            .chart-container {
              height: 350px;
              page-break-inside: avoid;
            }
            h2 {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>ライフプランシミュレーション結果</h1>
          <p>作成日: ${new Date().toLocaleDateString('ja-JP')}</p>
        </header>
        
        <div class="summary">
          <div class="summary-title">設定条件</div>
          <p>
            ${getConditionSummary().split(' | ').join(' | ')}
          </p>
        </div>

        <h2>個人キャッシュフロー</h2>
        <div class="chart-container">
          <canvas id="personal-chart"></canvas>
        </div>
        <div class="notes">
          <p>※ 総収入：給与、副業、配偶者収入、年金、運用収益など全ての収入の合計</p>
          <p>※ 生活費：食費、日用品、光熱費など基本的な生活に必要な支出</p>
          <p>※ 住居費：家賃、住宅ローン、管理費など住居に関する支出</p>
          <p>※ 教育費：学費、塾代、習い事など教育に関する支出</p>
          <p>※ その他支出：ローン返済を含む上記以外の支出</p>
          <p>※ 純資産：総資産から負債を差し引いた実質的な自己資産</p>
        </div>
        
        <h2>法人キャッシュフロー</h2>
        <div class="chart-container">
          <canvas id="corporate-chart"></canvas>
        </div>
        <div class="notes">
          <p>※ 売上：法人の全ての収入の合計</p>
          <p>※ 経費：法人の全ての支出の合計</p>
          <p>※ 総資産：法人が保有する全ての資産の合計</p>
          <p>※ 総負債：法人が抱える全ての負債の合計</p>
          <p>※ 純資産：総資産から負債を差し引いた実質的な自己資産</p>
        </div>
        
        <h2>キャッシュフロー詳細</h2>
        ${generateCashFlowTable()}
        
        <div class="footer">
          <p>このレポートはライフプランシミュレーターで自動生成されました。</p>
        </div>
        
        <script>
          ${generateChartScripts()}
        </script>
      </body>
      </html>
    `;

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
        </div>
        <p className="text-sm text-gray-600 mt-2">
          全体を保存：すべての入力データと結果をJSONファイルで保存します（続きから始める際に使用）<br/>
          PDF形式：キャッシュフロー表とグラフを含むレポートを印刷機能でPDF出力します<br/>
          HTML形式：グラフとデータを含むレポートをHTMLファイルとして保存します（ブラウザで閲覧可能）
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

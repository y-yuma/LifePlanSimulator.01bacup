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
  const { 
    basicInfo, 
    cashFlow,
    parameters,
    incomeData,
    expenseData,
    setCurrentStep,
    initializeCashFlow 
  } = useSimulatorStore();
  
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

  const personalData = {
    labels: years,
    datasets: [
      {
        label: '世帯収入',
        data: years.map(year => {
          const cf = cashFlow[year];
          if (!cf) return 0;
          return cf.mainIncome + cf.sideIncome + cf.spouseIncome;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: '運用収益',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.investmentIncome : 0;
        }),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
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
        label: '運用資産',
        data: years.map(year => cashFlow[year]?.totalInvestmentAssets || 0),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: '総資産',
        data: years.map(year => cashFlow[year]?.personalTotalAssets || 0),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
      },
    ],
  };

  const corporateData = {
    labels: years,
    datasets: [
      {
        label: '売上',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.corporateRevenue : 0;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: '経費',
        data: years.map(year => {
          const cf = cashFlow[year];
          return cf ? cf.corporateExpense : 0;
        }),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: '法人資産',
        data: years.map(year => cashFlow[year]?.corporateTotalAssets || 0),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: '金額（万円）',
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: '年齢',
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
        ticks: {
          callback: function(value: any) {
            const year = years[value];
            const age = basicInfo.currentAge + (year - basicInfo.startYear);
            return `${age}歳`;
          },
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  const getConditionSummary = () => {
    // 給与収入の取得
    const mainIncomeItem = incomeData.personal.find(item => item.name === '給与収入');
    const mainIncome = mainIncomeItem ? (mainIncomeItem.amounts[basicInfo.startYear] || 0) : 0;
    
    const conditions = [
      `${basicInfo.currentAge}歳`,
      `${basicInfo.occupation === 'company_employee' ? '会社員・公務員' : 
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

  // PDF エクスポート機能（ブラウザの印刷機能を使用）
  const handleExportPDF = () => {
    // キャッシュフローテーブルのHTMLを生成
    const generateCashFlowTable = () => {
      const tableHeaders = [
        '年度', '年齢', '世帯収入', '運用収益', '生活費', '住居費', '教育費', 
        '個人収支', '個人総資産', '売上', '経費', '法人収支', '法人総資産'
      ];

      const tableRows = years.map(year => {
        const cf = cashFlow[year] || {};
        const age = basicInfo.currentAge + (year - basicInfo.startYear);
        
        return `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 4px 8px; text-align: center; font-weight: bold;">${year}</td>
            <td style="padding: 4px 8px; text-align: center;">${age}歳</td>
            <td style="padding: 4px 8px; text-align: right;">${(cf.mainIncome || 0) + (cf.sideIncome || 0) + (cf.spouseIncome || 0)}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.investmentIncome || 0}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.livingExpense || 0}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.housingExpense || 0}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.educationExpense || 0}</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: ${(cf.personalBalance || 0) >= 0 ? '#059669' : '#dc2626'};">${cf.personalBalance || 0}</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: ${(cf.personalTotalAssets || 0) >= 0 ? '#059669' : '#dc2626'};">${cf.personalTotalAssets || 0}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.corporateRevenue || 0}</td>
            <td style="padding: 4px 8px; text-align: right;">${cf.corporateExpense || 0}</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: ${(cf.corporateBalance || 0) >= 0 ? '#059669' : '#dc2626'};">${cf.corporateBalance || 0}</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: ${(cf.corporateTotalAssets || 0) >= 0 ? '#059669' : '#dc2626'};">${cf.corporateTotalAssets || 0}</td>
          </tr>
        `;
      }).join('');

      return `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #ddd;">
              ${tableHeaders.map(header => 
                `<th style="padding: 8px 4px; text-align: center; font-weight: bold; border-right: 1px solid #ddd;">${header}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    };

    // 印刷用のHTMLコンテンツを作成
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ライフプランシミュレーション結果</title>
        <style>
          @media print {
            body { 
              margin: 0; 
              padding: 15px; 
              font-family: 'Yu Gothic', 'Hiragino Sans', sans-serif; 
              line-height: 1.4;
            }
            .page-break { page-break-before: always; }
            .chart-container { 
              width: 100%; 
              height: 300px; 
              margin: 15px 0; 
              page-break-inside: avoid;
            }
            .chart-container img { 
              width: 100%; 
              height: auto; 
              max-height: 300px;
              object-fit: contain;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              page-break-inside: avoid;
            }
            .conditions { 
              background: #f8f9fa; 
              padding: 12px; 
              margin: 15px 0; 
              border-radius: 5px; 
              page-break-inside: avoid;
              border: 1px solid #dee2e6;
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
          <img src="${personalChartRef.current?.canvas?.toDataURL('image/png') || ''}" alt="個人キャッシュフローグラフ" />
        </div>

        <div class="section-title">法人キャッシュフロー推移</div>
        <div class="chart-container">
          <img src="${corporateChartRef.current?.canvas?.toDataURL('image/png') || ''}" alt="法人キャッシュフローグラフ" />
        </div>
      </body>
      </html>
    `;

    // 新しいウィンドウを開いて印刷
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // 画像の読み込みを待ってから印刷
      setTimeout(() => {
        printWindow.print();
        // 印刷後にウィンドウを閉じる（ユーザーが印刷をキャンセルした場合も考慮）
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    } else {
      alert('ポップアップがブロックされています。ポップアップを許可してから再度お試しください。');
    }
  };

  // CSV エクスポート機能（既存機能を移動）
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

      const calculateAge = (startYear: number, currentAge: number, targetYear: number) => {
        return currentAge + (targetYear - startYear);
      };

      const getLifeEventDescription = (year: number, basicInfo: any, lifeEvents: any, type: string) => {
        // ライフイベントの説明を取得する関数（簡易版）
        return ''; // 実際の実装では適切なライフイベント情報を返す
      };

      return [
        year,
        calculateAge(basicInfo.startYear, basicInfo.currentAge, year),
        '', // ライフイベント（個人）
        '', // ライフイベント（法人）
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
              個人の収入、支出、資産の推移を表示します。収入には給与、副業、年金、運用収益が含まれ、支出には生活費、住居費、教育費が含まれます。
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
        </div>
      </div>

      {/* エクスポートボタンを追加 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">エクスポート</h3>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
          >
            エクセル形式でエクスポート
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-2"
          >
            PDF形式でエクスポート（印刷）
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          エクセル形式：詳細なデータをCSVファイルで出力します<br/>
          PDF形式：キャッシュフロー表とグラフを含むレポートを印刷機能でPDF出力します
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

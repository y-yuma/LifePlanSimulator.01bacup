import React, { useEffect } from 'react';
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
    setCurrentStep,
    initializeCashFlow 
  } = useSimulatorStore();
  
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

 // corporateData の部分を修正

 const corporateData = {
  labels: years,
  datasets: [
    {
      label: '売上',
      data: years.map(year => {
        const cf = cashFlow[year];
        return cf ? cf.corporateIncome : 0;
      }),
      borderColor: 'rgb(153, 102, 255)',
      backgroundColor: 'rgba(153, 102, 255, 0.5)',
    },
    {
      label: 'その他収入',
      data: years.map(year => {
        const cf = cashFlow[year];
        return cf ? cf.corporateOtherIncome : 0;
      }),
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    },
    {
      label: '運用収益',
      data: years.map(year => {
        const cf = cashFlow[year];
        return cf ? cf.corporateInvestmentIncome : 0;
      }),
      borderColor: 'rgb(153, 102, 255)',
      backgroundColor: 'rgba(153, 102, 255, 0.5)',
    },
    {
      label: '事業経費',
      data: years.map(year => {
        const cf = cashFlow[year];
        return cf ? cf.corporateExpense : 0;
      }),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
    {
      label: 'その他経費',
      data: years.map(year => {
        const cf = cashFlow[year];
        return cf ? cf.corporateOtherExpense : 0;
      }),
      borderColor: 'rgb(255, 159, 64)',
      backgroundColor: 'rgba(255, 159, 64, 0.5)',
    },
    {
      label: '運用資産',
      data: years.map(year => cashFlow[year]?.corporateTotalInvestmentAssets || 0),
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    },
    {
      label: '総資産',
      data: years.map(year => cashFlow[year]?.corporateTotalAssets || 0),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
    },
  ],
};

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
          boxWidth: 10,
          padding: 10,
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '金額（万円）',
          font: {
            size: window.innerWidth < 768 ? 10 : 12,
          },
        },
        ticks: {
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
            <Line options={{...options, plugins: {...options.plugins,
              title: {
                display: true,
                text: '個人キャッシュフロー推移',
                font: {
                  size: window.innerWidth < 768 ? 14 : 16,
                },
              },
            }}} data={personalData} />
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
            <Line options={{...options, plugins: {...options.plugins,
              title: {
                display: true,
                text: '法人キャッシュフロー推移',
                font: {
                  size: window.innerWidth < 768 ? 14 : 16,
                },
              },
            }}} data={corporateData} />
          </div>
        </div>
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
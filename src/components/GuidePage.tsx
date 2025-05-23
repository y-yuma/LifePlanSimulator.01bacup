import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, AlertTriangle, Sparkles, FileText } from 'lucide-react';
import { useSimulatorStore } from '@/store/simulator';

export function GuidePage() {
  const { setCurrentStep } = useSimulatorStore();
  const [openSections, setOpenSections] = useState({
    intro: true,
    terms: false,
    income: false,
    housing: false,
    education: false,
    pension: false,
    investment: false,
    cashflow: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleStart = () => {
    setCurrentStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">ライフプランシミュレーター</h1>
        <p className="text-lg text-gray-600">将来の人生設計をサポートするツール</p>
      </div>

      {/* イントロダクション */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('intro')}
        >
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-blue-800">このツールについて</h2>
          </div>
          {openSections.intro ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-blue-600" />}
        </div>

        {openSections.intro && (
          <div className="mt-3 text-gray-700 space-y-3">
            <p>このライフプランシミュレーターは、あなたの人生設計をサポートするためのツールです。収入、支出、資産、負債などの情報を入力することで、将来の資産形成や必要な準備について具体的な計画を立てることができます。</p>
            
            <div className="bg-white p-3 rounded-md border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2">使い方の流れ</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>基本情報（年齢、職業、家族構成など）を入力</li>
                <li>収入情報（給与、副業、配偶者収入など）を入力</li>
                <li>支出情報（生活費、住居費、教育費など）を入力</li>
                <li>資産・負債情報（貯金、投資、ローンなど）を入力</li>
                <li>ライフイベント（結婚、出産、住宅購入など）を登録</li>
                <li>キャッシュフロー（年別の収支）を確認・調整</li>
                <li>シミュレーション結果をグラフで確認</li>
              </ol>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1 text-yellow-700" />
                注意事項
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-yellow-800">
                <li>すべての金額は「万円」単位で入力してください</li>
                <li>シミュレーション結果は将来の可能性を示すものであり、確実な予測ではありません</li>
                <li>個人情報は端末内に保存され、サーバーに送信されません</li>
                <li>重要な資産形成の判断は、専門家（ファイナンシャルプランナーなど）にご相談ください</li>
              </ul>
            </div>
            
            <p>以下のセクションでは、このシミュレーターで使用されている計算式や用語について詳しく解説しています。</p>
          </div>
        )}
      </div>

      {/* 用語解説 */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('terms')}
        >
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">1. 用語解説</h2>
          </div>
          {openSections.terms ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
        </div>

        {openSections.terms && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">基本用語</h3>
              <ul className="space-y-2">
                <li><span className="font-bold">インフレーション率</span>: 物価上昇率のこと。生活費や住居費などが毎年どれくらい上昇するかを示す割合(%)。</li>
                <li><span className="font-bold">教育費上昇率</span>: 教育関連の費用(学費、教材費など)が毎年どれくらい上昇するかを示す割合(%)。教育費はインフレ率とは別に特有の上昇率を持つ。</li>
                <li><span className="font-bold">資産運用利回り</span>: 投資した資産から得られる年間収益率(%)。</li>
                <li><span className="font-bold">投資割合</span>: 収入のうち、何%を投資に回すかの割合。</li>
                <li><span className="font-bold">最大投資額</span>: 年間に投資できる金額の上限(万円)。</li>
                <li><span className="font-bold">標準報酬月額</span>: 社会保険料や厚生年金を計算するための基準となる月額給与。実際の給与を一定の幅で区分した金額。</li>
                <li><span className="font-bold">運用資産</span>: 投資対象として設定された資産。運用利回りが適用される。</li>
                <li><span className="font-bold">元利均等返済</span>: 毎月の返済額(元金と利息の合計)が一定になるローンの返済方式。</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">職業区分</h3>
              <ul className="space-y-2">
                <li><span className="font-bold">会社員・公務員</span>: 給与から所得税・住民税・社会保険料が差し引かれ、厚生年金に加入。</li>
                <li><span className="font-bold">パート(厚生年金あり)</span>: 一定の労働時間・収入があり、厚生年金に加入しているパート勤務者。</li>
                <li><span className="font-bold">パート(厚生年金なし)</span>: 労働時間が短く、国民年金のみに加入しているパート勤務者。</li>
                <li><span className="font-bold">自営業・フリーランス</span>: 自身で収入を得て、確定申告を行い、国民年金に加入。</li>
                <li><span className="font-bold">専業主婦・夫</span>: 収入がなく、配偶者の扶養に入り、国民年金第3号被保険者となる場合が多い。</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">支出分類</h3>
              <ul className="space-y-2">
                <li><span className="font-bold">生活費</span>: 食費、日用品費、光熱費、通信費、交通費、娯楽費、衣服費など日常的な支出。</li>
                <li><span className="font-bold">住居費</span>: 家賃、住宅ローン返済、管理費、修繕積立金、固定資産税など住居に関する支出。</li>
                <li><span className="font-bold">教育費</span>: 保育料、幼稚園・学校の授業料、教材費、制服代、給食費、学習塾、習い事、受験費用など。</li>
                <li><span className="font-bold">その他</span>: 医療費、保険料、冠婚葬祭費、旅行費、大型出費など上記に含まれない支出。</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 収入・支出の計算式 */}
      <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('income')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-green-800">2. 収入・支出の計算式</h2>
          </div>
          {openSections.income ? <ChevronUp className="h-5 w-5 text-green-600" /> : <ChevronDown className="h-5 w-5 text-green-600" />}
        </div>

        {openSections.income && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-green-800 mb-2">給与収入の手取り計算式</h3>
              <div className="bg-white p-3 rounded-md border border-green-100 overflow-x-auto">
                <div className="whitespace-normal">
                  <p className="text-sm mb-1">給与所得控除 = </p>
                  <ul className="text-sm pl-4">
                    <li>収入 &le; 850万円の場合: min(max((収入 × 0.3) + 8万円, 55万円), 195万円)</li>
                    <li>収入 &gt; 850万円の場合: 195万円</li>
                  </ul>
                  
                  <p className="text-sm mt-2 mb-1">社会保険料 = </p>
                  <ul className="text-sm pl-4">
                    <li>収入 &lt; 850万円の場合: 収入 × 0.15</li>
                    <li>収入 &ge; 850万円の場合: 収入 × 0.077</li>
                  </ul>
                  
                  <p className="text-sm mt-2">課税所得 = 収入 - 給与所得控除 - 社会保険料</p>
                  
                  <p className="text-sm mt-2 mb-1">所得税 = </p>
                  <ul className="text-sm pl-4">
                    <li>課税所得 &le; 195万円: 課税所得 × 0.05</li>
                    <li>課税所得 &le; 330万円: 課税所得 × 0.10 - 9.75万円</li>
                    <li>課税所得 &le; 695万円: 課税所得 × 0.20 - 42.75万円</li>
                    <li>課税所得 &le; 900万円: 課税所得 × 0.23 - 63.6万円</li>
                    <li>課税所得 &le; 1800万円: 課税所得 × 0.33 - 153.6万円</li>
                    <li>課税所得 &le; 4000万円: 課税所得 × 0.40 - 279.6万円</li>
                    <li>課税所得 &gt; 4000万円: 課税所得 × 0.45 - 479.6万円</li>
                  </ul>
                  
                  <p className="text-sm mt-2">住民税 = 課税所得 × 0.10</p>
                  
                  <p className="text-sm mt-2">手取り収入 = 収入 - 社会保険料 - 所得税 - 住民税</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-green-800 mb-2">昇給計算式</h3>
              <div className="bg-white p-3 rounded-md border border-green-100">
                <p className="text-sm">昇給後の収入 = 基本収入 × (1 + 昇給率/100)^経過年数</p>
              </div>
              <p className="text-sm mt-1 text-green-700">※経過年数は初年度からの経過した年数です</p>
            </div>
          </div>
        )}
      </div>

      {/* 住居費の計算式 */}
      <div className="mb-6 bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('housing')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-orange-800">3. 住居費の計算式</h2>
          </div>
          {openSections.housing ? <ChevronUp className="h-5 w-5 text-orange-600" /> : <ChevronDown className="h-5 w-5 text-orange-600" />}
        </div>

        {openSections.housing && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-orange-800 mb-2">賃貸の場合</h3>
              <div className="bg-white p-3 rounded-md border border-orange-100">
                <div className="whitespace-normal">
                  <p className="text-sm">年間家賃 = 月額賃料 × 12 × (1 + 年間上昇率/100)^経過年数</p>
                  <p className="text-sm mt-2">更新費用 = 更新料 × (経過年数 ÷ 更新間隔の小数点以下切り捨て)</p>
                  <p className="text-sm mt-2">年間住居費 = 年間家賃 + 更新費用</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-orange-800 mb-2">住宅購入の場合</h3>
              <div className="bg-white p-3 rounded-md border border-orange-100">
                <div className="whitespace-normal">
                  <h4 className="text-sm font-medium mb-1">月々のローン返済額(元利均等返済)</h4>
                  <p className="text-sm">月利 = 年間金利 ÷ 12 ÷ 100</p>
                  <p className="text-sm mt-1">返済月数 = 返済年数 × 12</p>
                  <p className="text-sm mt-1 mb-3">月々の返済額 = 借入額 × 月利 × (1 + 月利)^返済月数 ÷ ((1 + 月利)^返済月数 - 1)</p>
                  
                  <h4 className="text-sm font-medium mb-1">年間住居費</h4>
                  <p className="text-sm">年間ローン返済額 = 月々の返済額 × 12</p>
                  <p className="text-sm mt-1">年間維持費 = 購入金額 × (維持費率/100)</p>
                  <p className="text-sm mt-1">年間住居費 = 年間ローン返済額 + 年間維持費</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 教育費の計算式 */}
      <div className="mb-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('education')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-purple-800">4. 教育費の計算式</h2>
          </div>
          {openSections.education ? <ChevronUp className="h-5 w-5 text-purple-600" /> : <ChevronDown className="h-5 w-5 text-purple-600" />}
        </div>

        {openSections.education && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-purple-800 mb-2">教育費の基本金額(万円/年)</h3>
              <div className="overflow-x-auto">
                <div className="max-w-full">
                  <table className="min-w-full bg-white border border-purple-100 rounded-md">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-purple-800">区分</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-purple-800">公立</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-purple-800">私立</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      <tr>
                        <td className="px-4 py-2 text-sm">保育園</td>
                        <td className="px-4 py-2 text-right text-sm">29.9万円</td>
                        <td className="px-4 py-2 text-right text-sm">35.3万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">幼稚園</td>
                        <td className="px-4 py-2 text-right text-sm">18.4万円</td>
                        <td className="px-4 py-2 text-right text-sm">34.7万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">小学校</td>
                        <td className="px-4 py-2 text-right text-sm">33.6万円</td>
                        <td className="px-4 py-2 text-right text-sm">182.8万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">中学校</td>
                        <td className="px-4 py-2 text-right text-sm">54.2万円</td>
                        <td className="px-4 py-2 text-right text-sm">156万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">高校</td>
                        <td className="px-4 py-2 text-right text-sm">59.7万円</td>
                        <td className="px-4 py-2 text-right text-sm">103万円</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <h4 className="font-medium text-purple-800 mt-3 mb-2">大学の教育費</h4>
              <div className="overflow-x-auto">
                <div className="max-w-full">
                  <table className="min-w-full bg-white border border-purple-100 rounded-md">
                    <thead>
                      <tr className="bg-purple-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-purple-800">大学区分</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-purple-800">年間費用</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      <tr>
                        <td className="px-4 py-2 text-sm">国立大学(文系)</td>
                        <td className="px-4 py-2 text-right text-sm">60.6万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">国立大学(理系)</td>
                        <td className="px-4 py-2 text-right text-sm">60.6万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">私立大学(文系)</td>
                        <td className="px-4 py-2 text-right text-sm">102.6万円</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm">私立大学(理系)</td>
                        <td className="px-4 py-2 text-right text-sm">135.4万円</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-purple-800 mb-2">年齢別教育費計算</h3>
              <div className="bg-white p-3 rounded-md border border-purple-100">
                <div className="whitespace-normal">
                  <p className="text-sm">子どもの年齢 = 基準年の子どもの年齢 + (計算年 - 基準年)</p>
                  
                  <p className="text-sm mt-2 mb-1">教育費 = </p>
                  <ul className="text-sm pl-4">
                    <li>0～2歳: 保育園の費用(行かない場合は0)</li>
                    <li>3～5歳: 幼稚園の費用(行かない場合は0)</li>
                    <li>6～11歳: 小学校の費用</li>
                    <li>12～14歳: 中学校の費用</li>
                    <li>15～17歳: 高校の費用</li>
                    <li>18～21歳: 大学の費用(行かない場合は0)</li>
                    <li>上記以外: 0</li>
                  </ul>
                  
                  <p className="text-sm mt-2">インフレ調整教育費 = 教育費 × (1 + 教育費上昇率/100)^経過年数</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 年金計算の計算式 */}
      <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('pension')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-red-800">5. 年金計算の計算式</h2>
          </div>
          {openSections.pension ? <ChevronUp className="h-5 w-5 text-red-600" /> : <ChevronDown className="h-5 w-5 text-red-600" />}
        </div>

        {openSections.pension && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-red-800 mb-2">国民年金(基礎年金)計算</h3>
              <div className="bg-white p-3 rounded-md border border-red-100">
                <div className="whitespace-normal">
                  <p className="text-sm">満額の基礎年金(2025年度): 78.09万円/年</p>
                  <p className="text-sm mt-1">加入月数: 職歴に基づく加入月数(最大480ヶ月=40年)</p>
                  <p className="text-sm mt-1">加入月数割合 = min(加入月数 ÷ 480, 1)</p>
                  <p className="text-sm mt-1">基礎年金額 = 満額の基礎年金 × 加入月数割合</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-red-800 mb-2">厚生年金計算</h3>
              <div className="bg-white p-3 rounded-md border border-red-100">
                <div className="whitespace-normal">
                  <p className="text-sm">平均標準報酬月額 = 加入期間の標準報酬月額の平均</p>
                  <p className="text-sm mt-1">2003年3月以前分 = 平均標準報酬月額 × 0.007125 × 2003年3月以前の加入月数</p>
                  <p className="text-sm mt-1">2003年4月以降分 = 平均標準報酬月額 × 0.005481 × 2003年4月以降の加入月数</p>
                  <p className="text-sm mt-1">厚生年金額 = 2003年3月以前分 + 2003年4月以降分</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-red-800 mb-2">繰上げ/繰下げ調整</h3>
              <div className="bg-white p-3 rounded-md border border-red-100">
                <div className="whitespace-normal">
                  <p className="text-sm">標準支給開始年齢 = 65歳</p>
                  <p className="text-sm mt-1">月数差 = (実際の受給開始年齢 - 標準支給開始年齢) × 12</p>
                  
                  <p className="text-sm mt-2 mb-1">調整率 = </p>
                  <ul className="text-sm pl-4">
                    <li>月数差 &lt; 0の場合: 1.0 - (|月数差| × 0.004) (繰上げ: 月あたり0.4%減額)</li>
                    <li>月数差 &gt; 0の場合: 1.0 + (月数差 × 0.007) (繰下げ: 月あたり0.7%増額)</li>
                    <li>月数差 = 0の場合: 1.0 (調整なし)</li>
                  </ul>
                  
                  <p className="text-sm mt-2">調整後年金額 = (基礎年金額 + 厚生年金額) × 調整率</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-red-800 mb-2">在職老齢年金調整</h3>
              <div className="bg-white p-3 rounded-md border border-red-100">
                <div className="whitespace-normal">
                  <p className="text-sm">基準額 = </p>
                  <ul className="text-sm pl-4">
                    <li>60～64歳: 47万円/月</li>
                    <li>65歳以上: 51万円/月</li>
                  </ul>
                  
                  <p className="text-sm mt-1">総月収 = 月給 + 月々の年金額</p>
                  <p className="text-sm mt-1">超過額 = max(0, 総月収 - 基準額)</p>
                  <p className="text-sm mt-1">支給停止額 = min(厚生年金月額, 超過額 ÷ 2)</p>
                  <p className="text-sm mt-1">調整後厚生年金月額 = 厚生年金月額 - 支給停止額</p>
                  <p className="text-sm mt-1">調整後年金年額 = 基礎年金年額 + (調整後厚生年金月額 × 12)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 資産運用と投資の計算式 */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('investment')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-blue-800">6. 資産運用と投資の計算式</h2>
          </div>
          {openSections.investment ? <ChevronUp className="h-5 w-5 text-blue-600" /> : <ChevronDown className="h-5 w-5 text-blue-600" />}
        </div>

        {openSections.investment && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">投資額計算</h3>
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <div className="whitespace-normal">
                  <p className="text-sm">各収入項目の投資額 = min(収入額 × (投資割合/100), 最大投資額)</p>
                  <p className="text-sm mt-1">総投資額 = 各収入項目の投資額の合計</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">投資収益計算</h3>
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <div className="whitespace-normal">
                  <p className="text-sm">前年の運用資産 = 運用資産フラグがついた資産の合計額</p>
                  <p className="text-sm mt-1">投資収益 = 前年の運用資産 × (運用利回り/100)</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-blue-800 mb-2">運用資産更新</h3>
              <div className="bg-white p-3 rounded-md border border-blue-100">
                <div className="whitespace-normal">
                  <p className="text-sm">当年の運用資産 = 前年の運用資産 + 当年の総投資額 + 当年の投資収益 + ライフイベントによる影響</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* キャッシュフロー計算式 */}
      <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => toggleSection('cashflow')}
        >
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-indigo-600 mr-2" />
            <h2 className="text-xl font-semibold text-indigo-800">7. キャッシュフロー計算式</h2>
          </div>
          {openSections.cashflow ? <ChevronUp className="h-5 w-5 text-indigo-600" /> : <ChevronDown className="h-5 w-5 text-indigo-600" />}
        </div>

        {openSections.cashflow && (
          <div className="mt-3 text-gray-700 space-y-4">
            <div>
              <h3 className="font-medium text-indigo-800 mb-2">個人キャッシュフロー</h3>
              <div className="bg-white p-3 rounded-md border border-indigo-100">
                <div className="whitespace-normal">
                  <p className="text-sm">総収入 = 給与収入 + 副業収入 + 配偶者収入 + 年金収入 + 配偶者年金収入 + 投資収益 + ライフイベント収入</p>
                  <p className="text-sm mt-1">総支出 = 生活費 + 住居費 + 教育費 + その他支出 + ライフイベント支出</p>
                  <p className="text-sm mt-1">収支 = 総収入 - 総支出</p>
                  <p className="text-sm mt-1">個人総資産 = 前年の個人総資産 + 当年の収支</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-indigo-800 mb-2">法人キャッシュフロー</h3>
              <div className="bg-white p-3 rounded-md border border-indigo-100">
                <div className="whitespace-normal">
                  <p className="text-sm">総収入 = 売上 + その他収入 + 投資収益 + ライフイベント収入</p>
                  <p className="text-sm mt-1">総支出 = 事業経費 + その他経費 + ライフイベント支出</p>
                  <p className="text-sm mt-1">収支 = 総収入 - 総支出</p>
                  <p className="text-sm mt-1">法人総資産 = 前年の法人総資産 + 当年の収支</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-indigo-800 mb-2">純資産計算</h3>
              <div className="bg-white p-3 rounded-md border border-indigo-100">
                <div className="whitespace-normal">
                  <p className="text-sm">個人負債総額 = 個人負債項目の合計</p>
                  <p className="text-sm mt-1">法人負債総額 = 法人負債項目の合計</p>
                  <p className="text-sm mt-1">個人純資産 = 個人総資産 - 個人負債総額</p>
                  <p className="text-sm mt-1">法人純資産 = 法人総資産 - 法人負債総額</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* スタートボタン */}
      <div className="mt-8 text-center">
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none"
          onClick={handleStart}
        >
          シミュレーションを始める
        </button>
      </div>
    </div>
  );
}
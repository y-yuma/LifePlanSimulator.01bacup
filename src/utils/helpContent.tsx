import React from 'react';
import { FormulaAccordion } from '@/components/common/FormulaAccordion';
import { FormulaSyntax } from '@/components/common/FormulaSyntax';

// 共通の用語解説コンテンツ
export const commonTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">基本用語</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">インフレーション率</span>: 物価上昇率のこと。生活費や住居費などが毎年どれくらい上昇するかを示す割合(%)。</li>
      <li><span className="font-bold">教育費上昇率</span>: 教育関連の費用(学費、教材費など)が毎年どれくらい上昇するかを示す割合(%)。</li>
      <li><span className="font-bold">資産運用利回り</span>: 投資した資産から得られる年間収益率(%)。</li>
      <li><span className="font-bold">投資割合</span>: 収入のうち、何%を投資に回すかの割合。</li>
      <li><span className="font-bold">最大投資額</span>: 年間に投資できる金額の上限(万円)。</li>
    </ul>
  </div>
);

// 基本情報ページの用語解説コンテンツ
export const basicInfoTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">基本用語</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">インフレーション率</span>: 物価上昇率のこと。生活費や住居費などが毎年どれくらい上昇するかを示す割合(%)。</li>
      <li><span className="font-bold">教育費上昇率</span>: 教育関連の費用(学費、教材費など)が毎年どれくらい上昇するかを示す割合(%)。</li>
      <li><span className="font-bold">資産運用利回り</span>: 投資した資産から得られる年間収益率(%)。</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">職業区分</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">会社員・公務員</span>: 給与から所得税・住民税・社会保険料が差し引かれ、厚生年金に加入。</li>
      <li><span className="font-bold">パート(厚生年金あり)</span>: 一定の労働時間・収入があり、厚生年金に加入しているパート勤務者。</li>
      <li><span className="font-bold">パート(厚生年金なし)</span>: 労働時間が短く、国民年金のみに加入しているパート勤務者。</li>
      <li><span className="font-bold">自営業・フリーランス</span>: 自身で収入を得て、確定申告を行い、国民年金に加入。</li>
      <li><span className="font-bold">専業主婦・夫</span>: 収入がなく、配偶者の扶養に入り、国民年金第3号被保険者となる場合が多い。</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">年金関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">国民年金（基礎年金）</span>: すべての国民が加入する公的年金制度。満額支給は現在約78万円/年。</li>
      <li><span className="font-bold">厚生年金</span>: 会社員・公務員などが加入する公的年金制度。基礎年金に上乗せされる。</li>
      <li><span className="font-bold">第3号被保険者</span>: 厚生年金加入者の被扶養配偶者。保険料納付なしで基礎年金を受け取れる。</li>
    </ul>
  </div>
);

// 収入ページの用語解説コンテンツ
export const incomeTermsContent = (
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
  </div>
);

// 支出ページの用語解説コンテンツ
export const expenseTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">支出分類</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">生活費</span>: 食費、日用品費、光熱費、通信費、交通費、娯楽費、衣服費など日常的な支出</li>
      <li><span className="font-bold">住居費</span>: 家賃、住宅ローン返済、管理費、修繕積立金、固定資産税など住居に関する支出</li>
      <li><span className="font-bold">教育費</span>: 保育料、幼稚園・学校の授業料、教材費、制服代、給食費、学習塾、習い事、受験費用など</li>
      <li><span className="font-bold">その他</span>: 医療費、保険料、冠婚葬祭費、旅行費、大型出費など上記に含まれない支出</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">経費関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">固定費</span>: 毎月一定額が必要な費用（家賃、ローン返済、保険料など）</li>
      <li><span className="font-bold">変動費</span>: 月によって金額が変わる費用（食費、光熱費、娯楽費など）</li>
      <li><span className="font-bold">特別支出</span>: 不定期に発生する大きな支出（旅行、冠婚葬祭、家電購入など）</li>
    </ul>
  </div>
);

// 資産・負債ページの用語解説コンテンツ
export const assetsLiabilitiesTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">資産関連の用語</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">現金・預金</span>: 手元資金、普通預金、定期預金などの流動性の高い資産</li>
      <li><span className="font-bold">投資資産</span>: 株式、債券、投資信託、不動産投資など収益を目的とした資産</li>
      <li><span className="font-bold">固定資産</span>: 不動産、車、貴金属、美術品など長期間保有する資産</li>
      <li><span className="font-bold">運用資産</span>: 投資対象として設定された資産で、運用利回りが適用される資産</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">負債関連の用語</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">住宅ローン</span>: 住宅購入のための長期ローン。通常、購入物件に担保が設定される</li>
      <li><span className="font-bold">教育ローン</span>: 教育費用のための目的別ローン</li>
      <li><span className="font-bold">クレジットカード</span>: カード利用による短期的な借入。リボ払いは高金利になりやすい</li>
      <li><span className="font-bold">元利均等返済</span>: 返済額（元金＋利息）が毎月一定になる返済方式</li>
      <li><span className="font-bold">金利</span>: 借入金に対して支払う利息の割合（年率）</li>
    </ul>
  </div>
);

// ライフイベントページの用語解説コンテンツ
export const lifeEventTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">ライフイベント関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">ライフイベント</span>: 人生における重要な出来事（結婚、出産、住宅購入、転職など）</li>
      <li><span className="font-bold">結婚費用</span>: 結婚式、新生活の準備、新婚旅行などにかかる費用</li>
      <li><span className="font-bold">出産・育児費用</span>: 出産費用、育児用品、保育料などの子育てにかかる費用</li>
      <li><span className="font-bold">住宅購入</span>: マイホーム取得にかかる費用（頭金、諸費用、ローン返済など）</li>
      <li><span className="font-bold">車購入</span>: 自動車取得にかかる費用（車両代、税金、保険、維持費など）</li>
      <li><span className="font-bold">転職・独立</span>: 転職時や独立開業時に発生する収入変動や必要経費</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">資金源区分</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">個人資産</span>: 個人の貯蓄や投資などから支出する資金</li>
      <li><span className="font-bold">法人資産</span>: 会社や事業体の資産から支出する資金</li>
      <li><span className="font-bold">借入金</span>: ローンなどで借り入れた資金</li>
      <li><span className="font-bold">贈与・相続</span>: 親族などからもらった資金</li>
    </ul>
  </div>
);

// キャッシュフローページの用語解説コンテンツ
export const cashFlowTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">キャッシュフロー関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">キャッシュフロー</span>: 一定期間の現金の流れ。収入と支出の差額</li>
      <li><span className="font-bold">収支</span>: 収入から支出を引いた差額。プラスなら黒字、マイナスなら赤字</li>
      <li><span className="font-bold">総資産</span>: 保有する資産の合計額</li>
      <li><span className="font-bold">純資産</span>: 総資産から負債を差し引いた金額。実質的な自己資産</li>
      <li><span className="font-bold">運用資産</span>: 投資に回している資産。運用利回りが適用される</li>
      <li><span className="font-bold">投資収益</span>: 運用資産から得られる収益</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">個人・法人区分</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">個人収支</span>: 個人の収入と支出の差額</li>
      <li><span className="font-bold">法人収支</span>: 法人（会社）の収入と支出の差額</li>
      <li><span className="font-bold">個人資産</span>: 個人名義で保有している資産</li>
      <li><span className="font-bold">法人資産</span>: 法人名義で保有している資産</li>
    </ul>
  </div>
);

// シミュレーション結果ページの用語解説コンテンツ
export const simulationResultsTermsContent = (
  <div className="space-y-4 text-sm">
    <h4 className="font-bold text-gray-800">シミュレーション関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">資産推移</span>: 時間経過に伴う資産の変化</li>
      <li><span className="font-bold">収支推移</span>: 時間経過に伴う収支の変化</li>
      <li><span className="font-bold">ライフステージ</span>: 人生の各段階（独身期、子育て期、老後期など）</li>
      <li><span className="font-bold">ファイナンシャルプラン</span>: 生涯にわたる資産形成・管理の計画</li>
    </ul>
    
    <h4 className="font-bold text-gray-800">グラフ関連</h4>
    <ul className="space-y-2">
      <li><span className="font-bold">折れ線グラフ</span>: 時系列データの変化を線で表したグラフ</li>
      <li><span className="font-bold">積み上げグラフ</span>: 複数項目の合計と内訳を表示するグラフ</li>
      <li><span className="font-bold">推移予測</span>: 現在の条件から将来の変化を予測したもの</li>
    </ul>
  </div>
);

// 基本情報ページの計算式コンテンツ
export const basicInfoFormulasContent = (
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
      title="年金計算基本式" 
      bgColor="bg-red-50" 
      textColor="text-red-800" 
      borderColor="border-red-200"
    >
      <FormulaSyntax formula={`国民年金（基礎年金） = 780,900円（満額） × (加入月数 ÷ 480)
厚生年金 = 平均標準報酬月額 × 乗率(5.481/1000) × 加入月数
公的年金 = 国民年金 + 厚生年金`} />
    </FormulaAccordion>
  </div>
);

// 収入ページの計算式コンテンツ
export const incomeFormulasContent = (
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
      title="資産運用計算式" 
      bgColor="bg-blue-50" 
      textColor="text-blue-800" 
      borderColor="border-blue-200"
    >
      <FormulaSyntax formula={`投資額 = min(収入額 × (投資割合/100), 最大投資額)
投資収益 = 前年の運用資産 × (運用利回り/100)
当年の運用資産 = 前年の運用資産 + 当年の総投資額 + 当年の投資収益`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="昇給計算式" 
      bgColor="bg-green-50" 
      textColor="text-green-800" 
      borderColor="border-green-200"
    >
      <FormulaSyntax formula={`昇給後の収入 = 基本収入 × (1 + 昇給率/100)^経過年数`} />
    </FormulaAccordion>
  </div>
);

// 支出ページの計算式コンテンツ
export const expenseFormulasContent = (
  <div className="space-y-4">
    <FormulaAccordion 
      title="生活費のインフレ調整" 
      bgColor="bg-green-50" 
      textColor="text-green-800" 
      borderColor="border-green-200"
    >
      <FormulaSyntax formula={`n年後の生活費 = 現在の生活費 × (1 + インフレ率/100)^n`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="住居費計算式（賃貸）" 
      bgColor="bg-orange-50" 
      textColor="text-orange-800" 
      borderColor="border-orange-200"
    >
      <FormulaSyntax formula={`年間家賃 = 月額賃料 × 12 × (1 + 年間上昇率/100)^経過年数
更新費用 = 更新料 × (経過年数 ÷ 更新間隔の小数点以下切り捨て)
年間住居費 = 年間家賃 + 更新費用`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="住居費計算式（所有）" 
      bgColor="bg-orange-50" 
      textColor="text-orange-800" 
      borderColor="border-orange-200"
    >
      <FormulaSyntax formula={`月利 = 年間金利 ÷ 12 ÷ 100
返済月数 = 返済年数 × 12

月々の返済額 = 借入額 × 月利 × (1 + 月利)^返済月数 ÷ ((1 + 月利)^返済月数 - 1)
年間ローン返済額 = 月々の返済額 × 12
年間維持費 = 購入金額 × (維持費率/100)
年間住居費 = 年間ローン返済額 + 年間維持費`} />
    </FormulaAccordion>
  </div>
);

// 資産・負債ページの計算式コンテンツ
export const assetsLiabilitiesFormulasContent = (
  <div className="space-y-4">
    <FormulaAccordion 
      title="元利均等返済計算式" 
      bgColor="bg-purple-50" 
      textColor="text-purple-800" 
      borderColor="border-purple-200"
    >
      <FormulaSyntax formula={`月利 = 年間金利 ÷ 12 ÷ 100
返済月数 = 返済年数 × 12

月々の返済額 = 借入額 × 月利 × (1 + 月利)^返済月数 ÷ ((1 + 月利)^返済月数 - 1)
年間返済額 = 月々の返済額 × 12`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="資産運用計算式" 
      bgColor="bg-blue-50" 
      textColor="text-blue-800" 
      borderColor="border-blue-200"
    >
      <FormulaSyntax formula={`投資収益 = 運用資産 × (運用利回り/100)
n年後の運用資産 = 現在の運用資産 × (1 + 運用利回り/100)^n`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="純資産計算式" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`純資産 = 総資産 - 総負債
総資産 = 現金・預金 + 投資資産 + 固定資産 + その他資産
総負債 = 住宅ローン + 教育ローン + カードローン + その他負債`} />
    </FormulaAccordion>
  </div>
);

// ライフイベントページの計算式コンテンツ
export const lifeEventFormulasContent = (
  <div className="space-y-4">
    <FormulaAccordion 
      title="ライフイベント影響計算" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`イベント発生年の収支 = 通常の収支 + イベントによる収入 - イベントによる支出
イベント発生年の資産 = 前年の資産 + イベント発生年の収支`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="教育費計算式" 
      bgColor="bg-purple-50" 
      textColor="text-purple-800" 
      borderColor="border-purple-200"
    >
      <FormulaSyntax formula={`子どもの年齢 = 基準年の子どもの年齢 + (計算年 - 基準年)

教育費 = 
  - 0～2歳: 保育園の費用(行かない場合は0)
  - 3～5歳: 幼稚園の費用(行かない場合は0)
  - 6～11歳: 小学校の費用
  - 12～14歳: 中学校の費用
  - 15～17歳: 高校の費用
  - 18～21歳: 大学の費用(行かない場合は0)
  - 上記以外: 0

インフレ調整教育費 = 教育費 × (1 + 教育費上昇率/100)^経過年数`} />
    </FormulaAccordion>
  </div>
);

// キャッシュフローページの計算式コンテンツ
export const cashFlowFormulasContent = (
  <div className="space-y-4">
    <FormulaAccordion 
      title="個人キャッシュフロー" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`総収入 = 給与収入 + 副業収入 + 配偶者収入 + 年金収入 + 配偶者年金収入 + 投資収益
総支出 = 生活費 + 住居費 + 教育費 + その他支出
収支 = 総収入 - 総支出
個人総資産 = 前年の個人総資産 + 当年の収支`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="法人キャッシュフロー" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`総収入 = 売上 + その他収入
総支出 = 事業経費 + その他経費
収支 = 総収入 - 総支出
法人総資産 = 前年の法人総資産 + 当年の収支`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="純資産計算" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`個人負債総額 = 個人負債項目の合計
法人負債総額 = 法人負債項目の合計

個人純資産 = 個人総資産 - 個人負債総額
法人純資産 = 法人総資産 - 法人負債総額`} />
    </FormulaAccordion>
  </div>
);

// シミュレーション結果ページの計算式コンテンツ
export const simulationResultsFormulasContent = (
  <div className="space-y-4">
    <FormulaAccordion 
      title="キャッシュフロー計算の総括" 
      bgColor="bg-indigo-50" 
      textColor="text-indigo-800" 
      borderColor="border-indigo-200"
    >
      <FormulaSyntax formula={`各年の収支 = その年の総収入 - その年の総支出
累積資産 = 初期資産 + Σ(各年の収支)
最終資産 = シミュレーション最終年の累積資産`} />
    </FormulaAccordion>
    
    <FormulaAccordion 
      title="資産運用の複利効果" 
      bgColor="bg-blue-50" 
      textColor="text-blue-800" 
      borderColor="border-blue-200"
    >
      <FormulaSyntax formula={`n年後の資産 = 元本 × (1 + 運用利回り/100)^n
複利効果 = n年後の資産 - 元本 - (元本 × 運用利回り/100 × n)`} />
    </FormulaAccordion>
  </div>
);
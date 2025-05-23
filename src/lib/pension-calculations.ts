import { PENSION_CONSTANTS } from './pension-constants';
import { BasicInfo, IncomeSection } from '../store/simulator';

// デバッグ機能を追加（必要に応じてコメントアウト可能）
const DEBUG = true;
function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// 標準報酬月額の計算（年金制度に基づく）
export function calculateStandardRemuneration(monthlyIncome: number): number {
  // 収入が0の場合は0を返す
  if (monthlyIncome <= 0) {
    return 0;
  }

  // 標準報酬月額表に基づく変換
  const grade = PENSION_CONSTANTS.STANDARD_REMUNERATION_TABLE.find(
    g => monthlyIncome >= g.min && monthlyIncome < g.max
  );

  // 該当するグレードが見つからない場合
  if (!grade) {
    // 最低等級未満の場合は最低等級の金額
    if (monthlyIncome < PENSION_CONSTANTS.STANDARD_REMUNERATION_TABLE[0].min) {
      return PENSION_CONSTANTS.STANDARD_REMUNERATION_TABLE[0].amount;
    }
    // 最高等級を超える場合は最高等級の金額
    return PENSION_CONSTANTS.STANDARD_REMUNERATION_TABLE[PENSION_CONSTANTS.STANDARD_REMUNERATION_TABLE.length - 1].amount;
  }
  
  return grade.amount;
}

// 標準賞与額の計算
export function calculateStandardBonus(bonusAmount: number): number {
  // 1回あたり150万円が上限
  return Math.min(bonusAmount, PENSION_CONSTANTS.MAX_MONTHLY_BONUS);
}

// 職歴から加入月数を計算
export function calculatePensionMonths(basicInfo: BasicInfo): {
  welfareMonths: number;
  welfareMonthsBefore2003: number;
  welfareMonthsAfter2003: number;
  nationalMonths: number;
  category3Months: number;
} {
  // 就労開始年齢が設定されていない場合は22歳をデフォルトとする
  const workStartAge = basicInfo.workStartAge || 22;
  
  // 退職年齢（明示的に指定されていない場合は60歳と仮定）
  const workEndAge = basicInfo.workEndAge || 60;
  
  // 就労年数（月数）を計算
  const workingYears = Math.max(0, workEndAge - workStartAge);
  const workingMonths = Math.round(workingYears * 12);
  
  // デバッグ出力
  logDebug("年金計算: 就労開始年齢", workStartAge);
  logDebug("年金計算: 就労終了年齢", workEndAge);
  logDebug("年金計算: 就労年数", workingYears);
  logDebug("年金計算: 就労月数", workingMonths);
  
  // 最大加入月数は480ヶ月（40年）
  const cappedWorkingMonths = Math.min(workingMonths, PENSION_CONSTANTS.FULL_PENSION_MONTHS);
  
  // 2003年4月時点でのユーザー年齢を計算
  const birthYear = new Date().getFullYear() - basicInfo.currentAge;
  const ageIn200304 = 2003 - birthYear + 4/12;
  
  // 2003年4月以前の就労月数
  let monthsUntil200304 = 0;
  if (ageIn200304 >= workStartAge) {
    // 2003年4月時点ですでに就労していた場合
    monthsUntil200304 = Math.round((ageIn200304 - workStartAge) * 12);
    // 2003年4月以前の月数も上限（240ヶ月=20年）を設ける
    monthsUntil200304 = Math.min(monthsUntil200304, 240);
  }
  
  // 2003年4月以降の就労月数（全体の月数から2003年4月以前の月数を引く）
  const monthsAfter200304 = Math.max(0, cappedWorkingMonths - monthsUntil200304);
  
  // デバッグ出力
  logDebug("年金計算: 2003年4月時点の年齢", ageIn200304);
  logDebug("年金計算: 2003年4月以前の就労月数", monthsUntil200304);
  logDebug("年金計算: 2003年4月以降の就労月数", monthsAfter200304);
  logDebug("年金計算: 上限適用後の就労月数", cappedWorkingMonths);
  
  let welfareMonths = 0;
  let welfareMonthsBefore2003 = 0;
  let welfareMonthsAfter2003 = 0;
  let nationalMonths = 0;
  let category3Months = 0;
  
  // 職業に応じた加入月数を計算
  switch (basicInfo.occupation) {
    case 'company_employee':
    case 'part_time_with_pension':
      welfareMonths = cappedWorkingMonths;
      welfareMonthsBefore2003 = monthsUntil200304;
      welfareMonthsAfter2003 = monthsAfter200304;
      break;
    case 'part_time_without_pension':
    case 'self_employed':
      nationalMonths = cappedWorkingMonths;
      break;
    case 'homemaker':
      // 専業主婦・夫は第3号被保険者として基礎年金に加入
      category3Months = cappedWorkingMonths;
      break;
  }
  
  return { 
    welfareMonths, 
    welfareMonthsBefore2003, 
    welfareMonthsAfter2003, 
    nationalMonths, 
    category3Months 
  };
}

// 入力データから平均給与を計算する関数
export function calculateAverageSalary(basicInfo: BasicInfo, incomeData: IncomeSection): number {
  // 給与収入項目を取得
  const salaryItem = incomeData.personal.find(item => item.name === '給与収入');
  if (!salaryItem) {
    logDebug("年金計算: 給与収入項目なし");
    return 0;
  }
  
  // 額面データを優先使用（なければ手取り）
  const salaryData = salaryItem._originalAmounts || salaryItem.amounts;
  
  // 入力された給与の合計と年数をカウント
  let totalInputSalary = 0;
  let inputYearsCount = 0;
  
  // すべての入力年の給与を合計
  Object.entries(salaryData).forEach(([year, amount]) => {
    if (amount > 0) {
      totalInputSalary += amount;
      inputYearsCount++;
      logDebug(`年金計算: 給与データ ${year}年 ${amount}万円`);
    }
  });
  
  // 入力が一つもない場合
  if (inputYearsCount === 0 || totalInputSalary === 0) {
    // 会社員または厚生年金ありパートの場合は、標準的な給与を仮定
    if (basicInfo.occupation === 'company_employee' || basicInfo.occupation === 'part_time_with_pension') {
      // 年収の入力がなければ、標準的な金額を設定
      // この部分に注意 - 年収がデータに設定されていない可能性
      const defaultAnnualIncome = 360; // 30万円×12ヶ月=360万円/年
      const monthlyIncome = defaultAnnualIncome * 10000 / 12; // 月収30万円
      
      logDebug("年金計算: 給与データなし、標準値を使用", defaultAnnualIncome, "万円/年");
      return monthlyIncome; // 月収30万円 (360万円/年)
    }
    return 0;
  }
  
  // 平均年収の計算（入力されている給与の平均）
  const averageYearlySalary = totalInputSalary / inputYearsCount;
  
  // デバッグ出力
  logDebug("年金計算: 平均年収", averageYearlySalary, "万円");
  
  // 年収を月額に換算（万円 → 円）
  return Math.round(averageYearlySalary * 10000 / 12);
}

// 基礎年金額を計算
export function calculateBasicPensionAmount(totalMonths: number): number {
  // 基礎年金額 = 780,900 × (納付月数 ÷ 480)
  const ratio = Math.min(totalMonths / PENSION_CONSTANTS.FULL_PENSION_MONTHS, 1);
  const amount = Math.floor(PENSION_CONSTANTS.BASIC_PENSION_FULL_AMOUNT * ratio);
  
  logDebug("年金計算: 基礎年金 - 加入月数", totalMonths);
  logDebug("年金計算: 基礎年金 - 比率", ratio);
  logDebug("年金計算: 基礎年金額", amount, "円/年");
  
  return amount;
}

// 厚生年金額を計算
export function calculateWelfarePensionAmount(
  avgStandardRemuneration: number,
  monthsBeforeApril2003: number,
  monthsAfterApril2003: number
): number {
  // 2003年3月以前分: 平均標準報酬月額 × 7.125/1000 × 加入月数
  const amountBefore2003 = avgStandardRemuneration * 
    PENSION_CONSTANTS.WELFARE_PENSION_RATE_BEFORE_2003 * 
    monthsBeforeApril2003;
  
  // 2003年4月以降分: 平均標準報酬月額 × 5.481/1000 × 加入月数
  const amountAfter2003 = avgStandardRemuneration * 
    PENSION_CONSTANTS.WELFARE_PENSION_RATE_AFTER_2003 * 
    monthsAfterApril2003;
  
  const totalAmount = Math.floor(amountBefore2003 + amountAfter2003);
  
  logDebug("年金計算: 厚生年金 - 平均標準報酬月額", avgStandardRemuneration, "円");
  logDebug("年金計算: 厚生年金 - 2003年3月以前分", amountBefore2003, "円/年");
  logDebug("年金計算: 厚生年金 - 2003年4月以降分", amountAfter2003, "円/年");
  logDebug("年金計算: 厚生年金総額", totalAmount, "円/年");
  
  return totalAmount;
}

// 繰上げ/繰下げによる調整率を計算
export function calculatePensionAdjustmentRate(pensionStartAge: number): number {
  const standardAge = PENSION_CONSTANTS.STANDARD_PENSION_START_AGE;
  const monthDiff = (pensionStartAge - standardAge) * 12;
  
  let adjustmentRate = 1.0;
  
  if (monthDiff === 0) {
    // 標準支給開始年齢の場合は調整なし
    adjustmentRate = 1.0;
  } else if (monthDiff < 0) {
    // 繰上げ受給（減額）: 1 か月につき -0.4%
    adjustmentRate = 1.0 - Math.abs(monthDiff) * PENSION_CONSTANTS.EARLY_PENSION_RATE_PER_MONTH;
  } else {
    // 繰下げ受給（増額）: 1 か月につき +0.7%
    adjustmentRate = 1.0 + monthDiff * PENSION_CONSTANTS.DELAYED_PENSION_RATE_PER_MONTH;
  }
  
  logDebug("年金計算: 調整率 - 月数差", monthDiff);
  logDebug("年金計算: 調整率", adjustmentRate);
  
  return adjustmentRate;
}

// 在職老齢年金制度による調整
export function adjustPensionForWorking(
  basicPension: number,
  welfarePension: number,
  monthlyIncome: number,
  age: number
): { basicPension: number; welfarePension: number } {
  // 収入がない場合は調整不要
  if (monthlyIncome <= 0) {
    return { basicPension, welfarePension };
  }

  // 月額に換算
  const monthlyBasicPension = basicPension / 12;
  const monthlyWelfarePension = welfarePension / 12;
  
  // 基礎年金は在職老齢年金の対象外
  let adjustedMonthlyWelfare = monthlyWelfarePension;
  
  // 年齢に応じた基準を選択
  const threshold = age < 65 ? 
    PENSION_CONSTANTS.PENSION_REDUCTION_UNDER_65.THRESHOLD : 
    PENSION_CONSTANTS.PENSION_REDUCTION_OVER_65.THRESHOLD;
  
  // 総報酬月額 = 月給 + 月額年金
  const totalMonthlyIncome = monthlyIncome + monthlyBasicPension + monthlyWelfarePension;
  
  // 基準額超過分を計算
  const excessAmount = Math.max(0, totalMonthlyIncome - threshold);
  
  // 支給停止額を計算: (超過額) ÷ 2
  const suspensionAmount = Math.min(monthlyWelfarePension, excessAmount / 2);
  
  // 調整後の厚生年金額
  adjustedMonthlyWelfare = monthlyWelfarePension - suspensionAmount;
  
  // デバッグ
  if (suspensionAmount > 0) {
    logDebug("年金計算: 在職老齢年金調整 - 月収", monthlyIncome, "円");
    logDebug("年金計算: 在職老齢年金調整 - 基準額", threshold, "円");
    logDebug("年金計算: 在職老齢年金調整 - 総月収", totalMonthlyIncome, "円");
    logDebug("年金計算: 在職老齢年金調整 - 超過額", excessAmount, "円");
    logDebug("年金計算: 在職老齢年金調整 - 支給停止額", suspensionAmount, "円/月");
    logDebug("年金計算: 在職老齢年金調整 - 調整後厚生年金", adjustedMonthlyWelfare, "円/月");
  }
  
  // 年額に戻して返す
  return {
    basicPension: basicPension, // 基礎年金は減額されない
    welfarePension: Math.floor(adjustedMonthlyWelfare * 12)
  };
}

// 実際の年金計算関数 - シミュレーター内の各年の年金額計算に使用
export function calculatePensionForYear(
  basicInfo: BasicInfo,
  incomeData: IncomeSection,
  year: number
): number {
  logDebug("======== 年金計算開始:", year, "年 ========");
  
  // 現在の年齢を計算
  const yearFromStart = year - basicInfo.startYear;
  const age = basicInfo.currentAge + yearFromStart;
  
  logDebug("年金計算: 年齢", age, "歳");
  
  // 年金受給開始年齢より前なら年金なし
  if (age < (basicInfo.pensionStartAge || 65)) {
    logDebug("年金計算: 受給開始年齢前のため0円");
    return 0;
  }
  
  // 重要: 計算用の職歴情報を準備
  // 実際の就労終了年齢を計算（将来の値も含む）
  const workEndAge = basicInfo.workEndAge || 60; // 指定がなければ60歳で退職と仮定
  
  // 修正されたbasicInfoを作成（計算用）
  const pensionCalcBasicInfo = {
    ...basicInfo,
    // 職歴情報を明示的に設定
    workEndAge: workEndAge
  };
  
  // 1. 職歴から加入月数を計算
  const { 
    welfareMonths, 
    welfareMonthsBefore2003, 
    welfareMonthsAfter2003, 
    nationalMonths, 
    category3Months 
  } = calculatePensionMonths(pensionCalcBasicInfo);
  
  // 2. 基礎年金額を計算（すべての人に共通）
  const totalMonths = welfareMonths + nationalMonths + category3Months;
  const basicPensionAmount = calculateBasicPensionAmount(totalMonths);
  
  // 3. 厚生年金額を計算（会社員・公務員、厚生年金加入のパートのみ）
  let welfarePensionAmount = 0;
  
  if (basicInfo.occupation === 'company_employee' || basicInfo.occupation === 'part_time_with_pension') {
    // 入力データから平均月収を計算
    const avgMonthlyIncome = calculateAverageSalary(basicInfo, incomeData);
    
    // 標準報酬月額に変換
    const avgStandardRemuneration = calculateStandardRemuneration(avgMonthlyIncome);
    
    // 厚生年金額を計算
    welfarePensionAmount = calculateWelfarePensionAmount(
      avgStandardRemuneration,
      welfareMonthsBefore2003,
      welfareMonthsAfter2003
    );
  }
  
  // 4. 繰上げ/繰下げ調整率を計算
  const adjustmentRate = calculatePensionAdjustmentRate(basicInfo.pensionStartAge || 65);
  
  // 5. 調整後の年金額を計算
  let adjustedBasicPension = Math.floor(basicPensionAmount * adjustmentRate);
  let adjustedWelfarePension = Math.floor(welfarePensionAmount * adjustmentRate);
  
  // 6. 在職老齢年金制度による調整（年金受給開始後も就労している場合）
  if (basicInfo.willWorkAfterPension && age >= (basicInfo.pensionStartAge || 65)) {
    // 給与収入項目を取得
    const salaryItem = incomeData.personal.find(item => item.name === '給与収入');
    
    // その年の給与があれば、在職老齢年金制度による調整を適用
    if (salaryItem && salaryItem.amounts[year] > 0) {
      const currentYearSalary = salaryItem.amounts[year];
      const monthlyIncome = currentYearSalary * 10000 / 12; // 万円→円の月額に変換
      
      const { basicPension, welfarePension } = adjustPensionForWorking(
        adjustedBasicPension,
        adjustedWelfarePension,
        monthlyIncome,
        age
      );
      
      adjustedBasicPension = basicPension;
      adjustedWelfarePension = welfarePension;
    }
  }
  
  // 7. 年金総額（円）
  const totalPensionYen = adjustedBasicPension + adjustedWelfarePension;
  
  // 8. 万円単位に変換して小数点第一位で四捨五入
  const totalPensionManYen = Math.round(totalPensionYen / 10000 * 10) / 10;
  
  logDebug("年金計算: 調整後基礎年金", adjustedBasicPension, "円/年");
  logDebug("年金計算: 調整後厚生年金", adjustedWelfarePension, "円/年");
  logDebug("年金計算: 年金総額", totalPensionYen, "円/年");
  logDebug("年金計算: 年金総額", totalPensionManYen, "万円/年");
  logDebug("======== 年金計算終了 ========");
  
  return totalPensionManYen;
}

// 配偶者の年金を計算する関数
export function calculateSpousePensionForYear(
  basicInfo: BasicInfo,
  incomeData: IncomeSection,
  year: number
): number {
  logDebug("======== 配偶者年金計算開始:", year, "年 ========");
  
  // 配偶者がいない場合は0を返す
  if (basicInfo.maritalStatus === 'single') {
    logDebug("配偶者年金計算: 配偶者なし");
    return 0;
  }
  
  // 配偶者の年齢を計算
  let spouseAge = 0;
  
  if (basicInfo.maritalStatus === 'married' && basicInfo.spouseInfo?.currentAge) {
    // 既婚の場合
    spouseAge = basicInfo.spouseInfo.currentAge + (year - basicInfo.startYear);
    logDebug("配偶者年金計算: 配偶者年齢", spouseAge, "歳");
  } else if (basicInfo.maritalStatus === 'planning' && basicInfo.spouseInfo?.marriageAge && basicInfo.spouseInfo?.age) {
    // 結婚予定の場合
    const marriageYear = basicInfo.startYear + (basicInfo.spouseInfo.marriageAge - basicInfo.currentAge);
    
    // 結婚前は配偶者なし
    if (year < marriageYear) {
      logDebug("配偶者年金計算: 結婚前のため0円");
      return 0;
    }
    
    // 結婚後の配偶者の年齢
    const ageAtMarriage = basicInfo.spouseInfo.age;
    spouseAge = ageAtMarriage + (year - marriageYear);
    logDebug("配偶者年金計算: 結婚後の配偶者年齢", spouseAge, "歳");
  } else {
    // 配偶者の情報が不完全
    logDebug("配偶者年金計算: 配偶者情報不足");
    return 0;
  }
  
  // 配偶者の年金受給開始年齢（デフォルト65歳）
  const spousePensionStartAge = basicInfo.spouseInfo?.pensionStartAge || 65;
  
  // 受給開始年齢に達していなければ0
  if (spouseAge < spousePensionStartAge) {
    logDebug("配偶者年金計算: 受給開始年齢前のため0円");
    return 0;
  }

  // 配偶者の職業タイプに基づいて年金種別を判断
  const spouseOccupation = basicInfo.spouseInfo?.occupation || 'homemaker';
  
  // 配偶者用のbasicInfoを作成
  const spouseBasicInfo = {
    ...basicInfo,
    currentAge: spouseAge - (year - basicInfo.startYear), // 現在の年齢に修正
    occupation: spouseOccupation,
    workStartAge: basicInfo.spouseInfo?.workStartAge || 22,
    workEndAge: 60, // 標準的な退職年齢
    pensionStartAge: spousePensionStartAge,
    willWorkAfterPension: basicInfo.spouseInfo?.willWorkAfterPension || false
  };
  
  logDebug("配偶者年金計算: 配偶者職業", spouseOccupation);
  
  // 配偶者収入項目を取得して給与収入として計算するための準備
  const spouseIncomeItem = incomeData.personal.find(item => item.name === '配偶者収入');
  
  // 配偶者用の収入データを作成
  const spouseIncomeData = {
    ...incomeData,
    personal: incomeData.personal.map(item => {
      if (item.name === '配偶者収入') {
        return {
          ...item,
          name: '給与収入' // 計算のために名前を変更
        };
      }
      return item;
    })
  };
  
  // 配偶者の年金を計算
  // 1. 職歴から加入月数を計算
  const { 
    welfareMonths, 
    welfareMonthsBefore2003, 
    welfareMonthsAfter2003, 
    nationalMonths, 
    category3Months 
  } = calculatePensionMonths(spouseBasicInfo);
  
  // 2. 基礎年金額を計算（すべての人に共通）
  const totalMonths = welfareMonths + nationalMonths + category3Months;
  const basicPensionAmount = calculateBasicPensionAmount(totalMonths);
  
  // 3. 厚生年金額を計算（会社員・公務員、厚生年金加入のパートのみ）
  let welfarePensionAmount = 0;
  
  if (spouseOccupation === 'company_employee' || spouseOccupation === 'part_time_with_pension') {
    // 入力データから平均月収を計算
    let avgMonthlyIncome = 0;
    
    if (spouseIncomeItem) {
      const spouseSalaryData = spouseIncomeItem._originalAmounts || spouseIncomeItem.amounts;
      
      let totalSalary = 0;
      let salaryYearsCount = 0;
      
      // 入力された給与の平均を計算
      Object.entries(spouseSalaryData).forEach(([yearKey, amount]) => {
        if (amount > 0) {
          totalSalary += amount;
          salaryYearsCount++;
          logDebug(`配偶者年金計算: 給与データ ${yearKey}年 ${amount}万円`);
        }
      });
      
      if (salaryYearsCount > 0) {
        const avgYearlySalary = totalSalary / salaryYearsCount;
        avgMonthlyIncome = avgYearlySalary * 10000 / 12; // 万円→円の月額に変換
        logDebug("配偶者年金計算: 平均年収", avgYearlySalary, "万円");
      } else {
        // 入力データがない場合、標準的な給与を仮定
        avgMonthlyIncome = 25 * 10000; // 25万円/月（年収300万円相当）
        logDebug("配偶者年金計算: 給与データなし、標準値を使用 300万円/年");
      }
    } else {
      // 配偶者収入項目がない場合、標準的な給与を仮定
      avgMonthlyIncome = 25 * 10000; // 25万円/月（年収300万円相当）
      logDebug("配偶者年金計算: 収入項目なし、標準値を使用 300万円/年");
    }
    
    // 標準報酬月額に変換
    const avgStandardRemuneration = calculateStandardRemuneration(avgMonthlyIncome);
    
    // 厚生年金額を計算
    welfarePensionAmount = calculateWelfarePensionAmount(
      avgStandardRemuneration,
      welfareMonthsBefore2003,
      welfareMonthsAfter2003
    );
  }
  
  // 4. 繰上げ/繰下げ調整率を計算
  const adjustmentRate = calculatePensionAdjustmentRate(spousePensionStartAge);
  
  // 5. 調整後の年金額を計算
  let adjustedBasicPension = Math.floor(basicPensionAmount * adjustmentRate);
  let adjustedWelfarePension = Math.floor(welfarePensionAmount * adjustmentRate);
  
  // 6. 在職老齢年金制度による調整（年金受給開始後も就労している場合）
  if (spouseBasicInfo.willWorkAfterPension && spouseAge >= spousePensionStartAge && spouseIncomeItem) {
    // その年の給与があれば、在職老齢年金制度による調整を適用
    const currentYearSalary = spouseIncomeItem.amounts[year] || 0;
    
    if (currentYearSalary > 0) {
      const monthlyIncome = currentYearSalary * 10000 / 12; // 万円→円の月額に変換
      
      const { basicPension, welfarePension } = adjustPensionForWorking(
        adjustedBasicPension,
        adjustedWelfarePension,
        monthlyIncome,
        spouseAge
      );
      
      adjustedBasicPension = basicPension;
      adjustedWelfarePension = welfarePension;
    }
  }
  
  // 7. 年金総額（円）
  const totalPensionYen = adjustedBasicPension + adjustedWelfarePension;
  
  // 8. 万円単位に変換して小数点第一位で四捨五入
  const totalPensionManYen = Math.round(totalPensionYen / 10000 * 10) / 10;
  
  logDebug("配偶者年金計算: 調整後基礎年金", adjustedBasicPension, "円/年");
  logDebug("配偶者年金計算: 調整後厚生年金", adjustedWelfarePension, "円/年");
  logDebug("配偶者年金計算: 年金総額", totalPensionYen, "円/年");
  logDebug("配偶者年金計算: 年金総額", totalPensionManYen, "万円/年");
  logDebug("======== 配偶者年金計算終了 ========");
  
  return totalPensionManYen;
}
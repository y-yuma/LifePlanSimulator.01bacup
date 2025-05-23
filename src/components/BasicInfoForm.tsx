import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSimulatorStore } from '@/store/simulator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { basicInfoTermsContent, basicInfoFormulasContent } from '@/utils/helpContent';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 251 }, (_, i) => 1900 + i);
const ages = Array.from({ length: 121 }, (_, i) => i);
const yearsFromNow = Array.from({ length: 31 }, (_, i) => i);

const educationTypes = ['公立', '私立', '行かない'] as const;
const universityTypes = ['国立大学（文系）', '国立大学（理系）', '私立大学（文系）', '私立大学（理系）', '行かない'] as const;

const basicInfoSchema = z.object({
  currentAge: z.number().min(0).max(120),
  startYear: z.number().min(1900).max(2150),
  deathAge: z.number().min(0).max(120),
  gender: z.enum(['male', 'female']),
  monthlyLivingExpense: z.number().min(0),
  occupation: z.enum(['company_employee', 'part_time_with_pension', 'part_time_without_pension', 'self_employed', 'homemaker']),
  maritalStatus: z.enum(['single', 'married', 'planning']),
  housingInfo: z.object({
    type: z.enum(['rent', 'own']),
    rent: z.object({
      monthlyRent: z.number().min(0),
      annualIncreaseRate: z.number().min(0),
      renewalFee: z.number().min(0),
      renewalInterval: z.number().min(0),
    }).optional(),
    own: z.object({
      purchaseYear: z.number().min(1900).max(2150),
      purchasePrice: z.number().min(0),
      loanAmount: z.number().min(0),
      interestRate: z.number().min(0),
      loanTermYears: z.number().min(1).max(50),
      maintenanceCostRate: z.number().min(0).max(100),
    }).optional(),
  }),
  spouseInfo: z.object({
    age: z.number().min(0).max(120).optional(),
    currentAge: z.number().min(0).max(120).optional(),
    marriageAge: z.number().min(0).max(120).optional(),
    occupation: z.enum(['company_employee', 'part_time_with_pension', 'part_time_without_pension', 'self_employed', 'homemaker']).optional(),
    additionalExpense: z.number().min(0).optional(),
  }).optional(),
  children: z.array(
    z.object({
      currentAge: z.number().min(0).max(120),
      educationPlan: z.object({
        nursery: z.enum(educationTypes),
        preschool: z.enum(educationTypes),
        elementary: z.enum(educationTypes),
        juniorHigh: z.enum(educationTypes),
        highSchool: z.enum(educationTypes),
        university: z.enum(universityTypes),
      }),
    })
  ),
  plannedChildren: z.array(
    z.object({
      yearsFromNow: z.number().min(0).max(30),
      educationPlan: z.object({
        nursery: z.enum(educationTypes),
        preschool: z.enum(educationTypes),
        elementary: z.enum(educationTypes),
        juniorHigh: z.enum(educationTypes),
        highSchool: z.enum(educationTypes),
        university: z.enum(universityTypes),
      }),
    })
  ),
  // 年金関連のフィールド
  workStartAge: z.number().min(15).max(120),
  pensionStartAge: z.number().min(60).max(75),
  willWorkAfterPension: z.boolean(),
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

export function BasicInfoForm() {
  const { basicInfo, setBasicInfo, setCurrentStep } = useSimulatorStore();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      ...basicInfo,
      maritalStatus: basicInfo.maritalStatus || 'single',
      housingInfo: basicInfo.housingInfo || {
        type: 'rent',
        rent: {
          monthlyRent: 0,
          annualIncreaseRate: 0,
          renewalFee: 0,
          renewalInterval: 2,
        },
      },
      // 年金関連の初期値
      workStartAge: basicInfo.workStartAge || 22,
      pensionStartAge: basicInfo.pensionStartAge || 65,
      willWorkAfterPension: basicInfo.willWorkAfterPension || false,
    },
  });

  const maritalStatus = watch('maritalStatus');
  const children = watch('children') || [];
  const plannedChildren = watch('plannedChildren') || [];
  const housingType = watch('housingInfo.type');
  const startYear = watch('startYear');

  const onSubmit = (data: BasicInfoFormData) => {
    setBasicInfo(data);
    setCurrentStep(2);
  };

  const handleMaritalStatusChange = (value: string) => {
    setValue('maritalStatus', value as 'single' | 'married' | 'planning');
    setValue('spouseInfo', undefined);
  };

  const handleHousingTypeChange = (value: 'rent' | 'own') => {
    if (value === 'rent') {
      setValue('housingInfo', {
        type: 'rent',
        rent: {
          monthlyRent: 0,
          annualIncreaseRate: 0,
          renewalFee: 0,
          renewalInterval: 2,
        },
      }, { shouldValidate: true });
    } else {
      setValue('housingInfo', {
        type: 'own',
        own: {
          purchaseYear: startYear || currentYear,
          purchasePrice: 0,
          loanAmount: 0,
          interestRate: 0,
          loanTermYears: 35,
          maintenanceCostRate: 1,
        },
      }, { shouldValidate: true });
    }
  };

  const addChild = () => {
    setValue('children', [
      ...children,
      {
        currentAge: 0,
        educationPlan: {
          nursery: '公立',
          preschool: '公立',
          elementary: '公立',
          juniorHigh: '公立',
          highSchool: '公立',
          university: '国立大学（文系）',
        },
      },
    ]);
  };

  const removeChild = (index: number) => {
    setValue(
      'children',
      children.filter((_, i) => i !== index)
    );
  };

  const addPlannedChild = () => {
    setValue('plannedChildren', [
      ...plannedChildren,
      {
        yearsFromNow: 0,
        educationPlan: {
          nursery: '公立',
          preschool: '公立',
          elementary: '公立',
          juniorHigh: '公立',
          highSchool: '公立',
          university: '国立大学（文系）',
        },
      },
    ]);
  };

  const removePlannedChild = (index: number) => {
    setValue(
      'plannedChildren',
      plannedChildren.filter((_, i) => i !== index)
    );
  };

  const renderEducationSelect = (level: string, index: number, isPlannedChild: boolean = false) => {
    const path = isPlannedChild ? `plannedChildren.${index}.educationPlan.${level}` : `children.${index}.educationPlan.${level}`;
    const types = level === 'university' ? universityTypes : educationTypes;
    const labels = {
      nursery: '保育所',
      preschool: '幼稚園',
      elementary: '小学校',
      juniorHigh: '中学校',
      highSchool: '高校',
      university: '大学',
    };

    return (
      <div key={level} className="space-y-2">
        <label className="text-sm font-medium">
          {labels[level as keyof typeof labels]}
        </label>
        <Select
          defaultValue={isPlannedChild ? plannedChildren[index]?.educationPlan[level] : children[index]?.educationPlan[level]}
          onValueChange={(value) => setValue(path, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="種別を選択" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">基本個人情報</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              現在の年齢
              <TermTooltip term="" width="narrow">
                シミュレーション開始時点での年齢です。この年齢を基準に将来の各年齢での収支が計算されます。
              </TermTooltip>
            </label>
            <Select 
              defaultValue={basicInfo.currentAge?.toString()}
              onValueChange={(value) => setValue('currentAge', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="年齢を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {ages.map((age) => (
                  <SelectItem key={age} value={age.toString()}>
                    {age}歳
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currentAge && (
              <p className="text-sm text-red-500">{errors.currentAge.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              開始年度
              <TermTooltip term="" width="narrow">
                シミュレーションを開始する年です。通常は現在の年を入力します。
              </TermTooltip>
            </label>
            <Select
              defaultValue={basicInfo.startYear?.toString()}
              onValueChange={(value) => setValue('startYear', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="年度を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.startYear && (
              <p className="text-sm text-red-500">{errors.startYear.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              死亡想定年齢
              <TermTooltip term="" width="narrow">
                シミュレーションの終了年齢です。日本人の平均寿命は男性約81歳、女性約87歳ですが、長生きリスクに備えて90歳以上を設定するのが一般的です。
              </TermTooltip>
            </label>
            <Select
              defaultValue={basicInfo.deathAge?.toString()}
              onValueChange={(value) => setValue('deathAge', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="年齢を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {ages.map((age) => (
                  <SelectItem key={age} value={age.toString()}>
                    {age}歳
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deathAge && (
              <p className="text-sm text-red-500">{errors.deathAge.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">性別</label>
            <Select
              defaultValue={basicInfo.gender}
              onValueChange={(value) => setValue('gender', value as 'male' | 'female')}
            >
              <SelectTrigger>
                <SelectValue placeholder="性別を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男性</SelectItem>
                <SelectItem value="female">女性</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-500">{errors.gender.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            月額生活費（万円）
            <TermTooltip term="" width="wide">
              食費、日用品費、光熱費、通信費、交通費、娯楽費など日常的な支出の合計額（月額・万円）です。住居費、教育費は別途計算するので含めないでください。
            </TermTooltip>
          </label>
          <input
            type="number"
            defaultValue={basicInfo.monthlyLivingExpense}
            onChange={(e) => setValue('monthlyLivingExpense', parseFloat(e.target.value))}
            className="w-full rounded-md border border-gray-200 px-3 py-2"
          />
          {errors.monthlyLivingExpense && (
            <p className="text-sm text-red-500">{errors.monthlyLivingExpense.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            職業
            <TermTooltip term="" width="wide">
              <ul className="list-disc pl-4 space-y-1">
                <li>会社員・公務員: 給与から所得税・住民税・社会保険料が差し引かれ、厚生年金に加入</li>
                <li>パート(厚生年金あり): 一定の労働時間・収入があり、厚生年金に加入しているパート勤務者</li>
                <li>パート(厚生年金なし): 労働時間が短く、国民年金のみに加入しているパート勤務者</li>
                <li>自営業・フリーランス: 自身で収入を得て、確定申告を行い、国民年金に加入</li>
                <li>専業主婦・夫: 収入がなく、配偶者の扶養に入り、国民年金第3号被保険者となる場合が多い</li>
              </ul>
            </TermTooltip>
          </label>
          <Select
            defaultValue={basicInfo.occupation}
            onValueChange={(value) => setValue('occupation', value as BasicInfoFormData['occupation'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="職業を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_employee">会社員・公務員（契約社員含む）</SelectItem>
              <SelectItem value="part_time_with_pension">パート・アルバイト（厚生年金あり）</SelectItem>
              <SelectItem value="part_time_without_pension">パート・アルバイト（厚生年金なし）</SelectItem>
              <SelectItem value="self_employed">自営業・フリーランス</SelectItem>
              <SelectItem value="homemaker">専業主婦・夫（収入なし）</SelectItem>
            </SelectContent>
          </Select>
          {errors.occupation && (
            <p className="text-sm text-red-500">職業を選択してください</p>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            住居費設定
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">住居タイプ</label>
              <Select
                value={housingType}
                onValueChange={handleHousingTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="住居タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">賃貸</SelectItem>
                  <SelectItem value="own">住宅購入／ローン</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {housingType === 'rent' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    初期賃料（万円/月）
                    <TermTooltip term="" width="narrow">
                      月額の家賃（管理費・共益費を含む）です。単位は万円です。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.rent.monthlyRent', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    年間上昇率（%）
                    <TermTooltip term="" width="narrow">
                      家賃の年間上昇率です。一般的には0〜2%程度です。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('housingInfo.rent.annualIncreaseRate', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    更新料（万円）
                    <TermTooltip term="" width="narrow">
                      契約更新時の更新料です。一般的には1〜2ヶ月分の家賃が相場です。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('housingInfo.rent.renewalFee', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    更新間隔（年）
                    <TermTooltip term="" width="narrow">
                      契約更新の間隔です。一般的には2年間です。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.rent.renewalInterval', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
              </div>
            )}

            {housingType === 'own' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    購入予定年
                    <TermTooltip term="" width="narrow">
                      住宅を購入する予定の年です。通常は現在か将来の年を入力します。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.own.purchaseYear', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    購入金額（万円）
                    <TermTooltip term="" width="narrow">
                      住宅の購入価格です。単位は万円です。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.own.purchasePrice', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    借入額（万円）
                    <TermTooltip term="" width="narrow">
                      住宅ローンの総額です。購入金額から頭金を差し引いた金額になります。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.own.loanAmount', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    ローン金利（%）
                    <TermTooltip term="" width="narrow">
                      住宅ローンの年間金利です。変動金利の場合は平均的な想定金利を入力してください。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('housingInfo.own.interestRate', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    返済期間（年）
                    <TermTooltip term="" width="narrow">
                      住宅ローンの返済年数です。一般的には25〜35年が多いです。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    {...register('housingInfo.own.loanTermYears', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    住宅維持費率（%）
                    <TermTooltip term="" width="narrow">
                      購入金額に対する年間の維持費の割合です。修繕費、火災保険、固定資産税などが含まれます。
                    </TermTooltip>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('housingInfo.own.maintenanceCostRate', { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                  <p className="text-xs text-gray-500">購入金額に対する年間の維持費の割合</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            配偶者情報
            <TermTooltip term="" width="wide">
              配偶者の情報を入力することで、世帯全体の収支シミュレーションが可能になります。
              配偶者の年齢、職業、収入なども考慮されます。
            </TermTooltip>
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">婚姻状況</label>
            <Select
              defaultValue={maritalStatus}
              onValueChange={handleMaritalStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="状況を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">未婚</SelectItem>
                <SelectItem value="married">既婚</SelectItem>
                <SelectItem value="planning">結婚予定</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {maritalStatus === 'married' && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  配偶者の現在の年齢
                  <TermTooltip term="" width="narrow">
                    配偶者の現在の年齢です。年金や退職時期の計算に使用されます。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={basicInfo.spouseInfo?.currentAge?.toString()}
                  onValueChange={(value) => setValue('spouseInfo.currentAge', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年齢を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ages.map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age}歳
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  配偶者の職業
                  <TermTooltip term="" width="wide">
                    配偶者の職業です。年金計算や税金計算に影響します。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={basicInfo.spouseInfo?.occupation}
                  onValueChange={(value) => setValue('spouseInfo.occupation', value as BasicInfoFormData['occupation'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="職業を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_employee">会社員・公務員（契約社員含む）</SelectItem>
                    <SelectItem value="part_time_with_pension">パート・アルバイト（厚生年金あり）</SelectItem>
                    <SelectItem value="part_time_without_pension">パート・アルバイト（厚生年金なし）</SelectItem>
                    <SelectItem value="self_employed">自営業・フリーランス</SelectItem>
                    <SelectItem value="homemaker">専業主婦・夫（収入なし）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {maritalStatus === 'planning' && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  結婚予定年齢
                  <TermTooltip term="" width="narrow">
                    あなたが結婚予定の年齢です。この年齢以降、配偶者の情報が計算に反映されます。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={basicInfo.spouseInfo?.marriageAge?.toString()}
                  onValueChange={(value) => setValue('spouseInfo.marriageAge', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年齢を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ages.map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age}歳
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  結婚時配偶者の年齢
                  <TermTooltip term="" width="narrow">
                    結婚時の配偶者の年齢です。年金や退職時期の計算に使用されます。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={basicInfo.spouseInfo?.age?.toString()}
                  onValueChange={(value) => setValue('spouseInfo.age', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年齢を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ages.map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age}歳
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  配偶者の職業
                  <TermTooltip term="" width="wide">
                    配偶者の職業です。年金計算や税金計算に影響します。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={basicInfo.spouseInfo?.occupation}
                  onValueChange={(value) => setValue('spouseInfo.occupation', value as BasicInfoFormData['occupation'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="職業を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_employee">会社員・公務員（契約社員含む）</SelectItem>
                    <SelectItem value="part_time_with_pension">パート・アルバイト（厚生年金あり）</SelectItem>
                    <SelectItem value="part_time_without_pension">パート・アルバイト（厚生年金なし）</SelectItem>
                    <SelectItem value="self_employed">自営業・フリーランス</SelectItem>
                    <SelectItem value="homemaker">専業主婦・夫（収入なし）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  結婚による生活費の増加（万円）
                  <TermTooltip term="" width="narrow">
                    結婚によって増加する月額生活費です。単位は万円です。
                  </TermTooltip>
                </label>
                <input
                  type="number"
                  defaultValue={basicInfo.spouseInfo?.additionalExpense}
                  onChange={(e) => setValue('spouseInfo.additionalExpense', parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            年金設定
            <TermTooltip term="" width="wide">
              公的年金の受給開始時期や加入期間を設定します。これらの設定は老後の収入に大きく影響します。
            </TermTooltip>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                就職開始年齢
                <TermTooltip term="" width="narrow">
                  就職して年金に加入し始めた年齢です。年金額の計算に影響します。
                </TermTooltip>
              </label>
              <Select
                defaultValue={basicInfo.workStartAge?.toString()}
                onValueChange={(value) => setValue('workStartAge', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="年齢を選択" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Array.from({ length: basicInfo.currentAge + 20 }, (_, i) => i + 15).map((age) => (
                    <SelectItem key={age} value={age.toString()}>
                      {age}歳
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                就職して年金に加入し始めた年齢を選択してください。
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                年金受給開始希望年齢
                <TermTooltip term="" width="medium">
                  年金の受給を開始する年齢です。60〜75歳の間で選択可能で、繰上げ・繰下げにより年金額が変動します。
                </TermTooltip>
              </label>
              <Select
                defaultValue={basicInfo.pensionStartAge?.toString()}
                onValueChange={(value) => setValue('pensionStartAge', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="年齢を選択" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-auto">
                  {Array.from({ length: 26 }, (_, i) => i + 60).map((age) => (
                    <SelectItem key={age} value={age.toString()}>
                      {age}歳
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                60～85歳の間で選択可能。標準は65歳です。繰上げ・繰下げにより年金額が変動します。
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                年金受給開始後の就労
                <TermTooltip term="" width="medium">
                  年金を受給しながら働き続けるかどうかの設定です。在職老齢年金制度により、収入によって年金額が調整される場合があります。
                </TermTooltip>
              </label>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="workAfterPensionYes"
                    value="true"
                    checked={watch('willWorkAfterPension') === true}
                    onChange={() => setValue('willWorkAfterPension', true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="workAfterPensionYes" className="ml-2 text-sm">あり</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="workAfterPensionNo"
                    value="false"
                    checked={watch('willWorkAfterPension') === false}
                    onChange={() => setValue('willWorkAfterPension', false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="workAfterPensionNo" className="ml-2 text-sm">なし</label>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                在職老齢年金制度により、就労収入によって年金が調整される場合があります。
              </p>
            </div>
          </div>
          
          {/* 年金制度の説明パネル */}
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">年金制度について</h4>
            <div className="text-sm text-blue-700 space-y-2">
              <p>公的年金は「国民年金（基礎年金）」と「厚生年金」の2階建て構造です。</p>
              <p>国民年金は全ての方が加入し、厚生年金は会社員・公務員の方が加入します。</p>
              <p>繰上げ受給（60〜64歳）は月あたり0.4%減額、繰下げ受給（66〜75歳）は月あたり0.7%増額されます。</p>
              <p>在職老齢年金制度により、年金受給中に一定以上の収入がある場合、年金の一部または全部が支給停止となる場合があります。</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              子ども情報
              <TermTooltip term="" width="wide">
                子どもの情報を登録すると、教育費などの将来の支出が計算に反映されます。
                特に教育プランは大きなコストになるため、慎重に設定しましょう。
              </TermTooltip>
            </h3>
            <button
              type="button"
              onClick={addChild}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              子どもを追加
            </button>
          </div>

          {children.map((child, index) => (
            <div key={index} className="space-y-4 border-l-2 border-gray-200 pl-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium">第{index + 1}子</h4>
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  削除
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  現在の年齢
                  <TermTooltip term="" width="narrow">
                    子どもの現在の年齢です。教育費の計算に使用されます。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={child.currentAge?.toString()}
                  onValueChange={(value) =>
                    setValue(`children.${index}.currentAge`, parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年齢を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ages.map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age}歳
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-medium">
                  教育プラン
                  <TermTooltip term="" width="wide">
                    子どもの教育プランです。各段階ごとに公立/私立を選択できます。
                    費用は公立と私立で大きく異なります。
                  </TermTooltip>
                </h5>
                {['nursery', 'preschool', 'elementary', 'juniorHigh', 'highSchool', 'university'].map(
                  (level) => renderEducationSelect(level, index)
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              出生予定の子ども
              <TermTooltip term="" width="wide">
                将来生まれる予定の子どもについての情報です。
                出生時期と教育プランに基づいて将来の教育費が計算されます。
              </TermTooltip>
            </h3>
            <button
              type="button"
              onClick={addPlannedChild}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              出生予定を追加
            </button>
          </div>

          {plannedChildren.map((child, index) => (
            <div key={index} className="space-y-4 border-l-2 border-gray-200 pl-4">
              <div className="flex justify-between items-center">
                <h4 className="text-md font-medium">出生予定 {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removePlannedChild(index)}
                  className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  削除
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  出生予定時期（何年後）
                  <TermTooltip term="" width="narrow">
                    子どもが生まれる予定の時期です。現在から何年後かを選択します。
                  </TermTooltip>
                </label>
                <Select
                  defaultValue={child.yearsFromNow?.toString()}
                  onValueChange={(value) =>
                    setValue(`plannedChildren.${index}.yearsFromNow`, parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="年数を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {yearsFromNow.map((years) => (
                      <SelectItem key={years} value={years.toString()}>
                        {years}年後
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h5 className="text-sm font-medium">教育プラン</h5>
                {['nursery', 'preschool', 'elementary', 'juniorHigh', 'highSchool', 'university'].map(
                  (level) => renderEducationSelect(level, index, true)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          次へ
        </button>
      </div>
      
      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: basicInfoTermsContent },
          { id: 'formulas', label: '計算式', content: basicInfoFormulasContent }
        ]} 
      />
    </form>
  );
}
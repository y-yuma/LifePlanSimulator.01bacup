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
import { ArrowUpDown, Trash2 } from 'lucide-react';
// ヘルプ関連のインポート
import { TermTooltip } from '@/components/common/TermTooltip';
import { ContextHelp } from '@/components/common/ContextHelp';
import { lifeEventTermsContent, lifeEventFormulasContent } from '@/utils/helpContent';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 51 }, (_, i) => currentYear + i);

const lifeEventSchema = z.object({
  year: z.number(),
  description: z.string().min(1, "内容を入力してください"),
  type: z.enum(['income', 'expense']),
  category: z.string(),
  amount: z.number().min(0, "金額を入力してください"),
  source: z.enum(['personal', 'corporate', 'personal_investment', 'corporate_investment']), // 修正：運用資産を個人と法人に分離
});

type LifeEventFormData = z.infer<typeof lifeEventSchema>;

const categories = {
  income: ['給与', '賞与', '副業', 'その他'],
  expense: ['生活費', '住居費', '教育費', '医療費', '旅行', 'その他'],
};

export function LifeEventForm() {
  const { lifeEvents, addLifeEvent, removeLifeEvent, setCurrentStep } = useSimulatorStore();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<LifeEventFormData>({
    resolver: zodResolver(lifeEventSchema),
    defaultValues: {
      year: currentYear,
      type: 'expense',
      amount: 0,
      category: 'その他',
      source: 'personal',
    },
  });

  const eventType = watch('type');

  const onSubmit = (data: LifeEventFormData) => {
    addLifeEvent(data);
    reset({
      year: currentYear,
      type: 'expense',
      amount: 0,
      description: '',
      category: 'その他',
      source: 'personal',
    });
  };

  const handleNext = () => {
    setCurrentStep(6);
  };

  const handleBack = () => {
    setCurrentStep(4);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">
        ライフイベント
        </h2>

      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
          <span>ライフイベントについて</span>
          </h3>
        <p className="text-sm text-blue-700">
          ライフイベント登録では、将来発生する重要な収入・支出を登録します。結婚や住宅購入などの大きなイベントや、
          退職金、相続、高額な旅行など、通常の収支には含まれない特別な項目をここで登録しましょう。
          各イベントには発生年、種類（収入・支出）、金額、資金源（個人資産・法人資産・個人運用資産・法人運用資産）を設定できます。
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              年度
              </label>
            <Select
              defaultValue={currentYear.toString()}
              onValueChange={(value) => setValue('year', parseInt(value))}
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
            {errors.year && (
              <p className="text-sm text-red-500">{errors.year.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              イベント内容
              <TermTooltip term="" width="narrow">
                イベントの内容や目的を入力します。例: 結婚式、住宅購入、退職金など
              </TermTooltip>
            </label>
            <input
              type="text"
              {...register('description')}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              種類
            </label>
            <Select
              defaultValue={eventType}
              onValueChange={(value) => {
                setValue('type', value as 'income' | 'expense');
                setValue('category', 'その他');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="種類を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">収入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              カテゴリ
              <TermTooltip term="" width="narrow">
                イベントの分類です。収入なら給与/賞与/副業/その他、支出なら生活費/住居費/教育費/医療費/旅行/その他から選択します。
              </TermTooltip>
            </label>
            <Select
              defaultValue="その他"
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(categories[eventType] ?? []).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              金額（万円）
            </label>
            <input
              type="number"
              {...register('amount', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              資金源
              <TermTooltip term="" width="wide">
                <p className="text-xs mb-1">イベントの資金源を選択します：</p>
                <ul className="list-disc pl-4 text-xs space-y-1">
                  <li>個人資産: 個人的な貯蓄や資産から支出/収入される場合</li>
                  <li>法人資産: 会社や事業体の資産から支出/収入される場合</li>
                  <li>個人運用資産: 個人の投資資産（株式・投資信託など）から支出/収入される場合</li>
                  <li>法人運用資産: 法人の投資資産から支出/収入される場合</li>
                </ul>
              </TermTooltip>
            </label>
            <Select
              defaultValue="personal"
              onValueChange={(value) => setValue('source', value as 'personal' | 'corporate' | 'personal_investment' | 'corporate_investment')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">個人資産</SelectItem>
                <SelectItem value="corporate">法人資産</SelectItem>
                <SelectItem value="personal_investment">個人運用資産</SelectItem>
                <SelectItem value="corporate_investment">法人運用資産</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              追加
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {(lifeEvents ?? []).length > 0 ? (
          <div>
            <h3 className="text-lg font-medium mb-2">登録済みライフイベント</h3>
            {(lifeEvents ?? []).map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{event.year}年</span>
                  <span className="text-sm">{event.description}</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    event.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {event.type === 'income' ? '収入' : '支出'}
                  </span>
                  <span className="text-sm">{event.category}</span>
                  <span className="text-sm font-medium">{event.amount}万円</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    event.source === 'personal' ? 'bg-blue-100 text-blue-800' : 
                    event.source === 'corporate' ? 'bg-purple-100 text-purple-800' :
                    event.source === 'personal_investment' ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {event.source === 'personal' ? '個人資産' : 
                     event.source === 'corporate' ? '法人資産' : 
                     event.source === 'personal_investment' ? '個人運用資産' : '法人運用資産'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const temp = [...lifeEvents];
                      if (index > 0) {
                        [temp[index], temp[index - 1]] = [temp[index - 1], temp[index]];
                        useSimulatorStore.setState({ lifeEvents: temp });
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLifeEvent(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-500">登録されたライフイベントはありません</p>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 p-4 rounded-md">
        <h3 className="text-md font-medium text-yellow-800 mb-2">よくあるライフイベント例</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
          <div>
            <h4 className="font-medium mb-1">収入イベント例</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>退職金：最終年収の2〜3年分（例：500〜1000万円）</li>
              <li>相続・贈与：平均的な相続額は1000〜2000万円</li>
              <li>副業・臨時収入：副業平均月3〜5万円（年36〜60万円）</li>
              <li>不動産売却：保有不動産の売却額</li>
              <li>株式・投資売却：大型の資産売却</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">支出イベント例</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>結婚式費用：平均300〜500万円</li>
              <li>住宅購入（頭金）：購入価格の10〜20%（例：300〜600万円）</li>
              <li>リフォーム：規模により100〜500万円</li>
              <li>自動車購入：新車200〜500万円、中古車50〜300万円</li>
              <li>海外旅行：1人30〜100万円（長期・高級旅行の場合）</li>
              <li>子どもの独立支援：100〜300万円</li>
            </ul>
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
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          次へ
        </button>
      </div>
      
      {/* コンテキストヘルプコンポーネントを追加 */}
      <ContextHelp 
        tabs={[
          { id: 'terms', label: '用語解説', content: lifeEventTermsContent },
          { id: 'formulas', label: '計算式', content: lifeEventFormulasContent }
        ]} 
      />
    </div>
  );
}
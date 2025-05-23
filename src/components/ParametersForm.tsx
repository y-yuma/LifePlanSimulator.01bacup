import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSimulatorStore } from '@/store/simulator';

const parametersSchema = z.object({
  inflationRate: z.number().min(0).max(100),
  educationCostIncreaseRate: z.number().min(0).max(100),
  investmentReturn: z.number().min(0).max(100),
});

type ParametersFormData = z.infer<typeof parametersSchema>;

export function ParametersForm() {
  const { parameters, setParameters, setCurrentStep } = useSimulatorStore();
  const { register, handleSubmit, formState: { errors } } = useForm<ParametersFormData>({
    resolver: zodResolver(parametersSchema),
    defaultValues: parameters,
  });

  const onSubmit = (data: ParametersFormData) => {
    setParameters(data);
    setCurrentStep(7);
  };

  const handleBack = () => {
    setCurrentStep(5);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">パラメータ設定</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">インフレーション率（%）</label>
            <input
              type="number"
              step="0.1"
              {...register('inflationRate', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
            {errors.inflationRate && (
              <p className="text-sm text-red-500">{errors.inflationRate.message}</p>
            )}
            <p className="text-xs text-gray-500">生活費、住居費などの上昇率</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">教育費上昇率（%）</label>
            <input
              type="number"
              step="0.1"
              {...register('educationCostIncreaseRate', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
            {errors.educationCostIncreaseRate && (
              <p className="text-sm text-red-500">{errors.educationCostIncreaseRate.message}</p>
            )}
            <p className="text-xs text-gray-500">教育費専用の上昇率</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">資産運用利回り（%）</label>
            <input
              type="number"
              step="0.1"
              {...register('investmentReturn', { valueAsNumber: true })}
              className="w-full rounded-md border border-gray-200 px-3 py-2"
            />
            {errors.investmentReturn && (
              <p className="text-sm text-red-500">{errors.investmentReturn.message}</p>
            )}
            <p className="text-xs text-gray-500">毎年の資産運用収入・運用効果</p>
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
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            次へ
          </button>
        </div>
      </form>
    </div>
  );
}
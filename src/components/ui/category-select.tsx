import React from 'react';

// 大枠カテゴリー
export const MAIN_CATEGORIES = [
  { id: 'income', name: '収入' },
  { id: 'living', name: '生活費' },
  { id: 'housing', name: '住居費' },
  { id: 'education', name: '教育費' }, // 教育費カテゴリを追加
  { id: 'asset', name: '資産' },
  { id: 'liability', name: '負債' },
  { id: 'business', name: '事業運営費' }, // 法人用カテゴリを追加
  { id: 'office', name: 'オフィス・設備費' }, // 法人用カテゴリを追加
  { id: 'other', name: 'その他' },
];

// 収入項目用（内部処理用）
export const INCOME_CATEGORIES = [
  { id: 'income', name: '収入' },
  { id: 'other', name: 'その他' },
];

// 個人経費項目用（内部処理用）
export const EXPENSE_CATEGORIES = [
  { id: 'living', name: '生活費' },
  { id: 'housing', name: '住居費' },
  { id: 'education', name: '教育費' }, // 教育費カテゴリを追加
  { id: 'other', name: 'その他' },
];

// 法人経費項目用（内部処理用）
export const CORPORATE_EXPENSE_CATEGORIES = [
  { id: 'business', name: '事業運営費' },
  { id: 'office', name: 'オフィス・設備費' },
  { id: 'other', name: 'その他' },
];

// 資産項目用（内部処理用）
export const ASSET_CATEGORIES = [
  { id: 'asset', name: '資産' },
  { id: 'other', name: 'その他' },
];

// 負債項目用（内部処理用）
export const LIABILITY_CATEGORIES = [
  { id: 'liability', name: '負債' },
  { id: 'other', name: 'その他' },
];

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: { id: string; name: string }[];
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  className = '',
}: CategorySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
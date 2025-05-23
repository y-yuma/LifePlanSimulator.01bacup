import React, { useState } from 'react';
import { useSimulatorStore } from '@/store/simulator';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, X, Edit, Save, Trash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const educationOptions = {
  nursery: ['行かない', '公立', '私立'],
  preschool: ['行かない', '公立', '私立'],
  elementary: ['公立', '私立'],
  juniorHigh: ['公立', '私立'],
  highSchool: ['公立', '私立'],
  university: [
    '行かない',
    '国立大学（文系）',
    '国立大学（理系）',
    '私立大学（文系）',
    '私立大学（理系）'
  ]
};

// 教育プラン料金表（万円/年）
const educationCosts = {
  nursery: { '公立': 29.9, '私立': 35.3, '行かない': 0 },
  preschool: { '公立': 18.4, '私立': 34.7, '行かない': 0 },
  elementary: { '公立': 33.6, '私立': 182.8, '行かない': 0 },
  juniorHigh: { '公立': 54.2, '私立': 156, '行かない': 0 },
  highSchool: { '公立': 59.7, '私立': 103, '行かない': 0 },
  university: {
    '国立大学（文系）': 60.6,
    '国立大学（理系）': 60.6,
    '私立大学（文系）': 102.6,
    '私立大学（理系）': 135.4,
    '行かない': 0
  }
};

// 大学の場合のオプション追加費用
const universityOptions = {
  dormitory: { label: '寮または一人暮らし', cost: 60 }, // 月額5万円として年間60万円
  scholarship: { label: '奨学金（返済不要）', min: 0, max: 200 }
};

// 教育ローン設定
const educationLoanOptions = {
  interestRates: [0, 1, 2, 3, 4, 5],
  termYears: [5, 10, 15, 20]
};

// 新しい子供のデフォルト設定
const defaultChildEducationPlan = {
  nursery: '公立',
  preschool: '公立',
  elementary: '公立',
  juniorHigh: '公立',
  highSchool: '公立',
  university: '公立大学（文系）'
};

export function EducationForm() {
  const { basicInfo, setBasicInfo, setCurrentStep, saveToLocalStorage } = useSimulatorStore();
  const [children, setChildren] = useState(basicInfo.children || []);
  const [plannedChildren, setPlannedChildren] = useState(basicInfo.plannedChildren || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPlannedIndex, setEditingPlannedIndex] = useState<number | null>(null);
  
  // 新しい子供の編集用ステート
  const [newChild, setNewChild] = useState({
    currentAge: 0,
    educationPlan: { ...defaultChildEducationPlan },
    universityOptions: {
      dormitory: false,
      scholarship: 0
    },
    educationLoan: {
      enabled: false,
      amount: 0,
      interestRate: 2,
      termYears: 10,
      startAge: 18
    }
  });
  
  // 新しい予定の子供の編集用ステート
  const [newPlannedChild, setNewPlannedChild] = useState({
    yearsFromNow: 2,
    educationPlan: { ...defaultChildEducationPlan },
    universityOptions: {
      dormitory: false,
      scholarship: 0
    },
    educationLoan: {
      enabled: false,
      amount: 0,
      interestRate: 2,
      termYears: 10,
      startAge: 18
    }
  });
  
  // 教育費の総額を計算
  const calculateTotalEducationCost = (child) => {
    let total = 0;
    
    // 保育園（0〜2歳：3年間）
    if (child.educationPlan.nursery !== '行かない') {
      total += educationCosts.nursery[child.educationPlan.nursery] * 3;
    }
    
    // 幼稚園（3〜5歳：3年間）
    if (child.educationPlan.preschool !== '行かない') {
      total += educationCosts.preschool[child.educationPlan.preschool] * 3;
    }
    
    // 小学校（6〜11歳：6年間）
    total += educationCosts.elementary[child.educationPlan.elementary] * 6;
    
    // 中学校（12〜14歳：3年間）
    total += educationCosts.juniorHigh[child.educationPlan.juniorHigh] * 3;
    
    // 高校（15〜17歳：3年間）
    total += educationCosts.highSchool[child.educationPlan.highSchool] * 3;
    
    // 大学（18〜21歳：4年間）
    if (child.educationPlan.university !== '行かない') {
      total += educationCosts.university[child.educationPlan.university] * 4;
      
      // 追加オプション
      if (child.universityOptions) {
        // 寮・一人暮らし
        if (child.universityOptions.dormitory) {
          total += universityOptions.dormitory.cost * 4;
        }
        
        // 奨学金（返済不要のもののみ計上、返済必要なものはローンで別途）
        if (child.universityOptions.scholarship > 0) {
          total -= child.universityOptions.scholarship * 4;
        }
      }
    }
    
    return Math.round(total);
  };
  
  // 子供を追加
  const addChild = () => {
    const updatedChildren = [...children, { 
      currentAge: newChild.currentAge,
      educationPlan: { ...newChild.educationPlan }
    }];
    setChildren(updatedChildren);
    setNewChild({
      currentAge: 0,
      educationPlan: { ...defaultChildEducationPlan },
      universityOptions: {
        dormitory: false,
        scholarship: 0
      },
      educationLoan: {
        enabled: false,
        amount: 0,
        interestRate: 2,
        termYears: 10,
        startAge: 18
      }
    });
  };
  
  // 予定の子供を追加
  const addPlannedChild = () => {
    const updatedPlannedChildren = [...plannedChildren, {
      yearsFromNow: newPlannedChild.yearsFromNow,
      educationPlan: { ...newPlannedChild.educationPlan }
    }];
    setPlannedChildren(updatedPlannedChildren);
    setNewPlannedChild({
      yearsFromNow: 2,
      educationPlan: { ...defaultChildEducationPlan },
      universityOptions: {
        dormitory: false,
        scholarship: 0
      },
      educationLoan: {
        enabled: false,
        amount: 0,
        interestRate: 2,
        termYears: 10,
        startAge: 18
      }
    });
  };
  
  // 子供を削除
  const removeChild = (index) => {
    const updatedChildren = [...children];
    updatedChildren.splice(index, 1);
    setChildren(updatedChildren);
  };
  
  // 予定の子供を削除
  const removePlannedChild = (index) => {
    const updatedPlannedChildren = [...plannedChildren];
    updatedPlannedChildren.splice(index, 1);
    setPlannedChildren(updatedPlannedChildren);
  };
  
  // 子供の編集を開始
  const startEditingChild = (index) => {
    setEditingIndex(index);
  };
  
  // 予定の子供の編集を開始
  const startEditingPlannedChild = (index) => {
    setEditingPlannedIndex(index);
  };
  
  // 子供の教育プランを更新
  const updateChildEducationPlan = (index, field, value) => {
    const updatedChildren = [...children];
    updatedChildren[index].educationPlan[field] = value;
    setChildren(updatedChildren);
  };
  
  // 予定の子供の教育プランを更新
  const updatePlannedChildEducationPlan = (index, field, value) => {
    const updatedPlannedChildren = [...plannedChildren];
    updatedPlannedChildren[index].educationPlan[field] = value;
    setPlannedChildren(updatedPlannedChildren);
  };
  
  // 新しい子供の教育プランを更新
  const updateNewChildEducationPlan = (field, value) => {
    setNewChild({
      ...newChild,
      educationPlan: {
        ...newChild.educationPlan,
        [field]: value
      }
    });
  };
  
  // 新しい予定の子供の教育プランを更新
  const updateNewPlannedChildEducationPlan = (field, value) => {
    setNewPlannedChild({
      ...newPlannedChild,
      educationPlan: {
        ...newPlannedChild.educationPlan,
        [field]: value
      }
    });
  };
  
  // 編集を保存
  const saveChanges = () => {
    const updatedBasicInfo = {
      ...basicInfo,
      children,
      plannedChildren
    };
    setBasicInfo(updatedBasicInfo);
    saveToLocalStorage();
    setCurrentStep(5);
  };
  
  // 前のステップに戻る
  const handleBack = () => {
    setCurrentStep(3);
  };
  
  // 教育プラン選択肢を表示する共通コンポーネント
  const EducationPlanSelector = ({ label, type, value, onChange, disabled = false }) => (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`${label}を選択`} />
        </SelectTrigger>
        <SelectContent>
          {educationOptions[type].map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  
  // 費用を表示する共通関数
  const formatCost = (cost) => {
    return cost ? `${cost}万円/年` : '0円';
  };
  
  // 子供の年齢から表示用テキストを生成
  const getAgeRangeText = (age) => {
    if (age <= 2) return `${age}歳（保育園）`;
    if (age <= 5) return `${age}歳（幼稚園）`;
    if (age <= 11) return `${age}歳（小学${age - 5}年）`;
    if (age <= 14) return `${age}歳（中学${age - 11}年）`;
    if (age <= 17) return `${age}歳（高校${age - 14}年）`;
    if (age <= 21) return `${age}歳（大学${age - 17}年）`;
    return `${age}歳`;
  };
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">教育費設定</h2>
      <p className="text-gray-600">
        お子様の教育プランを設定してください。教育費はライフプランにおいて大きな支出項目の一つです。
        現在のお子様と将来予定されているお子様の両方を設定できます。
      </p>
      
      <div className="space-y-8">
        {/* 現在の子供セクション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>現在のお子様</span>
              <span className="text-sm font-normal text-gray-500">{children.length}人</span>
            </CardTitle>
            <CardDescription>
              現在のお子様の情報と教育プランを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {children.length > 0 ? (
              <div className="space-y-4">
                {children.map((child, index) => (
                  <Card key={index} className={`border ${editingIndex === index ? 'border-blue-500' : 'border-gray-200'}`}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center">
                          {getAgeRangeText(child.currentAge)}
                        </CardTitle>
                        <div className="flex space-x-2">
                          {editingIndex === index ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingIndex(null)}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              <span>完了</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingChild(index)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              <span>編集</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeChild(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {editingIndex === index ? (
                        <div className="space-y-4">
                          {/* 編集モード */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm">年齢</Label>
                              <Input
                                type="number"
                                min="0" 
                                max="22"
                                value={child.currentAge}
                                onChange={(e) => {
                                  const updatedChildren = [...children];
                                  updatedChildren[index].currentAge = Number(e.target.value);
                                  setChildren(updatedChildren);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm">教育費総額（概算）</Label>
                              <div className="h-10 flex items-center px-3 border rounded-md text-lg font-bold text-blue-700">
                                {calculateTotalEducationCost(child)}万円
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <EducationPlanSelector
                              label="保育園"
                              type="nursery"
                              value={child.educationPlan.nursery}
                              onChange={(value) => updateChildEducationPlan(index, 'nursery', value)}
                              disabled={child.currentAge > 2}
                            />
                            <EducationPlanSelector
                              label="幼稚園"
                              type="preschool"
                              value={child.educationPlan.preschool}
                              onChange={(value) => updateChildEducationPlan(index, 'preschool', value)}
                              disabled={child.currentAge > 5}
                            />
                            <EducationPlanSelector
                              label="小学校"
                              type="elementary"
                              value={child.educationPlan.elementary}
                              onChange={(value) => updateChildEducationPlan(index, 'elementary', value)}
                              disabled={child.currentAge > 11}
                            />
                            <EducationPlanSelector
                              label="中学校"
                              type="juniorHigh"
                              value={child.educationPlan.juniorHigh}
                              onChange={(value) => updateChildEducationPlan(index, 'juniorHigh', value)}
                              disabled={child.currentAge > 14}
                            />
                            <EducationPlanSelector
                              label="高校"
                              type="highSchool"
                              value={child.educationPlan.highSchool}
                              onChange={(value) => updateChildEducationPlan(index, 'highSchool', value)}
                              disabled={child.currentAge > 17}
                            />
                            <EducationPlanSelector
                              label="大学"
                              type="university"
                              value={child.educationPlan.university}
                              onChange={(value) => updateChildEducationPlan(index, 'university', value)}
                              disabled={child.currentAge > 21}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* 表示モード */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-500">教育プラン</div>
                              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">保育園:</span> {child.educationPlan.nursery}
                                </div>
                                <div>
                                  <span className="text-gray-500">幼稚園:</span> {child.educationPlan.preschool}
                                </div>
                                <div>
                                  <span className="text-gray-500">小学校:</span> {child.educationPlan.elementary}
                                </div>
                                <div>
                                  <span className="text-gray-500">中学校:</span> {child.educationPlan.juniorHigh}
                                </div>
                                <div>
                                  <span className="text-gray-500">高校:</span> {child.educationPlan.highSchool}
                                </div>
                                <div>
                                  <span className="text-gray-500">大学:</span> {child.educationPlan.university}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">概算教育費総額</div>
                              <div className="mt-1 text-xl font-bold text-blue-700">
                                {calculateTotalEducationCost(child)}万円
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">お子様の情報が登録されていません</p>
              </div>
            )}
            
            {/* 新しい子供の追加 */}
            <Card className="border border-dashed border-gray-300">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">新しいお子様を追加</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">年齢</Label>
                      <Input
                        type="number"
                        min="0" 
                        max="22"
                        value={newChild.currentAge}
                        onChange={(e) => setNewChild({...newChild, currentAge: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EducationPlanSelector
                      label="保育園"
                      type="nursery"
                      value={newChild.educationPlan.nursery}
                      onChange={(value) => updateNewChildEducationPlan('nursery', value)}
                      disabled={newChild.currentAge > 2}
                    />
                    <EducationPlanSelector
                      label="幼稚園"
                      type="preschool"
                      value={newChild.educationPlan.preschool}
                      onChange={(value) => updateNewChildEducationPlan('preschool', value)}
                      disabled={newChild.currentAge > 5}
                    />
                    <EducationPlanSelector
                      label="小学校"
                      type="elementary"
                      value={newChild.educationPlan.elementary}
                      onChange={(value) => updateNewChildEducationPlan('elementary', value)}
                      disabled={newChild.currentAge > 11}
                    />
                    <EducationPlanSelector
                      label="中学校"
                      type="juniorHigh"
                      value={newChild.educationPlan.juniorHigh}
                      onChange={(value) => updateNewChildEducationPlan('juniorHigh', value)}
                      disabled={newChild.currentAge > 14}
                    />
                    <EducationPlanSelector
                      label="高校"
                      type="highSchool"
                      value={newChild.educationPlan.highSchool}
                      onChange={(value) => updateNewChildEducationPlan('highSchool', value)}
                      disabled={newChild.currentAge > 17}
                    />
                    <EducationPlanSelector
                      label="大学"
                      type="university"
                      value={newChild.educationPlan.university}
                      onChange={(value) => updateNewChildEducationPlan('university', value)}
                      disabled={newChild.currentAge > 21}
                    />
                  </div>
                  
                  <div className="text-right">
                    <Button onClick={addChild}>
                      <PlusCircle className="h-4 w-4 mr-1" />
                      <span>追加</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        
        {/* 予定の子供セクション */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>将来予定のお子様</span>
              <span className="text-sm font-normal text-gray-500">{plannedChildren.length}人</span>
            </CardTitle>
            <CardDescription>
              将来予定されているお子様の情報と教育プランを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {plannedChildren.length > 0 ? (
              <div className="space-y-4">
                {plannedChildren.map((child, index) => (
                  <Card key={index} className={`border ${editingPlannedIndex === index ? 'border-blue-500' : 'border-gray-200'}`}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center">
                          {`${child.yearsFromNow}年後に誕生予定`}
                        </CardTitle>
                        <div className="flex space-x-2">
                          {editingPlannedIndex === index ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPlannedIndex(null)}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              <span>完了</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingPlannedChild(index)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              <span>編集</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removePlannedChild(index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {editingPlannedIndex === index ? (
                        <div className="space-y-4">
                          {/* 編集モード */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-sm">誕生予定（今から何年後）</Label>
                              <Input
                                type="number"
                                min="1" 
                                max="30"
                                value={child.yearsFromNow}
                                onChange={(e) => {
                                  const updatedPlannedChildren = [...plannedChildren];
                                  updatedPlannedChildren[index].yearsFromNow = Number(e.target.value);
                                  setPlannedChildren(updatedPlannedChildren);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-sm">教育費総額（概算）</Label>
                              <div className="h-10 flex items-center px-3 border rounded-md text-lg font-bold text-blue-700">
                                {calculateTotalEducationCost(child)}万円
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <EducationPlanSelector
                              label="保育園"
                              type="nursery"
                              value={child.educationPlan.nursery}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'nursery', value)}
                            />
                            <EducationPlanSelector
                              label="幼稚園"
                              type="preschool"
                              value={child.educationPlan.preschool}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'preschool', value)}
                            />
                            <EducationPlanSelector
                              label="小学校"
                              type="elementary"
                              value={child.educationPlan.elementary}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'elementary', value)}
                            />
                            <EducationPlanSelector
                              label="中学校"
                              type="juniorHigh"
                              value={child.educationPlan.juniorHigh}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'juniorHigh', value)}
                            />
                            <EducationPlanSelector
                              label="高校"
                              type="highSchool"
                              value={child.educationPlan.highSchool}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'highSchool', value)}
                            />
                            <EducationPlanSelector
                              label="大学"
                              type="university"
                              value={child.educationPlan.university}
                              onChange={(value) => updatePlannedChildEducationPlan(index, 'university', value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* 表示モード */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-500">教育プラン</div>
                              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">保育園:</span> {child.educationPlan.nursery}
                                </div>
                                <div>
                                  <span className="text-gray-500">幼稚園:</span> {child.educationPlan.preschool}
                                </div>
                                <div>
                                  <span className="text-gray-500">小学校:</span> {child.educationPlan.elementary}
                                </div>
                                <div>
                                  <span className="text-gray-500">中学校:</span> {child.educationPlan.juniorHigh}
                                </div>
                                <div>
                                  <span className="text-gray-500">高校:</span> {child.educationPlan.highSchool}
                                </div>
                                <div>
                                  <span className="text-gray-500">大学:</span> {child.educationPlan.university}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-500">概算教育費総額</div>
                              <div className="mt-1 text-xl font-bold text-blue-700">
                                {calculateTotalEducationCost(child)}万円
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">予定のお子様情報が登録されていません</p>
              </div>
            )}
            
            {/* 新しい予定の子供の追加 */}
            <Card className="border border-dashed border-gray-300">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">将来予定のお子様を追加</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">誕生予定（今から何年後）</Label>
                      <Input
                        type="number"
                        min="1" 
                        max="30"
                        value={newPlannedChild.yearsFromNow}
                        onChange={(e) => setNewPlannedChild({...newPlannedChild, yearsFromNow: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <EducationPlanSelector
                      label="保育園"
                      type="nursery"
                      value={newPlannedChild.educationPlan.nursery}
                      onChange={(value) => updateNewPlannedChildEducationPlan('nursery', value)}
                    />
                    <EducationPlanSelector
                      label="幼稚園"
                      type="preschool"
                      value={newPlannedChild.educationPlan.preschool}
                      onChange={(value) => updateNewPlannedChildEducationPlan('preschool', value)}
                    />
                    <EducationPlanSelector
                      label="小学校"
                      type="elementary"
                      value={newPlannedChild.educationPlan.elementary}
                      onChange={(value) => updateNewPlannedChildEducationPlan('elementary', value)}
                    />
                    <EducationPlanSelector
                      label="中学校"
                      type="juniorHigh"
                      value={newPlannedChild.educationPlan.juniorHigh}
                      onChange={(value) => updateNewPlannedChildEducationPlan('juniorHigh', value)}
                    />
                    <EducationPlanSelector
                      label="高校"
                      type="highSchool"
                      value={newPlannedChild.educationPlan.highSchool}
                      onChange={(value) => updateNewPlannedChildEducationPlan('highSchool', value)}
                    />
                    <EducationPlanSelector
                      label="大学"
                      type="university"
                      value={newPlannedChild.educationPlan.university}
                      onChange={(value) => updateNewPlannedChildEducationPlan('university', value)}
                    />
                  </div>
                  
                  <div className="text-right">
                    <Button onClick={addPlannedChild}>
                      <PlusCircle className="h-4 w-4 mr-1" />
                      <span>追加</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
        
        {/* 教育費に関する情報セクション */}
        <Card>
          <CardHeader>
            <CardTitle>教育費について</CardTitle>
            <CardDescription>教育費に関する重要な情報</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md text-sm">
                <h4 className="font-medium text-blue-800 mb-2">教育費の概算</h4>
                <p className="text-blue-700 mb-2">
                  このシミュレーションでは、以下の年間教育費を基準に計算しています：
                </p>
                <div className="grid grid-cols-2 gap-2 text-blue-700">
                  <div>
                    <span className="font-medium">保育園：</span>
                    公立 {formatCost(educationCosts.nursery['公立'])}、
                    私立 {formatCost(educationCosts.nursery['私立'])}
                  </div>
                  <div>
                    <span className="font-medium">幼稚園：</span>
                    公立 {formatCost(educationCosts.preschool['公立'])}、
                    私立 {formatCost(educationCosts.preschool['私立'])}
                  </div>
                  <div>
                    <span className="font-medium">小学校：</span>
                    公立 {formatCost(educationCosts.elementary['公立'])}、
                    私立 {formatCost(educationCosts.elementary['私立'])}
                  </div>
                  <div>
                    <span className="font-medium">中学校：</span>
                    公立 {formatCost(educationCosts.juniorHigh['公立'])}、
                    私立 {formatCost(educationCosts.juniorHigh['私立'])}
                  </div>
                  <div>
                    <span className="font-medium">高校：</span>
                    公立 {formatCost(educationCosts.highSchool['公立'])}、
                    私立 {formatCost(educationCosts.highSchool['私立'])}
                  </div>
                  <div>
                    <span className="font-medium">大学：</span>
                    公立文系 {formatCost(educationCosts.university['公立大学（文系）'])}、
                    私立文系 {formatCost(educationCosts.university['私立大学（文系）'])}
                  </div>
                </div>
                <p className="mt-2 text-blue-700">
                  ※これらの費用には、授業料、教材費、制服代、給食費、遠足や修学旅行などの費用が含まれています。
                  実際の費用は学校によって異なる場合があります。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          戻る
        </Button>
        <Button
          variant="default"
          onClick={saveChanges}
        >
          次へ
        </Button>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Calendar, DollarSign, MapPin, Clock, Loader2, Download, Sparkles } from 'lucide-react';
import { planningApi, GenerateItineraryResponse } from '@/lib/api';

type FormInputs = {
  city_id: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  daily_hours: number;
};

const cities = [
  { value: 'beijing', label: '北京' },
];

export default function PlannerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<GenerateItineraryResponse['data'] | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInputs>({
    defaultValues: {
      city_id: 'beijing',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_budget: 3000,
      daily_hours: 8,
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const onSubmit = async (data: FormInputs) => {
    setIsLoading(true);
    setItinerary(null);

    try {
      const response = await planningApi.generateItinerary({
        city_id: data.city_id,
        start_date: data.start_date,
        end_date: data.end_date,
        total_budget: data.total_budget,
        daily_hours: data.daily_hours,
      });

      if (response.success) {
        setItinerary(response.data);
        toast.success('行程生成成功！');
      } else {
        toast.error('生成行程失败，请重试');
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast.error('连接服务器失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!itinerary) return;

    try {
      const blob = await planningApi.itineraryApi.exportPDF('demo');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF 导出成功！');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('导出 PDF 失败，请重试');
    }
  };

  const getCityName = (cityId: string) => {
    const city = cities.find(c => c.value === cityId);
    return city ? city.label : cityId;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>智能规划</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            规划您的完美行程
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            基于先进的 AI 算法，智能优化旅行路线，合理分配预算
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span>设置行程参数</span>
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="label flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>目的地城市</span>
                  </label>
                  <select
                    {...register('city_id', { required: '请选择城市' })}
                    className="input-field"
                  >
                    {cities.map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.label}
                      </option>
                    ))}
                  </select>
                  {errors.city_id && (
                    <p className="text-sm text-red-600 mt-1">{errors.city_id.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">开始日期</label>
                    <input
                      type="date"
                      {...register('start_date', { required: '请选择开始日期' })}
                      className="input-field"
                    />
                    {errors.start_date && (
                      <p className="text-sm text-red-600 mt-1">{errors.start_date.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">结束日期</label>
                    <input
                      type="date"
                      {...register('end_date', { required: '请选择结束日期' })}
                      min={startDate}
                      className="input-field"
                    />
                    {errors.end_date && (
                      <p className="text-sm text-red-600 mt-1">{errors.end_date.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>总预算 (元)</span>
                  </label>
                  <input
                    type="number"
                    {...register('total_budget', {
                      required: '请输入预算',
                      min: { value: 100, message: '预算至少 100 元' },
                    })}
                    className="input-field"
                    placeholder="例如：3000"
                  />
                  {errors.total_budget && (
                    <p className="text-sm text-red-600 mt-1">{errors.total_budget.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>每日游玩时间 (小时)</span>
                  </label>
                  <input
                    type="number"
                    {...register('daily_hours', {
                      required: '请输入游玩时间',
                      min: { value: 1, message: '每天至少 1 小时' },
                      max: { value: 16, message: '每天最多 16 小时' },
                    })}
                    className="input-field"
                    placeholder="例如：8"
                  />
                  {errors.daily_hours && (
                    <p className="text-sm text-red-600 mt-1">{errors.daily_hours.message}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span>预计游玩天数</span>
                      <span className="font-semibold text-primary-600">{calculateDays()} 天</span>
                    </div>
                    <div className="flex justify-between">
                      <span>日均预算</span>
                      <span className="font-semibold text-primary-600">
                        ¥{Math.round((watch('total_budget') || 0) / calculateDays() || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>生成最优行程</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!itinerary ? (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  开始规划您的行程
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  在左侧填写您的旅行参数，我们将基于智能算法为您生成最优的旅行方案
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {getCityName(itinerary.city_id)} {itinerary.days} 日游
                      </h3>
                      <p className="text-gray-500">
                        {itinerary.start_date} 至 {itinerary.end_date}
                      </p>
                    </div>
                    <button
                      onClick={handleExportPDF}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出 PDF</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-primary-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-primary-600 mb-1">总预算</p>
                      <p className="text-2xl font-bold text-primary-700">¥{itinerary.total_budget}</p>
                    </div>
                    <div className="bg-secondary-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-secondary-600 mb-1">游玩天数</p>
                      <p className="text-2xl font-bold text-secondary-700">{itinerary.days} 天</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-purple-600 mb-1">总景点</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {itinerary.itinerary.reduce((sum, day) => sum + day.items.filter(i => i.type === 'attraction').length, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {itinerary.itinerary.map((day) => (
                  <div key={day.day_number} className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">
                          {day.day_number}
                        </span>
                        <span>第 {day.day_number} 天</span>
                      </h4>
                      <div className="text-sm text-gray-500">
                        <span>费用: ¥{day.total_cost}</span>
                        <span className="mx-2">·</span>
                        <span>时长: {Math.round(day.total_duration / 60)} 小时</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {day.items.map((item, index) => (
                        <div
                          key={`${day.day_number}-${index}`}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${item.type === 'attraction' ? 'bg-primary-500' : 'bg-orange-500'}`} />
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <div className="flex items-center space-x-3 text-sm text-gray-500">
                                <span>{item.start_time} - {item.end_time}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  item.type === 'attraction'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {item.type === 'attraction' ? '景点' : '餐厅'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {item.cost > 0 && (
                            <span className="font-semibold text-gray-900">¥{item.cost}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

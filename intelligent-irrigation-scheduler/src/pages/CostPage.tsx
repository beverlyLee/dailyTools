import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Zap,
  Droplets,
  Users,
  TrendingDown,
  Calculator,
  Save,
  DollarSign,
  CircleDollarSign,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { CostDetail } from '../../shared/types';

const MONTH_OPTIONS = [1, 3, 6, 12];
const PIE_COLORS = ['#4A90B8', '#2D5A3D', '#E8A838'];

function calcCost(
  waterAmount: number,
  durationMin: number,
  area: number,
  electricityPrice: number,
  waterPrice: number,
  pumpPower: number,
  laborCostPerHour: number
): CostDetail {
  const durationHour = durationMin / 60;
  const electricityCost = Number((pumpPower * durationHour * electricityPrice).toFixed(2));
  const waterCost = Number((waterAmount * waterPrice).toFixed(2));
  const laborCost = Number((durationHour * laborCostPerHour).toFixed(2));
  const totalCost = Number((electricityCost + waterCost + laborCost).toFixed(2));
  const unitCostPerMu = area > 0 ? Number((totalCost / area).toFixed(2)) : 0;
  const unitCostPerM3 = waterAmount > 0 ? Number((totalCost / waterAmount).toFixed(3)) : 0;

  const breakdown = [
    {
      label: '电费',
      value: electricityCost,
      percent: totalCost > 0 ? Number(((electricityCost / totalCost) * 100).toFixed(1)) : 0,
    },
    {
      label: '水费',
      value: waterCost,
      percent: totalCost > 0 ? Number(((waterCost / totalCost) * 100).toFixed(1)) : 0,
    },
    {
      label: '人工费',
      value: laborCost,
      percent: totalCost > 0 ? Number(((laborCost / totalCost) * 100).toFixed(1)) : 0,
    },
  ];

  return {
    electricityCost,
    waterCost,
    laborCost,
    totalCost,
    unitCostPerMu,
    unitCostPerM3,
    breakdown,
  };
}

function PieTooltip({ active, payload }: any) {
  if (active && payload?.[0]) {
    const d = payload[0].payload;
    return (
      <div className="glass-card !rounded-xl p-3 text-sm shadow-xl">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{d.name || d.label}</p>
        <p className="text-primary-green font-bold">¥{d.value?.toFixed(2)}</p>
        <p className="text-xs text-gray-500">占比 {d.payload?.percent || d.percent}%</p>
      </div>
    );
  }
  return null;
}

function BarTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="glass-card !rounded-xl p-3 text-sm shadow-xl">
        <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-gray-600 dark:text-gray-300">{e.name}:</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              ¥{Number(e.value).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function CostPage() {
  const { userConfig, setUserConfig, saveUserConfig, cropParams } = useAppStore();
  const [saved, setSaved] = useState(false);

  const [waterInput, setWaterInput] = useState(120);
  const [durationInput, setDurationInput] = useState(90);
  const [months, setMonths] = useState(3);

  const costDetail = useMemo(
    () =>
      calcCost(
        waterInput,
        durationInput,
        cropParams.plantingArea || userConfig.plantingArea,
        userConfig.electricityPrice,
        userConfig.waterPrice,
        userConfig.pumpPower,
        userConfig.laborCost
      ),
    [waterInput, durationInput, cropParams.plantingArea, userConfig]
  );

  const compareData = useMemo(() => {
    const area = cropParams.plantingArea || userConfig.plantingArea;
    const monthlyComparison = [];
    const baseMonth = new Date();
    let traditionalTotal = 0;
    let smartTotal = 0;
    const traditionalWaterPer = 150;
    const smartWaterPer = 100;

    for (let i = 0; i < months; i++) {
      const d = new Date(baseMonth);
      d.setMonth(d.getMonth() - (months - 1 - i));
      const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const traditionalFreq = i % 2 === 0 ? 4 : 3;
      const smartFreq = i % 2 === 0 ? 2 : 2;

      const tWater = traditionalFreq * traditionalWaterPer;
      const sWater = smartFreq * smartWaterPer;

      const tCost =
        (tWater * userConfig.waterPrice +
          (tWater / userConfig.pumpFlow) * userConfig.pumpPower * userConfig.electricityPrice +
          (tWater / userConfig.pumpFlow) * userConfig.laborCost) *
        (area / 100);

      const sCost =
        (sWater * userConfig.waterPrice +
          (sWater / userConfig.pumpFlow) * userConfig.pumpPower * userConfig.electricityPrice +
          (sWater / userConfig.pumpFlow) * userConfig.laborCost) *
        (area / 100);

      traditionalTotal += tCost;
      smartTotal += sCost;

      monthlyComparison.push({
        month: monthLabel,
        traditional: Number(tCost.toFixed(0)),
        smart: Number(sCost.toFixed(0)),
      });
    }

    const savings = traditionalTotal - smartTotal;
    const savingsPercent =
      traditionalTotal > 0 ? Number(((savings / traditionalTotal) * 100).toFixed(1)) : 0;

    return {
      months,
      traditional: {
        totalCost: Number(traditionalTotal.toFixed(2)),
        totalWater: 0,
        costPerMonth: monthlyComparison.map((m) => m.traditional),
      },
      smart: {
        totalCost: Number(smartTotal.toFixed(2)),
        totalWater: 0,
        costPerMonth: monthlyComparison.map((m) => m.smart),
      },
      savings: {
        cost: Number(savings.toFixed(2)),
        water: 0,
        percent: savingsPercent,
      },
      monthlyComparison,
    };
  }, [months, userConfig, cropParams.plantingArea]);

  const pieData = costDetail.breakdown.map((b) => ({
    name: b.label,
    value: b.value,
    percent: b.percent,
  }));

  const handleSave = async () => {
    await saveUserConfig();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-1">
          成本分析
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          精准核算灌溉成本，对比传统与智慧灌溉的经济效益
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-soil-brown/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-soil-brown" />
            </div>
            <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
              水电价与设备配置
            </h3>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              'btn-primary flex items-center gap-2 text-sm',
              saved && '!bg-green-500'
            )}
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存 ✓' : '保存配置'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="label-text flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber" />
              电价（元/kWh）
            </label>
            <input
              type="number"
              className="input-field"
              value={userConfig.electricityPrice}
              step={0.01}
              onChange={(e) =>
                setUserConfig({ electricityPrice: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label-text flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-blue" />
              水价（元/m³）
            </label>
            <input
              type="number"
              className="input-field"
              value={userConfig.waterPrice}
              step={0.1}
              onChange={(e) =>
                setUserConfig({ waterPrice: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label-text flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber" />
              水泵功率（kW）
            </label>
            <input
              type="number"
              className="input-field"
              value={userConfig.pumpPower}
              step={0.5}
              onChange={(e) =>
                setUserConfig({ pumpPower: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label-text flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-blue" />
              水泵流量（m³/h）
            </label>
            <input
              type="number"
              className="input-field"
              value={userConfig.pumpFlow}
              step={5}
              onChange={(e) =>
                setUserConfig({ pumpFlow: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label-text flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary-green" />
              人工费（元/h）
            </label>
            <input
              type="number"
              className="input-field"
              value={userConfig.laborCost}
              step={5}
              onChange={(e) =>
                setUserConfig({ laborCost: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="label-text">灌溉效率</label>
            <input
              type="number"
              className="input-field"
              value={userConfig.irrigationEfficiency}
              step={0.05}
              min={0}
              max={1}
              onChange={(e) =>
                setUserConfig({
                  irrigationEfficiency: parseFloat(e.target.value) || 0.85,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <div className="glass-card p-6 h-full">
            <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100 mb-4">
              单次灌溉成本构成
            </h3>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                    <RTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-3">
                {costDetail.breakdown.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white/60 dark:bg-slate-700/40 border border-white/60 dark:border-slate-600/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i] }}
                        />
                        {item.label}
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        ¥{item.value.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: PIE_COLORS[i],
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      {item.percent}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-slate-600/50 grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-sky-blue/10">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">总成本</div>
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  ¥{costDetail.totalCost}
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary-green/10">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">亩均成本</div>
                <div className="text-xl font-bold text-primary-green">
                  ¥{costDetail.unitCostPerMu}
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber/10">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">单方成本</div>
                <div className="text-xl font-bold text-amber-dark dark:text-amber-light">
                  ¥{costDetail.unitCostPerM3}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="glass-card p-6 h-full">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary-green" />
              </div>
              <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                成本计算器
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="label-text flex items-center justify-between">
                  <span>灌水量（m³）</span>
                  <span className="text-sm font-semibold text-primary-green">{waterInput}</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={waterInput}
                  onChange={(e) => setWaterInput(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-600 accent-primary-green cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10</span>
                  <span>250</span>
                  <span>500</span>
                </div>
              </div>
              <div>
                <label className="label-text flex items-center justify-between">
                  <span>灌溉时长（分钟）</span>
                  <span className="text-sm font-semibold text-primary-green">
                    {durationInput}分
                  </span>
                </label>
                <input
                  type="range"
                  min={15}
                  max={480}
                  step={5}
                  value={durationInput}
                  onChange={(e) => setDurationInput(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-600 accent-sky-blue cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>15分</span>
                  <span>4小时</span>
                  <span>8小时</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '电费', value: `¥${costDetail.electricityCost.toFixed(2)}`, icon: Zap, color: 'amber' },
                { label: '水费', value: `¥${costDetail.waterCost.toFixed(2)}`, icon: Droplets, color: 'sky-blue' },
                { label: '人工费', value: `¥${costDetail.laborCost.toFixed(2)}`, icon: Users, color: 'primary-green' },
                { label: '合计', value: `¥${costDetail.totalCost.toFixed(2)}`, icon: CircleDollarSign, color: 'soil-brown' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl border border-white/60 dark:border-slate-600/30 data-card"
                  style={{
                    background:
                      color === 'amber'
                        ? 'linear-gradient(135deg, rgba(232,168,56,0.15), rgba(232,168,56,0.02))'
                        : color === 'sky-blue'
                        ? 'linear-gradient(135deg, rgba(74,144,184,0.15), rgba(74,144,184,0.02))'
                        : color === 'primary-green'
                        ? 'linear-gradient(135deg, rgba(45,90,61,0.15), rgba(45,90,61,0.02))'
                        : 'linear-gradient(135deg, rgba(139,105,20,0.15), rgba(139,105,20,0.02))',
                  }}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
                      color === 'amber' && 'bg-amber/20 text-amber-dark',
                      color === 'sky-blue' && 'bg-sky-blue/20 text-sky-blue',
                      color === 'primary-green' && 'bg-primary-green/20 text-primary-green',
                      color === 'soil-brown' && 'bg-soil-brown/20 text-soil-brown'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-green/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary-green" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100">
                传统灌溉 vs 智慧灌溉
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                基于历史数据模型对比分析
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  months === m
                    ? 'bg-primary-green text-white shadow-md shadow-primary-green/30'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                )}
              >
                {m}个月
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={compareData.monthlyComparison}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: '元',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#6b7280' },
                  }}
                />
                <RTooltip content={<BarTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                  formatter={(v: string) => (
                    <span className="text-gray-600 dark:text-gray-400">{v}</span>
                  )}
                />
                <Bar
                  dataKey="traditional"
                  name="传统灌溉"
                  fill="#E8A838"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
                <Bar
                  dataKey="smart"
                  name="智慧灌溉"
                  fill="#2D5A3D"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-green/20 to-primary-green/5 border border-primary-green/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-slate-700/50 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-primary-green" />
                </div>
                <span className="text-sm font-medium text-primary-green-dark dark:text-primary-green-light">
                  {months}个月预计节省
                </span>
              </div>
              <div className="text-5xl font-bold text-primary-green mb-1 font-serif">
                ¥{compareData.savings.cost.toLocaleString()}
              </div>
              <div className="text-sm text-primary-green-dark/80 dark:text-primary-green-light/80">
                相当于节省 <span className="font-semibold">{compareData.savings.percent}%</span> 灌溉成本
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-amber/10 border border-amber/20">
                <div className="text-xs text-amber-dark dark:text-amber-light mb-1">
                  传统灌溉（{months}月）
                </div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-serif">
                  ¥{compareData.traditional.totalCost.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary-green/10 border border-primary-green/20">
                <div className="text-xs text-primary-green-dark dark:text-primary-green-light mb-1">
                  智慧灌溉（{months}月）
                </div>
                <div className="text-2xl font-bold text-primary-green font-serif">
                  ¥{compareData.smart.totalCost.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

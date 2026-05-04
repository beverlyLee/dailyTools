import { cn } from "~/lib/utils";

interface CaseTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

const caseTypes: CaseTypeOption[] = [
  {
    value: "民间借贷",
    label: "民间借贷",
    icon: "💰",
    description: "借款、欠条、利息、还款等纠纷",
  },
  {
    value: "合同纠纷",
    label: "合同纠纷",
    icon: "📄",
    description: "合同违约、解除、履行等纠纷",
  },
  {
    value: "劳动争议",
    label: "劳动争议",
    icon: "💼",
    description: "工资、加班、辞退、补偿等纠纷",
  },
  {
    value: "交通事故",
    label: "交通事故",
    icon: "🚗",
    description: "车祸、赔偿、保险、伤残等纠纷",
  },
  {
    value: "婚姻家庭",
    label: "婚姻家庭",
    icon: "🏠",
    description: "离婚、抚养、财产分割等纠纷",
  },
  {
    value: "房产纠纷",
    label: "房产纠纷",
    icon: "🏢",
    description: "房屋买卖、租赁、产权等纠纷",
  },
  {
    value: "侵权责任",
    label: "侵权责任",
    icon: "⚖️",
    description: "人身损害、名誉侵权、知识产权等",
  },
  {
    value: "其他纠纷",
    label: "其他纠纷",
    icon: "📋",
    description: "其他类型的法律纠纷",
  },
];

interface CaseTypeSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
}

export default function CaseTypeSelector({
  value,
  onChange,
  label = "案件类型",
}: CaseTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="label">{label}</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {caseTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              value === type.value
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300 bg-white"
            )}
          >
            <div className="text-2xl mb-2">{type.icon}</div>
            <div className="font-medium text-gray-900">{type.label}</div>
            <div className="text-xs text-gray-500 mt-1">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

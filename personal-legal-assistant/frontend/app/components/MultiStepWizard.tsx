import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, FileText, Users, DollarSign, Clock, AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  isValid: () => boolean;
}

interface MultiStepWizardProps {
  steps: WizardStep[];
  onComplete?: (data: Record<string, unknown>) => void;
  initialStep?: number;
}

export default function MultiStepWizard({
  steps,
  onComplete,
  initialStep = 0,
}: MultiStepWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.isValid()) {
      return;
    }
    
    setCompletedSteps(new Set([...completedSteps, currentStep]));
    
    if (isLastStep) {
      onComplete?.(formData);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (completedSteps.has(index) || index < currentStep) {
      setCurrentStep(index);
    }
  };

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(index)}
                disabled={!completedSteps.has(index) && index > currentStep}
                className={cn(
                  "flex flex-col items-center group",
                  index <= currentStep ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    index === currentStep
                      ? "bg-primary-600 text-white ring-4 ring-primary-100"
                      : completedSteps.has(index)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {completedSteps.has(index) && index !== currentStep ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-sm font-medium",
                    index === currentStep
                      ? "text-primary-600"
                      : completedSteps.has(index)
                      ? "text-green-600"
                      : "text-gray-500"
                  )}
                >
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-16 h-1 mx-2 rounded",
                    completedSteps.has(index) ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {steps[currentStep].title}
        </h2>
        
        <div className="mb-8">
          {steps[currentStep].component}
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={cn(
              "btn btn-outline",
              isFirstStep && "opacity-50 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            上一步
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary"
          >
            {isLastStep ? "完成" : "下一步"}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
}

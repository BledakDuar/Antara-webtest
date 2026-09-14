import React from 'react';
import { DASS_OPTIONS } from '../../data/dassData';

interface DassRadioGroupProps {
  questionId: number;
  questionText: string;
  selectedValue?: number;
  onChange: (value: number) => void;
  required?: boolean;
}

export const DassRadioGroup: React.FC<DassRadioGroupProps> = ({
  questionId,
  questionText,
  selectedValue,
  onChange,
  required = true,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 transition-all duration-200 hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Pernyataan Soal */}
      <div className="mb-5">
        <p className="text-[15px] sm:text-[16px] text-slate-800 leading-relaxed font-normal">
          <span className="font-medium mr-1.5">{questionId}.</span>
          {questionText}
          {required && <span className="text-rose-500 font-bold ml-1">*</span>}
        </p>
      </div>

      {/* Baris Horizontal Skala Angka dan Lingkaran Radio (Sesuai Referensi PDF Google Form DASS) */}
      <div className="pt-2 pb-1">
        <div className="grid grid-cols-4 max-w-sm sm:max-w-md mx-auto">
          {DASS_OPTIONS.map((option) => {
            const isSelected = selectedValue === option.value;
            const inputId = `q-${questionId}-opt-${option.value}`;

            return (
              <label
                key={option.value}
                htmlFor={inputId}
                className="group flex flex-col items-center justify-center cursor-pointer select-none py-1.5 px-1 transition-transform active:scale-95"
                title={`${option.value}: ${option.description}`}
              >
                {/* Angka Label (0, 1, 2, 3) di atas lingkaran */}
                <span
                  className={`text-sm sm:text-base font-normal mb-3 transition-colors ${
                    isSelected
                      ? 'text-purple-700 font-semibold'
                      : 'text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </span>

                {/* Hidden Native Radio Input for Accessibility */}
                <input
                  type="radio"
                  id={inputId}
                  name={`question-${questionId}`}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />

                {/* Lingkaran Radio Bulat Bersih (Persis Screenshot DASS) */}
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                    isSelected
                      ? 'border-purple-600 bg-white ring-4 ring-purple-100 shadow-sm'
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}
                >
                  {isSelected && (
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-purple-600 animate-in zoom-in-50 duration-150" />
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

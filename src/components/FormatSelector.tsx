import type { ConversionType } from '../utils/converter';
import { getConversionLabel } from '../utils/converter';

interface FormatSelectorProps {
  availableConversions: ConversionType[];
  selectedConversion: ConversionType | null;
  onSelect: (type: ConversionType) => void;
  disabled?: boolean;
}

export default function FormatSelector({
  availableConversions,
  selectedConversion,
  onSelect,
  disabled,
}: FormatSelectorProps) {
  if (availableConversions.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Output Format
      </label>
      <div className="relative">
        <select
          value={selectedConversion || ''}
          onChange={(e) => onSelect(e.target.value as ConversionType)}
          disabled={disabled}
          className={`
            w-full appearance-none rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800 px-4 py-3 pr-10
            text-gray-800 dark:text-gray-200
            text-sm font-medium
            shadow-sm
            transition-all duration-200
            focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            cursor-pointer
          `}
        >
          {availableConversions.map((type) => (
            <option key={type} value={type}>
              {getConversionLabel(type)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

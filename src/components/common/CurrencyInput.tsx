import React, { useState, useEffect } from 'react';
import { formatAmount, parseAmount } from '../../utils/formatters';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  disabled?: boolean;
  prefix?: string;
  required?: boolean;
  id?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  min = 0,
  max,
  allowDecimals = true,
  disabled = false,
  prefix,
  required = false,
  id
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayString, setDisplayString] = useState<string>('');

  // Sync internal displayString when value prop changes from outside and input is not actively focused
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || isNaN(value) || value === 0) {
        setDisplayString('');
      } else {
        setDisplayString(formatAmount(value));
      }
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (!value || value === 0) {
      setDisplayString('');
    } else {
      setDisplayString(value.toString());
    }
    // Select all text on focus for effortless manual replacement
    e.target.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseAmount(displayString);
    let finalValue = parsed;

    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    onChange(finalValue);
    setDisplayString(finalValue > 0 ? formatAmount(finalValue) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Disallow negative sign if min is >= 0
    if (min >= 0 && raw.includes('-')) {
      return;
    }

    // Filter characters: allow digits, commas, and at most one decimal point if enabled
    const validCharsRegex = allowDecimals ? /^[0-9,.]*$/ : /^[0-9,]*$/;
    if (!validCharsRegex.test(raw)) {
      return;
    }

    // Ensure at most one decimal point
    if (allowDecimals && (raw.match(/\./g) || []).length > 1) {
      return;
    }

    setDisplayString(raw);

    // If field is cleared, trigger onChange(0) without restoring '0' in display string
    const cleaned = raw.replace(/,/g, '');
    if (cleaned === '' || cleaned === '.') {
      onChange(0);
      return;
    }

    const numeric = parseFloat(cleaned);
    if (!isNaN(numeric)) {
      if (max !== undefined && numeric > max) {
        onChange(max);
      } else {
        onChange(numeric);
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none select-none z-10">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={isFocused ? displayString : (value > 0 ? formatAmount(value) : (displayString || ''))}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono font-medium
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${prefix ? 'pl-9' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}
          ${className}
        `}
      />
    </div>
  );
};


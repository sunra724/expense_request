"use client";

import { formatCurrency, parseCurrencyInput } from "@/lib/format";

type CurrencyInputProps = {
  className?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function CurrencyInput({
  className = "",
  value,
  onChange,
  placeholder,
  disabled = false,
}: CurrencyInputProps) {
  return (
    <input
      className={className}
      inputMode="numeric"
      value={formatCurrency(value)}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
    />
  );
}

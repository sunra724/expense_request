"use client";

import { evidenceChecklistOptions } from "@/lib/guideline";
import type { EvidenceChecklistKey } from "@/lib/guideline";

export default function EvidenceChecklistSelector({
  selected,
  onToggle,
  title,
  description,
}: {
  selected: EvidenceChecklistKey[];
  onToggle: (key: EvidenceChecklistKey) => void;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {evidenceChecklistOptions.map((option) => (
          <label key={option.key} className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(option.key)}
              onChange={() => onToggle(option.key)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

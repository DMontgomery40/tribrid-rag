import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg dark:border-gray-700">
      <button
        className="w-full flex items-center justify-between p-4 text-left font-medium"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}

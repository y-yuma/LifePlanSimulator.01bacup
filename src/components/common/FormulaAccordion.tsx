import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FormulaAccordionProps {
  title: string;
  children: React.ReactNode;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  defaultOpen?: boolean;
}

export function FormulaAccordion({
  title,
  children,
  bgColor = 'bg-blue-50',
  textColor = 'text-blue-800',
  borderColor = 'border-blue-200',
  defaultOpen = false,
}: FormulaAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${bgColor} p-3 rounded-lg border ${borderColor} mb-3`}>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className={`font-medium ${textColor}`}>{title}</h3>
        {isOpen ? (
          <ChevronUp className={`h-5 w-5 ${textColor}`} />
        ) : (
          <ChevronDown className={`h-5 w-5 ${textColor}`} />
        )}
      </div>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}
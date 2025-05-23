import React from 'react';

interface FormulaSyntaxProps {
  formula: string;
}

export function FormulaSyntax({ formula }: FormulaSyntaxProps) {
  return (
    <div className="bg-white p-2 rounded-md border border-gray-200 overflow-x-auto">
      <pre className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap">{formula}</pre>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TermTooltipProps {
  term: string;
  children: React.ReactNode;
  width?: 'narrow' | 'medium' | 'wide';
  icon?: boolean;
}

export function TermTooltip({ term, children, width = 'medium', icon = true }: TermTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ツールチップの幅を設定
  const widthClass = {
    narrow: 'w-48',
    medium: 'w-64',
    wide: 'w-80',
  }[width];

  // クリックイベント以外でツールチップを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <span className="inline-block relative" ref={tooltipRef}>
      <span
        className={`${term ? 'font-medium text-blue-600 border-b border-dotted border-blue-400' : ''} cursor-help inline-flex items-center`}
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {term}
        {icon && <HelpCircle className="h-3 w-3 ml-0.5 text-blue-500" />}
      </span>
      {isVisible && (
        <div className={`absolute z-50 ${widthClass} bg-white p-2 rounded-md shadow-lg border border-gray-200 text-sm text-gray-700 -translate-x-1/2 left-1/2 mt-1`}>
          {children}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
        </div>
      )}
    </span>
  );
}
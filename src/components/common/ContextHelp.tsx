import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface ContextHelpProps {
  tabs: Tab[];
}

export function ContextHelp({ tabs }: ContextHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  if (tabs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center transition-all"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 md:w-96">
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">ヘルプ</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {tabs.find((tab) => tab.id === activeTab)?.content}
          </div>
        </div>
      )}
    </div>
  );
}

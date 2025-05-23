import React, { createContext, useContext, useState, ReactNode } from 'react';

// ヘルプコンテキストのインターフェース
interface HelpContextType {
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

// デフォルト値を持つコンテキストを作成
const HelpContext = createContext<HelpContextType>({
  isHelpOpen: false,
  openHelp: () => {},
  closeHelp: () => {},
  toggleHelp: () => {},
});

// コンテキストを使用するためのカスタムフック
export const useHelp = () => useContext(HelpContext);

interface HelpProviderProps {
  children: ReactNode;
}

// ヘルプコンテキストのプロバイダーコンポーネント
export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openHelp = () => setIsHelpOpen(true);
  const closeHelp = () => setIsHelpOpen(false);
  const toggleHelp = () => setIsHelpOpen(prev => !prev);

  return (
    <HelpContext.Provider value={{ isHelpOpen, openHelp, closeHelp, toggleHelp }}>
      {children}
    </HelpContext.Provider>
  );
};
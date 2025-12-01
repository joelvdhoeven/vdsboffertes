import { useState, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': 'Offerte Generator',
  '/admin': 'Prijzenboek Beheer',
  '/settings': 'Instellingen',
};

const HeaderActionsContext = createContext<{
  setActions: (actions: React.ReactNode) => void;
}>({ setActions: () => {} });

export const useHeaderActions = () => useContext(HeaderActionsContext);

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Offerte Generator';

  return (
    <HeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 md:ml-64">
          <Header
            title={title}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            actions={headerActions}
          />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </HeaderActionsContext.Provider>
  );
}


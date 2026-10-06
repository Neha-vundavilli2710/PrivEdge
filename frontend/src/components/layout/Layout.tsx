import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FloatingAssistant from '../shared/FloatingAssistant';
import { useApp } from '../../contexts/AppContext';

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumb?: { label: string; to?: string }[];
  showAssistant?: boolean;
}

export default function Layout({ children, title, subtitle, breadcrumb, showAssistant = true }: Props) {
  const { sidebarOpen } = useApp();
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 248 : 0 }}
      >
        <TopBar title={title} subtitle={subtitle} breadcrumb={breadcrumb} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      {showAssistant && <FloatingAssistant />}
    </div>
  );
}

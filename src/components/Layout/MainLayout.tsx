import type { ReactNode } from 'react';
import { FileList } from '../FileManager/FileList';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <aside className="main-layout-sidebar">
        <FileList />
      </aside>
      <div className="main-layout-content">{children}</div>
    </div>
  );
}

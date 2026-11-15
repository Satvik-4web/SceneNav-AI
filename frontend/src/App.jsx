import { useState } from 'react';
import './styles/global.css';
import './styles/components.css';
import './styles/studio.css';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState('studio'); // 'studio' | 'explorer' | 'analytics' | 'munich'

  return (
    <div className="app-layout">
      <Header
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
      />
      <DashboardPage
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
      />
    </div>
  );
}

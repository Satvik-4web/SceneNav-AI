import './styles/global.css';
import './styles/components.css';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <div className="app-layout">
      <Header />
      <DashboardPage />
    </div>
  );
}

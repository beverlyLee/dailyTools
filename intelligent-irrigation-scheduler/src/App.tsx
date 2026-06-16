import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import WeatherPage from '@/pages/WeatherPage';
import SoilPage from '@/pages/SoilPage';
import PrescriptionPage from '@/pages/PrescriptionPage';
import CostPage from '@/pages/CostPage';
import CalendarPage from '@/pages/CalendarPage';
import { useAppStore } from '@/store/appStore';

export default function App() {
  const { fetchUserConfig, fetchTasks } = useAppStore();

  useEffect(() => {
    fetchUserConfig();
    fetchTasks();
  }, []);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/soil" element={<SoilPage />} />
          <Route path="/prescription" element={<PrescriptionPage />} />
          <Route path="/cost" element={<CostPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

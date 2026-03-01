import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import CCAManagement from './pages/CCAManagement';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import FeeCategories from './pages/FeeCategories';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="cca" element={<CCAManagement />} />
          <Route path="backup" element={<Backup />} />
          <Route path="settings" element={<Settings />} />
          <Route path="fee-categories" element={<FeeCategories />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;

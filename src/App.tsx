import { useState } from 'react';
import { supabase } from '../utils/supabase-client';
import { useAuth } from './hooks/useAuth';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import './App.css';
import hhLogo from './assets/hh.png';
import Button from './components/ui/Button/Button';
import PageTransition from './components/ui/PageTransition/PageTransition';
import RollcallOverlay from './components/Rollcall/RollcallOverlay';

import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage/HomePage';
import PigPage from './pages/PigPage/PigPage';
import FamilyTreePage from './pages/FamilyTreePage/FamilyTreePage.tsx';
import HealthLogPage from './pages/HealthLogPage/HealthLogPage.tsx';
import Loading from './components/ui/Loading/Loading.tsx';

function App() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [isRollcallOpen, setIsRollcallOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <Loading />;

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="wrapper">
      <header>
        <div className="headerLeft">
          <Link to="/" className="headerLink">
            <img src={hhLogo} alt="Hayley's Herd" className="headerLogo" />
          </Link>
          <div className="headerLinks">
            <Link to="/tree">
              <Button className="btn-outline headerButton treeButton">
                🌳
              </Button>
            </Link>
            <Link to="/health-log">
              <Button className="btn-outline headerButton">🏥</Button>
            </Link>
            <button
              className="btn-outline headerButton rollcallButton"
              onClick={() => setIsRollcallOpen(true)}
            >
              🍎
            </button>
          </div>
        </div>
        <Button onClick={handleLogout} className="btn-outline headerButton">
          🪵
        </Button>
      </header>

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <HomePage />
              </PageTransition>
            }
          />
          <Route
            path="/pigs/:id"
            element={
              <PageTransition>
                <PigPage />
              </PageTransition>
            }
          />
          <Route
            path="/tree"
            element={
              <PageTransition>
                <FamilyTreePage />
              </PageTransition>
            }
          />
          <Route
            path="/health-log"
            element={
              <PageTransition>
                <HealthLogPage />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
      <RollcallOverlay
        isOpen={isRollcallOpen}
        onClose={() => setIsRollcallOpen(false)}
      />
    </div>
  );
}

export default App;

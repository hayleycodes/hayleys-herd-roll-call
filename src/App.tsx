import { useState } from 'react';
import { supabase } from '../utils/supabase-client';
import { useAuth } from './hooks/useAuth';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import './App.css';
import hhLogo from './assets/hh.png';
import EmojiButton from './components/ui/EmojiButton/EmojiButton';
import PageTransition from './components/ui/PageTransition/PageTransition';
import ScrollToTop from './components/ui/ScrollToTop';
import RollcallOverlay from './components/Rollcall/RollcallOverlay';

import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage/HomePage';
import PigPage from './pages/PigPage/PigPage';
import FamilyTreePage from './pages/FamilyTreePage/FamilyTreePage.tsx';
import HealthLogPage from './pages/HealthLogPage/HealthLogPage.tsx';
import TasksPage from './pages/TasksPage/TasksPage.tsx';
import WeightsPage from './pages/WeightsPage/WeightsPage.tsx';
import TagsPage from './pages/TagsPage/TagsPage.tsx';
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
      <ScrollToTop />
      <header>
        <div className="headerLeft">
          <Link to="/" className="headerLink">
            <img src={hhLogo} alt="Hayley's Herd" className="headerLogo" />
          </Link>
          <div className="headerLinks">
            <Link to="/tree">
              <EmojiButton>🌳</EmojiButton>
            </Link>
            <Link to="/health-log">
              <EmojiButton>🏥</EmojiButton>
            </Link>
            <Link to="/tasks">
              <EmojiButton>📝</EmojiButton>
            </Link>
            <EmojiButton onClick={() => setIsRollcallOpen(true)}>
              🍎
            </EmojiButton>
          </div>
        </div>
        <EmojiButton onClick={handleLogout}>
          🪵
        </EmojiButton>
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
          <Route
            path="/tasks"
            element={
              <PageTransition>
                <TasksPage />
              </PageTransition>
            }
          />
          <Route
            path="/weights"
            element={
              <PageTransition>
                <WeightsPage />
              </PageTransition>
            }
          />
          <Route
            path="/tags"
            element={
              <PageTransition>
                <TagsPage />
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

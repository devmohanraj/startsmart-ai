import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from './components/Navbar';
import ProjectForm from './components/ProjectForm';
import AboutPanel from './components/AboutPanel';
import MarketAnalysisPanel from './components/MarketAnalysisPanel';
import ProjectAnalysis from './components/ProjectAnalysis';
import AuthModal from './components/AuthModal';
import MyProjects from './components/MyProjects';
import RiskAssessment from './components/RiskAssessment';
import Dashboard from './components/Dashboard';
import { invalidateDashboardCache } from './utils/dashboardCache';
import { projectsApi, onConnectingChange } from './services/api';
import './index.css';

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const TAB_ROUTES = {
  'Project Input': '/',
  'Project Analysis': '/project-analysis',
  'My Projects': '/my-projects',
  'Risk Assessment': '/risk-assessment',
  'Dashboard': '/dashboard',
};

const ROUTE_TO_TAB = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, route]) => [route, tab]),
);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = ROUTE_TO_TAB[location.pathname] || 'Project Input';
  const [submittedProject, setSubmittedProject] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [connectingToServer, setConnectingToServer] = useState(false);

  useEffect(() => {
    return onConnectingChange(setConnectingToServer);
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("startsmart_user"));
      return stored && stored.userId ? stored : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const [userProjects, setUserProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const [analysisCache, setAnalysisCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("startsmart_market_analyses")) || {};
    } catch {
      return {};
    }
  });
  const [showRiskIndicator, setShowRiskIndicator] = useState(false);
  const [riskAssessmentCache, setRiskAssessmentCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("startsmart_risk_assessments")) || {};
    } catch {
      return {};
    }
  });
  const [recommendationCache, setRecommendationCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("startsmart_recommendations")) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("startsmart_risk_assessments", JSON.stringify(riskAssessmentCache));
    } catch {
      // Best-effort persistence; quota/serialization failures are dropped.
    }
  }, [riskAssessmentCache]);

  useEffect(() => {
    try {
      localStorage.setItem("startsmart_market_analyses", JSON.stringify(analysisCache));
    } catch {
      // Best-effort persistence; quota/serialization failures are dropped.
    }
  }, [analysisCache]);

  useEffect(() => {
    try {
      localStorage.setItem("startsmart_recommendations", JSON.stringify(recommendationCache));
    } catch {
      // Best-effort persistence; quota/serialization failures are dropped.
    }
  }, [recommendationCache]);

  const handleProjectSubmit = (project) => {
    setSubmittedProject(project);
    setIsAnalyzing(true);
    setShowRiskIndicator(true);
    navigate(TAB_ROUTES['Project Analysis']);
    setUserProjects((prev) => {
      if (prev.some((p) => p.projectId === project.projectId)) return prev;
      return [project, ...prev];
    });
    // New project changes dashboard totals; drop the cached summary.
    invalidateDashboardCache(user?.userId);
    fetchUserProjects(user?.userId);
  };

  const handleReset = () => {
    setSubmittedProject(null);
    setIsAnalyzing(false);
    setShowRiskIndicator(false);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, submittedProject]);

  // Route-derived state so deep links and back/forward land in the same UI state.
  const effectiveSubmittedProject =
    activeTab === 'Project Input' ? null : submittedProject;
  const riskIndicatorVisible =
    activeTab === 'Risk Assessment' ? false : showRiskIndicator;

  const handleAnalysisComplete = useCallback(() => {
    setIsAnalyzing(false);
  }, []);

  const handleCacheAnalysis = useCallback((projectId, data) => {
    if (!projectId || !data) return;
    setAnalysisCache((prev) => ({ ...prev, [projectId]: data }));
  }, []);

  const handleAssessmentLoaded = useCallback((projectId, data) => {
    if (!projectId || !data) return;
    setRiskAssessmentCache((prev) => {
      if (prev[projectId]) return prev;
      return { ...prev, [projectId]: data };
    });
  }, []);

  const handleRecommendationsLoaded = useCallback((projectId, data) => {
    if (!projectId || !data) return;
    setRecommendationCache((prev) => {
      if (prev[projectId]) return prev;
      return { ...prev, [projectId]: data };
    });
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    try {
      localStorage.setItem("startsmart_user", JSON.stringify(userData));
    } catch {
      // Best-effort persistence; quota/serialization failures are dropped.
    }
    setAuthModalOpen(false);
    await fetchUserProjects(userData.userId);
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem("startsmart_user");
    } catch {
      // Best-effort persistence; quota/storage failures are dropped.
    }
    setUserProjects([]);
    setSubmittedProject(null);
    navigate(TAB_ROUTES['Project Input']);
    setShowRiskIndicator(false);
  };

  const handleMyProjects = () => {
    navigate(TAB_ROUTES['My Projects']);
    setSubmittedProject(null);
    setIsAnalyzing(false);
    setShowRiskIndicator(false);
  };

  const handleSelectProjectForView = (project) => {
    setSubmittedProject(project);
  };

  const fetchUserProjects = async (userId) => {
    setLoadingProjects(true);
    try {
      const projects = await projectsApi.list(userId);
      setUserProjects(projects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Session restored from localStorage; refetch projects once on mount.
  useEffect(() => {
    if (user?.userId) {
      fetchUserProjects(user.userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectProject = (project) => {
    setSubmittedProject(project);
    navigate(TAB_ROUTES['Project Analysis']);
  };

  const handleSelectProjectForAssessment = (project) => {
    // Resolve the full record (not the partial picker entry) for the assessment view.
    const full = userProjects.find((p) => p.projectId === project.projectId)
      || { ...project, projectType: project.industry };
    setSubmittedProject(full);
    navigate(TAB_ROUTES['Risk Assessment']);
  };

  const handleDeleteProject = async (projectId) => {
    if (!user) return;
    setDeletingProjectId(projectId);
    try {
      await projectsApi.remove(projectId);
      setUserProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      // Deletion changes dashboard totals; drop the cached summary.
      invalidateDashboardCache(user?.userId);
      if (submittedProject?.projectId === projectId) {
        handleReset();
      }
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Failed to delete project:', err);
      toast.error(err.message || 'Failed to delete project. Please try again.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleTabChange = (tab) => {
    navigate(TAB_ROUTES[tab]);
    if (tab === 'Risk Assessment') setShowRiskIndicator(false);
    if (tab === 'Project Input') setSubmittedProject(null);
  };

  const handleHome = () => {
    navigate(TAB_ROUTES['Project Input']);
    setSubmittedProject(null);
    setIsAnalyzing(false);
    setShowRiskIndicator(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-gray-950 via-gray-900 to-slate-900">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onHome={handleHome}
        user={user}
        onLoginClick={() => handleOpenAuth('login')}
        onMyProjects={handleMyProjects}
        onLogout={handleLogout}
        showRiskIndicator={riskIndicatorVisible}
      />
      <main className="flex-1 animate-[fadeIn_0.4s_ease]">
        <Routes>
          <Route
            path="/"
            element={
              <div className="max-w-345 mx-auto px-4 sm:px-6 py-4">
                {effectiveSubmittedProject ? (
                  <div className="animate-slide-up stagger-1 w-full">
                    <MarketAnalysisPanel
                      projectId={effectiveSubmittedProject.projectId}
                      onAnalysisComplete={handleAnalysisComplete}
                      onCacheAnalysis={handleCacheAnalysis}
                      cachedData={analysisCache[effectiveSubmittedProject.projectId]}
                      project={effectiveSubmittedProject}
                      onReset={handleReset}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
                    <div className="animate-slide-up stagger-1 lg:col-span-6">
                      <AboutPanel />
                    </div>
                    <div className="animate-slide-up stagger-2 lg:col-span-6">
                      <ProjectForm
                        onSuccess={handleProjectSubmit}
                        isLoggedIn={!!user}
                        onRequireAuth={() => handleOpenAuth('signup')}
                        userId={user?.userId}
                      />
                    </div>
                  </div>
                )}
              </div>
            }
          />
          <Route
            path="/project-analysis"
            element={
              <ProjectAnalysis
                project={effectiveSubmittedProject}
                projects={userProjects}
                isLoggedIn={!!user}
                onSelectProject={handleSelectProjectForView}
                onLoginClick={() => handleOpenAuth('login')}
                onAnalysisComplete={handleAnalysisComplete}
                onCacheAnalysis={handleCacheAnalysis}
                onReset={handleReset}
                analysisCache={analysisCache}
              />
            }
          />
          <Route
            path="/my-projects"
            element={
              <MyProjects
                projects={userProjects}
                onSelectProject={handleSelectProject}
                onDeleteProject={handleDeleteProject}
                loading={loadingProjects}
                deletingProjectId={deletingProjectId}
              />
            }
          />
          <Route
            path="/risk-assessment"
            element={
              <RiskAssessment
                project={effectiveSubmittedProject}
                projects={userProjects}
                isLoggedIn={!!user}
                onSelectProject={handleSelectProjectForView}
                onLoginClick={() => handleOpenAuth('login')}
                onReset={handleReset}
                riskAssessmentCache={riskAssessmentCache}
                onAssessmentLoaded={handleAssessmentLoaded}
                recommendationCache={recommendationCache}
                onRecommendationsLoaded={handleRecommendationsLoaded}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                key={user?.userId ?? "guest"}
                userId={user?.userId}
                isLoggedIn={!!user}
                onLoginClick={() => handleOpenAuth('login')}
                onSelectProjectForAssessment={handleSelectProjectForAssessment}
                onGoToProjectInput={() => handleTabChange('Project Input')}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {connectingToServer && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center gap-4">
            <svg className="w-12 h-12 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-300">Connecting to the server — this can take a moment on the first request.</p>
          </div>
        </div>
      )}

      {isAnalyzing && effectiveSubmittedProject && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center gap-4">
            <svg className="w-12 h-12 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-gray-300">Analyzing Market & Competitors...</p>
          </div>
        </div>
      )}

      <AuthModal
        key={authModalOpen ? 'open' : 'closed'}
        isOpen={authModalOpen}
        onClose={handleCloseAuth}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;

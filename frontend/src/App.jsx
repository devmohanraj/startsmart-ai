import { useState, useEffect, useCallback } from 'react';
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
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('Project Input');
  const [submittedProject, setSubmittedProject] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [user, setUser] = useState(null);
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

  useEffect(() => {
    try {
      localStorage.setItem("startsmart_risk_assessments", JSON.stringify(riskAssessmentCache));
    } catch {
      // ignore quota / serialization errors
    }
  }, [riskAssessmentCache]);

  useEffect(() => {
    try {
      localStorage.setItem("startsmart_market_analyses", JSON.stringify(analysisCache));
    } catch {
      // ignore quota / serialization errors
    }
  }, [analysisCache]);

  const handleProjectSubmit = (project) => {
    setSubmittedProject(project);
    setIsAnalyzing(true);
    setShowRiskIndicator(true);
    setActiveTab('Project Analysis');
    setUserProjects((prev) => {
      if (prev.some((p) => p.projectId === project.projectId)) return prev;
      return [project, ...prev];
    });
  };

  const handleReset = () => {
    setSubmittedProject(null);
    setIsAnalyzing(false);
    setShowRiskIndicator(false);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [submittedProject]);

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

  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  const handleAuthSuccess = async (userData) => {
    setUser(userData);
    setAuthModalOpen(false);
    await fetchUserProjects(userData.userId);
  };

  const handleLogout = () => {
    setUser(null);
    setUserProjects([]);
    setSubmittedProject(null);
    setActiveTab('Project Input');
    setShowRiskIndicator(false);
  };

  const handleMyProjects = () => {
    setActiveTab('My Projects');
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/user/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const projects = await res.json();
      setUserProjects(projects);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setUserProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSelectProject = (project) => {
    setSubmittedProject(project);
    setActiveTab('Project Analysis');
  };

  const handleDeleteProject = async (projectId) => {
    if (!user) return;
    setDeletingProjectId(projectId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete project');
      }
      setUserProjects((prev) => prev.filter((p) => p.projectId !== projectId));
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
    setActiveTab(tab);
    if (tab === 'Risk Assessment') setShowRiskIndicator(false);
    if (tab === 'Project Input') setSubmittedProject(null);
  };

  const handleHome = () => {
    setActiveTab('Project Input');
    setSubmittedProject(null);
    setIsAnalyzing(false);
    setShowRiskIndicator(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Project Input':
        return (
          <div className="max-w-345 mx-auto px-4 sm:px-6 py-4">
            {submittedProject ? (
              <div className="animate-slide-up stagger-1 w-full">
                <MarketAnalysisPanel
                  projectId={submittedProject.projectId}
                  onAnalysisComplete={handleAnalysisComplete}
                  onCacheAnalysis={handleCacheAnalysis}
                  cachedData={analysisCache[submittedProject.projectId]}
                  project={submittedProject}
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
        );
      case 'Project Analysis':
        return (
          <ProjectAnalysis
            project={submittedProject}
            projects={userProjects}
            isLoggedIn={!!user}
            onSelectProject={handleSelectProjectForView}
            onLoginClick={() => handleOpenAuth('login')}
            onAnalysisComplete={handleAnalysisComplete}
            onCacheAnalysis={handleCacheAnalysis}
            onReset={handleReset}
            analysisCache={analysisCache}
          />
        );
      case 'My Projects':
        return (
          <MyProjects
            projects={userProjects}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            loading={loadingProjects}
            deletingProjectId={deletingProjectId}
          />
        );
      case 'Risk Assessment':
        return (
          <RiskAssessment
            project={submittedProject}
            projects={userProjects}
            isLoggedIn={!!user}
            onSelectProject={handleSelectProjectForView}
            onLoginClick={() => handleOpenAuth('login')}
            onReset={handleReset}
            riskAssessmentCache={riskAssessmentCache}
            onAssessmentLoaded={handleAssessmentLoaded}
          />
        );
      case 'Dashboard':
        return <Dashboard />;
      default:
        return null;
    }
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
        showRiskIndicator={showRiskIndicator}
      />
      <main className="flex-1 animate-[fadeIn_0.4s_ease]">
        {renderContent()}
      </main>

      {/* Analyzing overlay */}
      {isAnalyzing && submittedProject && (
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

      {/* Auth Modal */}
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

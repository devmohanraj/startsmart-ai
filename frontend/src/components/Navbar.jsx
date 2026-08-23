import { useState, useRef, useEffect } from "react";

const TABS = [
  "Project Input",
  "Project Analysis",
  "Risk Assessment",
  "Dashboard",
];

function Navbar({ activeTab, onTabChange, onHome, user, onLoginClick, onMyProjects, onLogout, showRiskIndicator }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-345 mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
        <button
          onClick={onHome}
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
            <img
              src="/logo.svg"
              alt="StartSmart AI"
              className="w-7 h-7 sm:w-8.5 sm:h-8"
            />
          </div>
          <span className="text-sm sm:text-base font-semibold text-gray-100 tracking-tight">
            StartSmart AI
          </span>
        </button>

        <div className="hidden md:flex items-center gap-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? "text-indigo-300 bg-gray-800"
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              }`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
              {tab === "Risk Assessment" && showRiskIndicator && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400" />
                </span>
              )}
            </button>
          ))}

          {user ? (
            <div className="relative ml-2" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm hover:bg-indigo-600 transition-colors cursor-pointer"
                aria-label="Profile menu"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-xl shadow-lg border border-gray-700 py-1.5 animate-[fadeIn_0.15s_ease]">
                  <div className="px-4 py-2 border-b border-gray-700 mb-1">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onMyProjects();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    My Projects
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="ml-2 px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              Log In / Sign Up
            </button>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          {!user && (
            <button
              onClick={onLoginClick}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              Log In
            </button>
          )}
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-xl shadow-lg border border-gray-700 py-2 animate-[fadeIn_0.15s_ease] max-h-[80vh] overflow-y-auto">
                {user && (
                  <div className="px-4 py-2 border-b border-gray-700 mb-1">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                )}
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(tab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      activeTab === tab
                        ? "text-indigo-300 bg-gray-700"
                        : "text-gray-200 hover:bg-gray-700"
                    }`}
                  >
                    {tab}
                    {tab === "Risk Assessment" && showRiskIndicator && (
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  {user ? (
                    <>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onMyProjects();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        My Projects
                      </button>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLoginClick();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
                    >
                      Log In / Sign Up
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

import { useState, useEffect } from "react";

function AuthModal({ isOpen, onClose, initialMode = "login", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setFormData({ name: "", email: "", password: "" });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const url = mode === "login"
        ? `${import.meta.env.VITE_API_URL}/api/auth/login`
        : `${import.meta.env.VITE_API_URL}/api/auth/signup`;

      const body = mode === "login"
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (onAuthSuccess) {
        onAuthSuccess({
          userId: data.userId,
          name: data.name,
          email: data.email,
        });
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    handleModeChange(mode === "login" ? "signup" : "login");
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-8 max-h-[90dvh] overflow-y-auto animate-[fadeIn_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            {mode === "login"
              ? "Log in to save your projects and view your analysis anytime."
              : "Sign up to save your projects and view your analysis anytime."}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-700 rounded-lg mb-6">
          <button
            onClick={() => handleModeChange("login")}
            className={`flex-1 h-9 text-sm font-medium rounded-md transition-all cursor-pointer ${
              mode === "login"
                ? "bg-gray-600 text-indigo-400 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => handleModeChange("signup")}
            className={`flex-1 h-9 text-sm font-medium rounded-md transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-gray-600 text-indigo-400 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Logging in..." : "Creating account..."}
                </span>
              ) : mode === "login" ? (
                "Log In"
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>

        {/* Switch mode link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={switchMode}
            className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
import { useState } from "react";
import toast from "react-hot-toast";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Education",
  "Manufacturing",
  "Other",
];
const BUSINESS_MODELS = [
  "SaaS",
  "Marketplace",
  "Subscription",
  "Freemium",
  "D2C",
  "B2B",
  "Other",
];

const INITIAL_FORM = {
  projectName: "",
  industry: "",
  businessModel: "",
  targetMarket: "",
  budget: "",
  description: "",
};

function ProjectForm({ onSuccess, isLoggedIn, onRequireAuth, userId }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFocus = () => {
    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!isLoggedIn) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setLoading(true);

    const payload = {
      projectName: formData.projectName,
      industrySector: formData.industry,
      businessModel: formData.businessModel,
      targetMarket: formData.targetMarket,
      budget: Number(formData.budget),
      description: formData.description,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Request failed with status ${res.status}`,
        );
      }

      const result = await res.json();
      setFormData(INITIAL_FORM);
      toast.success("Project submitted successfully!");
      if (onSuccess) onSuccess(result);
    } catch (err) {
      toast.error(err.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl shadow-sm p-5 sm:p-8">
      <div className="mb-9">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Submit your project
        </h1>
        <p className="text-base text-gray-300 mt-1.5">
          Tell us about your startup or project idea for risk analysis.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        autocomplete="off"
        noValidate
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="projectName"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Project name
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            placeholder="e.g. TechVenture AI"
            value={formData.projectName}
            onChange={handleChange}
            onFocus={handleFocus}
            readOnly={!isLoggedIn}
            required
            className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="industry"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Industry / Sector
          </label>
          <select
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            onFocus={handleFocus}
            onMouseDown={(e) => {
              if (!isLoggedIn) e.preventDefault();
            }}
            required
            className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="" disabled>
              Select an industry
            </option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="businessModel"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Business model
          </label>
          <select
            id="businessModel"
            name="businessModel"
            value={formData.businessModel}
            onChange={handleChange}
            onFocus={handleFocus}
            onMouseDown={(e) => {
              if (!isLoggedIn) e.preventDefault();
            }}
            required
            className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="" disabled>
              Select a business model
            </option>
            {BUSINESS_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="targetMarket"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Target market
          </label>
          <input
            id="targetMarket"
            name="targetMarket"
            type="text"
            placeholder="e.g. SMBs, Enterprises, Consumers"
            value={formData.targetMarket}
            onChange={handleChange}
            onFocus={handleFocus}
            readOnly={!isLoggedIn}
            required
            className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="budget"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Budget (INR)
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            placeholder="e.g. 5000000"
            min="0"
            value={formData.budget}
            onChange={handleChange}
            onFocus={handleFocus}
            readOnly={!isLoggedIn}
            required
            className="w-full h-10 px-3.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Project description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Brief description of your project idea..."
            rows={4}
            value={formData.description}
            onChange={handleChange}
            onFocus={handleFocus}
            readOnly={!isLoggedIn}
            required
            className="w-full px-3.5 py-2.5 text-sm border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-y min-h-24"
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
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit for analysis"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectForm;
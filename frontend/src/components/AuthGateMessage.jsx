function AuthGateMessage({ title, description, onLoginClick }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 7.5v3.75m0 0c-.694.355-1.5.943-2.25 1.75m-3.75 4.5a7.5 7.5 0 0114.25-4.5M12 11.25v7.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          {description}
        </p>
        <button
          onClick={onLoginClick}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer"
        >
          Log In / Sign Up
        </button>
      </div>
    </div>
  );
}

export default AuthGateMessage;
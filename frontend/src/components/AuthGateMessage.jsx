function AuthGateMessage({ title, description, onLoginClick }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
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
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
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
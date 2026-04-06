function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.72 5.28l-1.77 1.77M7.05 16.95l-1.77 1.77M18.72 18.72l-1.77-1.77M7.05 7.05L5.28 5.28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.2 14.2A7.8 7.8 0 0 1 9.8 3.8a8.8 8.8 0 1 0 10.4 10.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M17.2 5.1v1.6M17.2 9.1v1.6M15.2 7.1h1.6M19.2 7.1h1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeToggle({ theme, usesSystemTheme, onChangeTheme }) {
  return (
    <div
      className="theme-toggle"
      role="group"
      aria-label="Theme switcher"
      title={usesSystemTheme ? `Following browser default: ${theme}` : `Manual theme: ${theme}`}
    >
      <button
        className={`theme-toggle-option ${theme === "light" ? "active" : ""}`}
        onClick={() => onChangeTheme("light")}
        type="button"
        aria-pressed={theme === "light"}
        aria-label="Use light mode"
      >
        <SunIcon />
      </button>
      <button
        className={`theme-toggle-option ${theme === "dark" ? "active" : ""}`}
        onClick={() => onChangeTheme("dark")}
        type="button"
        aria-pressed={theme === "dark"}
        aria-label="Use dark mode"
      >
        <MoonIcon />
      </button>
    </div>
  );
}

export default ThemeToggle;

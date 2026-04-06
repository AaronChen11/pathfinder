import { useEffect, useState } from "react";
import MenuToggleIcon from "./menu-toggle-icon";
import { useScroll } from "./use-scroll";

function AppHeader({
  activeTab,
  selectedSchool,
  onOpenDetails,
  onOpenSchools,
  onSignOut,
  scrollContainerRef,
}) {
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const scrolled = useScroll(scrollContainerRef, 10);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      setIsCompact(entry.contentRect.width < 980);
    });

    observer.observe(container);
    setIsCompact(container.getBoundingClientRect().width < 980);

    return () => observer.disconnect();
  }, [scrollContainerRef]);

  return (
    <header
      className={`app-header ${scrolled && !open ? "is-scrolled" : ""} ${open ? "is-open" : ""} ${
        isCompact ? "is-compact" : ""
      }`.trim()}
    >
      <nav className="app-header-bar">
        <div className="tabs app-header-tabs">
          <button
            className={`${activeTab === "details" ? "active" : ""} ${!selectedSchool ? "tab-locked" : ""}`.trim()}
            onClick={onOpenDetails}
            aria-disabled={!selectedSchool}
            title={!selectedSchool ? "Select a school from the sidebar first" : "Open selected school details"}
          >
            School Details
          </button>
          <button className={activeTab === "schools" ? "active" : ""} onClick={onOpenSchools}>
            All Schools
          </button>
        </div>

        <div className="app-header-desktop-actions">
          <button className="ghost-button top-nav-signout" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>

        <button
          className="ghost-button app-header-mobile-toggle"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          <MenuToggleIcon open={open} className="app-header-menu-icon" duration={300} />
        </button>
      </nav>

      <div className={`app-header-mobile-panel ${open ? "is-open" : ""}`.trim()}>
        <div className="app-header-mobile-actions">
          <button
            className={`${activeTab === "details" ? "active" : ""} ${!selectedSchool ? "tab-locked" : ""}`.trim()}
            onClick={onOpenDetails}
            aria-disabled={!selectedSchool}
          >
            School Details
          </button>
          <button className={activeTab === "schools" ? "active" : ""} onClick={onOpenSchools}>
            All Schools
          </button>
          <button className="ghost-button" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;

import { useEffect, useMemo, useRef, useState } from "react";
import AuthCard from "./components/AuthCard";
import DetailsCard from "./components/DetailsCard";
import CategorySelect from "./components/CategorySelect";
import SearchComposer from "./components/SearchComposer";
import StatCard from "./components/StatCard";
import ThemeToggle from "./components/ThemeToggle";
import AppHeader from "./components/ui/app-header";
import { formatAcceptanceRate, formatRank, formatSchoolName, getNumericRank } from "./lib/formatters";
import { loadSchools as loadSchoolsData } from "./lib/schoolsData";
import { getSchoolSuggestions } from "./lib/suggestions";
import { supabase } from "./lib/supabase";
import { clearUserLists, deleteSchoolFromCategory, loadUserLists, saveSchoolToCategory } from "./lib/userLists";

const categories = ["Target", "Reach", "Safety"];
const THEME_STORAGE_KEY = "pathfinder-theme";

const emptyLists = {
  Target: [],
  Reach: [],
  Safety: [],
};

function moveSchoolToCategory(currentLists, schoolName, nextCategory) {
  const nextLists = {
    Target: currentLists.Target.filter((item) => item !== schoolName),
    Reach: currentLists.Reach.filter((item) => item !== schoolName),
    Safety: currentLists.Safety.filter((item) => item !== schoolName),
  };

  nextLists[nextCategory] = [...nextLists[nextCategory], schoolName];
  return nextLists;
}

function getPreferredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const shellRef = useRef(null);
  const mainPanelRef = useRef(null);
  const [lists, setLists] = useState(emptyLists);
  const [activeTab, setActiveTab] = useState("schools");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Target");
  const [allSchools, setAllSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [expandedSchools, setExpandedSchools] = useState({});
  const [rowCategories, setRowCategories] = useState({});
  const [sidebarWidth, setSidebarWidth] = useState("30%");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDetailsHint, setShowDetailsHint] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : getPreferredTheme();
  });
  const [usesSystemTheme, setUsesSystemTheme] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return !window.localStorage.getItem(THEME_STORAGE_KEY);
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!supabase) {
        if (mounted) {
          setAuthLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session || null);
        setAuthLoading(false);
      }
    }

    loadSession();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSchools() {
      if (supabase && !session) {
        setAllSchools([]);
        setLoadingSchools(false);
        return;
      }

      setLoadingSchools(true);
      try {
        const data = await loadSchoolsData();
        if (!cancelled) {
          setAllSchools(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch schools", error);
        }
      } finally {
        if (!cancelled) {
          setLoadingSchools(false);
        }
      }
    }

    loadSchools();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncTheme(event) {
      if (usesSystemTheme) {
        setTheme(event.matches ? "dark" : "light");
      }
    }

    if (usesSystemTheme) {
      setTheme(mediaQuery.matches ? "dark" : "light");
    }

    mediaQuery.addEventListener("change", syncTheme);
    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
    };
  }, [usesSystemTheme]);

  useEffect(() => {
    const query = schoolQuery.trim();
    if (!query) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuggestions(getSchoolSuggestions(allSchools, query, selectedCategory, 16));
      setLoadingSuggestions(false);
    }, 120);

    setLoadingSuggestions(true);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [allSchools, schoolQuery, selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    async function loadLists() {
      if (!supabase || !session?.user?.id) {
        setLists(emptyLists);
        return;
      }

      try {
        const nextLists = await loadUserLists(session.user.id);
        if (!cancelled) {
          setLists(nextLists);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load saved lists", error);
        }
      }
    }

    loadLists();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();
    const visibleSchools = query
      ? allSchools.filter((school) => school.name.toLowerCase().includes(query))
      : allSchools;

    return [...visibleSchools].sort((left, right) => {
      const leftRank = getNumericRank(left.rank);
      const rightRank = getNumericRank(right.rank);
      const leftHasRank = leftRank !== null;
      const rightHasRank = rightRank !== null;

      if (leftHasRank && rightHasRank && leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (leftHasRank !== rightHasRank) {
        return leftHasRank ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [allSchools, schoolQuery]);

  async function addSchoolToList(name, category) {
    const nextCategory = category || "Target";
    setLists((current) => moveSchoolToCategory(current, name, nextCategory));

    if (supabase && session?.user?.id) {
      try {
        await saveSchoolToCategory(session.user.id, name, nextCategory);
      } catch (error) {
        console.error("Failed to save school list item", error);
      }
    }
  }

  async function removeSchoolFromList(name, category) {
    setLists((current) => ({
      ...current,
      [category]: current[category].filter((item) => item !== name),
    }));

    if (supabase && session?.user?.id) {
      try {
        await deleteSchoolFromCategory(session.user.id, name);
      } catch (error) {
        console.error("Failed to remove school list item", error);
      }
    }
  }

  async function clearAllLists() {
    setLists(emptyLists);

    if (supabase && session?.user?.id) {
      try {
        await clearUserLists(session.user.id);
      } catch (error) {
        console.error("Failed to clear saved lists", error);
      }
    }
  }

  function addSchoolAndShowDetails(name) {
    if (!name) return;
    addSchoolToList(name, selectedCategory);
    const match = allSchools.find((school) => school.name === name);
    setSelectedSchool(match || { name });
    setActiveTab("details");
    setSchoolQuery("");
    setSuggestions([]);
  }

  function addTypedSchool() {
    addSchoolAndShowDetails(schoolQuery.trim());
  }

  function toggleExpanded(name) {
    setExpandedSchools((current) => ({
      ...current,
      [name]: !current[name],
    }));
  }

  function setRowCategory(name, category) {
    setRowCategories((current) => ({
      ...current,
      [name]: category,
    }));
  }

  function startResize() {
    function onMove(event) {
      if (!shellRef.current) return;
      const bounds = shellRef.current.getBoundingClientRect();
      const nextWidth = event.clientX - bounds.left;
      const minSidebar = 360;
      const minMain = 760;
      const clamped = Math.max(minSidebar, Math.min(nextWidth, bounds.width - minMain));
      setSidebarWidth(`${clamped}px`);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function setThemeMode(nextTheme) {
    setTheme(nextTheme);
    setUsesSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSelectedSchool(null);
    setActiveTab("schools");
    setLists(emptyLists);
    setExpandedSchools({});
    setRowCategories({});
  }

  function applySuggestion(school) {
    setSchoolQuery(school.name);
  }

  function showSchoolDetails(name) {
    const match = allSchools.find((school) => school.name === name);
    setSelectedSchool(match || { name });
    setActiveTab("details");
    setShowDetailsHint(false);
  }

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (supabase && !session) {
    return <AuthCard />;
  }

  return (
    <div className="app-shell" ref={shellRef}>
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <div className="brand-block">
          <div className="brand-row">
            <div className="brand-identity">
              <img className="brand-icon" src="/pathfinder-icon.svg" alt="Pathfinder logo" />
              <div>
                <p className="eyebrow">Pathfinder</p>
                <h1>College Planner</h1>
                {session?.user?.email ? <p className="muted">Signed in as {session.user.email}</p> : null}
              </div>
            </div>
            <ThemeToggle theme={theme} usesSystemTheme={usesSystemTheme} onChangeTheme={setThemeMode} />
          </div>
          <p className="muted">Sort schools into Reach, Target, and Safety, then inspect the latest stats.</p>
        </div>

        <SearchComposer
          schoolQuery={schoolQuery}
          selectedCategory={selectedCategory}
          suggestions={suggestions}
          loadingSuggestions={loadingSuggestions}
          onChangeQuery={setSchoolQuery}
          onAdd={addTypedSchool}
          onAddSuggestion={(school) => addSchoolAndShowDetails(school.name)}
          onApplySuggestion={applySuggestion}
          onChangeCategory={setSelectedCategory}
          categories={categories}
        />

        <div className="list-stack">
          {categories.map((category) => (
            <section key={category} className="list-panel">
              <div className="list-panel-header">
                <h2>{category}</h2>
                <span>{lists[category].length}</span>
              </div>
              <div className="list-items">
                {lists[category].length === 0 ? (
                  <p className="empty-copy">No schools yet.</p>
                ) : (
                  lists[category].map((name) => (
                    <div key={`${category}-${name}`} className="saved-school">
                      <button className="link-button saved-school-name" onClick={() => showSchoolDetails(name)}>
                        {formatSchoolName(name)}
                      </button>
                      <div className="saved-school-actions">
                        <button className="ghost-button" onClick={() => showSchoolDetails(name)}>
                          Stats
                        </button>
                        <button className="danger-button" onClick={() => removeSchoolFromList(name, category)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        <button className="text-button" onClick={clearAllLists}>
          Clear All
        </button>
      </aside>

      <div
        className="splitter"
        onMouseDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
      />

      <main className="main-panel" ref={mainPanelRef}>
        <AppHeader
          activeTab={activeTab}
          selectedSchool={selectedSchool}
          onOpenDetails={() => {
            if (selectedSchool) {
              setActiveTab("details");
              setShowDetailsHint(false);
            } else {
              setShowDetailsHint(true);
            }
          }}
          onOpenSchools={() => setActiveTab("schools")}
          onSignOut={handleSignOut}
          scrollContainerRef={mainPanelRef}
        />

        {!selectedSchool && showDetailsHint ? (
          <p className="tab-hint">School Details unlocks after you pick a school from the left sidebar.</p>
        ) : null}

        {activeTab === "details" ? (
          <DetailsCard school={selectedSchool} />
        ) : (
          <section className="school-browser">
            <div className="browser-header">
              <div>
                <p className="eyebrow">Directory</p>
                <h2>All Schools</h2>
              </div>
              <p className="muted">{loadingSchools ? "Loading..." : `${filteredSchools.length} schools`}</p>
            </div>

            <div className="school-list">
              {loadingSchools ? (
                <div className="empty-state">
                  <p>Loading schools...</p>
                </div>
              ) : (
                filteredSchools.map((school) => (
                  <article key={school.name} className="school-row">
                    <div className="school-row-main">
                      <div className="school-row-title">
                        <span className="school-rank">{formatRank(school.rank)}</span>
                        <div>
                          <h3>{formatSchoolName(school.name)}</h3>
                          <p className="muted">
                            {school.location || "Unknown location"} · Acceptance {formatAcceptanceRate(school.acceptanceRate)}
                          </p>
                        </div>
                      </div>
                      <div className="school-row-actions">
                        <div className="school-row-filter-row">
                          <CategorySelect
                            value={rowCategories[school.name] || "Target"}
                            options={categories}
                            onChange={(category) => setRowCategory(school.name, category)}
                            className="school-row-category-select"
                          />
                          <button
                            className="primary-button"
                            onClick={() => addSchoolToList(school.name, rowCategories[school.name] || "Target")}
                          >
                            Add
                          </button>
                        </div>
                        <button className="link-button school-row-link" onClick={() => toggleExpanded(school.name)}>
                          {expandedSchools[school.name] ? "Hide" : "Quick View"}
                        </button>
                      </div>
                    </div>

                    {expandedSchools[school.name] ? (
                      <div className="school-row-expanded">
                        <div className="school-row-details">
                          <StatCard label="Acceptance Rate" value={formatAcceptanceRate(school.acceptanceRate)} />
                          <StatCard label="Tuition" value={school.tuition || "N/A"} />
                          <StatCard label="In-State" value={school.inStateTuition || "N/A"} />
                          <StatCard label="SAT" value={school.satRange || "N/A"} />
                          <StatCard label="Enrollment" value={school.enrollment || "N/A"} />
                        </div>
                        <div className="school-row-description">
                          <p className="stat-label">Description</p>
                          <p className="description-copy">{school.description || "N/A"}</p>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

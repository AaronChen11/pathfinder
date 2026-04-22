import { useEffect, useMemo, useState } from "react";
import AIAdvisor from "./components/AIAdvisor";
import AuthCard from "./components/AuthCard";
import CategorySelect from "./components/CategorySelect";
import SearchComposer from "./components/SearchComposer";
import StatCard from "./components/StatCard";
import StudentProfilePage from "./components/StudentProfilePage";
import ThemeToggle from "./components/ThemeToggle";
import { formatAcceptanceRate, formatRank, formatSchoolName, getNumericRank } from "./lib/formatters";
import { loadSchools as loadSchoolsData } from "./lib/schoolsData";
import { getSchoolSuggestions } from "./lib/suggestions";
import { supabase } from "./lib/supabase";
import { clearUserLists, deleteSchoolFromCategory, loadUserLists, saveSchoolToCategory } from "./lib/userLists";

const categories = ["Target", "Reach", "Safety"];
const listFilters = ["All", ...categories];
const admissionStatuses = ["considering", "applied", "accepted", "waitlisted", "denied"];
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

function sortSchoolsByRankAndName(schools) {
  return [...schools].sort((left, right) => {
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
}

function App() {
  const [lists, setLists] = useState(emptyLists);
  const [activeTab, setActiveTab] = useState("list");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Target");
  const [listFilter, setListFilter] = useState("All");
  const [dismissedAiPicks, setDismissedAiPicks] = useState([]);
  const [schoolStatuses, setSchoolStatuses] = useState({});
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  const [allSchools, setAllSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [expandedSchools, setExpandedSchools] = useState({});
  const [rowCategories, setRowCategories] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
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

  const rankedSchools = useMemo(() => sortSchoolsByRankAndName(allSchools), [allSchools]);

  const filteredSchools = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();
    const visibleSchools = query
      ? allSchools.filter((school) => school.name.toLowerCase().includes(query))
      : allSchools;

    return sortSchoolsByRankAndName(visibleSchools);
  }, [allSchools, schoolQuery]);

  const savedCollegeRows = useMemo(
    () =>
      categories.flatMap((category) =>
        lists[category].map((name) => {
          const school = allSchools.find((item) => item.name === name) || { name };
          return { category, name, school };
        }),
      ),
    [allSchools, lists],
  );

  const filteredSavedCollegeRows = useMemo(
    () => (listFilter === "All" ? savedCollegeRows : savedCollegeRows.filter((row) => row.category === listFilter)),
    [listFilter, savedCollegeRows],
  );

  const aiPickSchools = useMemo(() => {
    const savedNames = new Set(savedCollegeRows.map((row) => row.name));
    const dismissedNames = new Set(dismissedAiPicks);
    return rankedSchools.filter((school) => !savedNames.has(school.name) && !dismissedNames.has(school.name)).slice(0, 8);
  }, [dismissedAiPicks, rankedSchools, savedCollegeRows]);

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
    setExpandedSchools((current) => ({
      ...current,
      [name]: true,
    }));
    setActiveTab("list");
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

  function addAiPickSchool(name) {
    addSchoolToList(name, selectedCategory);
    setExpandedSchools((current) => ({
      ...current,
      [name]: true,
    }));
  }

  function setSchoolStatus(name, status) {
    setSchoolStatuses((current) => ({
      ...current,
      [name]: status,
    }));
    setOpenStatusMenu(null);
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
    setActiveTab("list");
    setLists(emptyLists);
    setExpandedSchools({});
    setRowCategories({});
    setSchoolStatuses({});
    setOpenStatusMenu(null);
  }

  function applySuggestion(school) {
    setSchoolQuery(school.name);
  }

  function dismissAiPick(name) {
    setDismissedAiPicks((current) => (current.includes(name) ? current : [...current, name]));
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="brand-icon" src="/pathfinder-icon.svg" alt="Pathfinder logo" />
          <div>
            <p className="eyebrow">Pathfinder</p>
            <h1>College Planner</h1>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <button className={activeTab === "list" ? "active" : ""} type="button" onClick={() => setActiveTab("list")}>
            <span aria-hidden="true">♡</span>
            My College List
          </button>
          <button className={activeTab === "schools" ? "active" : ""} type="button" onClick={() => setActiveTab("schools")}>
            <span aria-hidden="true">⌕</span>
            All Schools
          </button>
          <button className={activeTab === "advisor" ? "active" : ""} type="button" onClick={() => setActiveTab("advisor")}>
            <span aria-hidden="true">✦</span>
            AI Advisor
          </button>
          <button className={activeTab === "profile" ? "active" : ""} type="button" onClick={() => setActiveTab("profile")}>
            <span aria-hidden="true">☻</span>
            Profile
          </button>
          <button className={activeTab === "academics" ? "active" : ""} type="button" onClick={() => setActiveTab("academics")}>
            <span aria-hidden="true">▤</span>
            High School Academics
          </button>
          <button className={activeTab === "preferences" ? "active" : ""} type="button" onClick={() => setActiveTab("preferences")}>
            <span aria-hidden="true">☷</span>
            My Preferences
          </button>
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle theme={theme} usesSystemTheme={usesSystemTheme} onChangeTheme={setThemeMode} />
          {session?.user?.email ? <p className="muted sidebar-user">{session.user.email}</p> : null}
          <button className="ghost-button sidebar-signout" type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            <p className="eyebrow">Pathfinder</p>
            <h1>
              {activeTab === "list"
                ? "My College List"
                : activeTab === "schools"
                  ? "All Schools"
                  : activeTab === "advisor"
                    ? "AI Advisor"
                    : activeTab === "academics"
                      ? "High School Academics"
                      : activeTab === "preferences"
                        ? "My Preferences"
                        : "My Student Profile"}
            </h1>
          </div>
          {activeTab === "schools" ? (
            <p className="muted">{loadingSchools ? "Loading..." : `${filteredSchools.length} schools`}</p>
          ) : null}
        </header>

        {activeTab === "list" ? (
          <section className="college-list-page">
            <div className="college-list-intake">
              <SearchComposer
                schoolQuery={schoolQuery}
                selectedCategory={selectedCategory}
                suggestions={suggestions}
                loadingSuggestions={loadingSuggestions}
                placeholder="Add a college to your list"
                onChangeQuery={setSchoolQuery}
                onAdd={addTypedSchool}
                onAddSuggestion={(school) => addSchoolAndShowDetails(school.name)}
                onApplySuggestion={applySuggestion}
                onChangeCategory={setSelectedCategory}
                categories={categories}
                showCategorySelect={false}
              />
            </div>

            <section className="ai-picks-section" aria-labelledby="ai-picks-heading">
              <div className="college-list-header">
                <div>
                  <p className="eyebrow">AI Picks</p>
                  <h2 id="ai-picks-heading">Recommended schools to review next</h2>
                </div>
                <div className="ai-picks-header-actions">
                  <div className="save-routing-bar compact" aria-label="Choose saved school category">
                    <span>Save to</span>
                    <div className="save-routing-options">
                      {categories.map((category) => (
                        <button
                          key={category}
                          className={selectedCategory === category ? "active" : ""}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="text-button" type="button" onClick={() => setActiveTab("advisor")}>
                    AI Advisor
                  </button>
                </div>
              </div>

              <div className="ai-picks-carousel">
                {loadingSchools ? (
                  <p className="empty-copy">Loading recommendations...</p>
                ) : aiPickSchools.length === 0 ? (
                  <p className="empty-copy">Add more schools or update your profile to refresh recommendations.</p>
                ) : (
                  <div className="ai-picks-marquee" style={{ "--marquee-duration": `${Math.max(18, aiPickSchools.length * 4)}s` }}>
                    {[0, 1].map((setIndex) => (
                      <div className="ai-picks-row" key={setIndex} aria-hidden={setIndex === 1 ? "true" : undefined}>
                        {aiPickSchools.map((school) => (
                          <article key={`${setIndex}-${school.name}`} className="ai-pick-card">
                            <button
                              className="ai-pick-dismiss"
                              type="button"
                              onClick={() => dismissAiPick(school.name)}
                              aria-label={`Dismiss ${formatSchoolName(school.name)}`}
                              tabIndex={setIndex === 1 ? -1 : undefined}
                            >
                              ×
                            </button>
                            <div className="school-media-slot" aria-hidden="true">
                              <span>{formatSchoolName(school.name).slice(0, 2).toUpperCase()}</span>
                              <small>{formatRank(school.rank)}</small>
                            </div>
                            <div className="ai-pick-card-body">
                              <button
                                className="link-button ai-pick-title"
                                type="button"
                                onClick={() => addAiPickSchool(school.name)}
                                tabIndex={setIndex === 1 ? -1 : undefined}
                              >
                                {formatSchoolName(school.name)}
                              </button>
                              <p className="muted">{school.location || "Location unavailable"}</p>
                              <div className="ai-pick-actions">
                                <button
                                  className="ai-pick-save"
                                  type="button"
                                  onClick={() => addAiPickSchool(school.name)}
                                  aria-label={`Save ${formatSchoolName(school.name)} as ${selectedCategory}`}
                                  title={`Save as ${selectedCategory}`}
                                  tabIndex={setIndex === 1 ? -1 : undefined}
                                >
                                  ♡
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="saved-colleges-section" aria-labelledby="saved-colleges-heading">
              <div className="college-list-header">
                <div>
                  <p className="eyebrow">Saved Colleges</p>
                  <h2 id="saved-colleges-heading">Keep track of the schools you are considering</h2>
                </div>
                <button className="text-button" type="button" onClick={clearAllLists}>
                  Clear All
                </button>
              </div>

              <div className="college-list-filters" aria-label="Saved college filters">
                {listFilters.map((filter) => (
                  <button
                    key={filter}
                    className={listFilter === filter ? "active" : ""}
                    type="button"
                    onClick={() => setListFilter(filter)}
                  >
                    {filter}
                    <span>{filter === "All" ? savedCollegeRows.length : lists[filter].length}</span>
                  </button>
                ))}
              </div>

              <div className="saved-college-list">
                {filteredSavedCollegeRows.length === 0 ? (
                  <div className="empty-state compact-empty-state">
                    <p>{savedCollegeRows.length === 0 ? "No saved schools yet." : `No ${listFilter} schools saved yet.`}</p>
                  </div>
                ) : (
                  filteredSavedCollegeRows.map(({ category, name, school }) => (
                    <article key={`${category}-${name}`} className="saved-college-row">
                      <div className="saved-college-main">
                        <button className="saved-college-media school-media-slot" type="button" onClick={() => toggleExpanded(name)}>
                          <span>{formatSchoolName(name).slice(0, 2).toUpperCase()}</span>
                          <small>{school.location || "Campus media"}</small>
                        </button>
                        <div className="saved-college-content">
                          <div className="saved-college-title-row">
                            <span className="school-rank">{formatRank(school.rank)}</span>
                            <div>
                              <button className="link-button saved-college-title" type="button" onClick={() => toggleExpanded(name)}>
                                {formatSchoolName(name)}
                              </button>
                              <p className="muted">{school.location || "Location unavailable"}</p>
                            </div>
                          </div>
                          <div className="saved-college-stats" aria-label={`${formatSchoolName(name)} quick stats`}>
                            <span>Acceptance {formatAcceptanceRate(school.acceptanceRate)}</span>
                            <span>Tuition {school.tuition || "N/A"}</span>
                            <span>SAT {school.satRange || "N/A"}</span>
                          </div>
                        </div>
                        <div className="saved-college-side">
                          <button
                            className="saved-college-remove"
                            type="button"
                            onClick={() => removeSchoolFromList(name, category)}
                            aria-label={`Remove ${formatSchoolName(name)}`}
                          >
                            ×
                          </button>
                          <span className={`category-pill ${category.toLowerCase()}`}>{category}</span>
                          <div className="saved-college-status-wrap">
                            <button
                              className="saved-college-status"
                              type="button"
                              onClick={() => setOpenStatusMenu((current) => (current === name ? null : name))}
                              aria-expanded={openStatusMenu === name}
                            >
                              <span className={`status-dot ${schoolStatuses[name] || "considering"}`} aria-hidden="true" />
                              {schoolStatuses[name] || "considering"}
                              <span aria-hidden="true">▾</span>
                            </button>
                            {openStatusMenu === name ? (
                              <div className="saved-college-status-menu">
                                {admissionStatuses.map((status) => (
                                  <button
                                    key={status}
                                    className={(schoolStatuses[name] || "considering") === status ? "active" : ""}
                                    type="button"
                                    onClick={() => setSchoolStatus(name, status)}
                                  >
                                    <span className={`status-dot ${status}`} aria-hidden="true" />
                                    {status}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <button className="saved-college-details-button" type="button" onClick={() => toggleExpanded(name)}>
                            {expandedSchools[name] ? "Hide details" : "View details"}
                            <span aria-hidden="true">{expandedSchools[name] ? "⌃" : "⌄"}</span>
                          </button>
                        </div>
                      </div>

                      {expandedSchools[name] ? (
                        <div className="saved-college-expanded">
                          <div className="school-row-details">
                            <StatCard label="Rank" value={formatRank(school.rank)} />
                            <StatCard label="Acceptance Rate" value={formatAcceptanceRate(school.acceptanceRate)} />
                            <StatCard label="Tuition" value={school.tuition || "N/A"} />
                            <StatCard label="In-State" value={school.inStateTuition || "N/A"} />
                            <StatCard label="SAT" value={school.satRange || "N/A"} />
                            <StatCard label="Enrollment" value={school.enrollment || "N/A"} />
                          </div>
                          <div className="school-row-description">
                            <p className="stat-label">{school.location || "Location unavailable"}</p>
                            <p className="description-copy">{school.description || "N/A"}</p>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === "advisor" ? <AIAdvisor lists={lists} onAddSchool={addSchoolToList} /> : null}

        {activeTab === "profile" ? <StudentProfilePage section="personal" /> : null}

        {activeTab === "academics" ? <StudentProfilePage section="academics" /> : null}

        {activeTab === "preferences" ? <StudentProfilePage section="preferences" /> : null}

        {activeTab === "schools" ? (
          <section className="school-browser">
            <div className="browser-header">
              <div>
                <p className="eyebrow">Directory</p>
                <h2>Explore Colleges</h2>
              </div>
              <div className="directory-search">
                <input
                  value={schoolQuery}
                  onChange={(event) => setSchoolQuery(event.target.value)}
                  placeholder="Search all schools"
                />
              </div>
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
        ) : null}
      </main>
    </div>
  );
}

export default App;

import { useEffect, useRef, useState } from "react";
import CategorySelect from "./CategorySelect";
import { formatRank, formatSchoolName } from "../lib/formatters";

const SUGGESTION_LISTBOX_ID = "school-suggestion-listbox";

function SearchComposer({
  schoolQuery,
  selectedCategory,
  suggestions,
  loadingSuggestions,
  placeholder = "Search or type a school",
  showCategorySelect = true,
  onChangeQuery,
  onAdd,
  onAddSuggestion,
  onApplySuggestion,
  onChangeCategory,
  categories,
}) {
  const suggestionBoxRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!suggestionBoxRef.current?.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!showSuggestions || suggestions.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(0);
  }, [suggestions, showSuggestions]);

  function applySuggestion(school) {
    onApplySuggestion(school);
    setShowSuggestions(false);
    setActiveIndex(-1);
  }

  return (
    <div className="composer">
      <div className="composer-top-row">
        <div className="search-box" ref={suggestionBoxRef}>
          <input
            role="combobox"
            aria-expanded={showSuggestions && schoolQuery.trim() ? "true" : "false"}
            aria-controls={SUGGESTION_LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              showSuggestions && activeIndex >= 0 && suggestions[activeIndex]
                ? `school-suggestion-${activeIndex}`
                : undefined
            }
            value={schoolQuery}
            onChange={(event) => {
              onChangeQuery(event.target.value);
              setShowSuggestions(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (schoolQuery.trim()) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowSuggestions(false);
                setActiveIndex(-1);
              }

              if (event.key === "ArrowDown" && suggestions.length > 0) {
                event.preventDefault();
                setShowSuggestions(true);
                setActiveIndex((current) => (current + 1) % suggestions.length);
              }

              if (event.key === "ArrowUp" && suggestions.length > 0) {
                event.preventDefault();
                setShowSuggestions(true);
                setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
              }

              if (event.key === "Enter" && suggestions.length > 0) {
                event.preventDefault();
                onAddSuggestion(suggestions[activeIndex >= 0 ? activeIndex : 0]);
              } else if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
            placeholder={placeholder}
          />
          {showSuggestions && schoolQuery.trim() ? (
            <div className="suggestion-panel" role="listbox" id={SUGGESTION_LISTBOX_ID}>
              <div className="suggestion-header">
                <span className="suggestion-header-title">Recommended for {selectedCategory}</span>
                <span className="suggestion-header-count">{suggestions.length} matches</span>
              </div>
              {loadingSuggestions ? (
                <p className="suggestion-empty">Searching...</p>
              ) : suggestions.length > 0 ? (
                suggestions.map((school, index) => (
                  <button
                    key={school.name}
                    id={`school-suggestion-${index}`}
                    className={`suggestion-item ${activeIndex === index ? "active" : ""}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => applySuggestion(school)}
                  >
                    <span className="suggestion-name">{formatSchoolName(school.name)}</span>
                    <span className="suggestion-meta">
                      {formatRank(school.rank)} {school.location ? `· ${school.location}` : ""} · {selectedCategory}
                    </span>
                  </button>
                ))
              ) : (
                <p className="suggestion-empty">No matching schools</p>
              )}
            </div>
          ) : null}
        </div>
        <button className="primary-button composer-add-button" onClick={onAdd}>
          Add
        </button>
      </div>
      {showCategorySelect ? (
        <div className="composer-row composer-row-single">
          <CategorySelect value={selectedCategory} options={categories} onChange={onChangeCategory} />
        </div>
      ) : null}
    </div>
  );
}

export default SearchComposer;

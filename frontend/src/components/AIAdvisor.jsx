import { useEffect, useMemo, useState } from "react";
import { generateRecommendations, loadAdvisorQuestions } from "../lib/aiAdvisor";
import { formatAcceptanceRate, formatRank, formatSchoolName } from "../lib/formatters";
import { loadStudentProfile } from "../lib/studentProfile";

const profileSections = [
  {
    id: "academics",
    label: "Academics",
    groups: [
      {
        title: "High School",
        fields: ["gradeLevel"],
      },
      {
        title: "Academics",
        fields: ["gpa", "gpaType", "sat", "act", "activitiesSummary"],
      },
    ],
  },
  {
    id: "interests",
    label: "Interests",
    groups: [
      {
        title: "Academic Interests",
        fields: ["intendedMajors"],
      },
      {
        title: "College Signals",
        fields: ["likedSchools", "dislikedSchools"],
      },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    groups: [
      {
        title: "College Fit",
        fields: ["preferredRegions", "preferredStates", "annualBudget", "schoolSizePreference", "campusSettingPreference", "riskPreference"],
      },
    ],
  },
  {
    id: "budget",
    label: "Budget",
    groups: [
      {
        title: "Affordability",
        fields: ["annualBudget"],
      },
    ],
  },
  {
    id: "review",
    label: "Review",
    groups: [],
  },
];

function categoryToList(category) {
  return category === "Likely" ? "Safety" : category;
}

function ProfileSummary({ rows }) {
  if (rows.length === 0) {
    return <p className="empty-copy">Answer a few questions to build your profile.</p>;
  }

  return (
    <div className="advisor-profile-grid">
      {rows.map((row) => (
        <div key={row.label} className="advisor-profile-item">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ entry, onAddSchool }) {
  return (
    <article className="advisor-recommendation">
      <div className="advisor-recommendation-header">
        <div>
          <p className="eyebrow">{entry.category}</p>
          <h3>{formatSchoolName(entry.school.name)}</h3>
          <p className="muted">
            {entry.school.location || "Unknown location"} · {formatRank(entry.school.rank)} · Acceptance{" "}
            {formatAcceptanceRate(entry.school.acceptanceRate)}
          </p>
        </div>
        <div className="advisor-score">{entry.fitScore}</div>
      </div>

      <div className="advisor-score-grid">
        <span>Academic {entry.scoreBreakdown.academicScore}</span>
        <span>Major {entry.scoreBreakdown.majorScore}</span>
        <span>Location {entry.scoreBreakdown.locationScore}</span>
        <span>Budget {entry.scoreBreakdown.budgetScore}</span>
      </div>

      <div className="advisor-notes">
        {entry.reasons.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
        {entry.risks.map((risk) => (
          <p key={risk} className="advisor-risk">
            {risk}
          </p>
        ))}
      </div>

      <button className="ghost-button" type="button" onClick={() => onAddSchool(entry.school.name, categoryToList(entry.category))}>
        Add to {categoryToList(entry.category)}
      </button>
    </article>
  );
}

function SavedListSummary({ lists }) {
  const total = Object.values(lists || {}).reduce((sum, items) => sum + items.length, 0);

  if (total === 0) {
    return <p className="empty-copy">No saved colleges yet. Add schools in My College List to give the advisor more context.</p>;
  }

  return (
    <div className="advisor-saved-list-summary">
      {Object.entries(lists).map(([category, items]) => (
        <div key={category} className="advisor-saved-list-column">
          <span>{category}</span>
          {items.length === 0 ? (
            <p className="empty-copy">None</p>
          ) : (
            items.map((name) => <strong key={name}>{formatSchoolName(name)}</strong>)
          )}
        </div>
      ))}
    </div>
  );
}

function AIAdvisor({ lists, onAddSchool }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [activeSection, setActiveSection] = useState("academics");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchQuestions() {
      setLoadingQuestions(true);
      setError("");
      try {
        const data = await loadAdvisorQuestions();
        if (!cancelled) {
          setQuestions(data.questions || []);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "Failed to load advisor questions.");
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    }

    fetchQuestions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSavedProfile() {
      try {
        const profile = await loadStudentProfile();
        if (cancelled) {
          return;
        }

        setAnswers(profileToAnswers(profile));
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "Failed to load saved profile.");
        }
      }
    }

    fetchSavedProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const answerMap = useMemo(() => {
    return answers.reduce((acc, answer) => {
      acc[answer.field] = answer.value;
      return acc;
    }, {});
  }, [answers]);

  const questionMap = useMemo(() => {
    return questions.reduce((acc, question) => {
      acc[question.field] = question;
      return acc;
    }, {});
  }, [questions]);

  const profileRows = useMemo(() => {
    if (result?.displayProfile) {
      return result.displayProfile;
    }

    return answers
      .map((answer) => {
        const question = questionMap[answer.field];
        return {
          label: question?.label || answer.field,
          value: answer.value,
        };
      })
      .filter((row) => row.value);
  }, [answers, questionMap, result]);

  const groupedRecommendations = useMemo(() => {
    const groups = { Reach: [], Target: [], Likely: [] };
    for (const entry of result?.recommendations || []) {
      groups[entry.category]?.push(entry);
    }
    return groups;
  }, [result]);

  function setAnswer(field, value) {
    setAnswers((current) => [
      ...current.filter((answer) => answer.field !== field),
      {
        field,
        value,
      },
    ]);
    setResult(null);
    setError("");
  }

  function resetAdvisor() {
    setAnswers([]);
    setActiveSection("academics");
    setResult(null);
    setError("");
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const data = await generateRecommendations({ answers, savedLists: lists });
      setResult(data);
    } catch (nextError) {
      setError(nextError.message || "Failed to generate recommendations.");
    } finally {
      setLoading(false);
    }
  }

  function renderField(question) {
    const value = answerMap[question.field] || "";
    const hasOptions = question.options?.length > 0;

    if (hasOptions && !question.placeholder) {
      return (
        <label className="advisor-form-field" key={question.field}>
          <span>{question.label}</span>
          <select value={value} onChange={(event) => setAnswer(question.field, event.target.value)}>
            <option value="">Select an option</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="advisor-form-field" key={question.field}>
        <span>{question.label}</span>
        <input
          value={value}
          onChange={(event) => setAnswer(question.field, event.target.value)}
          list={`${question.field}-options`}
          placeholder={question.placeholder || question.prompt}
        />
        {hasOptions ? (
          <datalist id={`${question.field}-options`}>
            {question.options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}
      </label>
    );
  }

  if (loadingQuestions) {
    return (
      <section className="advisor-shell">
        <div className="advisor-panel">
          <p>Loading advisor...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="advisor-shell">
      <div className="advisor-main">
        <div className="advisor-panel advisor-profile-form">
          <div className="browser-header">
            <div>
              <p className="eyebrow">AI Advisor</p>
              <h2>Build Your Recommendation Profile</h2>
            </div>
            <button className="primary-button" type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate Recommendations"}
            </button>
          </div>

          <div className="advisor-section-tabs" role="tablist" aria-label="Profile sections">
            {profileSections.map((section) => (
              <button
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === "review" ? (
            <div className="advisor-review-grid">
              <section className="advisor-form-group">
                <h3>High School Academics</h3>
                <ProfileSummary
                  rows={profileRows.filter((row) =>
                    ["Grade level", "GPA", "GPA type", "SAT", "ACT", "Activities"].includes(row.label)
                  )}
                />
              </section>
              <section className="advisor-form-group">
                <h3>My College List</h3>
                <SavedListSummary lists={lists} />
              </section>
              <section className="advisor-form-group">
                <h3>Preferences</h3>
                <ProfileSummary
                  rows={profileRows.filter((row) =>
                    ["Majors", "Liked schools", "Avoid", "Regions", "States", "Budget", "School size", "Campus setting", "List style"].includes(
                      row.label
                    )
                  )}
                />
              </section>
            </div>
          ) : (
            profileSections
              .filter((section) => section.id === activeSection)
              .map((section) => (
                <div key={section.id} className="advisor-form-grid">
                  {section.groups.map((group) => (
                    <section key={group.title} className="advisor-form-group">
                      <h3>{group.title}</h3>
                      <div className="advisor-field-grid">
                        {group.fields.map((field) => {
                          const question = questionMap[field];
                          return question ? renderField(question) : null;
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              ))
          )}

          <div className="advisor-form-actions">
            <button className="primary-button" type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate Recommendations"}
            </button>
            <button className="text-button" type="button" onClick={resetAdvisor}>
              Start Over
            </button>
          </div>

          {error ? <p className="auth-message">{error}</p> : null}
        </div>

        {result ? (
          <div className="advisor-panel advisor-explanation">
            <p className="eyebrow">{result.aiPowered ? "AI Explanation" : "Rule-Based Explanation"}</p>
            <div className="advisor-explanation-copy">
              {result.aiExplanation.split(/\n+/).map((line) => (
                <p key={line}>{line.replace(/^[-*]\s*/, "")}</p>
              ))}
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="advisor-results">
            {["Reach", "Target", "Likely"].map((category) => (
              <section key={category} className="advisor-panel">
                <div className="list-panel-header">
                  <h2>{category}</h2>
                  <span>{groupedRecommendations[category].length}</span>
                </div>
                <div className="advisor-recommendation-list">
                  {groupedRecommendations[category].map((entry) => (
                    <RecommendationCard key={entry.school.name} entry={entry} onAddSchool={onAddSchool} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="advisor-panel advisor-profile-panel">
        <p className="eyebrow">Current Profile</p>
        <ProfileSummary rows={profileRows} />
        <div className="advisor-profile-divider" />
        <p className="eyebrow">Fetched From My College List</p>
        <SavedListSummary lists={lists} />
      </aside>
    </section>
  );
}

function profileToAnswers(profile = {}) {
  const personal = profile.personal || {};
  const academics = profile.academics || {};
  const preferences = profile.preferences || {};
  const fieldMap = {
    gradeLevel: personal.gradeLevel,
    intendedMajors: personal.intendedMajors,
    likedSchools: personal.likedSchools,
    dislikedSchools: personal.dislikedSchools,
    gpa: academics.gpa,
    gpaType: academics.gpaType,
    sat: academics.sat,
    act: academics.act,
    activitiesSummary: academics.activitiesSummary,
    preferredRegions: preferences.preferredRegions,
    preferredStates: preferences.preferredStates,
    annualBudget: preferences.annualBudget,
    schoolSizePreference: preferences.schoolSizePreference,
    campusSettingPreference: preferences.campusSettingPreference,
    riskPreference: preferences.riskPreference,
  };

  return Object.entries(fieldMap)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([field, value]) => ({
      field,
      value: String(value),
    }));
}

export default AIAdvisor;

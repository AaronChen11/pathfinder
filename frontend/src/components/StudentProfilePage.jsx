import { useEffect, useMemo, useState } from "react";
import { emptyProfile, loadStudentProfile, saveStudentProfile } from "../lib/studentProfile";

const sectionConfig = {
  personal: {
    eyebrow: "Student Profile",
    title: "Personal Info",
    groups: [
      {
        title: "Basic Information",
        fields: [
          { key: "firstName", label: "First Name" },
          { key: "lastName", label: "Last Name" },
          { key: "gradeLevel", label: "Grade Level", type: "select", options: ["9th", "10th", "11th", "12th", "Transfer"] },
        ],
      },
      {
        title: "College Interests",
        fields: [
          { key: "intendedMajors", label: "Intended Majors", placeholder: "Computer Science, Economics" },
          { key: "likedSchools", label: "Schools You Like", placeholder: "UC Irvine, Northeastern" },
          { key: "dislikedSchools", label: "Avoid", placeholder: "Very rural, too expensive" },
        ],
      },
    ],
  },
  academics: {
    eyebrow: "Student Profile",
    title: "High School Academics",
    groups: [
      {
        title: "High School",
        fields: [
          { key: "highSchool", label: "High School", placeholder: "Add your high school" },
          { key: "graduationMonth", label: "Graduation Month", type: "select", options: ["May", "June", "December"] },
          { key: "graduationYear", label: "Graduation Year", placeholder: "2027" },
        ],
      },
      {
        title: "Academics",
        fields: [
          { key: "gpa", label: "Unweighted GPA", placeholder: "3.9" },
          { key: "weightedGpa", label: "Weighted GPA", placeholder: "4.4" },
          { key: "gpaType", label: "GPA Type", type: "select", options: ["Unweighted", "Weighted", "Not sure"] },
          { key: "sat", label: "SAT", placeholder: "1450" },
          { key: "act", label: "ACT", placeholder: "33" },
          { key: "classRank", label: "Class Rank", placeholder: "Top 10%" },
          { key: "courseRigor", label: "Course Rigor", type: "select", options: ["Standard", "Honors", "AP/IB", "Dual Enrollment", "Mixed"] },
        ],
      },
      {
        title: "Extracurriculars",
        fields: [
          { key: "activitiesSummary", label: "Activities and Awards", placeholder: "Robotics, debate, research, varsity sports" },
        ],
      },
    ],
  },
  preferences: {
    eyebrow: "Student Profile",
    title: "My Preferences",
    groups: [
      {
        title: "Location",
        fields: [
          { key: "preferredRegions", label: "Preferred Regions", placeholder: "California, Northeast, West Coast" },
          { key: "preferredStates", label: "Preferred States", placeholder: "CA, NY, MA" },
        ],
      },
      {
        title: "College Fit",
        fields: [
          { key: "annualBudget", label: "Annual Budget Before Aid", placeholder: "60000" },
          { key: "schoolSizePreference", label: "School Size", type: "select", options: ["Small", "Medium", "Large", "No preference"] },
          { key: "campusSettingPreference", label: "Campus Setting", type: "select", options: ["Urban", "Suburban", "Rural", "No preference"] },
          { key: "riskPreference", label: "List Style", type: "select", options: ["Balanced", "More reaches", "More likely schools", "Mostly targets"] },
        ],
      },
    ],
  },
};

function mergeProfile(nextProfile) {
  return {
    personal: { ...emptyProfile.personal, ...nextProfile.personal },
    academics: { ...emptyProfile.academics, ...nextProfile.academics },
    preferences: { ...emptyProfile.preferences, ...nextProfile.preferences },
  };
}

function ProfileField({ field, value, onChange }) {
  return (
    <label className="profile-field">
      <span>{field.label}</span>
      {field.type === "select" ? (
        <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ""} />
      )}
    </label>
  );
}

function StudentProfilePage({ section }) {
  const config = sectionConfig[section] || sectionConfig.personal;
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setMessage("");
      try {
        const data = await loadStudentProfile();
        if (!cancelled) {
          setProfile(mergeProfile(data));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || "Failed to load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const sectionValues = useMemo(() => profile[section] || {}, [profile, section]);

  function updateField(key, value) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const data = await saveStudentProfile(profile);
      setProfile(mergeProfile(data));
      setMessage("Saved.");
    } catch (error) {
      setMessage(error.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="profile-page">
        <p>Loading profile...</p>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="profile-page-header">
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h2>{config.title}</h2>
        </div>
        <button className="primary-button" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="profile-form-grid">
        {config.groups.map((group) => (
          <section key={group.title} className="profile-form-group">
            <h3>{group.title}</h3>
            <div className="profile-field-grid">
              {group.fields.map((field) => (
                <ProfileField
                  key={field.key}
                  field={field}
                  value={sectionValues[field.key]}
                  onChange={(value) => updateField(field.key, value)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  );
}

export default StudentProfilePage;

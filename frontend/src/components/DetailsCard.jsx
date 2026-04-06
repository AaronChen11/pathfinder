import StatCard from "./StatCard";
import { formatAcceptanceRate, formatRank, formatSchoolName } from "../lib/formatters";

function DetailsCard({ school }) {
  if (!school) {
    return (
      <div className="empty-state">
        <h2>No School Selected</h2>
        <p>Select a school from the left sidebar to open its dedicated details view.</p>
      </div>
    );
  }

  return (
    <div className="details-card">
      <div className="details-header">
        <div>
          <p className="eyebrow">School Snapshot</p>
          <h2>{formatSchoolName(school.name)}</h2>
          <p className="muted">{school.location || "Location unavailable"}</p>
        </div>
        <div className="rank-pill">{formatRank(school.rank)}</div>
      </div>

      <div className="stats-grid">
        <StatCard label="Acceptance Rate" value={formatAcceptanceRate(school.acceptanceRate)} />
        <StatCard label="Tuition" value={school.tuition || "N/A"} />
        <StatCard label="In-State Tuition" value={school.inStateTuition || "N/A"} />
        <StatCard label="SAT Range" value={school.satRange || "N/A"} />
        <StatCard label="Enrollment" value={school.enrollment || "N/A"} />
      </div>

      <div className="description-block">
        <p className="stat-label">Description</p>
        <p className="description-copy">{school.description || "N/A"}</p>
      </div>
    </div>
  );
}

export default DetailsCard;

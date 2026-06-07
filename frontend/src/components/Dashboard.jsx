import { useState, useEffect } from "react";

export default function Dashboard() {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchCaptures();
    const interval = setInterval(
      fetchCaptures,
      5000
    ); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchCaptures = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/upload"
      );
      const data = await response.json();
      setCaptures(data);
      calculateStats(data);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const pending = data.filter(
      (d) => d.processingStatus === "pending"
    ).length;
    const reviewed = data.filter(
      (d) => d.processingStatus === "reviewed"
    ).length;
    const autoApproved = data.filter(
      (d) => d.processingStatus === "auto_approved"
    ).length;
    const flagged = data.filter(
      (d) => d.processingStatus === "flagged"
    ).length;
    const duplicates = data.filter(
      (d) => d.isDuplicate
    ).length;

    const confidences = data
      .flatMap((d) => [
        d.extractedFields?.billNo?.confidence || 0,
        d.extractedFields?.vehicleNumber
          ?.confidence || 0,
        d.extractedFields?.grossWeight?.confidence ||
          0,
        d.extractedFields?.tareWeight?.confidence ||
          0,
        d.extractedFields?.netWeight?.confidence || 0,
      ])
      .filter((c) => c > 0);

    const avgConfidence =
      confidences.length > 0
        ? (
            confidences.reduce((a, b) => a + b, 0) /
            confidences.length
          ).toFixed(1)
        : 0;

    setStats({
      total,
      pending,
      reviewed,
      autoApproved,
      flagged,
      duplicates,
      avgConfidence,
    });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h2>📊 Operations Dashboard</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        {/* Stats Cards */}
        <Card
          icon="📦"
          title="Total Captures"
          value={stats.total || 0}
          color="#007bff"
        />
        <Card
          icon="⏳"
          title="Pending Review"
          value={stats.pending || 0}
          color="#ff9800"
        />
        <Card
          icon="✅"
          title="Reviewed"
          value={stats.reviewed || 0}
          color="#4caf50"
        />
        <Card
          icon="🤖"
          title="Auto-Approved"
          value={stats.autoApproved || 0}
          color="#2196f3"
        />
        <Card
          icon="⚠️"
          title="Flagged"
          value={stats.flagged || 0}
          color="#f44336"
        />
        <Card
          icon="🔄"
          title="Duplicates"
          value={stats.duplicates || 0}
          color="#ff5722"
        />
        <Card
          icon="🎯"
          title="Avg Confidence"
          value={`${stats.avgConfidence}%`}
          color="#9c27b0"
        />
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: "30px" }}>
        <h3>📋 Recent Captures</h3>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "10px",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f5f5f5",
                borderBottom: "2px solid #ddd",
              }}
            >
              <th style={{ padding: "10px", textAlign: "left" }}>
                Vehicle
              </th>
              <th style={{ padding: "10px", textAlign: "left" }}>
                Bill
              </th>
              <th style={{ padding: "10px", textAlign: "left" }}>
                Status
              </th>
              <th style={{ padding: "10px", textAlign: "left" }}>
                Confidence
              </th>
              <th style={{ padding: "10px", textAlign: "left" }}>
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {captures.slice(0, 10).map((c) => (
              <tr
                key={c._id}
                style={{
                  borderBottom: "1px solid #eee",
                }}
              >
                <td
                  style={{
                    padding: "10px",
                    color: "#007bff",
                  }}
                >
                  {c.extractedFields?.vehicleNumber
                    ?.value || "N/A"}
                </td>
                <td style={{ padding: "10px" }}>
                  {c.extractedFields?.billNo?.value ||
                    "N/A"}
                </td>
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor:
                        c.processingStatus ===
                        "auto_approved"
                          ? "#4caf50"
                          : c.processingStatus ===
                            "flagged"
                          ? "#f44336"
                          : "#ff9800",
                      color: "white",
                      fontSize: "12px",
                    }}
                  >
                    {c.processingStatus}
                  </span>
                </td>
                <td style={{ padding: "10px" }}>
                  {(
                    (c.extractedFields?.billNo
                      ?.confidence +
                      c.extractedFields?.vehicleNumber
                        ?.confidence +
                      c.extractedFields?.grossWeight
                        ?.confidence +
                      c.extractedFields?.tareWeight
                        ?.confidence +
                      c.extractedFields?.netWeight
                        ?.confidence) /
                    5
                  ).toFixed(0)}
                  %
                </td>
                <td style={{ padding: "10px", fontSize: "12px" }}>
                  {new Date(
                    c.uploadedAt
                  ).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ icon, title, value, color }) {
  return (
    <div
      style={{
        backgroundColor: color,
        color: "white",
        padding: "20px",
        borderRadius: "8px",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "10px" }}>
        {icon}
      </div>
      <div style={{ fontSize: "14px", opacity: 0.9 }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold" }}>
        {value}
      </div>
    </div>
  );
}
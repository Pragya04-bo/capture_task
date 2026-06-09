import { useState, useEffect } from "react";

const ITEMS_PER_PAGE = 12;

export default function Search() {
  const [captures, setCaptures] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [vehicleFilter, setVehicleFilter] =
    useState("");
  const [confidenceFilter, setConfidenceFilter] =
    useState(0);
  const [statusFilter, setStatusFilter] = useState(
    "all"
  );
  const [showDuplicates, setShowDuplicates] =
    useState(false);

  // Date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Weight range
  const [weightMin, setWeightMin] = useState("");
  const [weightMax, setWeightMax] = useState("");

  useEffect(() => {
    fetchCaptures();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [
    captures,
    vehicleFilter,
    confidenceFilter,
    statusFilter,
    showDuplicates,
    dateFrom,
    dateTo,
    weightMin,
    weightMax,
  ]);

  const fetchCaptures = async () => {
    try {
      const response = await fetch(
        "https://capture-task.onrender.com/upload"
      );
      const data = await response.json();
      setCaptures(data);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = captures;

    // Vehicle filter
    if (vehicleFilter) {
      result = result.filter((c) =>
        c.extractedFields?.vehicleNumber?.value
          ?.toUpperCase()
          .includes(vehicleFilter.toUpperCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (c) => c.processingStatus === statusFilter
      );
    }

    // Duplicates filter
    if (showDuplicates) {
      result = result.filter((c) => c.isDuplicate);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter((c) => {
        const uploadDate = new Date(c.uploadedAt);
        return uploadDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter((c) => {
        const uploadDate = new Date(c.uploadedAt);
        return uploadDate <= toDate;
      });
    }

    // Weight range filter
    if (weightMin || weightMax) {
      result = result.filter((c) => {
        const weight = parseFloat(
          c.extractedFields?.netWeight?.value || 0
        );
        const min = weightMin
          ? parseFloat(weightMin)
          : 0;
        const max = weightMax
          ? parseFloat(weightMax)
          : Infinity;
        return weight >= min && weight <= max;
      });
    }

    // Confidence filter
    const avgConfidence = (c) => {
      const fields = [
        c.extractedFields?.billNo?.confidence || 0,
        c.extractedFields?.vehicleNumber
          ?.confidence || 0,
        c.extractedFields?.grossWeight?.confidence ||
          0,
        c.extractedFields?.tareWeight?.confidence ||
          0,
        c.extractedFields?.netWeight?.confidence ||
          0,
      ];
      return (
        fields.reduce((a, b) => a + b, 0) /
        fields.length
      );
    };

    result = result.filter(
      (c) => avgConfidence(c) >= confidenceFilter
    );

    setFiltered(result);
  };

  // Pagination
  const totalPages = Math.ceil(
    filtered.length / ITEMS_PER_PAGE
  );
  const startIdx =
    (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedResults = filtered.slice(
    startIdx,
    endIdx
  );

  if (loading) return <p>Loading...</p>;

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h2>🔍 Search Captures</h2>

      {/* Filters Section */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          border: "1px solid #ddd",
        }}
      >
        <h4 style={{ marginTop: 0 }}>Filters</h4>

        {/* Row 1: Basic Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Vehicle Number
            </label>
            <input
              type="text"
              placeholder="e.g., KL45AB1234"
              value={vehicleFilter}
              onChange={(e) =>
                setVehicleFilter(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">
                Pending
              </option>
              <option value="auto_approved">
                Auto-Approved
              </option>
              <option value="reviewed">
                Reviewed
              </option>
              <option value="needs_review">
                Needs Review
              </option>
              <option value="flagged">
                Flagged
              </option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Min Confidence
            </label>
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={confidenceFilter}
                onChange={(e) =>
                  setConfidenceFilter(
                    parseInt(
                      e.target.value
                    )
                  )
                }
                style={{ flex: 1 }}
              />
              <span
                style={{
                  width: "40px",
                  textAlign: "center",
                }}
              >
                {confidenceFilter}%
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Date Range */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Row 3: Weight Range */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Net Weight Min (kg)
            </label>
            <input
              type="number"
              placeholder="0"
              value={weightMin}
              onChange={(e) =>
                setWeightMin(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Net Weight Max (kg)
            </label>
            <input
              type="number"
              placeholder="∞"
              value={weightMax}
              onChange={(e) =>
                setWeightMax(e.target.value)
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Row 4: Checkboxes */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={showDuplicates}
              onChange={(e) =>
                setShowDuplicates(
                  e.target.checked
                )
              }
            />
            🔄 Show Duplicates Only
          </label>
        </div>
      </div>

      {/* Results Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#e3f2fd",
          borderRadius: "4px",
        }}
      >
        <strong>
          Found: {filtered.length} captures
        </strong>
        {filtered.length > 0 && (
          <span style={{ fontSize: "12px" }}>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Results Grid */}
      {paginatedResults.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          {paginatedResults.map((c) => (
            <div
              key={c._id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow:
                  "0 2px 4px rgba(0,0,0,0.1)",
                transition:
                  "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              <img
                src={`https://capture-task.onrender.com/${c.imagePath.replace(/\\/g, "/")}`}
                alt="capture"
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover",
                  display: "block",
                }}
              />

              {c.isDuplicate && (
                <div
                  style={{
                    backgroundColor:
                      "#ff9800",
                    color: "white",
                    padding: "5px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  🔄 DUPLICATE
                </div>
              )}

              {c.processingStatus ===
                "auto_approved" && (
                <div
                  style={{
                    backgroundColor:
                      "#4caf50",
                    color: "white",
                    padding: "5px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  ✅ AUTO-APPROVED
                </div>
              )}

              {c.processingStatus ===
                "flagged" && (
                <div
                  style={{
                    backgroundColor:
                      "#f44336",
                    color: "white",
                    padding: "5px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  ⚠️ FLAGGED
                </div>
              )}

              <div
                style={{
                  padding: "12px",
                }}
              >
                <p
                  style={{
                    margin: "6px 0",
                    fontSize: "14px",
                  }}
                >
                  <strong>Vehicle:</strong>{" "}
                  {c.extractedFields
                    ?.vehicleNumber?.value ||
                    "N/A"}
                </p>
                <p
                  style={{
                    margin: "6px 0",
                    fontSize: "14px",
                  }}
                >
                  <strong>Bill:</strong>{" "}
                  {c.extractedFields?.billNo
                    ?.value || "N/A"}
                </p>
                <p
                  style={{
                    margin: "6px 0",
                    fontSize: "14px",
                  }}
                >
                  <strong>Net:</strong>{" "}
                  {c.extractedFields?.netWeight
                    ?.value || "N/A"}{" "}
                  kg
                </p>
                <p
                  style={{
                    margin: "6px 0",
                    fontSize: "12px",
                    color: "#666",
                  }}
                >
                  <strong>Date:</strong>{" "}
                  {new Date(
                    c.uploadedAt
                  ).toLocaleDateString()}
                </p>
                {/* Human Corrected Badge */}
{c.humanCorrectedFields?.length > 0 && (
  <div
    style={{
      backgroundColor: "#2196f3",
      color: "white",
      padding: "4px 8px",
      borderRadius: "4px",
      marginTop: "8px",
      marginBottom: "8px",
      fontSize: "12px",
      display: "inline-block",
      fontWeight: "bold",
    }}
  >
    👤 Human Corrected ({c.humanCorrectedFields.length})
  </div>
)}
{c.humanCorrectedFields?.length > 0 && (
  <div
    style={{
      marginTop: "8px",
      padding: "8px",
      backgroundColor: "#f8f9fa",
      borderRadius: "6px",
      fontSize: "12px",
    }}
  >
    <strong>Corrected Fields:</strong>

    <ul style={{ margin: "6px 0 0 15px" }}>
      {c.humanCorrectedFields.map((field) => (
        <li key={field}>{field}</li>
      ))}
    </ul>
  </div>
)}{c.auditLogs?.length > 0 && (
  <div
    style={{
      marginTop: "10px",
      borderTop: "1px solid #ddd",
      paddingTop: "8px",
      fontSize: "11px",
    }}
  >
    <strong>Audit Trail</strong>

    {c.auditLogs
      .filter(log => log.action === "FIELD_CORRECTED")
      .map((log) => (
        <div
          key={log._id}
          style={{
            marginTop: "5px",
            padding: "5px",
            backgroundColor: "#fff3cd",
            borderRadius: "4px",
          }}
        >
          <div>
            <strong>{log.field}</strong>
          </div>

          <div>
            OCR: "{log.oldValue || "empty"}"
          </div>

          <div>
            Human: "{log.newValue}"
          </div>

          <div>
            By: {log.performedBy}
          </div>

          <div>
            {new Date(log.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
  </div>
)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#999",
          }}
        >
          <p>No captures found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "center",
            gap: "8px",
            marginTop: "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              setCurrentPage(1)
            }
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              backgroundColor:
                currentPage === 1
                  ? "#ddd"
                  : "#007bff",
              color:
                currentPage === 1
                  ? "#999"
                  : "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                currentPage === 1
                  ? "default"
                  : "pointer",
            }}
          >
            ⏮ First
          </button>

          <button
            onClick={() =>
              setCurrentPage(
                currentPage - 1
              )
            }
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              backgroundColor:
                currentPage === 1
                  ? "#ddd"
                  : "#007bff",
              color:
                currentPage === 1
                  ? "#999"
                  : "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                currentPage === 1
                  ? "default"
                  : "pointer",
            }}
          >
            ◀ Prev
          </button>

          {Array.from(
            { length: totalPages },
            (_, i) => i + 1
          ).map((page) => (
            <button
              key={page}
              onClick={() =>
                setCurrentPage(page)
              }
              style={{
                padding: "8px 12px",
                backgroundColor:
                  page === currentPage
                    ? "#007bff"
                    : "#e0e0e0",
                color:
                  page === currentPage
                    ? "white"
                    : "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight:
                  page === currentPage
                    ? "bold"
                    : "normal",
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() =>
              setCurrentPage(
                currentPage + 1
              )
            }
            disabled={
              currentPage === totalPages
            }
            style={{
              padding: "8px 12px",
              backgroundColor:
                currentPage === totalPages
                  ? "#ddd"
                  : "#007bff",
              color:
                currentPage === totalPages
                  ? "#999"
                  : "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                currentPage === totalPages
                  ? "default"
                  : "pointer",
            }}
          >
            Next ▶
          </button>

          <button
            onClick={() =>
              setCurrentPage(totalPages)
            }
            disabled={
              currentPage === totalPages
            }
            style={{
              padding: "8px 12px",
              backgroundColor:
                currentPage === totalPages
                  ? "#ddd"
                  : "#007bff",
              color:
                currentPage === totalPages
                  ? "#999"
                  : "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                currentPage === totalPages
                  ? "default"
                  : "pointer",
            }}
          >
            Last ⏭
          </button>
        </div>
      )}
    </div>
  );
}
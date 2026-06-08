import { useEffect, useState } from "react";
import "./Review.css";

const validateField = (field, value) => {
  const errors = [];

  if (!value) {
    errors.push("Required");
    return errors;
  }

  switch (field) {
    case "vehicleNumber":
      if (
        !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/i.test(
          value
        )
      ) {
        errors.push("Invalid format (KL45AB1234)");
      }
      break;
    case "billNo":
      if (!/^\d+$/.test(value)) {
        errors.push("Must be numeric");
      }
      break;
    case "grossWeight":
    case "tareWeight":
    case "netWeight":
      const weight = parseFloat(value);
      if (isNaN(weight)) {
        errors.push("Must be numeric");
      } else if (weight <= 0) {
        errors.push("Must be > 0");
      } else if (weight > 100000) {
        errors.push("Too large (>100 tons)");
      }
      break;
  }

  return errors;
};

export default function Review({ captureId }) {
  const [captures, setCaptures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [flagReason, setFlagReason] = useState("");
  const [showFlagModal, setShowFlagModal] =
    useState(false);

  const [vehicleNumber, setVehicleNumber] =
    useState("");
  const [billNo, setBillNo] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");

  useEffect(() => {
    fetchCaptures();
  }, []);

  const fetchCaptures = async () => {
    try {
      const response = await fetch(
        "https://capture-task.onrender.com/upload"
      );
      const data = await response.json();
      const needsReview = data.filter(
        (c) =>
          c.processingStatus === "needs_review" ||
          c.processingStatus === "flagged"
      );
      setCaptures(needsReview);
      setLoading(false);

      if (needsReview.length > 0) {
        selectCapture(needsReview[0]);
      }
    } catch (error) {
      console.error("Error fetching:", error);
      setLoading(false);
    }
  };

  const selectCapture = (capture) => {
    setSelected(capture);
    setVehicleNumber(
      capture.extractedFields?.vehicleNumber
        ?.value || ""
    );
    setBillNo(
      capture.extractedFields?.billNo?.value || ""
    );
    setGrossWeight(
      capture.extractedFields?.grossWeight?.value ||
        ""
    );
    setTareWeight(
      capture.extractedFields?.tareWeight?.value ||
        ""
    );
    setNetWeight(
      capture.extractedFields?.netWeight?.value ||
        ""
    );
    setErrors({});
    setFlagReason("");
    setShowFlagModal(false);
  };

  const validateWeights = () => {
    const newErrors = {};
    const gross = parseFloat(grossWeight);
    const tare = parseFloat(tareWeight);
    const net = parseFloat(netWeight);

    if (
      !isNaN(gross) &&
      !isNaN(tare) &&
      !isNaN(net)
    ) {
      const calculated = gross - tare;
      if (Math.abs(calculated - net) > 100) {
        newErrors.weights = `Net ≠ (Gross - Tare). Expected ~${calculated}kg`;
      }
    }

    return newErrors;
  };

  const saveCorrections = async () => {
    const newErrors = {};

    newErrors.vehicleNumber = validateField(
      "vehicleNumber",
      vehicleNumber
    );
    newErrors.billNo = validateField(
      "billNo",
      billNo
    );
    newErrors.grossWeight = validateField(
      "grossWeight",
      grossWeight
    );
    newErrors.tareWeight = validateField(
      "tareWeight",
      tareWeight
    );
    newErrors.netWeight = validateField(
      "netWeight",
      netWeight
    );

    const weightErrors = validateWeights();
    newErrors.weights = weightErrors.weights;

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((err) => {
  if (Array.isArray(err)) return err.length > 0;
  return !!err;
});
console.log(newErrors);
console.log("hasErrors:", hasErrors);
    if (hasErrors) {
       console.trace("Please fix errors triggered");
      alert("Please fix errors");
      return;
    }

    try {
       const corrections = {};

if (
  vehicleNumber !==
  selected.extractedFields?.vehicleNumber?.value
) {
  corrections.vehicleNumber = {
    value: vehicleNumber,
  };
}

if (
  billNo !==
  selected.extractedFields?.billNo?.value
) {
  corrections.billNo = {
    value: billNo,
  };
}

if (
  grossWeight !==
  selected.extractedFields?.grossWeight?.value
) {
  corrections.grossWeight = {
    value: grossWeight,
  };
}

if (
  tareWeight !==
  selected.extractedFields?.tareWeight?.value
) {
  corrections.tareWeight = {
    value: tareWeight,
  };
}

if (
  netWeight !==
  selected.extractedFields?.netWeight?.value
) {
  corrections.netWeight = {
    value: netWeight,
  };
}

const response = await fetch(
  `https://capture-task.onrender.com/upload/${selected._id}/review`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      corrections,
    }),
  }
);

      if (response.ok) {
        alert("✅ Saved!");
        fetchCaptures();
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving");
    }
  };

  const flagCapture = async () => {
    if (!flagReason.trim()) {
      alert("Please enter a reason");
      return;
    }

    try {
      const response = await fetch(
        `https://capture-task.onrender.com/upload/${selected._id}/flag`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: flagReason,
          }),
        }
      );

      if (response.ok) {
        alert("⚠️ Capture flagged for escalation!");
        setShowFlagModal(false);
        fetchCaptures();
      }
    } catch (error) {
      console.error("Flag error:", error);
      alert("Error flagging capture");
    }
  };

  const getFieldStatus = (field) => {
    if (!selected) return "unknown";

    const isAutoApproved =
      selected.autoApprovedFields?.includes(field);
    const isHumanCorrected =
      selected.humanCorrectedFields?.includes(field);

    if (isHumanCorrected) return "corrected";
    if (isAutoApproved) return "auto-approved";
    return "extracted";
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        padding: "20px",
      }}
    >
      {/* Left: Capture List */}
      <div
        style={{
          flex: 0.3,
          overflowY: "auto",
          maxHeight: "80vh",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "10px",
        }}
      >
        <h3>Need Review ({captures.length})</h3>
        {captures.map((c) => (
          <div
            key={c._id}
            onClick={() => selectCapture(c)}
            style={{
              padding: "10px",
              marginBottom: "5px",
              backgroundColor:
                selected?._id === c._id
                  ? "#007bff"
                  : c.processingStatus === "flagged"
                  ? "#ffe0b2"
                  : "#f0f0f0",
              color:
                selected?._id === c._id
                  ? "white"
                  : "black",
              cursor: "pointer",
              borderRadius: "4px",
              border:
                c.isDuplicate &&
                "2px solid #ff9800",
            }}
          >
            <p style={{ margin: "5px 0" }}>
              {c.extractedFields?.vehicleNumber
                ?.value || "N/A"}
              {c.isDuplicate && " 🔄"}
            </p>
            <p
              style={{
                margin: "5px 0",
                fontSize: "12px",
                opacity: 0.7,
              }}
            >
              Bill:{" "}
              {c.extractedFields?.billNo?.value ||
                "N/A"}
            </p>
            {c.processingStatus === "flagged" && (
              <p
                style={{
                  margin: "5px 0",
                  fontSize: "11px",
                  color: "#d32f2f",
                  fontWeight: "bold",
                }}
              >
                ⚠️ {c.flaggedReason}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Right: Image + Fields */}
      <div style={{ flex: 0.7 }}>
        {selected ? (
          <>
            {/* Image */}
            <div style={{ marginBottom: "20px" }}>
              <h3>Original Image</h3>
              <img
                src={`https://capture-task.onrender.com/${selected.imagePath.replace(/\\/g, "/")}`}
                alt="capture"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
              {selected.isDuplicate && (
                <div
                  style={{
                    backgroundColor: "#ff9800",
                    color: "white",
                    padding: "8px",
                    borderRadius: "4px",
                    marginTop: "10px",
                  }}
                >
                  🔄 Duplicate detected! Check recent
                  submissions
                </div>
              )}
            </div>

            {/* Weight Error */}
            {errors.weights && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  padding: "10px",
                  borderRadius: "4px",
                  marginBottom: "15px",
                  color: "#d32f2f",
                }}
              >
                ⚠️ {errors.weights}
              </div>
            )}

            {/* Fields */}
            <div>
              <h3>Extracted Fields</h3>

              {/* Vehicle Number */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>
                    <strong>Vehicle Number</strong>
                  </label>
                  <FieldBadge
                    status={getFieldStatus(
                      "vehicleNumber"
                    )}
                  />
                </div>
                <input
                  value={vehicleNumber}
                  onChange={(e) => {
                    setVehicleNumber(
                      e.target.value
                    );
                    setErrors((prev) => ({
                      ...prev,
                      vehicleNumber:
                        validateField(
                          "vehicleNumber",
                          e.target.value
                        ),
                    }));
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px",
                    marginTop: "5px",
                    border:
                      errors.vehicleNumber
                        ?.length > 0
                        ? "2px solid #d32f2f"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {errors.vehicleNumber?.length >
                  0 && (
                  <p
                    style={{
                      color: "#d32f2f",
                      fontSize: "12px",
                      margin: "5px 0 0 0",
                    }}
                  >
                    {errors.vehicleNumber.join(
                      ", "
                    )}
                  </p>
                )}
                <p
                  style={{
                    color:
                      (
                        selected
                          ?.extractedFields
                          ?.vehicleNumber
                          ?.confidence || 0
                      ) < 70
                        ? "red"
                        : "green",
                    fontSize: "12px",
                  }}
                >
                  🎯 Confidence:{" "}
                  {
                    selected?.extractedFields
                      ?.vehicleNumber?.confidence
                  }
                  %
                </p>
              </div>

              {/* Bill No */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>
                    <strong>Bill No</strong>
                  </label>
                  <FieldBadge
                    status={getFieldStatus("billNo")}
                  />
                </div>
                <input
                  value={billNo}
                  onChange={(e) => {
                    setBillNo(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      billNo: validateField(
                        "billNo",
                        e.target.value
                      ),
                    }));
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px",
                    marginTop: "5px",
                    border:
                      errors.billNo?.length > 0
                        ? "2px solid #d32f2f"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {errors.billNo?.length > 0 && (
                  <p
                    style={{
                      color: "#d32f2f",
                      fontSize: "12px",
                      margin: "5px 0 0 0",
                    }}
                  >
                    {errors.billNo.join(", ")}
                  </p>
                )}
              </div>

              {/* Gross Weight */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>
                    <strong>Gross Weight (kg)</strong>
                  </label>
                  <FieldBadge
                    status={getFieldStatus(
                      "grossWeight"
                    )}
                  />
                </div>
                <input
                  value={grossWeight}
                  onChange={(e) => {
                    setGrossWeight(
                      e.target.value
                    );
                    setErrors((prev) => ({
                      ...prev,
                      grossWeight:
                        validateField(
                          "grossWeight",
                          e.target.value
                        ),
                    }));
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px",
                    marginTop: "5px",
                    border:
                      errors.grossWeight
                        ?.length > 0
                        ? "2px solid #d32f2f"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {errors.grossWeight?.length > 0 && (
                  <p
                    style={{
                      color: "#d32f2f",
                      fontSize: "12px",
                      margin: "5px 0 0 0",
                    }}
                  >
                    {errors.grossWeight.join(", ")}
                  </p>
                )}
              </div>

              {/* Tare Weight */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>
                    <strong>Tare Weight (kg)</strong>
                  </label>
                  <FieldBadge
                    status={getFieldStatus(
                      "tareWeight"
                    )}
                  />
                </div>
                <input
                  value={tareWeight}
                  onChange={(e) => {
                    setTareWeight(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      tareWeight:
                        validateField(
                          "tareWeight",
                          e.target.value
                        ),
                    }));
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px",
                    marginTop: "5px",
                    border:
                      errors.tareWeight?.length >
                      0
                        ? "2px solid #d32f2f"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {errors.tareWeight?.length > 0 && (
                  <p
                    style={{
                      color: "#d32f2f",
                      fontSize: "12px",
                      margin: "5px 0 0 0",
                    }}
                  >
                    {errors.tareWeight.join(", ")}
                  </p>
                )}
              </div>

              {/* Net Weight */}
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <label>
                    <strong>Net Weight (kg)</strong>
                  </label>
                  <FieldBadge
                    status={getFieldStatus(
                      "netWeight"
                    )}
                  />
                </div>
                <input
                  value={netWeight}
                  onChange={(e) => {
                    setNetWeight(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      netWeight:
                        validateField(
                          "netWeight",
                          e.target.value
                        ),
                    }));
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px",
                    marginTop: "5px",
                    border:
                      errors.netWeight?.length >
                      0
                        ? "2px solid #d32f2f"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
                {errors.netWeight?.length > 0 && (
                  <p
                    style={{
                      color: "#d32f2f",
                      fontSize: "12px",
                      margin: "5px 0 0 0",
                    }}
                  >
                    {errors.netWeight.join(", ")}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  onClick={saveCorrections}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Save & Next
                </button>

                <button
                  onClick={() =>
                    setShowFlagModal(true)
                  }
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: "#ff9800",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  ⚠️ Flag for Escalation
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>No captures to review</p>
        )}
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              maxWidth: "400px",
              width: "90%",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              ⚠️ Flag for Escalation
            </h3>

            <label style={{ display: "block" }}>
              <strong>Reason for flagging:</strong>
            </label>
            <textarea
              value={flagReason}
              onChange={(e) =>
                setFlagReason(e.target.value)
              }
              placeholder="e.g., Image quality too poor, Values don't match, Duplicate suspected..."
              style={{
                width: "100%",
                height: "100px",
                padding: "8px",
                marginTop: "8px",
                marginBottom: "15px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                onClick={() =>
                  setShowFlagModal(false)
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#ccc",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={flagCapture}
                style={{
                  flex: 1,
                  padding: "10px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Confirm Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldBadge({ status }) {
  const styles = {
    extracted: {
      backgroundColor: "#e0e0e0",
      color: "#333",
      label: "🤖 Auto",
    },
    "auto-approved": {
      backgroundColor: "#4caf50",
      color: "white",
      label: "✅ Auto-Approved",
    },
    corrected: {
      backgroundColor: "#2196f3",
      color: "white",
      label: "👤 Corrected",
    },
  };

  const style = styles[status] || styles.extracted;

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: style.backgroundColor,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
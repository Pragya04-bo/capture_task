import { useEffect, useState } from "react";
import {
  saveOffline,
  getPendingUploads,
  deletePendingUpload,
} from "./db";
import Review from "./components/Review";
import Search from "./components/Search";
import Dashboard from "./components/Dashboard";
import {
  preprocessImage,
  validateImage,
} from "./utils/imagePreprocessing";

function App() {
  const [page, setPage] = useState("capture");
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] =
    useState({});

  useEffect(() => {
    // Check URL for review parameter
    const params = new URLSearchParams(
      window.location.search
    );
    const reviewId = params.get("review");

    if (reviewId) {
      setPage("review");
      setSelectedId(reviewId);
      // Clean up URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  const syncPendingUploads = async () => {
    setSyncing(true);
    const docs = await getPendingUploads();

    if (docs.length === 0) {
      setSyncing(false);
      return;
    }

    console.log(`Syncing ${docs.length} files`);

    for (const doc of docs) {
      try {
        const formData = new FormData();
        formData.append("image", doc.file);

        const response = await fetch(
          "https://capture-task.onrender.com/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        await deletePendingUpload(doc.id);
        console.log(`Uploaded file ${doc.id}`);
      } catch (err) {
        console.error("Sync error:", err);
      }
    }

    setSyncing(false);
    alert("Pending uploads synced");
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log("Internet restored");
      syncPendingUploads();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!navigator.onLine) {
      await saveOffline(file);
      alert("Saved offline");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    await fetch("https://capture-task.onrender.com/upload", {
      method: "POST",
      body: formData,
    });

    alert("Uploaded Successfully");
  };

  const showPending = async () => {
    const docs = await getPendingUploads();
    console.log(docs);
    alert(`Pending: ${docs.length}`);
  };

  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const queue = [];

    for (const file of files) {
      const validation = await validateImage(file);

      if (!validation.valid) {
        alert(
          `${file.name}: ${validation.errors.join(", ")}`
        );
        continue;
      }

      queue.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: "pending",
        progress: 0,
      });
    }

    setUploadQueue([...uploadQueue, ...queue]);

    if (!navigator.onLine) {
      for (const item of queue) {
        await saveOffline(item.file);
      }
      alert(`${queue.length} files saved offline`);
      return;
    }

    // Process queue
    for (const item of queue) {
      await uploadFile(item);
    }
  };

  const uploadFile = async (item) => {
    try {
      setUploadProgress((prev) => ({
        ...prev,
        [item.id]: 10,
      }));

      // Preprocess image
      const preprocessed =
        await preprocessImage(item.file);
      setUploadProgress((prev) => ({
        ...prev,
        [item.id]: 50,
      }));

      const formData = new FormData();
      formData.append("image", preprocessed);

      const response = await fetch(
        "https://capture-task.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadProgress((prev) => ({
        ...prev,
        [item.id]: 100,
      }));

      setUploadQueue((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "completed" }
            : i
        )
      );

      console.log(`Uploaded: ${item.file.name}`);
    } catch (error) {
      console.error("Upload error:", error);

      if (!navigator.onLine) {
        await saveOffline(item.file);
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "offline" }
              : i
          )
        );
      } else {
        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "failed" }
              : i
          )
        );
      }
    }
  };

  return (
    <>
      <div
        style={{
          padding: "10px",
          display: "flex",
          gap: "10px",
          borderBottom: "1px solid #ccc",
        }}
      >
        <button
          onClick={() => {
            setPage("capture");
            setSelectedId(null);
          }}
          style={{
            backgroundColor:
              page === "capture" ? "#007bff" : "#ccc",
            color: "white",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
          }}
        >
          📸 Capture
        </button>

        <button
          onClick={() => {
            setPage("review");
            setSelectedId(null);
          }}
          style={{
            backgroundColor:
              page === "review" ? "#007bff" : "#ccc",
            color: "white",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✅ Review
        </button>

        <button
          onClick={() => {
            setPage("search");
            setSelectedId(null);
          }}
          style={{
            backgroundColor:
              page === "search" ? "#007bff" : "#ccc",
            color: "white",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔍 Search
        </button>

        <button
          onClick={() => {
            setPage("dashboard");
            setSelectedId(null);
          }}
          style={{
            backgroundColor:
              page === "dashboard"
                ? "#007bff"
                : "#ccc",
            color: "white",
            padding: "10px 20px",
            border: "none",
            cursor: "pointer",
          }}
        >
          📊 Dashboard
        </button>
      </div>

      {page === "capture" ? (
        <div
          style={{
            padding: "20px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <h1>Climitra Capture</h1>

          {syncing && (
            <p style={{ color: "green" }}>
              🔄 Syncing...
            </p>
          )}

          {/* Single Upload */}
          <div
            style={{
              border: "2px dashed #2196f3",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            <p>Single Upload</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const validation =
                  await validateImage(file);
                if (!validation.valid) {
                  alert(
                    validation.errors.join(", ")
                  );
                  return;
                }

                if (!navigator.onLine) {
                  await saveOffline(file);
                  alert("Saved offline");
                } else {
                  const formData = new FormData();
                  const preprocessed =
                    await preprocessImage(file);
                  formData.append(
                    "image",
                    preprocessed
                  );

                  await fetch(
                    "https://capture-task.onrender.com/upload",
                    {
                      method: "POST",
                      body: formData,
                    }
                  );
                  alert("Uploaded successfully");
                }
              }}
              style={{ width: "100%" }}
            />
          </div>

          {/* Batch Upload */}
          <div
            style={{
              border: "2px dashed #4caf50",
              padding: "20px",
              borderRadius: "8px",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            <p>Batch Upload</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBatchUpload}
              style={{ width: "100%" }}
            />
          </div>

          {/* Upload Queue */}
          {uploadQueue.length > 0 && (
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              <h3>Queue ({uploadQueue.length})</h3>
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    backgroundColor: "white",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>
                      {item.file.name}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color:
                          item.status === "completed"
                            ? "green"
                            : item.status ===
                              "failed"
                            ? "red"
                            : "orange",
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      backgroundColor: "#ddd",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        backgroundColor:
                          uploadProgress[item.id] >=
                          100
                            ? "#4caf50"
                            : "#2196f3",
                        width: `${
                          uploadProgress[
                            item.id
                          ] || 0
                        }%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <br />
          <button onClick={showPending}>
            View Offline Queue
          </button>
          <br />
          <br />
          <button
            onClick={syncPendingUploads}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      ) : page === "review" ? (
        <Review captureId={selectedId} />
      ) : page === "search" ? (
        <Search />
      ) : (
        <Dashboard />
      )}
    </>
  );
}

export default App;
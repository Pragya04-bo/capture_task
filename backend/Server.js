 import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
app.use(cors());
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(console.error);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running");
});
app.use(
  "/uploads",
  express.static("uploads")
);
app.use("/upload", uploadRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
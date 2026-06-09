 import express from "express";
import multer from "multer";
import Image from "../models/Image.js";
import Tesseract from "tesseract.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import sharp from "sharp";


dotenv.config();

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const LLM_MODEL = "gemma-4-26b-a4b-it";

/* ---------------- MULTER ---------------- */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ---------------- CONFIDENCE ---------------- */
function getWordConfidence(words, value) {
  if (!value) return 0;

  const cleanValue = value
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  const matches = words.filter((w) => {
    const cleanWord = (w.text || "")
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase();

    return cleanValue.includes(cleanWord);
  });

  if (!matches.length) return 0;

  const avg =
    matches.reduce((sum, w) => sum + (w.confidence || 0), 0) /
    matches.length;

  return Math.round(avg);
}

/* ---------------- DUPLICATE CHECK ---------------- */
async function checkDuplicates(extractedFields) {
  const vehicle = extractedFields.vehicleNumber?.value;
  const weight = extractedFields.grossWeight?.value;

  if (!vehicle || !weight) return null;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const duplicates = await Image.findOne({
    uploadedAt: { $gte: yesterday },
    "extractedFields.vehicleNumber.value": vehicle,
    "extractedFields.grossWeight.value": weight,
  });

  return duplicates ? duplicates._id : null;
}

/* ---------------- AUTO APPROVAL ---------------- */
function shouldAutoApprove(extractedFields) {
  const confidences = [
    extractedFields.billNo?.confidence || 0,
    extractedFields.vehicleNumber?.confidence || 0,
    extractedFields.grossWeight?.confidence || 0,
    extractedFields.tareWeight?.confidence || 0,
    extractedFields.netWeight?.confidence || 0,
  ];

  const avg =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return avg > 85;
}

/* ---------------- FIELD APPROVAL ---------------- */
function getAutoApprovedFields(extractedFields) {
  const autoApproved = [];

  Object.keys(extractedFields).forEach((field) => {
    if ((extractedFields[field]?.confidence || 0) > 85) {
      autoApproved.push(field);
    }
  });

  return autoApproved;
}

/* ---------------- GEMMA EXTRACTION ---------------- */
 async function extractWithGemma(ocrText) {
  try {
    const prompt = `Extract fields from weighbridge OCR text.

Return ONLY valid JSON with no markdown.

{
  "billNo": "",
  "vehicleNumber": "",
  "grossWeight": "",
  "tareWeight": "",
  "netWeight": ""
}

OCR:
${ocrText}`;

    console.log("Calling Gemma 4...");

    const response = await ai.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
    });

    let text =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]
        ?.text ||
      "";

    console.log("Gemma Raw Response:", text);

    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(text);

    console.log("Gemma Parsed:", parsed);

    return parsed;
  } catch (err) {
    console.error(
      "Gemma extraction failed:",
      err.message
    );
    return null;
  }
}

/* =========================================================
   POST - UPLOAD + OCR + GEMMA
========================================================= */
router.post("/", upload.single("image"), async (req, res) => {
  let worker;

  try {
    console.log("Processing:", req.file.path);

    /* ---------------- OCR ---------------- */
    worker = await Tesseract.createWorker("eng");

     
  // Create OCR-enhanced image
const enhancedPath = req.file.path + "_ocr.png";

await sharp(req.file.path)
  .grayscale()
  .normalize()
  .sharpen()
  .png()
  .toFile(enhancedPath);

await worker.setParameters({
  tessedit_pageseg_mode: 6,
});

// OCR on enhanced image
const result = await worker.recognize(enhancedPath);
console.log("OCR Confidence:", result.data.confidence);

console.log("Words:");
result.data.words.forEach((word) => {
  console.log(word.text, "=>", word.confidence);
});
    let extractedText = result.data.text;
    const confidence = result.data.confidence;
    const words = result.data.words || [];

    console.log("===== OCR TEXT =====");
    console.log(extractedText);

    console.log("===== CONFIDENCE =====");
    console.log(confidence);

    extractedText = extractedText.replace(/\s+/g, " ");

    /* ---------------- GEMMA ---------------- */
    const gemmaResult = await extractWithGemma(extractedText);

    /* ---------------- CLEANUP ---------------- */
    await worker.terminate();

    /* ---------------- FAILURE CASE ---------------- */
    if (!gemmaResult) {
      const imageRecord = await Image.create({
        imagePath: req.file.path,
        status: "uploaded",
        source: "mobile",
        processingStatus: "needs_review",
        ocrText: extractedText,
        ocrConfidence: confidence,
        extractedFields: {},
        llmModel: LLM_MODEL,
        extractedAt: new Date(),
        uploadedAt: new Date(),
        reviewerCorrections: [],
        autoApprovedFields: [],
        humanCorrectedFields: [],
      });

      return res.status(201).json({
        success: true,
        message: "OCR done but extraction failed",
        imageRecord,
      });
    }

    /* ---------------- FIELD MAPPING ---------------- */
    const billNo = gemmaResult.billNo || "";
    const vehicleNumber = gemmaResult.vehicleNumber || "";
    const grossWeight = gemmaResult.grossWeight || "";
    const tareWeight = gemmaResult.tareWeight || "";
    const netWeight = gemmaResult.netWeight || "";

    const billConfidence = getWordConfidence(words, billNo);
    const vehicleConfidence = getWordConfidence(words, vehicleNumber);
    const grossConfidence = getWordConfidence(words, grossWeight);
    const tareConfidence = getWordConfidence(words, tareWeight);
    const netConfidence = getWordConfidence(words, netWeight);

    const extractedFields = {
      billNo: { value: billNo, confidence: billConfidence },
      vehicleNumber: { value: vehicleNumber, confidence: vehicleConfidence },
      grossWeight: { value: grossWeight, confidence: grossConfidence },
      tareWeight: { value: tareWeight, confidence: tareConfidence },
      netWeight: { value: netWeight, confidence: netConfidence },
    };

    /* ---------------- DUPLICATES ---------------- */
    const duplicateId = await checkDuplicates(extractedFields);

    /* ---------------- AUTO APPROVAL ---------------- */
    const autoApprovedFields =
      getAutoApprovedFields(extractedFields);

    let processingStatus = "needs_review";
    let autoApprovedAt = null;

    if (shouldAutoApprove(extractedFields) && !duplicateId) {
      processingStatus = "auto_approved";
      autoApprovedAt = new Date();
    }

    /* ---------------- SAVE ---------------- */
    const imageRecord = await Image.create({
      imagePath: req.file.path,
      status: "uploaded",
      source: "mobile",
      processingStatus,
      ocrText: extractedText,
      ocrConfidence: confidence,
      extractedFields,
      llmModel: LLM_MODEL,
      isDuplicate: !!duplicateId,
      duplicateOf: duplicateId,
      extractedAt: new Date(),
      uploadedAt: new Date(),
      reviewerCorrections: [],
      autoApprovedFields,
      humanCorrectedFields: [],
      autoApprovedAt,
    });

    return res.status(201).json({
      success: true,
      message: "Image processed successfully",
      imageRecord,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {}
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ---------------- ROUTES ---------------- */
router.get("/", async (req, res) => {
  const data = await Image.find().sort({ uploadedAt: -1 });
  res.json(data);
});

router.get("/:id", async (req, res) => {
  const data = await Image.findById(req.params.id);
  res.json(data);
});

 router.put("/:id/review", async (req, res) => {
  const { corrections } = req.body;

  const image = await Image.findById(req.params.id);

  if (!image) {
    return res.status(404).json({
      message: "Not found",
    });
  }

  for (const field in corrections) {
    const oldValue =
      image.extractedFields?.[field]?.value || "";

    const newValue =
      corrections?.[field]?.value || "";

    if (oldValue !== newValue) {
      image.reviewerCorrections.push({
        field,
        oldValue,
        newValue,
        correctedAt: new Date(),
      });

      if (
        !image.humanCorrectedFields.includes(field)
      ) {
        image.humanCorrectedFields.push(field);
      }

      image.extractedFields[field].value =
        newValue;

      image.extractedFields[
        field
      ].isHumanCorrected = true;

      image.auditLogs.push({
        action: "FIELD_CORRECTED",
        field,
        oldValue,
        newValue,
        performedBy: "reviewer",
        timestamp: new Date(),
      });
    }
  }

  image.reviewed = true;
  image.reviewedAt = new Date();
  image.processingStatus = "reviewed";

  image.auditLogs.push({
    action: "REVIEW_COMPLETED",
    performedBy: "reviewer",
    timestamp: new Date(),
  });

  await image.save();

  res.json(image);
});

router.put("/:id/flag", async (req, res) => {
  const updated = await Image.findByIdAndUpdate(
    req.params.id,
    {
      processingStatus: "flagged",
      flaggedReason: req.body.reason,
      flaggedAt: new Date(),
    },
    { new: true }
  );

  res.json(updated);
});

router.get("/duplicates/search", async (req, res) => {
  const data = await Image.find({ isDuplicate: true });
  res.json(data);
});

export default router;
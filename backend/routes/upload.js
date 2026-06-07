import express from "express";
import multer from "multer";
import Image from "../models/Image.js";
import Tesseract from "tesseract.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const LLM_MODEL = "gemma-4-26b-a4b-it";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

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
    matches.reduce(
      (sum, w) => sum + (w.confidence || 0),
      0
    ) / matches.length;

  return Math.round(avg);
}

// Check for duplicates
async function checkDuplicates(extractedFields) {
  const vehicle = extractedFields.vehicleNumber?.value;
  const weight = extractedFields.grossWeight?.value;

  if (!vehicle || !weight) return null;

  // Find similar captures from last 24 hours
  const yesterday = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  );

  const duplicates = await Image.findOne({
    uploadedAt: { $gte: yesterday },
    "extractedFields.vehicleNumber.value": vehicle,
    "extractedFields.grossWeight.value": weight,
  });

  return duplicates ? duplicates._id : null;
}

// Auto-approve if all confidences > 85%
function shouldAutoApprove(extractedFields) {
  const confidences = [
    extractedFields.billNo?.confidence || 0,
    extractedFields.vehicleNumber?.confidence || 0,
    extractedFields.grossWeight?.confidence || 0,
    extractedFields.tareWeight?.confidence || 0,
    extractedFields.netWeight?.confidence || 0,
  ];

  const avgConfidence =
    confidences.reduce((a, b) => a + b, 0) /
    confidences.length;

  return avgConfidence > 85;
}

// Get auto-approved fields
function getAutoApprovedFields(extractedFields) {
  const autoApproved = [];
  Object.keys(extractedFields).forEach((field) => {
    if (
      (extractedFields[field]?.confidence || 0) >
      85
    ) {
      autoApproved.push(field);
    }
  });
  return autoApproved;
}

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

// POST - Upload and process image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("Processing:", req.file.path);

    // const result = await Tesseract.recognize(
    //   req.file.path,
    //   "eng"
    // );

    // let extractedText = result.data.text;
    // const confidence = result.data.confidence;
    // const words = result.data.words || [];

    // console.log("===== OCR OUTPUT =====");
    // console.log(extractedText);
    const result = await Tesseract.recognize(
  req.file.path,
  "eng"
);

console.log("===== RAW OCR TEXT =====");
console.log(result.data.text);

console.log("===== OCR CONFIDENCE =====");
console.log(result.data.confidence);

let extractedText = result.data.text;
const confidence = result.data.confidence;
const words = result.data.words || [];

console.log("===== OCR OUTPUT =====");
console.log(extractedText);

    extractedText = extractedText.replace(
      /\s+/g,
      " "
    );

    // Extract with Gemma
    const gemmaResult =
      await extractWithGemma(extractedText);

    if (!gemmaResult) {
      console.error(
        "Gemma failed, saving for review"
      );

      const imageRecord = await Image.create({
        imagePath: req.file.path,
        status: "uploaded",
        source: "mobile",
        processingStatus: "needs_review",
        ocrText: extractedText,
        ocrConfidence: confidence,
        extractedFields: {
          billNo: {
            value: "",
            confidence: 0,
            extractionMethod: "gemma",
            isHumanCorrected: false,
          },
          vehicleNumber: {
            value: "",
            confidence: 0,
            extractionMethod: "gemma",
            isHumanCorrected: false,
          },
          grossWeight: {
            value: "",
            confidence: 0,
            extractionMethod: "gemma",
            isHumanCorrected: false,
          },
          tareWeight: {
            value: "",
            confidence: 0,
            extractionMethod: "gemma",
            isHumanCorrected: false,
          },
          netWeight: {
            value: "",
            confidence: 0,
            extractionMethod: "gemma",
            isHumanCorrected: false,
          },
        },
        llmModel: LLM_MODEL,
        extractedAt: new Date(),
        uploadedAt: new Date(),
        reviewerCorrections: [],
        autoApprovedFields: [],
        humanCorrectedFields: [],
      });

      return res.status(201).json({
        success: true,
        message:
          "Image uploaded. Processing failed, marked for review.",
        imageRecord,
      });
    }

    const billNo = gemmaResult.billNo || "";
    const vehicleNumber =
      gemmaResult.vehicleNumber || "";
    const grossWeight =
      gemmaResult.grossWeight || "";
    const tareWeight =
      gemmaResult.tareWeight || "";
    const netWeight = gemmaResult.netWeight || "";

    // Calculate confidences
    const billConfidence =
      getWordConfidence(words, billNo);
    const vehicleConfidence =
      getWordConfidence(words, vehicleNumber);
    const grossConfidence =
      getWordConfidence(words, grossWeight);
    const tareConfidence =
      getWordConfidence(words, tareWeight);
    const netConfidence =
      getWordConfidence(words, netWeight);

    const extractedFields = {
      billNo: {
        value: billNo,
        confidence: billConfidence,
        extractionMethod: "gemma",
        isHumanCorrected: false,
      },
      vehicleNumber: {
        value: vehicleNumber,
        confidence: vehicleConfidence,
        extractionMethod: "gemma",
        isHumanCorrected: false,
      },
      grossWeight: {
        value: grossWeight,
        confidence: grossConfidence,
        extractionMethod: "gemma",
        isHumanCorrected: false,
      },
      tareWeight: {
        value: tareWeight,
        confidence: tareConfidence,
        extractionMethod: "gemma",
        isHumanCorrected: false,
      },
      netWeight: {
        value: netWeight,
        confidence: netConfidence,
        extractionMethod: "gemma",
        isHumanCorrected: false,
      },
    };

    console.log("===== EXTRACTED FIELDS =====");
    console.log(extractedFields);

    // Check for duplicates
    const duplicateId = await checkDuplicates(
      extractedFields
    );

    // Get auto-approved fields
    const autoApprovedFields =
      getAutoApprovedFields(extractedFields);

    // Determine status
    let processingStatus = "needs_review";
    let autoApprovedAt = null;

    if (
      shouldAutoApprove(extractedFields) &&
      !duplicateId
    ) {
      processingStatus = "auto_approved";
      autoApprovedAt = new Date();
    }

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

    console.log("===== AUTO-APPROVAL =====");
    console.log("Status:", processingStatus);
    console.log("Duplicate:", !!duplicateId);
    console.log("Auto-Approved Fields:", autoApprovedFields);

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      imageRecord,
    });
  } catch (error) {
    console.error("Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET - All captures
router.get("/", async (req, res) => {
  try {
    const captures = await Image.find().sort({
      uploadedAt: -1,
    });

    res.json(captures);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET - Single capture
router.get("/:id", async (req, res) => {
  try {
    const capture = await Image.findById(
      req.params.id
    );

    if (!capture) {
      return res.status(404).json({
        success: false,
        message: "Capture not found",
      });
    }

    res.json(capture);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// PUT - Save corrections
router.put("/:id/review", async (req, res) => {
  try {
    const { corrections } = req.body;

    const image = await Image.findById(
      req.params.id
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const auditLogs = [];
    const humanCorrectedFields = [];

    Object.keys(corrections).forEach((field) => {
      const oldValue =
        image.extractedFields[field]?.value;
      const newValue =
        corrections[field]?.value;

      if (oldValue !== newValue) {
        auditLogs.push({
          field,
          oldValue: oldValue || "",
          newValue: newValue || "",
          correctedAt: new Date(),
        });

        // Mark as human corrected
        humanCorrectedFields.push(field);
      }
    });

    console.log("===== AUDIT TRAIL =====");
    console.log(auditLogs);
    console.log("Human Corrected:", humanCorrectedFields);

    // Update extracted fields with human correction flag
    const updatedFields = { ...corrections };
    humanCorrectedFields.forEach((field) => {
      if (updatedFields[field]) {
        updatedFields[field].isHumanCorrected = true;
      }
    });

    const updated = await Image.findByIdAndUpdate(
      req.params.id,
      {
        extractedFields: updatedFields,
        reviewed: true,
        reviewedAt: new Date(),
        processingStatus: "reviewed",
        humanCorrectedFields,
        $push: {
          reviewerCorrections: {
            $each: auditLogs,
          },
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Corrections saved",
      data: updated,
    });
  } catch (error) {
    console.error("Review Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// PUT - Flag for review
router.put("/:id/flag", async (req, res) => {
  try {
    const { reason } = req.body;

    const updated = await Image.findByIdAndUpdate(
      req.params.id,
      {
        processingStatus: "flagged",
        flaggedReason: reason,
        flaggedAt: new Date(),
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Capture flagged",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET - Find duplicates
router.get(
  "/duplicates/search",
  async (req, res) => {
    try {
      const duplicates = await Image.find({
        isDuplicate: true,
      }).sort({ uploadedAt: -1 });

      res.json(duplicates);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

export default router;
 import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  imagePath: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default: "uploaded",
  },

  source: {
    type: String,
    default: "mobile",
  },

  processingStatus: {
    type: String,
    default: "pending",
    enum: [
      "pending",
      "processing",
      "completed",
      "needs_review",
      "reviewed",
      "auto_approved",
      "flagged",
      "failed",
    ],
  },

  uploadedAt: {
    type: Date,
    default: Date.now,
  },

  extractedAt: {
    type: Date,
    default: Date.now,
  },

  reviewedAt: Date,

  ocrText: {
    type: String,
    default: "",
  },

  ocrConfidence: {
    type: Number,
    default: 0,
  },

  llmModel: {
    type: String,
    default: "gemma-4-26b-a4b-it",
  },

  extractedFields: {
    billNo: {
      value: String,
      confidence: Number,
      extractionMethod: String,
      isHumanCorrected: { type: Boolean, default: false },
    },
    vehicleNumber: {
      value: String,
      confidence: Number,
      extractionMethod: String,
      isHumanCorrected: { type: Boolean, default: false },
    },
    grossWeight: {
      value: String,
      confidence: Number,
      extractionMethod: String,
      isHumanCorrected: { type: Boolean, default: false },
    },
    tareWeight: {
      value: String,
      confidence: Number,
      extractionMethod: String,
      isHumanCorrected: { type: Boolean, default: false },
    },
    netWeight: {
      value: String,
      confidence: Number,
      extractionMethod: String,
      isHumanCorrected: { type: Boolean, default: false },
    },
  },

  reviewed: {
    type: Boolean,
    default: false,
  },

  reviewerCorrections: [
    {
      field: String,
      oldValue: String,
      newValue: String,
      correctedAt: Date,
    },
  ],

  auditLogs: [
    {
      action: {
        type: String,
        enum: [
          "UPLOAD",
          "OCR_EXTRACTED",
          "AUTO_APPROVED",
          "FIELD_CORRECTED",
          "FLAGGED",
          "REVIEW_COMPLETED",
        ],
      },

      field: String,

      oldValue: String,

      newValue: String,

      performedBy: {
        type: String,
        default: "system",
      },

      timestamp: {
        type: Date,
        default: Date.now,
      },

      details: String,
    },
  ],

  // NEW FIELDS FOR AUTO-APPROVAL & DUPLICATES
  isDuplicate: {
    type: Boolean,
    default: false,
  },

  duplicateOf: mongoose.Schema.Types.ObjectId,

  flaggedReason: String,

  flaggedAt: Date,

  autoApprovedAt: Date,

  // NEW: Track which fields are auto-approved vs human-corrected
  autoApprovedFields: [String], // ['billNo', 'vehicleNumber', etc]

  humanCorrectedFields: [String], // ['grossWeight', 'netWeight', etc]
});

export default mongoose.model("Image", imageSchema);
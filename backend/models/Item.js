const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  building: {
    type: String,
    required: [true, "Building is required"],
    trim: true,
  },
  area: {
    type: String,
    required: [true, "Area is required"],
    trim: true,
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
});

const claimRequestSchema = new mongoose.Schema(
  {
    claimantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    claimantContact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    claimDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: {
        values: ["lost", "found"],
        message: "Type must be either 'lost' or 'found'",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "ID Card",
        "Wallet",
        "Keys",
        "Electronics",
        "Books",
        "Clothing",
        "Bag",
        "Stationery",
        "Water Bottle",
        "Other",
      ],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    location: {
      type: locationSchema,
      required: [true, "Location is required"],
    },
    contactInfo: {
      type: String,
      trim: true,
      maxlength: [200, "Contact info cannot exceed 200 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "resolved", "claimed"],
      default: "active",
    },
    reportedBy: {
      type: String,
      trim: true,
      default: "Anonymous",
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    imagePublicId: {
       type: String,
       default: "",
       trim: true,
    },
    claims: {
       type: [claimRequestSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast text search
itemSchema.index({ title: "text", description: "text" });
// Index for location-based queries
itemSchema.index({ "location.building": 1 });
// Index for type + status (most common filter combo)
itemSchema.index({ type: 1, status: 1 });

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;

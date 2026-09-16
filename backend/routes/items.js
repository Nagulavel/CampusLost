const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const upload = require("../middleware/upload");

// ─── GET /api/items ─────────────────────────────────────────────────────────
// List items with optional filters: ?type=lost|found, ?building=Library,
// ?category=Keys, ?status=active, ?search=wallet
router.get("/", async (req, res) => {
  try {
    const { type, building, category, status, search, sort } = req.query;

    const filter = {};

    if (type && ["lost", "found"].includes(type)) {
      filter.type = type;
    }

    if (building) {
      filter["location.building"] = building;
    }

    if (category) {
      filter.category = category;
    }

    if (status && ["active", "resolved", "claimed"].includes(status)) {
      filter.status = status;
    } else {
      // By default, show only active items
      filter.status = "active";
    }

    if (search) {
      // Text search on title + description
      filter.$text = { $search: search };
    }

    // Sort: newest first by default, or by text score when searching
    let sortOption = { createdAt: -1 };
    if (search) {
      sortOption = { score: { $meta: "textScore" }, createdAt: -1 };
    }

    const items = await Item.find(filter)
      .sort(sortOption)
      .select(search ? { score: { $meta: "textScore" } } : {})
      .limit(100);

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/items/stats ────────────────────────────────────────────────────
// Quick summary stats for dashboard
router.get("/stats", async (req, res) => {
  try {
    const [totalLost, totalFound, totalResolved] = await Promise.all([
      Item.countDocuments({ type: "lost", status: "active" }),
      Item.countDocuments({ type: "found", status: "active" }),
      Item.countDocuments({ status: "resolved" }),
    ]);

    res.json({
      success: true,
      data: { activeLost: totalLost, activeFound: totalFound, resolved: totalResolved },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/items/:id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid item ID" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/items ─────────────────────────────────────────────────────────
router.post("/", upload.single("image"), async (req, res) => {
  try {
  const {
  title,
  type,
  category,
  description,
  contactInfo,
  reportedBy,
} = req.body;

let location;

try {
  location = JSON.parse(req.body.location);
} catch {
  return res.status(400).json({
    message: "Invalid location data",
  });
}
    // Basic required field check
    if (!title || !type || !category || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "title, type, category, description, and location are required",
      });
    }

    if (!location.building || !location.area) {
      return res.status(400).json({
        success: false,
        message: "location.building and location.area are required",
      });
    }

    const item = await Item.create({
      title,
      type,
      category,
      description,
      location,
      contactInfo: contactInfo || "",
      reportedBy: reportedBy || "Anonymous",
      imageUrl: req.file ? req.file.path : "",
      imagePublicId: req.file ? req.file.filename : "",
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(". ") });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/items/:id ──────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const allowedUpdates = [
      "title",
      "category",
      "description",
      "location",
      "contactInfo",
      "status",
      "reportedBy",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const item = await Item.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid item ID" });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(". ") });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/items/:id/status ────────────────────────────────────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["active", "resolved", "claimed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be one of: active, resolved, claimed",
      });
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid item ID" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/items/:id/claims ─────────────────────────────────────────────
// Submit a claim request for a found item
router.post("/:id/claims", async (req, res) => {
  try {
    const {
      claimantName,
      claimantContact,
      claimDescription,
    } = req.body;

    if (!claimantName || !claimantContact || !claimDescription) {
      return res.status(400).json({
        success: false,
        message:
          "claimantName, claimantContact, and claimDescription are required",
      });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (item.type !== "found") {
      return res.status(400).json({
        success: false,
        message: "Only found items can be claimed",
      });
    }

    if (item.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This item is no longer available for claiming",
      });
    }

    item.claims.push({
      claimantName,
      claimantContact,
      claimDescription,
    });

    await item.save();

    res.status(201).json({
      success: true,
      message: "Claim request submitted successfully",
      data: item,
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);

      return res.status(400).json({
        success: false,
        message: messages.join(". "),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ─── DELETE /api/items/:id ───────────────────────────────────────────────────
// Dev-only: No auth yet. Will be protected in v2.
router.delete("/:id", async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, message: "Item deleted", data: item });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid item ID" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

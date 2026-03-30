const Hackathon = require("../models/Hackathon");
const Team = require("../models/Team");
const asyncHandler = require("../utils/asyncHandler");

const normalizePaging = (pageInput, limitInput) => {
  const page = Math.max(1, Number.parseInt(pageInput || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitInput || "20", 10) || 20));
  return { page, limit };
};

const listHackathons = asyncHandler(async (req, res) => {
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;

  const [hackathons, total] = await Promise.all([
    Hackathon.find().sort({ date: 1, createdAt: -1 }).skip(skip).limit(limit),
    Hackathon.countDocuments(),
  ]);

  return res.json({
    hackathons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const createHackathon = asyncHandler(async (req, res) => {
  const { title, description, date, link } = req.body;

  const hackathon = await Hackathon.create({
    title,
    description,
    date,
    link,
    createdBy: req.user.id,
  });

  return res.status(201).json({
    message: "Hackathon created successfully.",
    hackathon,
  });
});

const updateHackathon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hackathon = await Hackathon.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!hackathon) {
    return res.status(404).json({ message: "Hackathon not found." });
  }

  return res.json({
    message: "Hackathon updated successfully.",
    hackathon,
  });
});

const deleteHackathon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Team.updateMany({ hackathon: id }, { $set: { hackathon: null } });

  const hackathon = await Hackathon.findByIdAndDelete(id);

  if (!hackathon) {
    return res.status(404).json({ message: "Hackathon not found." });
  }

  return res.json({ message: "Hackathon deleted successfully." });
});

module.exports = {
  listHackathons,
  createHackathon,
  updateHackathon,
  deleteHackathon,
};

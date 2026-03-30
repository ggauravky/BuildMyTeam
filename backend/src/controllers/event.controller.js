const Event = require("../models/Event");
const Team = require("../models/Team");
const asyncHandler = require("../utils/asyncHandler");

const normalizePaging = (pageInput, limitInput) => {
  const page = Math.max(1, Number.parseInt(pageInput || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitInput || "20", 10) || 20));
  return { page, limit };
};

const listEvents = asyncHandler(async (req, res) => {
  const { page, limit } = normalizePaging(req.query.page, req.query.limit);
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    Event.find().sort({ date: 1, createdAt: -1 }).skip(skip).limit(limit),
    Event.countDocuments(),
  ]);

  return res.json({
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const { title, description, date, link } = req.body;

  const event = await Event.create({
    title,
    description,
    date,
    link,
    createdBy: req.user.id,
  });

  return res.status(201).json({
    message: "Event created successfully.",
    event,
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  return res.json({
    message: "Event updated successfully.",
    event,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Team.updateMany({ event: id }, { $set: { event: null, eventLink: "" } });

  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  return res.json({ message: "Event deleted successfully." });
});

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};

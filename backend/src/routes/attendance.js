const express = require("express");
const Attendance = require("../models/Attendance");
const { auth, authorize } = require("../middleware/auth");
const router = express.Router();

// Mark attendance
router.post("/", auth, authorize("teacher", "admin"), async (req, res) => {
  try {
    const { classId, date, records } = req.body;

    const attendance = await Attendance.create({
      class: classId,
      date,
      records,
      markedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get attendance for a class
router.get("/:classId", auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ class: req.params.classId })
      .populate("records.student", "firstName lastName email")
      .populate("markedBy", "firstName lastName");

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update attendance record
router.put("/:id", auth, authorize("teacher", "admin"), async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

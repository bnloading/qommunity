const express = require("express");
const Assignment = require("../models/Assignment");
const { auth, authorize } = require("../middleware/auth");
const router = express.Router();

// Get all assignments
router.get("/", auth, async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate("course", "title")
      .populate("instructor", "firstName lastName")
      .populate("submissions.student", "firstName lastName email");
    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get assignment by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("course", "title")
      .populate("instructor", "firstName lastName")
      .populate("submissions.student", "firstName lastName email");
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }
    res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create assignment (teacher/admin)
router.post("/", auth, authorize("teacher", "admin"), async (req, res) => {
  try {
    const { title, description, course, dueDate, totalPoints } = req.body;

    const assignment = await Assignment.create({
      title,
      description,
      course,
      dueDate,
      totalPoints,
      instructor: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Submit assignment (student)
router.post("/:id/submit", auth, authorize("student"), async (req, res) => {
  try {
    const { content, fileUrl } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Check if student already submitted
    const existingSubmission = assignment.submissions.find(
      (sub) => sub.student.toString() === req.user.id
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted this assignment",
      });
    }

    assignment.submissions.push({
      student: req.user.id,
      submittedAt: new Date(),
      content,
      fileUrl,
    });

    await assignment.save();

    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Grade assignment (teacher)
router.post(
  "/:id/grade/:submissionIndex",
  auth,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const { grade, feedback } = req.body;
      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      const submission = assignment.submissions[req.params.submissionIndex];
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      submission.grade = grade;
      submission.feedback = feedback;
      submission.gradedAt = new Date();
      submission.gradedBy = req.user.id;

      await assignment.save();

      res.status(200).json({
        success: true,
        message: "Assignment graded successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;

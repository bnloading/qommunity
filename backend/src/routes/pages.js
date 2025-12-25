const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const Page = require("../models/Page");
const Folder = require("../models/Folder");
const Course = require("../models/Course");
const cloudinary = require("cloudinary").v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "your_cloud_name",
  api_key: process.env.CLOUDINARY_API_KEY || "your_api_key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "your_api_secret",
});

// GET all pages for a course
router.get("/course/:courseId", auth, async (req, res) => {
  try {
    const pages = await Page.find({ course: req.params.courseId })
      .populate("folder", "name")
      .populate("creator", "firstName lastName profilePicture")
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      pages,
    });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET single page
router.get("/:id", auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id)
      .populate("folder", "name")
      .populate("creator", "firstName lastName profilePicture")
      .populate("course", "title");

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    res.status(200).json({
      success: true,
      page,
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE new page
router.post("/", auth, async (req, res) => {
  try {
    let { title, content, courseId, communityId, folderId, status } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // If communityId not provided, fetch it from the course
    if (!communityId) {
      const course = await Course.findById(courseId).select("community");
      if (course && course.community) {
        communityId = course.community;
      }
    }

    // Get the highest order number for this course
    const lastPage = await Page.findOne({ course: courseId })
      .sort({ order: -1 })
      .select("order");

    const order = lastPage ? lastPage.order + 1 : 0;

    const page = await Page.create({
      title: title || "New page",
      content: content || "",
      course: courseId,
      community: communityId || null,
      creator: req.user._id,
      folder: folderId || null,
      order,
      status: status || "published",
    });

    const populatedPage = await Page.findById(page._id)
      .populate("folder", "name")
      .populate("creator", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Page created successfully",
      page: populatedPage,
    });
  } catch (error) {
    console.error("Error creating page:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE page
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, content, status, folderId, dripStatus } = req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    // Check if user is creator
    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this page",
      });
    }

    // Update fields
    if (title !== undefined) page.title = title;
    if (content !== undefined) page.content = content;
    if (status !== undefined) page.status = status;
    if (folderId !== undefined) page.folder = folderId;
    if (dripStatus !== undefined) page.dripStatus = dripStatus;

    await page.save();

    const updatedPage = await Page.findById(page._id)
      .populate("folder", "name")
      .populate("creator", "firstName lastName profilePicture");

    res.status(200).json({
      success: true,
      message: "Page updated successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Error updating page:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// REVERT page to draft
router.put("/:id/revert-to-draft", auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    page.status = "draft";
    await page.save();

    res.status(200).json({
      success: true,
      message: "Page reverted to draft",
      page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CHANGE folder
router.put("/:id/change-folder", auth, async (req, res) => {
  try {
    const { folderId } = req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    page.folder = folderId;
    await page.save();

    const updatedPage = await Page.findById(page._id).populate(
      "folder",
      "name"
    );

    res.status(200).json({
      success: true,
      message: "Folder changed successfully",
      page: updatedPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DUPLICATE page
router.post("/:id/duplicate", auth, async (req, res) => {
  try {
    const originalPage = await Page.findById(req.params.id);

    if (!originalPage) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (originalPage.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Get the highest order number
    const lastPage = await Page.findOne({ course: originalPage.course })
      .sort({ order: -1 })
      .select("order");

    const newPage = await Page.create({
      title: `${originalPage.title} (Copy)`,
      content: originalPage.content,
      course: originalPage.course,
      community: originalPage.community,
      creator: req.user._id,
      folder: originalPage.folder,
      order: lastPage ? lastPage.order + 1 : 0,
      status: "draft",
      media: originalPage.media,
    });

    const populatedPage = await Page.findById(newPage._id)
      .populate("folder", "name")
      .populate("creator", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Page duplicated successfully",
      page: populatedPage,
    });
  } catch (error) {
    console.error("Error duplicating page:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// TOGGLE drip status
router.put("/:id/drip-status", auth, async (req, res) => {
  try {
    const { enabled, unlockDate, unlockAfterDays } = req.body;

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    page.dripStatus = {
      enabled: enabled !== undefined ? enabled : !page.dripStatus.enabled,
      unlockDate: unlockDate || page.dripStatus.unlockDate,
      unlockAfterDays: unlockAfterDays || page.dripStatus.unlockAfterDays,
    };

    await page.save();

    res.status(200).json({
      success: true,
      message: `Drip status ${
        page.dripStatus.enabled ? "enabled" : "disabled"
      }`,
      page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE page
router.delete("/:id", auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this page",
      });
    }

    // Delete media from Cloudinary
    if (page.media && page.media.length > 0) {
      for (const mediaItem of page.media) {
        try {
          const publicId = mediaItem.url.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Error deleting media from Cloudinary:", err);
        }
      }
    }

    await Page.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPLOAD image
router.post("/:id/upload-image", auth, async (req, res) => {
  try {
    const { image, name } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image data required",
      });
    }

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      folder: "skool/pages/images",
      resource_type: "image",
    });

    const mediaItem = {
      type: "image",
      url: result.secure_url,
      name: name || "Image",
      size: result.bytes,
      uploadedAt: new Date(),
    };

    page.media.push(mediaItem);
    await page.save();

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      media: mediaItem,
      page,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPLOAD video
router.post("/:id/upload-video", auth, async (req, res) => {
  try {
    const { video, name } = req.body;

    if (!video) {
      return res.status(400).json({
        success: false,
        message: "Video data required",
      });
    }

    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(video, {
      folder: "skool/pages/videos",
      resource_type: "video",
      chunk_size: 6000000,
    });

    const mediaItem = {
      type: "video",
      url: result.secure_url,
      name: name || "Video",
      size: result.bytes,
      uploadedAt: new Date(),
    };

    page.media.push(mediaItem);
    await page.save();

    res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      media: mediaItem,
      page,
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE media from page
router.delete("/:id/media/:mediaId", auth, async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    if (page.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const mediaItem = page.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    // Delete from Cloudinary
    try {
      const publicId = mediaItem.url.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId, {
        resource_type: mediaItem.type === "video" ? "video" : "image",
      });
    } catch (err) {
      console.error("Error deleting from Cloudinary:", err);
    }

    page.media.pull(req.params.mediaId);
    await page.save();

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
      page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE folder
router.post("/folders", auth, async (req, res) => {
  try {
    let { name, courseId, communityId } = req.body;

    if (!name || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Name and course ID are required",
      });
    }

    // If communityId not provided, fetch it from the course
    if (!communityId) {
      const course = await Course.findById(courseId).select("community");
      if (course && course.community) {
        communityId = course.community;
      }
    }

    const lastFolder = await Folder.findOne({ course: courseId })
      .sort({ order: -1 })
      .select("order");

    const folder = await Folder.create({
      name,
      course: courseId,
      community: communityId || null,
      creator: req.user._id,
      order: lastFolder ? lastFolder.order + 1 : 0,
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET folders for a course
router.get("/folders/course/:courseId", auth, async (req, res) => {
  try {
    const folders = await Folder.find({ course: req.params.courseId }).sort({
      order: 1,
    });

    res.status(200).json({
      success: true,
      folders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE folder
router.put("/folders/:id", auth, async (req, res) => {
  try {
    const { name } = req.body;

    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    if (folder.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (name) folder.name = name;
    await folder.save();

    res.status(200).json({
      success: true,
      message: "Folder updated successfully",
      folder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE folder
router.delete("/folders/:id", auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    if (folder.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Set all pages in this folder to have no folder
    await Page.updateMany(
      { folder: req.params.id },
      { $set: { folder: null } }
    );

    await Folder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Folder deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

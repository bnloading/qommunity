import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  ChevronDown,
  FolderPlus,
  FilePlus,
  MoreVertical,
  Edit,
  FileText,
  FolderOpen,
  Copy,
  Clock,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  X,
} from "lucide-react";
import "./CoursePages.css";

const CoursePages = () => {
  const { courseId, communityId } = useParams();
  const textareaRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showPageEditor, setShowPageEditor] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [showFolderContextMenu, setShowFolderContextMenu] = useState(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [folderMenuPosition, setFolderMenuPosition] = useState({ x: 0, y: 0 });
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [newFolder, setNewFolder] = useState({
    name: "",
  });

  const [pageData, setPageData] = useState({
    title: "New page",
    content: "",
    status: "published",
    folderId: null,
  });

  useEffect(() => {
    if (courseId) {
      fetchPages();
      fetchFolders();
    }
  }, [courseId]);

  useEffect(() => {
    if (showPageEditor && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }
  }, [showPageEditor, selectedPage]);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/pages/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setPages(response.data.pages);
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/pages/folders/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setFolders(response.data.folders);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const createPage = async (folderId = null) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/pages`,
        {
          title: "New page",
          content: "",
          courseId,
          communityId,
          folderId,
          status: "published",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const newPage = response.data.page;
        setPages([...pages, newPage]);
        setSelectedPage(newPage);
        setPageData({
          title: newPage.title || "New page",
          content: newPage.content || "",
          status: newPage.status || "published",
          folderId: newPage.folder?._id || folderId || null,
        });
        setShowPageEditor(true);
      }
    } catch (error) {
      console.error("Error creating page:", error);
      alert(error.response?.data?.message || "Failed to create page");
    }
  };

  const updatePage = async () => {
    if (!selectedPage) {
      console.error("No page selected");
      alert("Please select a page first");
      return;
    }

    console.log("Saving page:", {
      id: selectedPage._id,
      title: pageData.title,
      content: pageData.content,
      status: pageData.status,
    });

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/pages/${selectedPage._id}`,
        {
          title: pageData.title,
          content: pageData.content,
          status: pageData.status,
          folderId: pageData.folderId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const updatedPages = pages.map((p) =>
          p._id === selectedPage._id ? response.data.page : p
        );
        setPages(updatedPages);
        setSelectedPage(response.data.page);
        console.log("Page saved successfully:", response.data.page);
        alert("Page saved successfully!");
      }
    } catch (error) {
      console.error("Error updating page:", error);
      console.error("Error details:", error.response?.data);
      alert(error.response?.data?.message || "Failed to update page");
    } finally {
      setLoading(false);
    }
  };

  const revertToDraft = async (pageId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/pages/${pageId}/revert-to-draft`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        fetchPages();
        alert("Page reverted to draft");
      }
    } catch (error) {
      console.error("Error reverting page:", error);
      alert(error.response?.data?.message || "Failed to revert page");
    }
  };

  const changeFolder = async (pageId, newFolderId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/pages/${pageId}/change-folder`,
        { folderId: newFolderId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        fetchPages();
        alert("Folder changed successfully");
      }
    } catch (error) {
      console.error("Error changing folder:", error);
      alert(error.response?.data?.message || "Failed to change folder");
    }
  };

  const duplicatePage = async (pageId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/pages/${pageId}/duplicate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        fetchPages();
        alert("Page duplicated successfully");
      }
    } catch (error) {
      console.error("Error duplicating page:", error);
      alert(error.response?.data?.message || "Failed to duplicate page");
    }
  };

  const toggleDripStatus = async (pageId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/pages/${pageId}/drip-status`,
        { enabled: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        fetchPages();
        alert(`Drip status toggled`);
      }
    } catch (error) {
      console.error("Error toggling drip status:", error);
      alert(error.response?.data?.message || "Failed to toggle drip status");
    }
  };

  const deletePage = async (pageId) => {
    console.log("Delete page called with ID:", pageId);
    if (!window.confirm("Are you sure you want to delete this page?")) return;

    try {
      const token = localStorage.getItem("token");
      console.log("Sending delete request for page:", pageId);
      const response = await axios.delete(
        `http://localhost:5000/api/pages/${pageId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Delete response:", response.data);
      if (response.data.success) {
        setPages(pages.filter((p) => p._id !== pageId));
        if (selectedPage?._id === pageId) {
          setSelectedPage(null);
          setShowPageEditor(false);
        }
        alert("Page deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting page:", error);
      alert(error.response?.data?.message || "Failed to delete page");
    }
  };

  const createFolder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/pages/folders`,
        {
          name: newFolder.name,
          courseId,
          communityId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setFolders([...folders, response.data.folder]);
        setShowFolderModal(false);
        setNewFolder({ name: "" });
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      alert(error.response?.data?.message || "Failed to create folder");
    }
  };

  const updateFolder = async (folderId, newName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `http://localhost:5000/api/pages/folders/${folderId}`,
        { name: newName },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setFolders(
          folders.map((f) => (f._id === folderId ? { ...f, name: newName } : f))
        );
        alert("Folder updated successfully");
      }
    } catch (error) {
      console.error("Error updating folder:", error);
      alert(error.response?.data?.message || "Failed to update folder");
    }
  };

  const duplicateFolder = async (folderId) => {
    try {
      const token = localStorage.getItem("token");
      const folder = folders.find((f) => f._id === folderId);
      if (!folder) return;

      const response = await axios.post(
        `http://localhost:5000/api/pages/folders`,
        {
          name: `${folder.name} (Copy)`,
          courseId,
          communityId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setFolders([...folders, response.data.folder]);
        alert("Folder duplicated successfully");
      }
    } catch (error) {
      console.error("Error duplicating folder:", error);
      alert(error.response?.data?.message || "Failed to duplicate folder");
    }
  };

  const deleteFolder = async (folderId) => {
    console.log("Delete folder called with ID:", folderId);
    if (
      !window.confirm("Delete this folder? Pages inside will be moved to root.")
    )
      return;

    try {
      const token = localStorage.getItem("token");
      console.log("Sending delete request for folder:", folderId);
      const response = await axios.delete(
        `http://localhost:5000/api/pages/folders/${folderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Delete folder response:", response.data);
      if (response.data.success) {
        setFolders(folders.filter((f) => f._id !== folderId));
        fetchPages();
        alert("Folder deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert(error.response?.data?.message || "Failed to delete folder");
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPage) return;

    try {
      setUploadingMedia(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `http://localhost:5000/api/pages/${selectedPage._id}/upload-image`,
          {
            image: reader.result,
            name: file.name,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          setSelectedPage(response.data.page);
          alert("Image uploaded successfully!");
        }
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingMedia(false);
    }
  };

  const uploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPage) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("Video file is too large. Maximum size is 100MB.");
      return;
    }

    try {
      setUploadingMedia(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const token = localStorage.getItem("token");
        const response = await axios.post(
          `http://localhost:5000/api/pages/${selectedPage._id}/upload-video`,
          {
            video: reader.result,
            name: file.name,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          setSelectedPage(response.data.page);
          alert("Video uploaded successfully!");
        }
      };
    } catch (error) {
      console.error("Error uploading video:", error);
      alert(error.response?.data?.message || "Failed to upload video");
    } finally {
      setUploadingMedia(false);
    }
  };

  const openPageEditor = (page) => {
    setSelectedPage(page);
    setPageData({
      title: page.title || "New page",
      content: page.content || "",
      status: page.status || "published",
      folderId: page.folder?._id || null,
    });
    setShowPageEditor(true);
    setShowContextMenu(null);
  };

  const handleFolderContextMenu = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFolderContextMenu(folder._id);
    setFolderMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const insertFormatting = (format) => {
    console.log("Insert formatting called:", format);
    const textarea = textareaRef.current;
    if (!textarea) {
      console.log("Textarea ref not found");
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = pageData.content.substring(start, end) || "text";
    console.log("Selected text:", selectedText, "Start:", start, "End:", end);
    let formattedText = "";

    switch (format) {
      case "h1":
        formattedText = `# ${selectedText}`;
        break;
      case "h2":
        formattedText = `## ${selectedText}`;
        break;
      case "h3":
        formattedText = `### ${selectedText}`;
        break;
      case "h4":
        formattedText = `#### ${selectedText}`;
        break;
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "strikethrough":
        formattedText = `~~${selectedText}~~`;
        break;
      case "code":
        formattedText = `\`${selectedText}\``;
        break;
      case "bulletList":
        formattedText = `- ${selectedText}`;
        break;
      case "numberedList":
        formattedText = `1. ${selectedText}`;
        break;
      case "quote":
        formattedText = `> ${selectedText}`;
        break;
      case "link":
        formattedText = `[${selectedText}](url)`;
        break;
      case "divider":
        formattedText = "\n---\n";
        break;
      default:
        return;
    }

    const newContent =
      pageData.content.substring(0, start) +
      formattedText +
      pageData.content.substring(end);

    console.log("New content:", newContent);
    setPageData({ ...pageData, content: newContent });

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formattedText.length,
        start + formattedText.length
      );
    }, 0);
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (e, page) => {
    e.preventDefault();
    setShowContextMenu(page._id);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const getPagesWithoutFolder = () => {
    return pages.filter((page) => !page.folder);
  };

  const getPagesByFolder = (folderId) => {
    return pages.filter((page) => page.folder?._id === folderId);
  };

  return (
    <div className="course-pages-container">
      <div className="pages-sidebar">
        <div className="sidebar-header">
          <h3>Course Content</h3>
          <div className="sidebar-actions">
            <button
              className="icon-btn"
              onClick={() => setShowFolderModal(true)}
              title="Create folder"
            >
              <FolderPlus size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => createPage()}
              title="Create page"
            >
              <FilePlus size={18} />
            </button>
          </div>
        </div>

        <div className="pages-list">
          {/* Pages without folder */}
          {getPagesWithoutFolder().map((page) => (
            <div
              key={page._id}
              className={`page-item ${
                selectedPage?._id === page._id ? "active" : ""
              }`}
              onClick={() => openPageEditor(page)}
              onContextMenu={(e) => handleContextMenu(e, page)}
            >
              <div className="page-item-content">
                <div className="page-icon">
                  <FileText size={16} />
                </div>
                <span className="page-title">{page.title}</span>
                {page.status === "draft" && (
                  <span className="draft-badge">Draft</span>
                )}
              </div>
              <div className="page-item-progress">
                <div
                  className="progress-bar"
                  style={{ width: `${page.completionPercentage}%` }}
                />
              </div>
            </div>
          ))}

          {/* Folders with pages */}
          {folders.map((folder) => (
            <div key={folder._id} className="folder-item">
              <div
                className="folder-header"
                onClick={() => toggleFolder(folder._id)}
              >
                <ChevronDown
                  size={16}
                  className={`folder-chevron ${
                    expandedFolders.has(folder._id) ? "expanded" : ""
                  }`}
                />
                <span className="folder-name">{folder.name}</span>
                <button
                  className="folder-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFolderContextMenu(e, folder);
                  }}
                >
                  <MoreVertical size={14} />
                </button>
              </div>

              {expandedFolders.has(folder._id) && (
                <div className="folder-pages">
                  {getPagesByFolder(folder._id).map((page) => (
                    <div
                      key={page._id}
                      className={`page-item ${
                        selectedPage?._id === page._id ? "active" : ""
                      }`}
                      onClick={() => openPageEditor(page)}
                      onContextMenu={(e) => handleContextMenu(e, page)}
                    >
                      <div className="page-item-content">
                        <div className="page-icon">
                          <FileText size={16} />
                        </div>
                        <span className="page-title">{page.title}</span>
                        {page.status === "draft" && (
                          <span className="draft-badge">Draft</span>
                        )}
                      </div>
                      <div className="page-item-progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${page.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    className="add-page-to-folder"
                    onClick={() => createPage(folder._id)}
                  >
                    <FilePlus size={14} />
                    Add page
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pages-content">
        {showPageEditor && selectedPage ? (
          <div className="page-editor">
            <div className="editor-header">
              <input
                type="text"
                className="page-title-input"
                value={pageData.title}
                onChange={(e) =>
                  setPageData({ ...pageData, title: e.target.value })
                }
                placeholder="Page title"
              />
              <div className="editor-actions">
                <button
                  className="icon-btn"
                  onClick={() => {
                    const menu =
                      showContextMenu === selectedPage._id
                        ? null
                        : selectedPage._id;
                    setShowContextMenu(menu);
                  }}
                >
                  <MoreVertical size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    setShowPageEditor(false);
                    setSelectedPage(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="editor-toolbar">
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("h1")}
                title="Heading 1"
              >
                H1
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("h2")}
                title="Heading 2"
              >
                H2
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("h3")}
                title="Heading 3"
              >
                H3
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("h4")}
                title="Heading 4"
              >
                H4
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("bold")}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("italic")}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("strikethrough")}
                title="Strikethrough"
              >
                <s>S</s>
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("code")}
                title="Code"
              >
                &lt;/&gt;
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("bulletList")}
                title="Bullet list"
              >
                ☰
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("numberedList")}
                title="Numbered list"
              >
                ≡
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("quote")}
                title="Quote"
              >
                ""
              </button>
              <label
                className="toolbar-btn"
                htmlFor="image-upload"
                title="Image"
              >
                <ImageIcon size={16} />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={uploadImage}
                  disabled={uploadingMedia}
                />
              </label>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("link")}
                title="Link"
              >
                🔗
              </button>
              <button
                className="toolbar-btn"
                onClick={() => insertFormatting("divider")}
                title="Divider"
              >
                —
              </button>
              <label
                className="toolbar-btn"
                htmlFor="video-upload"
                title="Video"
              >
                <VideoIcon size={16} />
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={uploadVideo}
                  disabled={uploadingMedia}
                />
              </label>
            </div>

            {uploadingMedia && (
              <div className="upload-progress">
                <Upload size={16} />
                <span>Uploading media...</span>
              </div>
            )}

            <textarea
              key={selectedPage?._id}
              ref={textareaRef}
              className="page-content-editor"
              value={pageData.content}
              onChange={(e) =>
                setPageData({ ...pageData, content: e.target.value })
              }
              placeholder="Start writing your content..."
              autoFocus
            />

            {selectedPage.media && selectedPage.media.length > 0 && (
              <div className="media-gallery">
                <h4>Media Files</h4>
                <div className="media-grid">
                  {selectedPage.media.map((media, index) => (
                    <div key={index} className="media-item">
                      {media.type === "image" ? (
                        <img src={media.url} alt={media.name} />
                      ) : (
                        <video src={media.url} controls />
                      )}
                      <span className="media-name">{media.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="editor-footer">
              <div style={{ position: "relative" }}>
                <button
                  className="btn-add-dropdown"
                  onClick={() => setShowAddDropdown(!showAddDropdown)}
                >
                  ADD ▼
                </button>
                {showAddDropdown && (
                  <>
                    <div
                      className="context-menu-overlay"
                      onClick={() => setShowAddDropdown(false)}
                    />
                    <div
                      className="context-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                      }}
                    >
                      <button
                        className="context-menu-item"
                        onClick={() => {
                          createPage();
                          setShowAddDropdown(false);
                        }}
                      >
                        <FilePlus size={14} />
                        New Page
                      </button>
                      <button
                        className="context-menu-item"
                        onClick={() => {
                          setShowFolderModal(true);
                          setShowAddDropdown(false);
                        }}
                      >
                        <FolderPlus size={14} />
                        New Folder
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="footer-right">
                <label className="toggle-label">
                  <span className="toggle-text-left">Published</span>
                  <input
                    type="checkbox"
                    checked={pageData.status === "published"}
                    onChange={(e) =>
                      setPageData({
                        ...pageData,
                        status: e.target.checked ? "published" : "draft",
                      })
                    }
                  />
                  <span className="toggle-switch" />
                </label>
                <button
                  className="btn-cancel"
                  onClick={() => setShowPageEditor(false)}
                >
                  CANCEL
                </button>
                <button
                  className="btn-save"
                  onClick={updatePage}
                  disabled={loading}
                >
                  {loading ? "SAVING..." : "SAVE"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No page selected</h3>
            <p>Select a page from the sidebar or create a new one</p>
            <button className="btn-primary" onClick={() => createPage()}>
              <FilePlus size={16} />
              Create New Page
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setShowContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: contextMenuPosition.y,
              left: contextMenuPosition.x,
            }}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                const page = pages.find((p) => p._id === showContextMenu);
                if (page) openPageEditor(page);
                setShowContextMenu(null);
              }}
            >
              <Edit size={14} />
              Edit page
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                revertToDraft(showContextMenu);
                setShowContextMenu(null);
              }}
            >
              <FileText size={14} />
              Revert to draft
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                const newFolderId = prompt("Enter folder ID:");
                if (newFolderId) {
                  changeFolder(showContextMenu, newFolderId);
                }
                setShowContextMenu(null);
              }}
            >
              <FolderOpen size={14} />
              Change folder
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                duplicatePage(showContextMenu);
                setShowContextMenu(null);
              }}
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                toggleDripStatus(showContextMenu);
                setShowContextMenu(null);
              }}
            >
              <Clock size={14} />
              Drip status: Off
            </button>
            <button
              className="context-menu-item danger"
              onClick={() => {
                deletePage(showContextMenu);
                setShowContextMenu(null);
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}

      {/* Folder Context Menu */}
      {showFolderContextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setShowFolderContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: folderMenuPosition.y,
              left: folderMenuPosition.x,
            }}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                const folder = folders.find(
                  (f) => f._id === showFolderContextMenu
                );
                if (folder) {
                  const newName = prompt("Enter new folder name:", folder.name);
                  if (newName && newName.trim()) {
                    updateFolder(showFolderContextMenu, newName.trim());
                  }
                }
                setShowFolderContextMenu(null);
              }}
            >
              <Edit size={14} />
              Edit folder
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                const folder = folders.find(
                  (f) => f._id === showFolderContextMenu
                );
                if (folder) {
                  createPage(folder._id);
                }
                setShowFolderContextMenu(null);
              }}
            >
              <FilePlus size={14} />
              Add page in folder
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                duplicateFolder(showFolderContextMenu);
                setShowFolderContextMenu(null);
              }}
            >
              <Copy size={14} />
              Duplicate folder
            </button>
            <button
              className="context-menu-item danger"
              onClick={() => {
                deleteFolder(showFolderContextMenu);
                setShowFolderContextMenu(null);
              }}
            >
              <Trash2 size={14} />
              Delete folder
            </button>
          </div>
        </>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowFolderModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Folder</h3>
              <button
                className="modal-close"
                onClick={() => setShowFolderModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createFolder}>
              <div className="form-group">
                <label>Folder Name</label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) =>
                    setNewFolder({ ...newFolder, name: e.target.value })
                  }
                  placeholder="Enter folder name"
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFolderModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursePages;

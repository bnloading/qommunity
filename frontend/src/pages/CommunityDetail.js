import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  MessageSquare,
  Calendar,
  Users,
  Trophy,
  Info,
  BookOpen,
} from "lucide-react";
import "./CommunityDetail.css";

const TABS = [
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "classroom", label: "Classroom", icon: BookOpen },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "members", label: "Members", icon: Users },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "about", label: "About", icon: Info },
];

const CommunityDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const coverInputRef = useRef(null);
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("community");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("dashboard");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const [classroomFolders, setClassroomFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [classroomError, setClassroomError] = useState(null);
  const [folderMenuOpenId, setFolderMenuOpenId] = useState(null);
  const [showPageMenu, setShowPageMenu] = useState(false); // Add page menu state
  const [hoveredFolderId, setHoveredFolderId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pageDraft, setPageDraft] = useState("");
  const [pagePublished, setPagePublished] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    description: "",
    accessType: "open",
    coverImage: "",
    published: true,
  });
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderPublished, setNewFolderPublished] = useState(true);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isMember, setIsMember] = useState(false);

  // Helper function to get auth token (Clerk or localStorage fallback)
  const getAuthToken = useCallback(async () => {
    try {
      // First try Clerk token
      if (getToken) {
        const clerkToken = await getToken();
        if (clerkToken) return clerkToken;
      }
    } catch (e) {
      console.log("Clerk token not available, trying localStorage");
    }
    // Fallback to localStorage
    return localStorage.getItem("token");
  }, [getToken]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAuthToken]);

  // Helper to check if an ID is a demo/placeholder ID (not a real MongoDB ObjectId)
  const isDemoId = (id) => {
    if (!id) return true;
    // Demo IDs start with "demo-" or are not valid 24-char hex MongoDB ObjectIds
    if (typeof id === "string" && id.startsWith("demo-")) return true;
    // MongoDB ObjectIds are 24 character hex strings
    return !/^[a-f\d]{24}$/i.test(id);
  };

  useEffect(() => {
    const folder = classroomFolders.find((f) => f.id === selectedFolderId);
    const page = folder?.pages?.find((p) => p.id === selectedPageId);
    if (page) {
      setPageDraft(page.content || "");
      setPagePublished(page.published !== false);
    }
  }, [classroomFolders, selectedFolderId, selectedPageId]);

  useEffect(() => {
    if (!folderMenuOpenId) return;
    const handleClick = () => setFolderMenuOpenId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [folderMenuOpenId]);

  // Close image/video dropdown menus when clicking outside
  useEffect(() => {
    if (!showImageMenu && !showVideoMenu) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".toolbar-dropdown-container")) {
        setShowImageMenu(false);
        setShowVideoMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showImageMenu, showVideoMenu]);

  const fetchCommunity = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/communities/${slug}`
      );

      if (!response.data.success) {
        navigate("/discover");
        return;
      }

      setCommunity(response.data.community);

      // Get current user info
      const token = await getAuthToken();
      if (token) {
        try {
          const userResponse = await axios.get(
            "http://localhost:5000/api/users/me",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const userId = userResponse.data.user._id;

          // Check if user is creator
          const creatorId =
            response.data.community.creator?._id ||
            response.data.community.creator;
          const isUserCreator = userId === creatorId;
          console.log("🔍 Creator check:", {
            userId,
            creatorId,
            isCreator: isUserCreator,
            creator: response.data.community.creator,
          });
          setIsCreator(isUserCreator);

          // Check if user is member
          setIsMember(
            response.data.community.members?.some(
              (m) =>
                m &&
                (m.user === userId ||
                  m._id === userId ||
                  m.user?._id === userId)
            )
          );
        } catch (err) {
          console.error("Error fetching user:", err);
        }
      }
    } catch (error) {
      console.error("Error fetching community:", error);
      navigate("/discover");
    } finally {
      setLoading(false);
    }
  }, [navigate, slug, getAuthToken]);

  const fetchPosts = useCallback(async () => {
    if (!community?._id) return;
    try {
      setPostsLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/communities/${community._id}/posts`
      );

      if (response.data.success) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setPostsLoading(false);
    }
  }, [community?._id]);

  const fetchCourses = useCallback(async () => {
    if (!community?._id) return;
    try {
      const response = await axios.get(
        `http://localhost:5000/api/communities/${community._id}/courses`
      );

      if (response.data.success) {
        setCourses(response.data.courses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, [community?._id]);

  const fetchEvents = useCallback(async () => {
    if (!community?._id) return;
    try {
      const response = await axios.get(
        `http://localhost:5000/api/communities/${community._id}/events`
      );

      if (response.data.success) {
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [community?._id]);

  useEffect(() => {
    if (!slug) return;
    fetchCommunity();
  }, [slug, fetchCommunity]);

  useEffect(() => {
    if (!community) return;
    fetchPosts();
    fetchCourses();
    fetchEvents();
  }, [community, fetchCourses, fetchEvents, fetchPosts]);

  const buildClassroomState = useCallback((folders = [], pages = []) => {
    const normalizePage = (page) => ({
      id: page._id,
      title: page.title || "Untitled page",
      content: page.content || "",
      published: page.status !== "draft",
      completed: page.status !== "draft" && page.status !== "archived",
      order: page.order ?? 0,
      status: page.status || "draft",
    });

    const folderList = folders.map((folder) => {
      const folderPages = pages
        .filter((page) => {
          const folderValue = page.folder?._id || page.folder || null;
          if (!folderValue) return false;
          return folderValue.toString() === folder._id.toString();
        })
        .map(normalizePage)
        .sort((a, b) => a.order - b.order);

      return {
        id: folder._id,
        title: folder.name,
        expanded: true,
        order: folder.order ?? 0,
        pages: folderPages,
      };
    });

    const ungroupedPages = pages
      .filter((page) => !page.folder)
      .map(normalizePage)
      .sort((a, b) => a.order - b.order);

    if (ungroupedPages.length > 0) {
      folderList.unshift({
        id: "uncategorized",
        title: "Unorganized",
        expanded: true,
        order: -1,
        pages: ungroupedPages,
        isVirtual: true,
      });
    }

    return folderList.sort((a, b) => a.order - b.order);
  }, []);

  const fetchClassroomStructure = useCallback(
    async (courseId) => {
      if (!courseId) return;

      setClassroomLoading(true);
      setClassroomError(null);

      try {
        const token = await getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [folderRes, pageRes] = await Promise.all([
          axios.get(
            `http://localhost:5000/api/pages/folders/course/${courseId}`,
            { headers }
          ),
          axios.get(`http://localhost:5000/api/pages/course/${courseId}`, {
            headers,
          }),
        ]);

        const folders = folderRes.data?.folders || [];
        const pages = pageRes.data?.pages || [];

        // If no folders exist, create placeholder data for demo
        let structured = buildClassroomState(folders, pages);

        if (structured.length === 0) {
          structured = [
            {
              id: "demo-folder-1",
              title: "Getting Started",
              expanded: true,
              order: 0,
              pages: [
                {
                  id: "demo-page-1",
                  title: "Welcome to the Course",
                  content:
                    "This is a sample page. Click to edit and add your content.",
                  published: false,
                  completed: false,
                  order: 0,
                  status: "draft",
                },
              ],
            },
          ];
        }

        setClassroomFolders(structured);
        const firstFolderId = structured[0]?.id || null;
        const firstPageId = structured[0]?.pages?.[0]?.id || null;
        setSelectedFolderId(firstFolderId);
        setSelectedPageId(firstPageId);
        setIsEditMode(false);
        setClassroomLoading(false);
      } catch (error) {
        console.error("Error loading classroom:", error);
        // Fallback to demo data even on error
        const demoData = [
          {
            id: "demo-folder-1",
            title: "Getting Started",
            expanded: true,
            order: 0,
            pages: [
              {
                id: "demo-page-1",
                title: "Welcome to the Course",
                content:
                  "This is a sample page. Click to edit and add your content.",
                published: false,
                completed: false,
                order: 0,
                status: "draft",
              },
            ],
          },
        ];

        setClassroomFolders(demoData);
        setSelectedFolderId("demo-folder-1");
        setSelectedPageId("demo-page-1");
        setIsEditMode(false);
        setClassroomLoading(false);
      }
    },
    [buildClassroomState, getAuthToken]
  );

  useEffect(() => {
    if (selectedCourse) {
      const courseId = selectedCourse._id || selectedCourse.id;
      if (courseId) {
        fetchClassroomStructure(courseId);
      }
    } else {
      setClassroomFolders([]);
      setSelectedFolderId(null);
      setSelectedPageId(null);
    }
  }, [selectedCourse, fetchClassroomStructure]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Please write something");
      return;
    }

    try {
      const token = await getAuthToken();
      console.log("📝 Creating post, token exists:", !!token);

      if (!token) {
        alert("You must be logged in to create a post. Please log in.");
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/communities/${community._id}/posts`,
        {
          content: newPostContent,
          category: "",
          title: "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setNewPostContent("");
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error("Error creating post:", error);
      console.error("Error response:", error.response?.data);
      alert(error.response?.data?.message || "Failed to create post");
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const token = await getAuthToken();
      await axios.post(
        `http://localhost:5000/api/posts/${postId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchPosts(); // Refresh posts to update like count
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just store the file name. In production, upload to Cloudinary
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCourse({ ...newCourse, coverImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.name.trim() || !newCourse.description.trim()) {
      alert("Please fill in course name and description");
      return;
    }

    try {
      const headers = await getAuthHeaders();
      console.log(
        "Auth headers:",
        headers.Authorization ? "Token exists" : "No token"
      );

      if (!headers.Authorization && !isSignedIn) {
        alert("You must be logged in to create a course");
        return;
      }

      // First check and fix membership if needed
      try {
        await axios.post(
          `http://localhost:5000/api/communities/${community._id}/check-membership`,
          {},
          { headers }
        );
      } catch (checkError) {
        console.log("Membership check completed:", checkError.response?.data);
      }

      // Now create the course
      const response = await axios.post(
        `http://localhost:5000/api/communities/${community._id}/courses`,
        {
          title: newCourse.name,
          description: newCourse.description,
          thumbnail: newCourse.coverImage,
          category: "other",
          level: "beginner",
          price: 0,
        },
        { headers }
      );

      if (response.data.success) {
        setShowAddCourseModal(false);
        setNewCourse({
          name: "",
          description: "",
          accessType: "open",
          coverImage: "",
          published: true,
        });
        fetchCourses(); // Refresh courses
      }
    } catch (error) {
      console.error("Error creating course:", error);
      console.error("Error response:", error.response?.data);
      alert(error.response?.data?.message || "Failed to create course");
    }
  };

  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    const folder = classroomFolders.find((f) => f.id === folderId);
    const firstPage = folder?.pages?.[0];
    setSelectedPageId(firstPage?.id || null);
    setIsEditMode(false);
  };

  const handleSelectPage = (folderId, pageId) => {
    setSelectedFolderId(folderId);
    setSelectedPageId(pageId);
    setIsEditMode(false);
  };

  const handleAddFolder = async () => {
    const courseId = selectedCourse?._id || selectedCourse?.id;
    if (!courseId) {
      showToast("Select a course first", "error");
      return;
    }
    // Open the modal instead of prompt
    setNewFolderName("");
    setNewFolderPublished(true);
    setShowAddFolderModal(true);
  };

  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) {
      showToast("Please enter a folder name", "error");
      return;
    }
    if (newFolderName.length > 50) {
      showToast("Folder name must be 50 characters or less", "error");
      return;
    }
    const courseId = selectedCourse?._id || selectedCourse?.id;
    if (!courseId) {
      showToast("Select a course first", "error");
      return;
    }
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        "http://localhost:5000/api/pages/folders",
        {
          name: newFolderName,
          courseId,
          communityId: community?._id,
        },
        { headers }
      );
      await fetchClassroomStructure(courseId);
      setShowAddFolderModal(false);
      setNewFolderName("");
      showToast("Folder created");
    } catch (error) {
      console.error("Error creating folder:", error);
      showToast("Failed to create folder", "error");
    }
  };

  const handleEditFolder = async (folderId) => {
    const folder = classroomFolders.find((f) => f.id === folderId);
    if (!folder || folder.isVirtual) {
      showToast("This folder cannot be renamed", "error");
      return;
    }
    // Check if this is a demo folder
    if (isDemoId(folderId)) {
      showToast(
        "Demo folders cannot be renamed. Create a real folder first.",
        "error"
      );
      return;
    }
    const title = prompt("Rename folder", folder.title);
    if (!title) return;
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(
        `http://localhost:5000/api/pages/folders/${folderId}`,
        { name: title },
        { headers }
      );
      const courseId = selectedCourse?._id || selectedCourse?.id;
      if (courseId) {
        await fetchClassroomStructure(courseId);
      }
      showToast("Folder renamed");
    } catch (error) {
      console.error("Error renaming folder:", error);
      showToast("Failed to rename folder", "error");
    }
  };

  const handleDuplicateFolder = async (folderId) => {
    const folder = classroomFolders.find((f) => f.id === folderId);
    if (!folder || folder.isVirtual) {
      showToast("This folder cannot be duplicated", "error");
      return;
    }
    // Check if this is a demo folder
    if (isDemoId(folderId)) {
      showToast(
        "Demo folders cannot be duplicated. Create a real folder first.",
        "error"
      );
      return;
    }
    const courseId = selectedCourse?._id || selectedCourse?.id;
    if (!courseId) {
      showToast("Select a course first", "error");
      return;
    }
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const createResponse = await axios.post(
        "http://localhost:5000/api/pages/folders",
        {
          name: `${folder.title} copy`,
          courseId,
          communityId: community?._id,
        },
        { headers }
      );

      const newFolderId = createResponse.data?.folder?._id;

      if (newFolderId && folder.pages?.length) {
        for (const page of folder.pages) {
          try {
            const duplicatePageRes = await axios.post(
              `http://localhost:5000/api/pages/${page.id}/duplicate`,
              {},
              { headers }
            );
            const duplicatedPageId = duplicatePageRes.data?.page?._id;
            if (duplicatedPageId) {
              await axios.put(
                `http://localhost:5000/api/pages/${duplicatedPageId}/change-folder`,
                { folderId: newFolderId },
                { headers }
              );
            }
          } catch (innerError) {
            console.error("Error duplicating page:", innerError);
          }
        }
      }

      await fetchClassroomStructure(courseId);
      showToast("Folder duplicated");
    } catch (error) {
      console.error("Error duplicating folder:", error);
      showToast("Failed to duplicate folder", "error");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = classroomFolders.find((f) => f.id === folderId);
    if (!folder || folder.isVirtual) {
      showToast("This folder cannot be deleted", "error");
      return;
    }
    // Check if this is a demo folder
    if (isDemoId(folderId)) {
      showToast(
        "Demo folders cannot be deleted. Create a real folder first.",
        "error"
      );
      return;
    }
    if (!window.confirm("Delete this folder and its pages?")) return;
    const courseId = selectedCourse?._id || selectedCourse?.id;
    if (!courseId) return;
    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(
        `http://localhost:5000/api/pages/folders/${folderId}`,
        { headers }
      );
      await fetchClassroomStructure(courseId);
      showToast("Folder deleted");
    } catch (error) {
      console.error("Error deleting folder:", error);
      showToast("Failed to delete folder", "error");
    }
  };

  const handleToggleFolder = (folderId) => {
    setClassroomFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, expanded: !f.expanded } : f))
    );
  };

  const handleAddPageInFolder = async (folderId, titleFromPrompt) => {
    const folder = classroomFolders.find((f) => f.id === folderId);
    if (!folder) return;
    const title =
      titleFromPrompt ||
      prompt("Page title", `New page ${folder.pages.length + 1}`);
    if (!title) return;
    const courseId = selectedCourse?._id || selectedCourse?.id;
    if (!courseId) {
      showToast("Select a course first", "error");
      return;
    }

    // Check if this is a demo folder - if so, create a real folder first
    let realFolderId = folderId;
    if (isDemoId(folderId) && folderId !== "uncategorized") {
      try {
        const token = await getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const folderResponse = await axios.post(
          "http://localhost:5000/api/pages/folders",
          {
            name: folder.title || "New Folder",
            courseId,
            communityId: community?._id,
          },
          { headers }
        );
        realFolderId = folderResponse.data?.folder?._id;
        if (!realFolderId) {
          showToast("Failed to create folder", "error");
          return;
        }
      } catch (error) {
        console.error("Error creating folder:", error);
        showToast("Failed to create folder for page", "error");
        return;
      }
    }

    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        "http://localhost:5000/api/pages",
        {
          title,
          courseId,
          communityId: community?._id,
          folderId: realFolderId === "uncategorized" ? null : realFolderId,
          status: "draft",
          content: "",
        },
        { headers }
      );
      await fetchClassroomStructure(courseId);
      const createdPageId = response.data?.page?._id;
      if (createdPageId) {
        setSelectedFolderId(realFolderId);
        setSelectedPageId(createdPageId);
        setIsEditMode(true);
      }
      showToast("Page created");
    } catch (error) {
      console.error("Error creating page:", error);
      showToast("Failed to create page", "error");
    }
  };

  const handleQuickAddTask = () => {
    if (!selectedFolderId) return;
    handleAddPageInFolder(selectedFolderId);
  };

  const handleFolderMenuToggle = (event, folderId) => {
    event.stopPropagation();
    setFolderMenuOpenId((current) => (current === folderId ? null : folderId));
  };

  const handleFolderMenuAction = (action, folderId) => {
    switch (action) {
      case "rename":
        handleEditFolder(folderId);
        break;
      case "add-page":
        handleAddPageInFolder(folderId);
        break;
      case "duplicate":
        handleDuplicateFolder(folderId);
        break;
      case "delete":
        handleDeleteFolder(folderId);
        break;
      default:
        break;
    }
    setFolderMenuOpenId(null);
  };

  // Handler for page menu actions
  const handlePageMenuAction = async (action) => {
    setShowPageMenu(false);

    if (!selectedPageId) {
      showToast("No page selected", "error");
      return;
    }

    // Check if this is a demo page - most actions not available for demo pages
    if (isDemoId(selectedPageId) && action !== "edit") {
      showToast(
        "This action is not available for demo pages. Create a real page first.",
        "error"
      );
      return;
    }

    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const courseId = selectedCourse?._id || selectedCourse?.id;

    try {
      switch (action) {
        case "edit":
          setIsEditMode(true);
          break;

        case "revert":
          await axios.put(
            `http://localhost:5000/api/pages/${selectedPageId}/revert-to-draft`,
            {},
            { headers }
          );
          if (courseId) await fetchClassroomStructure(courseId);
          showToast("Page reverted to draft");
          break;

        case "change-folder":
          const folderOptions = classroomFolders
            .filter((f) => !f.isVirtual)
            .map((f) => f.title)
            .join(", ");
          const newFolder = prompt(
            `Available folders: ${folderOptions}\n\nEnter folder name (or leave empty for no folder):`
          );
          if (newFolder !== null) {
            const targetFolder = classroomFolders.find(
              (f) => f.title.toLowerCase() === newFolder.toLowerCase()
            );
            const folderId = targetFolder ? targetFolder.id : null;
            await axios.put(
              `http://localhost:5000/api/pages/${selectedPageId}/change-folder`,
              { folderId },
              { headers }
            );
            if (courseId) await fetchClassroomStructure(courseId);
            showToast("Folder changed");
          }
          break;

        case "duplicate":
          await axios.post(
            `http://localhost:5000/api/pages/${selectedPageId}/duplicate`,
            {},
            { headers }
          );
          if (courseId) await fetchClassroomStructure(courseId);
          showToast("Page duplicated");
          break;

        case "drip":
          const dripEnabled = window.confirm(
            "Enable drip status for this page?\n\nClick OK to enable, Cancel to disable."
          );
          await axios.put(
            `http://localhost:5000/api/pages/${selectedPageId}/drip-status`,
            { enabled: dripEnabled },
            { headers }
          );
          if (courseId) await fetchClassroomStructure(courseId);
          showToast(`Drip status ${dripEnabled ? "enabled" : "disabled"}`);
          break;

        case "delete":
          if (
            window.confirm(
              "Are you sure you want to delete this page? This cannot be undone."
            )
          ) {
            await axios.delete(
              `http://localhost:5000/api/pages/${selectedPageId}`,
              { headers }
            );
            if (courseId) await fetchClassroomStructure(courseId);
            setSelectedPageId(null);
            showToast("Page deleted");
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error(`Error with action ${action}:`, error);
      showToast(
        error.response?.data?.message || `Failed to ${action} page`,
        "error"
      );
    }
  };

  // Rich text editor formatting functions
  const applyFormatting = (format) => {
    const textarea = document.querySelector(".page-textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = pageDraft.substring(start, end);
    let newText = pageDraft;
    let newCursorPos = end;

    if (selectedText) {
      let formattedText = selectedText;

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
        case "quote":
          formattedText = `> ${selectedText}`;
          break;
        case "list":
          formattedText = selectedText
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n");
          break;
        case "numbered":
          formattedText = selectedText
            .split("\n")
            .map((line, i) => `${i + 1}. ${line}`)
            .join("\n");
          break;
        case "link":
          const url = prompt("Enter URL:");
          if (url) formattedText = `[${selectedText}](${url})`;
          break;
        case "divider":
          formattedText = `${selectedText}\n\n---\n\n`;
          break;
        default:
          break;
      }

      newText =
        pageDraft.substring(0, start) +
        formattedText +
        pageDraft.substring(end);
      newCursorPos = start + formattedText.length;
    } else {
      // No selection, insert at cursor
      switch (format) {
        case "image":
          const imageUrl = prompt("Enter image URL:");
          if (imageUrl) {
            const imageMarkdown = `\n![Image](${imageUrl})\n`;
            newText =
              pageDraft.substring(0, start) +
              imageMarkdown +
              pageDraft.substring(end);
            newCursorPos = start + imageMarkdown.length;
          }
          break;
        case "video":
          const videoUrl = prompt(
            "Enter video URL (YouTube, Vimeo, or direct link):"
          );
          if (videoUrl) {
            const videoMarkdown = `\n[Video: ${videoUrl}](${videoUrl})\n`;
            newText =
              pageDraft.substring(0, start) +
              videoMarkdown +
              pageDraft.substring(end);
            newCursorPos = start + videoMarkdown.length;
          }
          break;
        case "divider":
          newText =
            pageDraft.substring(0, start) +
            "\n---\n" +
            pageDraft.substring(end);
          newCursorPos = start + 5;
          break;
        default:
          break;
      }
    }

    setPageDraft(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle file upload for images, videos, and audio
  const handleFileUpload = async (file, type) => {
    if (!file) return;

    const token = await getAuthToken();
    if (!token) {
      showToast("Please log in to upload files", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/local-upload/${type}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      if (response.data.success) {
        const fileUrl = `http://localhost:5000${response.data.url}`;
        const textarea = document.querySelector(".page-textarea");
        const start = textarea?.selectionStart || pageDraft.length;

        let markdown = "";
        if (type === "image") {
          markdown = `\n![${response.data.originalName}](${fileUrl})\n`;
        } else if (type === "video") {
          // Use HTML5 video tag syntax for local videos
          markdown = `\n<video controls width="100%" style="border-radius: 8px; margin: 16px 0;">\n  <source src="${fileUrl}" type="${response.data.mimetype}">\n  Your browser does not support the video tag.\n</video>\n`;
        } else if (type === "audio") {
          markdown = `\n<audio controls style="width: 100%; margin: 16px 0;">\n  <source src="${fileUrl}" type="${response.data.mimetype}">\n  Your browser does not support the audio tag.\n</audio>\n`;
        }

        const newContent =
          pageDraft.substring(0, start) + markdown + pageDraft.substring(start);
        setPageDraft(newContent);

        showToast(
          `${
            type.charAt(0).toUpperCase() + type.slice(1)
          } uploaded successfully!`
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast(
        error.response?.data?.message || `Failed to upload ${type}`,
        "error"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleSavePage = async () => {
    if (!selectedPageId) return;

    // Check if this is a demo page - can't save demo pages
    if (isDemoId(selectedPageId)) {
      showToast("Please create a real page first before saving", "error");
      return;
    }

    try {
      const token = await getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(
        `http://localhost:5000/api/pages/${selectedPageId}`,
        {
          content: pageDraft,
          status: pagePublished ? "published" : "draft",
        },
        { headers }
      );
      const courseId = selectedCourse?._id || selectedCourse?.id;
      if (courseId) {
        await fetchClassroomStructure(courseId);
      }
      setIsEditMode(false);
      showToast("Page saved!");
    } catch (error) {
      console.error("Error saving page:", error);
      showToast("Failed to save page", "error");
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    const folder = classroomFolders.find((f) => f.id === selectedFolderId);
    const page = folder?.pages?.find((p) => p.id === selectedPageId);
    if (page) {
      setPageDraft(page.content || "");
      setPagePublished(page.published !== false);
    }
  };

  const handleJoin = async () => {
    try {
      const token = await getAuthToken();
      await axios.post(
        `http://localhost:5000/api/communities/${community._id}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsMember(true);
      fetchCommunity();
    } catch (error) {
      console.error("Error joining community:", error);
      alert(error.response?.data?.message || "Failed to join community");
    }
  };

  // Toast notification helper
  const showToast = (message, type = "success") => {
    // You can integrate a toast library here (react-toastify, etc.)
    // For now, using alert
    if (type === "success") {
      alert("✅ " + message);
    } else {
      alert("❌ " + message);
    }
  };

  // Settings save handlers
  const handleSaveGeneralSettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(
        `http://localhost:5000/api/communities/${community._id}/settings`,
        {
          tab: "general",
          data: {
            name: community.name,
            description: community.description,
            icon: community.icon,
            coverImage: community.coverImage,
            customUrl: community.customUrl,
            isPrivate: community.isPrivate,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showToast("General settings saved successfully!");
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error saving general settings:", error);
      showToast(
        error.response?.data?.message || "Failed to save settings",
        "error"
      );
    }
  };

  const handleSaveDiscoverySettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(
        `http://localhost:5000/api/communities/${community._id}/settings`,
        {
          tab: "discovery",
          data: {
            showInDiscovery: community.showInDiscovery,
            category: community.category,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showToast("Discovery settings saved successfully!");
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error saving discovery settings:", error);
      showToast(
        error.response?.data?.message || "Failed to save settings",
        "error"
      );
    }
  };

  const handleSavePricingSettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(
        `http://localhost:5000/api/communities/${community._id}/settings`,
        {
          tab: "pricing",
          data: {
            pricingModel: community.pricingModel || "free",
            pricingAmount: community.pricingAmount || 0,
            hasTrial: community.hasTrial || false,
            trialDays: community.trialDays || 7,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showToast("Pricing settings saved successfully!");
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error saving pricing settings:", error);
      showToast(
        error.response?.data?.message || "Failed to save settings",
        "error"
      );
    }
  };

  const handleSaveAffiliatesSettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(
        `http://localhost:5000/api/communities/${community._id}/settings`,
        {
          tab: "affiliates",
          data: {
            affiliatesEnabled: community.affiliatesEnabled || false,
            affiliateCommissionRate: community.affiliateCommissionRate || 10,
            affiliateCookieDuration: community.affiliateCookieDuration || 30,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showToast("Affiliates settings saved successfully!");
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error saving affiliates settings:", error);
      showToast(
        error.response?.data?.message || "Failed to save settings",
        "error"
      );
    }
  };

  const handleSaveRulesSettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await axios.put(
        `http://localhost:5000/api/communities/${community._id}/settings`,
        {
          tab: "rules",
          data: {
            rules: community.rules || "",
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        showToast("Rules saved successfully!");
        fetchCommunity();
      }
    } catch (error) {
      console.error("Error saving rules:", error);
      showToast(
        error.response?.data?.message || "Failed to save rules",
        "error"
      );
    }
  };

  const handleCopyInviteLink = () => {
    const link = `https://www.skool.com/${community.slug}/about`;
    navigator.clipboard.writeText(link);
    showToast("Invite link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="error-container">
        <h2>Community not found</h2>
        <p>This community may have been deleted or doesn't exist.</p>
        <button onClick={() => navigate("/discover")} className="btn-home">
          Go Home
        </button>
      </div>
    );
  }

  const onlineCount = 0; // TODO: Implement real-time online tracking
  const adminCount = community.admins?.length || 0;
  const memberCount = community.members?.length || 0;
  const selectedFolder = classroomFolders.find(
    (folder) => folder.id === selectedFolderId
  );
  const selectedPage = selectedFolder?.pages?.find(
    (page) => page.id === selectedPageId
  );

  return (
    <div className="community-detail-page">
      <div className="community-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="community-body">
        <div className="community-main">
          <div className="tab-content">
            {activeTab === "community" && (
              <div className="community-feed">
                {/* Setup Group Card */}
                <div className="setup-card">
                  <div className="setup-header">
                    <div className="setup-icon">⚙️</div>
                    <h3>Set up your group</h3>
                    <button className="setup-toggle">^</button>
                  </div>
                  <div className="setup-items">
                    <div className="setup-item completed">
                      <span className="setup-check">✓</span>
                      <span className="setup-text">
                        Watch 2 min intro video
                      </span>
                    </div>
                    <div className="setup-item completed">
                      <span className="setup-check">✓</span>
                      <span className="setup-text">Set cover image</span>
                    </div>
                    <div className="setup-item">
                      <span className="setup-check">○</span>
                      <span className="setup-text">Invite 3 people</span>
                    </div>
                    <div className="setup-item completed">
                      <span className="setup-check">✓</span>
                      <span className="setup-text">Write your first post</span>
                    </div>
                    <div className="setup-item completed">
                      <span className="setup-check">✓</span>
                      <span className="setup-text">Download app</span>
                    </div>
                  </div>
                </div>

                {/* Post Input */}
                <div className="post-input-card">
                  <div className="post-input-header">
                    <div className="user-avatar-small">N</div>
                    <input
                      type="text"
                      placeholder="Write something"
                      className="post-input"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleCreatePost();
                        }
                      }}
                    />
                  </div>
                  <button className="btn-go-live" onClick={handleCreatePost}>
                    Post
                  </button>
                </div>

                {/* Event Banner */}
                {events.length > 0 &&
                  (() => {
                    const now = new Date();
                    const upcomingEvent = events.find(
                      (e) => new Date(e.startTime) > now
                    );
                    if (upcomingEvent) {
                      const hoursUntil = Math.floor(
                        (new Date(upcomingEvent.startTime) - now) /
                          (1000 * 60 * 60)
                      );
                      return (
                        <div className="event-banner">
                          <Calendar size={20} />
                          <span>
                            <strong>{upcomingEvent.title}</strong> is happening
                            in {hoursUntil} hours
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                {/* Filter Buttons */}
                <div className="feed-filters">
                  <button className="filter-btn active">All</button>
                  <button className="filter-btn">Общее обсуждение</button>
                  <button className="filter-options">⚙</button>
                </div>

                {/* Posts */}
                {postsLoading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="no-posts">
                    <p>No posts yet. Be the first to post!</p>
                  </div>
                ) : (
                  posts.map((post) => {
                    const authorName =
                      post.author?.name ||
                      `${post.author?.firstName || ""} ${
                        post.author?.lastName || ""
                      }`.trim() ||
                      "Anonymous";
                    const authorInitial = authorName.charAt(0).toUpperCase();
                    const timeAgo = post.createdAt
                      ? Math.floor(
                          (Date.now() - new Date(post.createdAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + "d"
                      : "1d";

                    return (
                      <div key={post._id} className="post-card">
                        <div className="post-header">
                          <div className="post-avatar">{authorInitial}</div>
                          <div className="post-author-info">
                            <h4>{authorName}</h4>
                            <span className="post-meta">
                              {timeAgo}
                              {post.category && ` · ${post.category}`}
                            </span>
                          </div>
                        </div>
                        {post.title && (
                          <h3 className="post-title">{post.title}</h3>
                        )}
                        <div className="post-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              video: ({ node, ...props }) => (
                                <video
                                  {...props}
                                  controls
                                  style={{
                                    width: "100%",
                                    borderRadius: "8px",
                                    margin: "16px 0",
                                  }}
                                />
                              ),
                              audio: ({ node, ...props }) => (
                                <audio
                                  {...props}
                                  controls
                                  style={{ width: "100%", margin: "16px 0" }}
                                />
                              ),
                              img: ({ node, ...props }) => (
                                <img
                                  {...props}
                                  style={{
                                    maxWidth: "100%",
                                    borderRadius: "8px",
                                    margin: "8px 0",
                                  }}
                                  alt={props.alt || "Post image"}
                                />
                              ),
                              a: ({ node, href, children, ...props }) => {
                                // Check if it's a YouTube or Vimeo link
                                const youtubeMatch = href?.match(
                                  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
                                );
                                const vimeoMatch =
                                  href?.match(/vimeo\.com\/(\d+)/);

                                if (youtubeMatch) {
                                  return (
                                    <div
                                      className="video-embed"
                                      style={{
                                        position: "relative",
                                        paddingBottom: "56.25%",
                                        height: 0,
                                        margin: "16px 0",
                                      }}
                                    >
                                      <iframe
                                        src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                                        style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          height: "100%",
                                          borderRadius: "8px",
                                        }}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title="YouTube video"
                                      />
                                    </div>
                                  );
                                }

                                if (vimeoMatch) {
                                  return (
                                    <div
                                      className="video-embed"
                                      style={{
                                        position: "relative",
                                        paddingBottom: "56.25%",
                                        height: 0,
                                        margin: "16px 0",
                                      }}
                                    >
                                      <iframe
                                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                                        style={{
                                          position: "absolute",
                                          top: 0,
                                          left: 0,
                                          width: "100%",
                                          height: "100%",
                                          borderRadius: "8px",
                                        }}
                                        frameBorder="0"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        title="Vimeo video"
                                      />
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                );
                              },
                            }}
                          >
                            {post.content}
                          </ReactMarkdown>
                        </div>
                        {post.image && (
                          <img
                            src={post.image}
                            alt="Post"
                            className="post-image"
                          />
                        )}
                        <div className="post-footer">
                          <button
                            className="post-action"
                            onClick={() => handleLikePost(post._id)}
                          >
                            👍 {post.likes?.length || 0}
                          </button>
                          <button className="post-action">
                            💬 {post.comments?.length || 0}
                          </button>
                          {post.comments?.length > 0 && (
                            <div className="post-commenter">
                              <div className="commenter-avatar">
                                {post.comments[0].author?.name
                                  ?.charAt(0)
                                  .toUpperCase() || "A"}
                              </div>
                              <span>Last comment {timeAgo} ago</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination */}
                <div className="pagination">
                  <button className="page-btn" disabled>
                    ← Previous
                  </button>
                  <button className="page-btn active">1</button>
                  <button className="page-btn" disabled>
                    Next →
                  </button>
                  <span className="page-info">1-1 of 1</span>
                </div>
              </div>
            )}

            {activeTab === "classroom" && (
              <div className="classroom-content">
                {!selectedCourse ? (
                  <div className="courses-grid">
                    {courses.length === 0 ? (
                      <div className="no-courses">
                        <p>No courses yet. Create your first course!</p>
                      </div>
                    ) : (
                      courses.map((course) => {
                        const progress = course.progress || 0;
                        const thumbnail =
                          course.thumbnail ||
                          "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)";
                        const isGradient = thumbnail.includes("gradient");

                        return (
                          <div
                            key={course._id}
                            className="course-card"
                            onClick={() => setSelectedCourse(course)}
                          >
                            <div
                              className="course-thumbnail"
                              style={
                                isGradient
                                  ? { background: thumbnail }
                                  : { backgroundImage: `url(${thumbnail})` }
                              }
                            ></div>
                            <div className="course-info">
                              <h3 className="course-title">{course.title}</h3>
                              <p className="course-description">
                                {course.description}
                              </p>
                              <div className="course-progress">
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="progress-text">
                                  {progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <button
                      className="new-course-btn"
                      onClick={() => setShowAddCourseModal(true)}
                    >
                      <span>+ New course</span>
                    </button>
                  </div>
                ) : (
                  <div className="course-view">
                    <button
                      className="back-to-courses"
                      onClick={() => setSelectedCourse(null)}
                    >
                      ← Back to courses
                    </button>
                    <div className="course-layout">
                      <div className="course-sidebar">
                        <div className="course-summary-card">
                          <div className="course-summary-top">
                            <div>
                              <span className="course-summary-label">
                                Course
                              </span>
                              <h3>{selectedCourse.title}</h3>
                            </div>
                            {isCreator && (
                              <div className="course-summary-actions">
                                <button
                                  className="course-menu-btn"
                                  onClick={() =>
                                    setShowCourseMenu(!showCourseMenu)
                                  }
                                >
                                  ⋮
                                </button>
                                {showCourseMenu && (
                                  <div className="course-dropdown">
                                    <button
                                      className="dropdown-item"
                                      onClick={() => {
                                        setShowCourseMenu(false);
                                        alert("Edit course functionality");
                                      }}
                                    >
                                      Edit course
                                    </button>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => {
                                        handleAddFolder();
                                        setShowCourseMenu(false);
                                      }}
                                    >
                                      Add folder
                                    </button>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => {
                                        if (classroomFolders.length > 0) {
                                          handleAddPageInFolder(
                                            classroomFolders[0].id
                                          );
                                        } else {
                                          alert("Please create a folder first");
                                        }
                                        setShowCourseMenu(false);
                                      }}
                                    >
                                      Add page
                                    </button>
                                    <button
                                      className="dropdown-item delete"
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            "Are you sure you want to delete this course?"
                                          )
                                        ) {
                                          setSelectedCourse(null);
                                        }
                                        setShowCourseMenu(false);
                                      }}
                                    >
                                      Delete course
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="course-summary-progress">
                            <div className="summary-progress-pill">
                              <span className="summary-progress-label">
                                Course progress
                              </span>
                              <div className="summary-progress-track">
                                <div
                                  className="summary-progress-fill"
                                  style={{
                                    width: `${selectedCourse.progress || 0}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="summary-progress-value">
                                {selectedCourse.progress || 0}% complete
                              </span>
                            </div>
                          </div>
                        </div>
                        {isCreator && (
                          <div className="classroom-sidebar-actions">
                            <button
                              className="sidebar-action-btn"
                              onClick={handleQuickAddTask}
                              disabled={!selectedFolderId}
                            >
                              + Task
                            </button>
                            <button
                              className="sidebar-action-btn"
                              onClick={handleAddFolder}
                            >
                              + Folder
                            </button>
                          </div>
                        )}
                        <div className="classroom-folder-list">
                          {classroomLoading && (
                            <div className="classroom-loading">
                              Loading classroom...
                            </div>
                          )}
                          {!classroomLoading && classroomError && (
                            <div className="classroom-error">
                              {classroomError}
                            </div>
                          )}
                          {!classroomLoading &&
                            !classroomError &&
                            classroomFolders.map((folder) => {
                              const pages = folder.pages || [];
                              const totalPages = pages.length;
                              const completedPages = pages.filter(
                                (page) => page.completed
                              ).length;
                              const folderProgress =
                                totalPages === 0
                                  ? 0
                                  : Math.round(
                                      (completedPages / totalPages) * 100
                                    );
                              const isMenuOpen = folderMenuOpenId === folder.id;
                              const isHovered = hoveredFolderId === folder.id;
                              const isActiveFolder =
                                selectedFolderId === folder.id;

                              return (
                                <div
                                  key={folder.id}
                                  className={`classroom-folder ${
                                    isActiveFolder ? "active" : ""
                                  }`}
                                  onMouseEnter={() =>
                                    setHoveredFolderId(folder.id)
                                  }
                                  onMouseLeave={() => setHoveredFolderId(null)}
                                >
                                  <div className="classroom-folder-header">
                                    <button
                                      className="folder-toggle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFolder(folder.id);
                                      }}
                                    >
                                      {folder.expanded ? "▾" : "▸"}
                                    </button>
                                    <div
                                      className="classroom-folder-info"
                                      onClick={() =>
                                        handleSelectFolder(folder.id)
                                      }
                                    >
                                      <div className="folder-title-row">
                                        <span className="folder-title">
                                          {folder.title}
                                        </span>
                                        <span className="folder-count">
                                          {completedPages}/{totalPages}
                                        </span>
                                      </div>
                                      <div className="folder-progress">
                                        <div className="folder-progress-bar">
                                          <div
                                            className="folder-progress-fill"
                                            style={{
                                              width: `${folderProgress}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="folder-progress-value">
                                          {folderProgress}% complete
                                        </span>
                                      </div>
                                    </div>
                                    {isCreator && (
                                      <div className="classroom-folder-actions">
                                        {isHovered && (
                                          <button
                                            className="folder-quick-add"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddPageInFolder(folder.id);
                                            }}
                                          >
                                            + Task
                                          </button>
                                        )}
                                        {!folder.isVirtual && (
                                          <>
                                            <button
                                              className="folder-menu-btn"
                                              onClick={(e) =>
                                                handleFolderMenuToggle(
                                                  e,
                                                  folder.id
                                                )
                                              }
                                            >
                                              ⋯
                                            </button>
                                            {isMenuOpen && (
                                              <div
                                                className="folder-menu"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <button
                                                  onClick={() =>
                                                    handleFolderMenuAction(
                                                      "rename",
                                                      folder.id
                                                    )
                                                  }
                                                >
                                                  Rename folder
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleFolderMenuAction(
                                                      "add-page",
                                                      folder.id
                                                    )
                                                  }
                                                >
                                                  Add page
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleFolderMenuAction(
                                                      "duplicate",
                                                      folder.id
                                                    )
                                                  }
                                                >
                                                  Duplicate
                                                </button>
                                                <button
                                                  className="danger"
                                                  onClick={() =>
                                                    handleFolderMenuAction(
                                                      "delete",
                                                      folder.id
                                                    )
                                                  }
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {folder.expanded && (
                                    <div className="classroom-pages">
                                      {pages.map((page) => (
                                        <button
                                          key={page.id}
                                          className={`classroom-page ${
                                            selectedPageId === page.id
                                              ? "active"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleSelectPage(folder.id, page.id)
                                          }
                                        >
                                          <div className="classroom-page-meta">
                                            <span className="page-check">
                                              {page.completed ? "✓" : "○"}
                                            </span>
                                            <span className="classroom-page-title">
                                              {page.title}
                                            </span>
                                          </div>
                                          <span
                                            className={`classroom-page-status ${
                                              page.published
                                                ? "published"
                                                : "draft"
                                            }`}
                                          >
                                            {page.published
                                              ? "Published"
                                              : "Draft"}
                                          </span>
                                        </button>
                                      ))}
                                      {pages.length === 0 && (
                                        <button
                                          className="classroom-page empty"
                                          onClick={() =>
                                            handleAddPageInFolder(folder.id)
                                          }
                                        >
                                          + Add page
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {!classroomLoading &&
                            !classroomError &&
                            classroomFolders.length === 0 &&
                            isCreator && (
                              <button
                                className="classroom-empty"
                                onClick={handleAddFolder}
                              >
                                + Create your first folder
                              </button>
                            )}
                        </div>
                      </div>
                      <div className="course-content-area">
                        <div className="page-content-card">
                          <div className="page-header-row">
                            <h1 className="page-title-text">
                              {selectedPage?.title || "No page selected"}
                            </h1>
                            {isCreator && selectedPage && !isEditMode && (
                              <div className="page-header-icons">
                                <button
                                  className="page-icon-btn check"
                                  onClick={() => {
                                    // Toggle completion status
                                    showToast("Page marked as complete");
                                  }}
                                  title="Mark as complete"
                                >
                                  ○
                                </button>
                                <button
                                  className="page-icon-btn edit"
                                  onClick={() => setIsEditMode(true)}
                                  title="Edit page"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>

                          {isCreator && isEditMode && selectedPage ? (
                            <div className="page-editor-container">
                              <div className="editor-toolbar">
                                <div className="toolbar-group">
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("h1")}
                                    title="Heading 1"
                                  >
                                    H<sub>1</sub>
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("h2")}
                                    title="Heading 2"
                                  >
                                    H<sub>2</sub>
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("h3")}
                                    title="Heading 3"
                                  >
                                    H<sub>3</sub>
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("h4")}
                                    title="Heading 4"
                                  >
                                    H<sub>4</sub>
                                  </button>
                                </div>
                                <div className="toolbar-divider"></div>
                                <div className="toolbar-group">
                                  <button
                                    className="toolbar-btn bold"
                                    onClick={() => applyFormatting("bold")}
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    className="toolbar-btn italic"
                                    onClick={() => applyFormatting("italic")}
                                    title="Italic"
                                  >
                                    <em>I</em>
                                  </button>
                                  <button
                                    className="toolbar-btn strikethrough"
                                    onClick={() =>
                                      applyFormatting("strikethrough")
                                    }
                                    title="Strikethrough"
                                  >
                                    <s>S</s>
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("code")}
                                    title="Code"
                                  >
                                    &lt;&gt;
                                  </button>
                                </div>
                                <div className="toolbar-divider"></div>
                                <div className="toolbar-group">
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("list")}
                                    title="Bullet List"
                                  >
                                    ☰
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("numbered")}
                                    title="Numbered List"
                                  >
                                    ≡
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("quote")}
                                    title="Quote"
                                  >
                                    ❝
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("embed")}
                                    title="Embed"
                                  >
                                    ⧉
                                  </button>
                                </div>
                                <div className="toolbar-divider"></div>
                                <div className="toolbar-group">
                                  {/* Hidden file inputs */}
                                  <input
                                    type="file"
                                    ref={imageInputRef}
                                    hidden
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files[0]) {
                                        handleFileUpload(
                                          e.target.files[0],
                                          "image"
                                        );
                                        e.target.value = "";
                                      }
                                    }}
                                  />
                                  <input
                                    type="file"
                                    ref={videoInputRef}
                                    hidden
                                    accept="video/*,audio/*"
                                    onChange={(e) => {
                                      if (e.target.files[0]) {
                                        handleFileUpload(
                                          e.target.files[0],
                                          "video"
                                        );
                                        e.target.value = "";
                                      }
                                    }}
                                  />

                                  {/* Image button with dropdown */}
                                  <div className="toolbar-dropdown-container">
                                    <button
                                      className="toolbar-btn"
                                      onClick={() =>
                                        setShowImageMenu(!showImageMenu)
                                      }
                                      title="Image"
                                    >
                                      🖼
                                    </button>
                                    {showImageMenu && (
                                      <div className="toolbar-dropdown-menu">
                                        <button
                                          className="dropdown-item"
                                          onClick={() => {
                                            imageInputRef.current?.click();
                                            setShowImageMenu(false);
                                          }}
                                        >
                                          📁 Upload from Computer
                                        </button>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => {
                                            applyFormatting("image");
                                            setShowImageMenu(false);
                                          }}
                                        >
                                          🔗 Insert URL
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("link")}
                                    title="Link"
                                  >
                                    🔗
                                  </button>
                                  <button
                                    className="toolbar-btn"
                                    onClick={() => applyFormatting("divider")}
                                    title="Divider"
                                  >
                                    —
                                  </button>

                                  {/* Video button with dropdown */}
                                  <div className="toolbar-dropdown-container">
                                    <button
                                      className="toolbar-btn"
                                      onClick={() =>
                                        setShowVideoMenu(!showVideoMenu)
                                      }
                                      title="Video"
                                    >
                                      ▶
                                    </button>
                                    {showVideoMenu && (
                                      <div className="toolbar-dropdown-menu">
                                        <button
                                          className="dropdown-item"
                                          onClick={() => {
                                            videoInputRef.current?.click();
                                            setShowVideoMenu(false);
                                          }}
                                        >
                                          📁 Upload from Computer
                                        </button>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => {
                                            applyFormatting("video");
                                            setShowVideoMenu(false);
                                          }}
                                        >
                                          🔗 Insert URL (YouTube/Vimeo)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Upload progress indicator */}
                              {isUploading && (
                                <div className="upload-progress-bar">
                                  <div className="upload-progress-text">
                                    📤 Uploading... {uploadProgress}%
                                  </div>
                                  <div className="upload-progress-track">
                                    <div
                                      className="upload-progress-fill"
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              <div className="editor-title-section">
                                <h2 className="editor-page-title">
                                  {selectedPage?.title}
                                </h2>
                              </div>

                              <div className="editor-split-view">
                                <div className="editor-write-panel">
                                  <div className="panel-header">✍️ Write</div>
                                  <textarea
                                    className="page-textarea"
                                    placeholder="Start writing... Use # for H1, ## for H2, **bold**, *italic*"
                                    value={pageDraft}
                                    onChange={(e) =>
                                      setPageDraft(e.target.value)
                                    }
                                  ></textarea>
                                </div>
                                <div className="editor-preview-panel">
                                  <div className="panel-header">👁️ Preview</div>
                                  <div className="preview-content markdown-content">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                        a: ({
                                          node,
                                          children,
                                          href,
                                          ...props
                                        }) => {
                                          // Check for local video files
                                          if (
                                            href &&
                                            (href.includes(
                                              "/uploads/videos/"
                                            ) ||
                                              href.match(
                                                /\.(mp4|webm|ogg|mov)$/i
                                              ))
                                          ) {
                                            return (
                                              <div className="video-player-container">
                                                <video
                                                  controls
                                                  style={{
                                                    width: "100%",
                                                    maxHeight: "400px",
                                                    borderRadius: "8px",
                                                    backgroundColor: "#000",
                                                  }}
                                                >
                                                  <source
                                                    src={href}
                                                    type="video/mp4"
                                                  />
                                                  Your browser does not support
                                                  the video tag.
                                                </video>
                                              </div>
                                            );
                                          }
                                          // Check for local audio files
                                          if (
                                            href &&
                                            (href.includes(
                                              "/uploads/videos/"
                                            ) ||
                                              href.match(
                                                /\.(mp3|wav|ogg|m4a)$/i
                                              ))
                                          ) {
                                            return (
                                              <div className="audio-player-container">
                                                <audio
                                                  controls
                                                  style={{
                                                    width: "100%",
                                                    borderRadius: "8px",
                                                  }}
                                                >
                                                  <source src={href} />
                                                  Your browser does not support
                                                  the audio tag.
                                                </audio>
                                              </div>
                                            );
                                          }
                                          // Check for YouTube/Vimeo embeds
                                          if (
                                            href &&
                                            (href.includes("youtube.com") ||
                                              href.includes("youtu.be") ||
                                              href.includes("vimeo.com"))
                                          ) {
                                            let embedUrl = href;
                                            if (
                                              href.includes("youtube.com/watch")
                                            ) {
                                              const videoId = new URL(
                                                href
                                              ).searchParams.get("v");
                                              embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                            } else if (
                                              href.includes("youtu.be")
                                            ) {
                                              const videoId = href
                                                .split("/")
                                                .pop();
                                              embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                            }
                                            return (
                                              <div className="video-embed">
                                                <iframe
                                                  src={embedUrl}
                                                  title="Video"
                                                  frameBorder="0"
                                                  allowFullScreen
                                                  style={{
                                                    width: "100%",
                                                    height: "300px",
                                                    borderRadius: "8px",
                                                  }}
                                                />
                                              </div>
                                            );
                                          }
                                          return (
                                            <a
                                              href={href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              {...props}
                                            >
                                              {children}
                                            </a>
                                          );
                                        },
                                        img: ({ node, ...props }) => (
                                          <img
                                            {...props}
                                            alt={props.alt || "Image"}
                                            style={{
                                              maxWidth: "100%",
                                              borderRadius: "8px",
                                              margin: "8px 0",
                                            }}
                                          />
                                        ),
                                      }}
                                    >
                                      {pageDraft ||
                                        "*Start typing to see preview...*"}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>

                              <div className="editor-footer">
                                <div className="editor-footer-left">
                                  <div className="add-dropdown-container">
                                    <button
                                      className="add-dropdown-btn"
                                      onClick={() =>
                                        setCourseMenuOpen(!courseMenuOpen)
                                      }
                                    >
                                      ADD{" "}
                                      <span className="dropdown-arrow">▾</span>
                                    </button>
                                    {courseMenuOpen && (
                                      <div className="add-dropdown-menu">
                                        <button
                                          onClick={() => {
                                            handleAddPageInFolder(
                                              selectedFolderId
                                            );
                                            setCourseMenuOpen(false);
                                          }}
                                        >
                                          Add page
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleAddFolder();
                                            setCourseMenuOpen(false);
                                          }}
                                        >
                                          Add folder
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="editor-footer-right">
                                  <div className="publish-toggle-inline">
                                    <span
                                      className={`published-text ${
                                        pagePublished ? "published" : "draft"
                                      }`}
                                    >
                                      {pagePublished ? "Published" : "Draft"}
                                    </span>
                                    <label className="toggle-switch">
                                      <input
                                        type="checkbox"
                                        checked={pagePublished}
                                        onChange={(e) =>
                                          setPagePublished(e.target.checked)
                                        }
                                      />
                                      <span className="toggle-slider"></span>
                                    </label>
                                  </div>
                                  <button
                                    className="cancel-btn"
                                    onClick={handleCancelEdit}
                                  >
                                    CANCEL
                                  </button>
                                  <button
                                    className="save-btn"
                                    onClick={handleSavePage}
                                  >
                                    SAVE
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : selectedPage ? (
                            <div
                              className="page-content-view markdown-content"
                              onClick={() => isCreator && setIsEditMode(true)}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  // Custom video renderer for video links
                                  a: ({ node, children, href, ...props }) => {
                                    // Check if it's a video link
                                    if (
                                      href &&
                                      (href.includes("youtube.com") ||
                                        href.includes("youtu.be") ||
                                        href.includes("vimeo.com"))
                                    ) {
                                      let embedUrl = href;
                                      if (href.includes("youtube.com/watch")) {
                                        const videoId = new URL(
                                          href
                                        ).searchParams.get("v");
                                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                      } else if (href.includes("youtu.be")) {
                                        const videoId = href.split("/").pop();
                                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                      }
                                      return (
                                        <div className="video-embed">
                                          <iframe
                                            src={embedUrl}
                                            title="Video"
                                            frameBorder="0"
                                            allowFullScreen
                                            style={{
                                              width: "100%",
                                              height: "400px",
                                              borderRadius: "8px",
                                            }}
                                          />
                                        </div>
                                      );
                                    }
                                    return (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        {...props}
                                      >
                                        {children}
                                      </a>
                                    );
                                  },
                                  img: ({ node, ...props }) => (
                                    <img
                                      {...props}
                                      alt={props.alt || "Image"}
                                      style={{
                                        maxWidth: "100%",
                                        borderRadius: "8px",
                                        margin: "16px 0",
                                      }}
                                    />
                                  ),
                                }}
                              >
                                {selectedPage.content ||
                                  "Click to edit page content..."}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="page-empty-state">
                              <h2>No page selected</h2>
                              <p>Select a page to view or edit.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="calendar-content">
                <div className="calendar-header">
                  <button className="calendar-nav-btn">←</button>
                  <div className="calendar-title">
                    <h2>
                      {new Date().toLocaleString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h2>
                    <p className="calendar-time">
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}{" "}
                      Local time
                    </p>
                  </div>
                  <button className="calendar-nav-btn">→</button>
                  <div className="calendar-controls">
                    <button className="calendar-control-btn">Today</button>
                    <button className="calendar-control-btn">+</button>
                    <button className="calendar-control-btn">≡</button>
                    <button className="calendar-control-btn">📅</button>
                  </div>
                </div>
                <div className="calendar-grid">
                  <div className="calendar-weekdays">
                    <div className="weekday">Mon</div>
                    <div className="weekday">Tue</div>
                    <div className="weekday">Wed</div>
                    <div className="weekday">Thu</div>
                    <div className="weekday">Fri</div>
                    <div className="weekday">Sat</div>
                    <div className="weekday">Sun</div>
                  </div>
                  <div className="calendar-days">
                    {(() => {
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = now.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(
                        year,
                        month + 1,
                        0
                      ).getDate();
                      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                      const days = [];

                      for (let i = 0; i < 35; i++) {
                        const dayNum = i - startOffset + 1;
                        const isCurrentMonth =
                          dayNum >= 1 && dayNum <= daysInMonth;
                        const displayNum = isCurrentMonth
                          ? dayNum
                          : dayNum < 1
                          ? new Date(year, month, dayNum).getDate()
                          : dayNum - daysInMonth;
                        const isToday =
                          isCurrentMonth && dayNum === now.getDate();

                        // Find events for this day
                        const dayEvents = isCurrentMonth
                          ? events.filter((event) => {
                              const eventDate = new Date(event.startTime);
                              return (
                                eventDate.getDate() === dayNum &&
                                eventDate.getMonth() === month &&
                                eventDate.getFullYear() === year
                              );
                            })
                          : [];

                        days.push(
                          <div
                            key={i}
                            className={`calendar-day ${
                              !isCurrentMonth ? "other-month" : ""
                            } ${isToday ? "today" : ""}`}
                          >
                            <div className="day-number">{displayNum}</div>
                            {dayEvents.map((event) => (
                              <div key={event._id} className="day-event">
                                {new Date(event.startTime).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}{" "}
                                - {event.title.substring(0, 15)}
                                {event.title.length > 15 ? "..." : ""}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "members" && (
              <div className="members-content">
                <div className="members-header">
                  <h2>Members ({memberCount})</h2>
                  <input
                    type="text"
                    placeholder="Search members..."
                    className="search-members"
                  />
                </div>
                <div className="members-list">
                  {community.members?.map((member, index) => (
                    <div key={index} className="member-item">
                      <div className="member-avatar">
                        {member.user?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="member-info">
                        <h4>{member.user?.name || "Unknown"}</h4>
                        <span className="member-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "leaderboard" && (
              <div className="leaderboard-content">
                <div className="leaderboard-header">
                  <h2>Leaderboard</h2>
                  <select className="time-filter">
                    <option>All Time</option>
                    <option>This Month</option>
                    <option>This Week</option>
                  </select>
                </div>
                <div className="leaderboard-empty">
                  <Trophy size={48} className="trophy-icon" />
                  <p>No leaderboard data yet</p>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="about-content">
                <div className="about-header">
                  <Info size={24} className="info-icon" />
                  <h2>About {community.name}</h2>
                </div>

                <div className="about-description">
                  <h3>Welcome to our community!</h3>
                  <p>{community.description}</p>
                </div>

                <div className="about-stats">
                  <div className="stat-card">
                    <Users size={32} className="stat-icon blue" />
                    <div className="stat-info">
                      <h3>{memberCount}</h3>
                      <p>Total Members</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <Calendar size={32} className="stat-icon green" />
                    <div className="stat-info">
                      <h3>November 2025</h3>
                      <p>Founded</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <Trophy size={32} className="stat-icon purple" />
                    <div className="stat-info">
                      <h3>{community.category}</h3>
                      <p>Category</p>
                    </div>
                  </div>

                  <div className="stat-card">
                    <MessageSquare size={32} className="stat-icon blue" />
                    <div className="stat-info">
                      <h3>Free</h3>
                      <p>Membership</p>
                    </div>
                  </div>
                </div>

                <div className="welcome-message">
                  <h3>Welcome Message</h3>
                  <div className="welcome-box">
                    <p>Welcome! 👋</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="community-sidebar">
          <div className="sidebar-card">
            <div
              className="card-cover"
              style={{
                backgroundImage: community.thumbnail
                  ? `url(${community.thumbnail})`
                  : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              }}
            />
            <div className="card-content">
              <div className="card-logo">
                {community.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="card-title">{community.name}</h3>
              <p className="card-url">skool.com/{community.slug}</p>

              <p className="card-date">
                {new Date(community.createdAt).getFullYear()}
              </p>

              <div className="card-stats">
                <div className="stat">
                  <div className="stat-value">{memberCount}</div>
                  <div className="stat-label">Members</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{onlineCount}</div>
                  <div className="stat-label">Online</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{adminCount}</div>
                  <div className="stat-label">Admin</div>
                </div>
              </div>

              <button
                className="btn-settings-sidebar"
                style={{
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                }}
                onClick={() => {
                  console.log("Settings clicked, isCreator:", isCreator);
                  setShowSettingsModal(true);
                }}
              >
                SETTINGS
              </button>

              {!isMember && (
                <button className="btn-invite" onClick={handleJoin}>
                  INVITE PEOPLE
                </button>
              )}
            </div>
          </div>

          <div className="suggested-section">
            <h4>Suggested communities</h4>
            <div className="suggested-list">
              <div className="suggested-item">
                <div className="suggested-avatar purple">S</div>
                <span>Skoolers</span>
              </div>
              <div className="suggested-item">
                <div className="suggested-avatar purple">S</div>
                <span>School of Mentors</span>
              </div>
              <div className="suggested-item">
                <div className="suggested-avatar purple">A</div>
                <span>ANIME SHREDS</span>
              </div>
              <div className="suggested-item">
                <div className="suggested-avatar purple">D</div>
                <span>Dating With Gracie</span>
              </div>
              <div className="suggested-item">
                <div className="suggested-avatar purple">T</div>
                <span>Trading For Women</span>
              </div>
            </div>
            <button
              className="btn-build"
              onClick={() => navigate("/create-community")}
            >
              Build your own community
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="settings-modal-overlay"
          onClick={() => setShowSettingsModal(false)}
        >
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <div className="settings-logo">
                  {community.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2>{community.name}</h2>
                  <p>Group settings</p>
                </div>
              </div>
              <button
                className="settings-close"
                onClick={() => setShowSettingsModal(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-modal-body">
              <div
                className="settings-sidebar"
                style={{ background: "#ffffff" }}
              >
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "dashboard" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("dashboard")}
                >
                  Dashboard
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "invite" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("invite")}
                >
                  Invite
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "general" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("general")}
                >
                  General
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "payouts" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("payouts")}
                >
                  Payouts
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "pricing" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("pricing")}
                >
                  Pricing
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "affiliates" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("affiliates")}
                >
                  Affiliates
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "plugins" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("plugins")}
                >
                  Tabs
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "categories" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("categories")}
                >
                  Categories
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "rules" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("rules")}
                >
                  Rules
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "discovery" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("discovery")}
                >
                  Discovery
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "metrics" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("metrics")}
                >
                  Metrics
                </button>
                <button
                  className={`settings-menu-item ${
                    activeSettingsTab === "billing" ? "active" : ""
                  }`}
                  onClick={() => setActiveSettingsTab("billing")}
                >
                  Billing
                </button>
              </div>

              <div className="settings-content">
                {activeSettingsTab === "dashboard" && (
                  <div className="dashboard-content">
                    <div className="dashboard-greeting">
                      <h1>🎉 Happy Saturday, Yerkhulan</h1>
                      <span className="last-updated">
                        Last updated just now
                      </span>
                      <button className="refresh-btn">🔄</button>
                    </div>

                    <div className="dashboard-section">
                      <h3>Community Stats</h3>
                      <div className="dashboard-stats-grid">
                        <div className="dashboard-stat-card">
                          <div className="stat-number">{memberCount}</div>
                          <div className="stat-label">Total members</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">{posts.length}</div>
                          <div className="stat-label">Total posts</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">{courses.length}</div>
                          <div className="stat-label">Courses</div>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-section">
                      <h3>Subscriptions</h3>
                      <div className="dashboard-stats-grid">
                        <div className="dashboard-stat-card">
                          <div className="stat-number">0</div>
                          <div className="stat-label">Paid members</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">
                            ${(community.pricingAmount || 0).toFixed(2)}
                          </div>
                          <div className="stat-label">Price/month</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">
                            ${(community.accountBalance || 0).toFixed(2)}
                          </div>
                          <div className="stat-label">Account balance</div>
                        </div>
                      </div>
                    </div>

                    <div className="dashboard-section">
                      <h3>Other</h3>
                      <div className="dashboard-stats-grid">
                        <div className="dashboard-stat-card">
                          <div className="stat-number">$0</div>
                          <div className="stat-label">1-time sales</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">0</div>
                          <div className="stat-label">Trials in progress</div>
                        </div>
                        <div className="dashboard-stat-card">
                          <div className="stat-number">0.00%</div>
                          <div className="stat-label">
                            Trial conversion rate
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "general" && (
                  <div className="settings-form">
                    <div className="media-upload-section">
                      <div className="media-item">
                        <div className="media-preview icon-preview">
                          <img src={community.icon || ""} alt="Icon" />
                        </div>
                        <div className="media-info">
                          <h4>Icon</h4>
                          <p className="media-recommended">
                            Recommended: 128x128
                          </p>
                          <button className="btn-change">CHANGE</button>
                        </div>
                      </div>
                      <div className="media-item">
                        <div className="media-preview cover-preview">
                          <span className="community-name-large">
                            {community.name}
                          </span>
                        </div>
                        <div className="media-info">
                          <h4>Cover</h4>
                          <p className="media-recommended">
                            Recommended: 1084x576
                          </p>
                          <button className="btn-change">CHANGE</button>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Group name</label>
                      <input
                        type="text"
                        value={community.name}
                        onChange={(e) =>
                          setCommunity({ ...community, name: e.target.value })
                        }
                        className="settings-input"
                        maxLength="30"
                      />
                      <span className="char-count">8 / 30</span>
                    </div>

                    <div className="form-group">
                      <label>Group description</label>
                      <textarea
                        value={community.description || ""}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            description: e.target.value,
                          })
                        }
                        className="settings-textarea"
                        rows="3"
                        maxLength="150"
                      />
                      <span className="char-count">4 / 150</span>
                    </div>

                    <div className="custom-url-box">
                      <div className="url-icon">✨</div>
                      <div className="url-content">
                        <h4>Stand out with a custom URL</h4>
                        <p className="url-link">skool.com/{community.slug}</p>
                      </div>
                      <button className="btn-change-url">CHANGE URL</button>
                    </div>

                    <div className="privacy-section">
                      <label className="radio-option-large">
                        <input
                          type="radio"
                          name="privacy"
                          value="private"
                          checked={community.isPrivate === true}
                          onChange={(e) =>
                            setCommunity({ ...community, isPrivate: true })
                          }
                        />
                        <div className="radio-content-large">
                          <div className="radio-header">
                            <span className="lock-icon">🔒</span>
                            <span className="radio-title">Private</span>
                          </div>
                          <p className="radio-description">
                            Only members can see who's in the group and what
                            they post. Content is hidden from search engines.
                          </p>
                        </div>
                      </label>
                      <label className="radio-option-large">
                        <input
                          type="radio"
                          name="privacy"
                          value="public"
                          checked={community.isPrivate === false}
                          onChange={(e) =>
                            setCommunity({ ...community, isPrivate: false })
                          }
                        />
                        <div className="radio-content-large">
                          <div className="radio-header">
                            <span className="lock-icon">🌐</span>
                            <span className="radio-title">Public</span>
                          </div>
                          <p className="radio-description">
                            Anyone can see who's in the group and what they
                            post. Content is discoverable by search engines.
                          </p>
                        </div>
                      </label>
                    </div>
                    <button
                      className="btn-save-settings"
                      onClick={handleSaveGeneralSettings}
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSettingsTab === "invite" && (
                  <div className="settings-form">
                    <h2>Share your group link</h2>
                    <p>
                      This will take people to your group's About page where
                      they can purchase or request membership.
                    </p>

                    <div className="invite-link-box-large">
                      <input
                        type="text"
                        value={`https://www.skool.com/${community.slug}/about`}
                        readOnly
                        className="invite-link-input-large"
                      />
                      <button
                        className="btn-copy-large"
                        onClick={handleCopyInviteLink}
                      >
                        COPY
                      </button>
                    </div>

                    <h3 className="section-subtitle">
                      These invite methods will grant instant access without
                      purchasing or requesting membership.
                    </h3>

                    <div className="email-invite-box">
                      <input
                        type="email"
                        placeholder="Email address"
                        className="email-invite-input"
                      />
                      <button className="btn-send">SEND</button>
                    </div>
                    <p className="course-access-note">
                      This member will have access to{" "}
                      <a href="#">(1/5 courses)</a>.
                    </p>

                    <div className="integration-item">
                      <div className="integration-icon csv-icon">📊</div>
                      <div className="integration-content">
                        <h4>Import .CSV file</h4>
                        <p>
                          Invite members in bulk by uploading a .CSV file of
                          email addresses.
                        </p>
                      </div>
                      <button className="btn-import">IMPORT</button>
                    </div>

                    <div className="integration-item">
                      <div className="integration-icon zapier-icon">⚡</div>
                      <div className="integration-content">
                        <h4>Zapier integration</h4>
                        <p>
                          Invite members by connecting Skool to over 500 tools
                          using Zapier.
                        </p>
                      </div>
                      <button className="btn-integrate">INTEGRATE</button>
                    </div>

                    <p className="pending-invites">See 3 pending invites</p>
                  </div>
                )}

                {activeSettingsTab === "payouts" && (
                  <div className="settings-form">
                    <div className="payouts-header">
                      <h2>Payouts</h2>
                      <button className="btn-settings-icon">⚙️</button>
                    </div>

                    <div className="payouts-grid">
                      <div className="payout-card">
                        <div className="payout-amount">
                          ${(community.accountBalance || 0).toFixed(2)}
                        </div>
                        <div className="payout-label">Account balance</div>
                      </div>
                      <div className="payout-info">
                        <div className="payout-next">
                          Next payout will be $
                          {(community.accountBalance || 0).toFixed(2)} in 2 days
                        </div>
                        <div className="payout-pending">$0 is pending</div>
                      </div>
                    </div>

                    {community.stripeAccountId ? (
                      <div className="stripe-connected">
                        ✓ Stripe account connected
                      </div>
                    ) : (
                      <div className="no-payouts">
                        <p>Connect Stripe to receive payouts</p>
                        <button className="btn-save-settings">
                          Connect Stripe
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeSettingsTab === "pricing" && (
                  <div className="settings-form">
                    <h2>Pricing</h2>
                    <p>Set up paid memberships for your community</p>

                    <div className="form-group">
                      <label>Pricing Model</label>
                      <select
                        className="settings-select"
                        value={community.pricingModel || "free"}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            pricingModel: e.target.value,
                          })
                        }
                      >
                        <option value="free">Free</option>
                        <option value="subscription">Subscription</option>
                        <option value="freemium">Freemium</option>
                        <option value="tiers">Tiers</option>
                        <option value="one-time">One-time Payment</option>
                      </select>
                    </div>

                    {community.pricingModel !== "free" && (
                      <>
                        <div className="form-group">
                          <label>Price Amount ($)</label>
                          <input
                            type="number"
                            className="settings-input"
                            placeholder="59"
                            value={community.pricingAmount || 0}
                            onChange={(e) =>
                              setCommunity({
                                ...community,
                                pricingAmount: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={community.hasTrial || false}
                              onChange={(e) =>
                                setCommunity({
                                  ...community,
                                  hasTrial: e.target.checked,
                                })
                              }
                            />{" "}
                            Offer Free Trial
                          </label>
                        </div>

                        {community.hasTrial && (
                          <div className="form-group">
                            <label>Trial Duration (days)</label>
                            <input
                              type="number"
                              className="settings-input"
                              placeholder="7"
                              value={community.trialDays || 7}
                              onChange={(e) =>
                                setCommunity({
                                  ...community,
                                  trialDays: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                        )}
                      </>
                    )}

                    <button
                      className="btn-save-settings"
                      onClick={handleSavePricingSettings}
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSettingsTab === "members" && (
                  <div className="settings-form">
                    <h2>Members ({memberCount})</h2>
                    <div className="members-list">
                      {community.members?.map((member, index) => (
                        <div key={index} className="member-item">
                          <div className="member-avatar">
                            {member.user?.firstName?.[0] || "M"}
                          </div>
                          <div className="member-info">
                            <span className="member-name">
                              {member.user?.firstName || "Member"}{" "}
                              {member.user?.lastName || ""}
                            </span>
                            <span className="member-email">
                              {member.user?.email || "No email"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSettingsTab === "discovery" && (
                  <div className="settings-form">
                    <h2>Discovery Settings</h2>
                    <p>
                      Control how your community appears in Skool's discovery
                    </p>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={community.showInDiscovery || false}
                          onChange={(e) =>
                            setCommunity({
                              ...community,
                              showInDiscovery: e.target.checked,
                            })
                          }
                        />{" "}
                        Show in discovery
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="settings-select"
                        value={community.category || "other"}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            category: e.target.value,
                          })
                        }
                      >
                        <option value="Business">Business</option>
                        <option value="Technology">Technology</option>
                        <option value="Health & Fitness">
                          Health & Fitness
                        </option>
                        <option value="Creative Arts">Creative Arts</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      className="btn-save-settings"
                      onClick={handleSaveDiscoverySettings}
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSettingsTab === "affiliates" && (
                  <div className="settings-form">
                    <h2>Affiliates</h2>
                    <p>Set up an affiliate program for your community</p>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={community.affiliatesEnabled || false}
                          onChange={(e) =>
                            setCommunity({
                              ...community,
                              affiliatesEnabled: e.target.checked,
                            })
                          }
                        />{" "}
                        Enable Affiliate Program
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Commission Rate (%)</label>
                      <input
                        type="number"
                        className="settings-input"
                        placeholder="10"
                        value={community.affiliateCommissionRate || 10}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            affiliateCommissionRate: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Cookie Duration (days)</label>
                      <input
                        type="number"
                        className="settings-input"
                        placeholder="30"
                        value={community.affiliateCookieDuration || 30}
                        onChange={(e) =>
                          setCommunity({
                            ...community,
                            affiliateCookieDuration: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <button
                      className="btn-save-settings"
                      onClick={handleSaveAffiliatesSettings}
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSettingsTab === "plugins" && (
                  <div className="settings-form">
                    <h2>Plugins</h2>
                    <p>Integrate third-party tools and services</p>
                    <div className="plugins-grid">
                      <div className="plugin-card">
                        <h3>Zapier</h3>
                        <p>Automate workflows</p>
                        <button className="btn-plugin">Connect</button>
                      </div>
                      <div className="plugin-card">
                        <h3>Google Analytics</h3>
                        <p>Track community metrics</p>
                        <button className="btn-plugin">Connect</button>
                      </div>
                      <div className="plugin-card">
                        <h3>Mailchimp</h3>
                        <p>Email marketing integration</p>
                        <button className="btn-plugin">Connect</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "tabs" && (
                  <div className="settings-form">
                    <h2>Custom Tabs</h2>
                    <p>Add custom navigation tabs to your community</p>
                    <button className="btn-add-tab">+ Add Custom Tab</button>
                    <div className="tabs-list">
                      <p className="empty-state">No custom tabs yet</p>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "categories" && (
                  <div className="settings-form">
                    <h2>Post Categories</h2>
                    <p>Organize posts with custom categories</p>
                    <button className="btn-add-category">+ Add Category</button>
                    <div className="categories-list">
                      <div className="category-item">
                        <span>General Discussion</span>
                        <button className="btn-edit">Edit</button>
                      </div>
                      <div className="category-item">
                        <span>Announcements</span>
                        <button className="btn-edit">Edit</button>
                      </div>
                      <div className="category-item">
                        <span>Questions</span>
                        <button className="btn-edit">Edit</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "rules" && (
                  <div className="settings-form">
                    <h2>Community Rules</h2>
                    <p>Set guidelines and rules for your members</p>
                    <div className="form-group">
                      <label>Rules</label>
                      <textarea
                        className="settings-textarea"
                        rows={10}
                        placeholder="1. Be respectful&#10;2. No spam&#10;3. Stay on topic"
                        value={community.rules || ""}
                        onChange={(e) =>
                          setCommunity({ ...community, rules: e.target.value })
                        }
                      />
                    </div>
                    <button
                      className="btn-save-settings"
                      onClick={handleSaveRulesSettings}
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {activeSettingsTab === "metrics" && (
                  <div className="settings-form">
                    <h2>Analytics & Metrics</h2>
                    <p>Track your community's performance</p>
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <h3>Total Members</h3>
                        <p className="metric-value">{memberCount}</p>
                      </div>
                      <div className="metric-card">
                        <h3>Total Posts</h3>
                        <p className="metric-value">{posts.length}</p>
                      </div>
                      <div className="metric-card">
                        <h3>Total Courses</h3>
                        <p className="metric-value">{courses.length}</p>
                      </div>
                      <div className="metric-card">
                        <h3>Total Events</h3>
                        <p className="metric-value">{events.length}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "billing" && (
                  <div className="settings-form">
                    <h2>Billing</h2>
                    <p>Manage your subscription and payment methods</p>
                    <div className="billing-info">
                      <div className="billing-section">
                        <h3>Current Plan</h3>
                        <p>Free Plan</p>
                        <button className="btn-upgrade">Upgrade Plan</button>
                      </div>
                      <div className="billing-section">
                        <h3>Payment Method</h3>
                        <p>No payment method on file</p>
                        <button className="btn-add-payment">
                          Add Payment Method
                        </button>
                      </div>
                      <div className="billing-section">
                        <h3>Billing History</h3>
                        <p className="empty-state">No transactions yet</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div
          className="add-course-modal-overlay"
          onClick={() => setShowAddCourseModal(false)}
        >
          <div
            className="add-course-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add course</h2>
              <button className="import-link" type="button">
                Import with key
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Course name"
                  value={newCourse.name}
                  onChange={(e) => {
                    if (e.target.value.length <= 50) {
                      setNewCourse({ ...newCourse, name: e.target.value });
                    }
                  }}
                  className="course-input"
                />
                <div className="char-counter">{newCourse.name.length} / 50</div>
              </div>

              <div className="form-group">
                <textarea
                  placeholder="Course description"
                  value={newCourse.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setNewCourse({
                        ...newCourse,
                        description: e.target.value,
                      });
                    }
                  }}
                  className="course-textarea"
                  rows={4}
                />
                <div className="char-counter">
                  {newCourse.description.length} / 500
                </div>
              </div>

              <div className="form-group">
                <label className="section-label">Access type</label>
                <div className="access-type-options">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="accessType"
                      value="open"
                      checked={newCourse.accessType === "open"}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          accessType: e.target.value,
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title">Open</span>
                      <span className="radio-description">
                        All members can access
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="accessType"
                      value="level"
                      checked={newCourse.accessType === "level"}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          accessType: e.target.value,
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title">Level unlock</span>
                      <span className="radio-description">
                        Members unlock at a specific level
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="accessType"
                      value="buy"
                      checked={newCourse.accessType === "buy"}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          accessType: e.target.value,
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title">Buy now</span>
                      <span className="radio-description">
                        Members pay a 1-time price to unlock
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="accessType"
                      value="time"
                      checked={newCourse.accessType === "time"}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          accessType: e.target.value,
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title">Time unlock</span>
                      <span className="radio-description">
                        Members unlock after x days
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="accessType"
                      value="private"
                      checked={newCourse.accessType === "private"}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          accessType: e.target.value,
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title">Private</span>
                      <span className="radio-description">
                        Members on a tier or specific members
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="section-label">Cover</label>
                <div className="cover-upload">
                  {newCourse.coverImage ? (
                    <img
                      src={newCourse.coverImage}
                      alt="Cover preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        marginBottom: "10px",
                      }}
                    />
                  ) : (
                    <span className="cover-dimensions">1460 x 752 px</span>
                  )}
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {newCourse.coverImage ? "Change" : "Upload"}
                  </button>
                </div>
              </div>

              <div className="form-group published-toggle">
                <label className="section-label">Published</label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={newCourse.published}
                    onChange={(e) =>
                      setNewCourse({
                        ...newCourse,
                        published: e.target.checked,
                      })
                    }
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowAddCourseModal(false)}
              >
                CANCEL
              </button>
              <button className="add-btn" onClick={handleCreateCourse}>
                ADD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {showAddFolderModal && (
        <div
          className="add-folder-modal-overlay"
          onClick={() => setShowAddFolderModal(false)}
        >
          <div
            className="add-folder-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add folder</h2>

            <div className="form-group">
              <input
                type="text"
                placeholder="Name"
                value={newFolderName}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setNewFolderName(e.target.value);
                  }
                }}
                className="folder-name-input"
                autoFocus
              />
              <div className="char-counter">{newFolderName.length} / 50</div>
            </div>

            <div className="folder-modal-footer">
              <div className="published-toggle-inline">
                <span className="published-label">Published</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={newFolderPublished}
                    onChange={(e) => setNewFolderPublished(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="folder-modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowAddFolderModal(false)}
                >
                  CANCEL
                </button>
                <button
                  className="add-btn"
                  onClick={handleCreateFolderSubmit}
                  disabled={!newFolderName.trim()}
                >
                  ADD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDetail;

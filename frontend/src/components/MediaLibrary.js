import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Image,
  Video,
  Music,
  Trash2,
  Copy,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";

const MediaLibrary = ({ isOpen, onClose, onSelect, darkMode = false }) => {
  const { getToken } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewFile, setPreviewFile] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/local-upload/my-files`,
        {
          params: {
            type: filter === "all" ? undefined : filter,
            page,
            limit: 12,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFiles(response.data.files);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filter, page]);

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      setDeleting(fileId);
      const token = await getToken();
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/local-upload/file/${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFiles(files.filter((f) => f._id !== fileId));
      if (previewFile?._id === fileId) setPreviewFile(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = async (url) => {
    const fullUrl = url.startsWith("http")
      ? url
      : `${window.location.origin.replace(":3000", ":5000")}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelect = (file) => {
    if (onSelect) {
      onSelect(file);
      onClose();
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "image":
        return <Image className="text-green-500" size={24} />;
      case "video":
        return <Video className="text-blue-500" size={24} />;
      case "audio":
        return <Music className="text-purple-500" size={24} />;
      default:
        return <Image className="text-gray-500" size={24} />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <h2
            className={`text-xl font-bold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Media Library
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            <X
              className={darkMode ? "text-white" : "text-gray-600"}
              size={24}
            />
          </button>
        </div>

        {/* Filters */}
        <div
          className={`flex items-center gap-2 px-6 py-3 border-b ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          {["all", "image", "video", "audio"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilter(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                filter === type
                  ? "bg-blue-500 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2
                className={`animate-spin ${
                  darkMode ? "text-blue-400" : "text-blue-600"
                }`}
                size={40}
              />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Image
                className={darkMode ? "text-gray-600" : "text-gray-400"}
                size={64}
              />
              <p
                className={`mt-4 text-lg ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No files found
              </p>
              <p
                className={`text-sm ${
                  darkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                Upload some media to see them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file._id}
                  className={`relative group rounded-xl overflow-hidden border transition ${
                    darkMode
                      ? "border-gray-700 hover:border-gray-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative">
                    {file.type === "image" ? (
                      <img
                        src={
                          file.url.startsWith("http")
                            ? file.url
                            : `http://localhost:5000${file.url}`
                        }
                        alt={file.originalName}
                        className="w-full h-full object-cover"
                      />
                    ) : file.type === "video" ? (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <Video
                          className={
                            darkMode ? "text-blue-400" : "text-blue-600"
                          }
                          size={48}
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        }`}
                      >
                        <Music
                          className={
                            darkMode ? "text-purple-400" : "text-purple-600"
                          }
                          size={48}
                        />
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="Preview"
                      >
                        <Eye className="text-white" size={20} />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(file.url)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="Copy URL"
                      >
                        <Copy className="text-white" size={20} />
                      </button>
                      {onSelect && (
                        <button
                          onClick={() => handleSelect(file)}
                          className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                          title="Select"
                        >
                          <Download className="text-white" size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(file._id)}
                        disabled={deleting === file._id}
                        className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === file._id ? (
                          <Loader2
                            className="text-white animate-spin"
                            size={20}
                          />
                        ) : (
                          <Trash2 className="text-white" size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div
                    className={`p-3 ${darkMode ? "bg-gray-800" : "bg-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span
                        className={`text-sm font-medium truncate flex-1 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                        title={file.originalName}
                      >
                        {file.originalName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatSize(file.size)}
                      </span>
                      <span
                        className={`text-xs ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatDate(file.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className={`flex items-center justify-center gap-4 px-6 py-4 border-t ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`p-2 rounded-lg transition disabled:opacity-50 ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <ChevronLeft
                className={darkMode ? "text-white" : "text-gray-600"}
                size={20}
              />
            </button>
            <span className={darkMode ? "text-white" : "text-gray-900"}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`p-2 rounded-lg transition disabled:opacity-50 ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <ChevronRight
                className={darkMode ? "text-white" : "text-gray-600"}
                size={20}
              />
            </button>
          </div>
        )}

        {/* Copied Toast */}
        {copied && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium shadow-lg">
            URL copied to clipboard!
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-lg transition"
            >
              <X size={24} />
            </button>

            {previewFile.type === "image" && (
              <img
                src={
                  previewFile.url.startsWith("http")
                    ? previewFile.url
                    : `http://localhost:5000${previewFile.url}`
                }
                alt={previewFile.originalName}
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            )}

            {previewFile.type === "video" && (
              <video
                src={
                  previewFile.url.startsWith("http")
                    ? previewFile.url
                    : `http://localhost:5000${previewFile.url}`
                }
                controls
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            )}

            {previewFile.type === "audio" && (
              <div className="bg-gray-800 p-8 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <Music className="text-purple-400" size={48} />
                  <span className="text-white text-lg">
                    {previewFile.originalName}
                  </span>
                </div>
                <audio
                  src={
                    previewFile.url.startsWith("http")
                      ? previewFile.url
                      : `http://localhost:5000${previewFile.url}`
                  }
                  controls
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;

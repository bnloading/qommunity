import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Favorite as LikeIcon,
  Comment as CommentIcon,
  PersonAdd as FollowIcon,
  School as CourseIcon,
  Groups as CommunityIcon,
  Campaign as AnnouncementIcon,
  Message as MessageIcon,
  DoneAll as MarkAllIcon,
} from "@mui/icons-material";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getNotificationIcon = (type) => {
  switch (type) {
    case "post_like":
      return <LikeIcon sx={{ color: "#e91e63" }} />;
    case "comment":
    case "comment_reply":
      return <CommentIcon sx={{ color: "#2196f3" }} />;
    case "follow":
      return <FollowIcon sx={{ color: "#4caf50" }} />;
    case "course_enrollment":
    case "new_lesson":
    case "lesson_complete":
      return <CourseIcon sx={{ color: "#ff9800" }} />;
    case "community_join":
    case "community_invite":
    case "role_change":
      return <CommunityIcon sx={{ color: "#9c27b0" }} />;
    case "announcement":
      return <AnnouncementIcon sx={{ color: "#f44336" }} />;
    case "message":
      return <MessageIcon sx={{ color: "#00bcd4" }} />;
    default:
      return <NotificationsIcon sx={{ color: "#757575" }} />;
  }
};

const NotificationsPage = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setPage(1);
      }

      const token = await getToken();
      const currentPage = loadMore ? page + 1 : 1;
      const unreadOnly = tabValue === 1;

      const response = await axios.get(
        `${API_URL}/notifications?page=${currentPage}&limit=20${
          unreadOnly ? "&unread=true" : ""
        }`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newNotifications = response.data.notifications || [];

      if (loadMore) {
        setNotifications((prev) => [...prev, ...newNotifications]);
        setPage(currentPage);
      } else {
        setNotifications(newNotifications);
      }

      setUnreadCount(response.data.unreadCount || 0);
      setHasMore(newNotifications.length === 20);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await getToken();
      await axios.put(
        `${API_URL}/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const deleted = notifications.find((n) => n._id === notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (!deleted?.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
    setAnchorEl(null);
  };

  const handleDeleteAll = async () => {
    try {
      const token = await getToken();
      await axios.delete(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.relatedCommunity) {
      navigate(`/community/${notification.relatedCommunity.slug}`);
    } else if (notification.relatedCourse) {
      navigate(`/courses/${notification.relatedCourse._id}`);
    } else if (notification.relatedPost) {
      navigate(`/posts/${notification.relatedPost._id}`);
    } else if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMenuOpen = (event, notification) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  if (loading && notifications.length === 0) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} unread`}
                color="primary"
                size="small"
              />
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                startIcon={<MarkAllIcon />}
                onClick={handleMarkAllAsRead}
                size="small"
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAll}
                size="small"
                color="error"
              >
                Clear all
              </Button>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="All" />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>

        {/* Notifications List */}
        <Card>
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <NotificationsIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                {tabValue === 1
                  ? "No unread notifications"
                  : "No notifications yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You'll see notifications here when there's activity
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: notification.isRead
                        ? "transparent"
                        : "action.hover",
                      "&:hover": { bgcolor: "action.selected" },
                      py: 2,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, notification)}
                      >
                        <MoreIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={notification.sender?.profilePicture}
                        sx={{ bgcolor: "primary.light" }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: notification.isRead ? 400 : 600 }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.isRead && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: "primary.main",
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Load More */}
          {hasMore && notifications.length > 0 && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Button
                onClick={() => fetchNotifications(true)}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : "Load More"}
              </Button>
            </Box>
          )}
        </Card>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {selectedNotification && !selectedNotification.isRead && (
            <MenuItem
              onClick={() => {
                handleMarkAsRead(selectedNotification._id);
                setAnchorEl(null);
              }}
            >
              <CheckIcon sx={{ mr: 1 }} /> Mark as read
            </MenuItem>
          )}
          <MenuItem
            onClick={() => handleDelete(selectedNotification?._id)}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </Box>
    </Container>
  );
};

export default NotificationsPage;

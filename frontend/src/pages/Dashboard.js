import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Card,
  Typography,
  Grid,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  CircularProgress,
  Divider,
  IconButton,
  Badge,
} from "@mui/material";
import {
  School as SchoolIcon,
  Groups as GroupsIcon,
  CreditCard as CreditCardIcon,
  PlayCircleOutline as PlayIcon,
  CheckCircle as CheckIcon,
  Notifications as NotificationsIcon,
  ArrowForward as ArrowIcon,
  TrendingUp as TrendingIcon,
} from "@mui/icons-material";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const Dashboard = () => {
  const { getToken, userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    totalCommunities: 0,
    totalCourses: 0,
    averageProgress: 0,
    completedLessons: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch user profile and subscription
      const [userRes, communitiesRes, notificationsRes] = await Promise.all([
        axios.get(`${API_URL}/subscriptions/status`, { headers }),
        axios.get(`${API_URL}/communities`, { headers }),
        axios
          .get(`${API_URL}/notifications?limit=5`, { headers })
          .catch(() => ({ data: { notifications: [], unreadCount: 0 } })),
      ]);

      setUser(userRes.data);
      setUnreadCount(notificationsRes.data.unreadCount || 0);
      setNotifications(notificationsRes.data.notifications || []);

      // Filter communities user is a member of
      const allCommunities = communitiesRes.data.communities || [];
      const myCommunities = allCommunities.filter((c) => {
        const isMember = c.members?.some((m) => {
          const memberId = m.user?._id || m.user || m._id;
          return (
            memberId && memberId.toString() === userRes.data.mongoId?.toString()
          );
        });
        const isCreator =
          c.creator?._id?.toString() === userRes.data.mongoId?.toString();
        return isMember || isCreator;
      });

      setCommunities(myCommunities.slice(0, 4));

      // Fetch enrolled courses
      const coursesRes = await axios.get(`${API_URL}/courses`, { headers });
      const enrolledCourses = (coursesRes.data.courses || [])
        .filter((c) => c.enrolledUsers?.includes(userId))
        .slice(0, 4);
      setCourses(enrolledCourses);

      // Calculate stats
      setStats({
        totalCommunities: myCommunities.length,
        totalCourses: enrolledCourses.length,
        averageProgress: 0,
        completedLessons: 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = () => {
    if (!user) return null;
    const tier = user.subscriptionTier || "free";
    const status = user.subscriptionStatus || "none";

    if (status === "trialing") {
      return <Chip label="Trial" color="warning" size="small" />;
    }
    if (status === "active") {
      return (
        <Chip
          label={
            tier === "premium" ? "Pro" : tier === "basic" ? "Hobby" : "Free"
          }
          color={
            tier === "premium"
              ? "secondary"
              : tier === "basic"
              ? "primary"
              : "default"
          }
          size="small"
        />
      );
    }
    return <Chip label="Free" color="default" size="small" />;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
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
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Welcome back, {user?.firstName || "Member"}! 👋
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              {getSubscriptionBadge()}
            </Box>
          </Box>
          <IconButton
            onClick={() => navigate("/notifications")}
            sx={{ position: "relative" }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
            >
              <GroupsIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.totalCommunities}
              </Typography>
              <Typography variant="body2">Communities</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: "center",
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
              }}
            >
              <SchoolIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.totalCourses}
              </Typography>
              <Typography variant="body2">Enrolled Courses</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: "center",
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
              }}
            >
              <TrendingIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.averageProgress}%
              </Typography>
              <Typography variant="body2">Avg. Progress</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                p: 3,
                textAlign: "center",
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
              }}
            >
              <CheckIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {stats.completedLessons}
              </Typography>
              <Typography variant="body2">Completed Lessons</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Communities Section */}
        <Card sx={{ p: 3, mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <GroupsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              My Communities
            </Typography>
            <Button
              endIcon={<ArrowIcon />}
              onClick={() => navigate("/communities")}
            >
              View All
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {communities.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                You haven't joined any communities yet
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate("/communities")}
              >
                Explore Communities
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {communities.map((community) => (
                <Grid item xs={12} sm={6} md={3} key={community._id}>
                  <Card
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                    }}
                    onClick={() => navigate(`/community/${community.slug}`)}
                  >
                    <Avatar
                      src={community.thumbnail}
                      sx={{ width: 56, height: 56, mb: 1 }}
                      variant="rounded"
                    >
                      {community.name?.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600 }}
                      noWrap
                    >
                      {community.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {community.members?.length || 0} members
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>

        {/* Courses Section */}
        <Card sx={{ p: 3, mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <SchoolIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              My Courses
            </Typography>
            <Button
              endIcon={<ArrowIcon />}
              onClick={() => navigate("/courses")}
            >
              View All
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {courses.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                You haven't enrolled in any courses yet
              </Typography>
              <Button variant="contained" onClick={() => navigate("/courses")}>
                Browse Courses
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {courses.map((course) => (
                <Grid item xs={12} sm={6} key={course._id}>
                  <Card
                    sx={{
                      display: "flex",
                      cursor: "pointer",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                    }}
                    onClick={() => navigate(`/courses/${course._id}`)}
                  >
                    <Box
                      sx={{
                        width: 120,
                        height: 90,
                        backgroundImage: `url(${course.thumbnail})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ p: 2, flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        {course.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {course.lessons?.length || 0} lessons
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <LinearProgress
                          variant="determinate"
                          value={course.progress || 0}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {course.progress || 0}%
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>

        {/* Subscription Card */}
        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              <CreditCardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Subscription
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6">
                {user?.subscriptionTier === "premium"
                  ? "Pro Plan"
                  : user?.subscriptionTier === "basic"
                  ? "Hobby Plan"
                  : "Free Plan"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.subscriptionStatus === "trialing"
                  ? "14-day free trial active"
                  : user?.subscriptionStatus === "active"
                  ? "Your subscription is active"
                  : "Upgrade to unlock all features"}
              </Typography>
            </Box>
            {(!user?.subscriptionStatus ||
              user?.subscriptionStatus === "none") && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/select-plan")}
              >
                Upgrade Now
              </Button>
            )}
            {user?.subscriptionStatus === "active" && (
              <Button variant="outlined" onClick={() => navigate("/billing")}>
                Manage Billing
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard;

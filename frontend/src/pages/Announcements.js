import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Box,
  Card,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material";

const API_URL = process.env.REACT_APP_API_URL;

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(response.data.announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Announcements
        </Typography>

        {announcements.length === 0 ? (
          <Alert severity="info">No announcements at the moment.</Alert>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement._id} sx={{ mb: 2, p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{announcement.title}</Typography>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ mb: 1 }}
                  >
                    By {announcement.author?.firstName}{" "}
                    {announcement.author?.lastName}
                  </Typography>
                  <Chip
                    label={announcement.priority?.toUpperCase()}
                    size="small"
                    color={
                      announcement.priority === "high"
                        ? "error"
                        : announcement.priority === "medium"
                        ? "warning"
                        : "default"
                    }
                    sx={{ mb: 2 }}
                  />
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">{announcement.content}</Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ display: "block", mt: 2 }}
              >
                {new Date(announcement.createdAt).toLocaleString()}
              </Typography>
            </Card>
          ))
        )}
      </Box>
    </Container>
  );
};

export default Announcements;

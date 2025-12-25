import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Box,
  Card,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

const API_URL = process.env.REACT_APP_API_URL;

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
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
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Assignments
        </Typography>

        <Card>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Title</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment._id}>
                  <TableCell>{assignment.title}</TableCell>
                  <TableCell>{assignment.course?.title}</TableCell>
                  <TableCell>
                    {new Date(assignment.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {assignments.length === 0 && (
          <Typography sx={{ textAlign: "center", py: 4 }}>
            No assignments available.
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default Assignments;

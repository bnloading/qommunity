import React from "react";
import { Container, Box, Typography } from "@mui/material";

const Attendance = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4">Attendance Management</Typography>
        <Typography sx={{ mt: 2 }}>
          Attendance tracking and reports coming soon
        </Typography>
      </Box>
    </Container>
  );
};

export default Attendance;

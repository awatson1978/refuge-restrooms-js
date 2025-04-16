// imports/ui/pages/MapTest.jsx
import React from 'react';
import { Container, Paper, Typography, Box, Divider } from '@mui/material';
import MainLayout from '../layouts/MainLayout';
import TestMap from '../components/TestMap';

const MapTest = () => {
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Google Maps Test Page
          </Typography>
          <Typography paragraph>
            This page tests basic Google Maps functionality.
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Box my={4}>
            <TestMap />
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Troubleshooting
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Check the browser console for errors</li>
              <li>Verify your Google Maps API key is correctly set in settings.json</li>
              <li>Make sure the API key has the Maps JavaScript API enabled</li>
              <li>Check for Content Security Policy (CSP) issues</li>
              <li>Try a different browser to rule out extension conflicts</li>
            </ul>
          </Typography>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default MapTest;
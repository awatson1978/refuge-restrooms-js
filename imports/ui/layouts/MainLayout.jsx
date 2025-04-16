// imports/ui/layouts/MainLayout.jsx
import React from 'react';
import { Container, Box } from '@mui/material';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const MainLayout = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Navigation />
      
      <Container 
        component="main" 
        sx={{ flexGrow: 1, py: 3 }}
      >
        {children}
      </Container>
      
      <Footer />
    </Box>
  );
};

export default MainLayout;
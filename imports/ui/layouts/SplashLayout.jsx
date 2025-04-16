// imports/ui/layouts/SplashLayout.jsx
import React from 'react';
import { Box, Container } from '@mui/material';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const SplashLayout = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundImage: 'linear-gradient(135deg, #8e44ad 0%, #3498db 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box sx={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
        <Navigation transparent />
      </Box>
      
      <Container 
        component="main" 
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4
        }}
      >
        {children}
      </Container>
      
      <Footer light />
    </Box>
  );
};

export default SplashLayout;
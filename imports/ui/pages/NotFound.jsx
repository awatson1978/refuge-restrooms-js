// imports/ui/pages/NotFound.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

import MainLayout from '../layouts/MainLayout';

const NotFound = () => {
  const { t } = useTranslation();
  
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography variant="h1" component="h1" sx={{ fontSize: '5rem', color: 'primary.main' }}>
            404
          </Typography>
          
          <Typography variant="h4" component="h2" gutterBottom>
            Page Not Found
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ maxWidth: '600px', mb: 4 }}>
            We couldn't find the page you're looking for. It might have been moved, 
            deleted, or may have never existed.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              startIcon={<HomeIcon />}
              component={RouterLink}
              to="/"
              size="large"
            >
              Go to Home
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<SearchIcon />}
              component={RouterLink}
              to="/restrooms"
              size="large"
            >
              Find Restrooms
            </Button>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default NotFound;
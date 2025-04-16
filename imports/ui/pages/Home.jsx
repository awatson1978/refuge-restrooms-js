// imports/ui/pages/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Paper,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SplashLayout from '../layouts/SplashLayout';
import Search from '../components/Search';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const handleAddRestroomClick = () => {
    navigate('/restrooms/new');
  };
  
  return (
    <SplashLayout>
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            mt: 4,
            mb: 6
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            color="white" 
            gutterBottom
            fontWeight="bold"
          >
            {t('home.find-refuge')}
          </Typography>
          
          <Typography 
            variant="h6" 
            color="rgba(255,255,255,0.9)" 
            paragraph
            sx={{ mb: 4 }}
          >
            {t('home.life-is-tough')}
          </Typography>
          
          <Box sx={{ width: '100%', maxWidth: 600, mb: 4 }}>
            <Search isSplash />
          </Box>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleAddRestroomClick}
            sx={{ 
              fontWeight: 'bold',
              py: 1.5,
              px: 3, 
              borderRadius: 2,
              fontSize: '1.1rem',
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              }
            }}
          >
            {t('home.add-restroom-button-label')}
          </Button>
        </Box>
        
        {/* <Grid container spacing={3} sx={{ mt: 4, mb: 6 }}>
          <Grid item xs={12} sm={6}>
            <Paper 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.03)',
                }
              }}
              elevation={3}
            >
              <Box component="a" href="https://itunes.apple.com/us/app/refuge-restrooms/id968531953?mt=8" target="_blank" rel="noopener noreferrer">
                <Box 
                  component="img" 
                  src="/images/app-store.svg" 
                  alt={t('home.html-alt-attributes.app-store')}
                  sx={{ 
                    width: '100%', 
                    maxWidth: 200,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      opacity: 0.8,
                    }
                  }}
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Paper 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.9)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.03)',
                }
              }}
              elevation={3}
            >
              <Box component="a" href="https://play.google.com/store/apps/details?id=org.refugerestrooms" target="_blank" rel="noopener noreferrer">
                <Box 
                  component="img" 
                  src="/images/play-store.png" 
                  alt={t('home.html-alt-attributes.play-store')}
                  sx={{ 
                    width: '100%', 
                    maxWidth: 200,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      opacity: 0.8,
                    }
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid> */}
        
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box component="a" href="https://patreon.com/refugerestrooms" target="_blank" rel="noopener noreferrer">
            <Box 
              component="img" 
              src="/images/patreon.png" 
              alt={t('home.html-alt-attributes.patreon')}
              sx={{ 
                width: '100%', 
                maxWidth: 300,
                transition: 'opacity 0.2s',
                '&:hover': {
                  opacity: 0.8,
                }
              }}
            />
          </Box>
        </Box>
      </Container>
    </SplashLayout>
  );
};

export default Home;
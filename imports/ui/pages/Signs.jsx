// imports/ui/pages/Signs.jsx
import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid,
  Button,
  Card,
  CardMedia,
  CardContent,
  CardActions
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';

import MainLayout from '../layouts/MainLayout';

const SignCard = ({ title, description, imageSrc, downloadUrl }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={imageSrc}
        alt={title}
        sx={{ objectFit: 'contain', p: 2, bgcolor: '#f5f5f5' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          startIcon={<DownloadIcon />}
          component="a"
          href={downloadUrl}
          download
        >
          Download
        </Button>
      </CardActions>
    </Card>
  );
};

const Signs = () => {
  const { t } = useTranslation();
  
  // Sign data
  const signs = [
    {
      id: 'all-gender',
      title: 'All Gender Restroom',
      description: 'A simple sign indicating an all-gender restroom. Suitable for single-occupancy restrooms.',
      imageSrc: '/images/signs/all-gender.png',
      downloadUrl: '/downloads/signs/all-gender.pdf'
    },
    {
      id: 'all-gender-accessible',
      title: 'All Gender Accessible Restroom',
      description: 'Sign for an all-gender restroom that is also accessible.',
      imageSrc: '/images/signs/all-gender-accessible.png',
      downloadUrl: '/downloads/signs/all-gender-accessible.pdf'
    },
    {
      id: 'changing-table',
      title: 'Restroom with Changing Table',
      description: 'Sign indicating a restroom with a baby changing table.',
      imageSrc: '/images/signs/changing-table.png',
      downloadUrl: '/downloads/signs/changing-table.pdf'
    },
    {
      id: 'accessible',
      title: 'Accessible Restroom',
      description: 'Sign for an accessible restroom.',
      imageSrc: '/images/signs/accessible.png',
      downloadUrl: '/downloads/signs/accessible.pdf'
    }
  ];
  
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Restroom Signs
          </Typography>
          
          <Typography variant="body1" paragraph>
            These printable restroom signs can be used to designate gender-neutral and accessible facilities.
            Feel free to download and print these signs for your establishment.
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <Grid container spacing={3}>
              {signs.map((sign) => (
                <Grid item key={sign.id} xs={12} sm={6} md={3}>
                  <SignCard 
                    title={sign.title}
                    description={sign.description}
                    imageSrc={sign.imageSrc}
                    downloadUrl={sign.downloadUrl}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Usage Guidelines
            </Typography>
            
            <Typography variant="body1" paragraph>
              These signs are provided under a Creative Commons Attribution-NonCommercial license. 
              You are free to use and adapt them for non-commercial purposes, with attribution to REFUGE Restrooms.
            </Typography>
            
            <Typography variant="body1" paragraph>
              For businesses, we recommend placing signs at eye level next to restroom doors. 
              For best visibility, print on 8.5" x 11" paper or cardstock.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default Signs;
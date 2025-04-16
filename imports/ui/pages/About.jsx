// imports/ui/pages/About.jsx
import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Link, 
  Divider,
  Button
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useTranslation } from 'react-i18next';

import MainLayout from '../layouts/MainLayout';

const About = () => {
  const { t } = useTranslation();
  
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('about.title')}
          </Typography>
          
          <Box sx={{ textAlign: 'right', mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<GitHubIcon />}
              component="a"
              href="https://github.com/RefugeRestrooms/refugerestrooms"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('about.contribute')}
            </Button>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            {t('about.p1header')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.p1.first')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.p1.second')}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            {t('about.p2header')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.p2')}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            {t('about.p3header')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.p3')}
          </Typography>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            {t('about.p4header')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.p4')}
          </Typography>
        </Paper>
      </Container>
    </MainLayout>
  );
};

// Make sure to export as default
export default About;
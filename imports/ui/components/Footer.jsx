// imports/ui/components/Footer.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Link,
  IconButton,
  Grid,
  Divider
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';
import { useTranslation } from 'react-i18next';

const Footer = ({ light = false }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  const textColor = light ? 'rgba(255, 255, 255, 0.9)' : 'text.secondary';
  const iconColor = light ? 'white' : 'primary';
  
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: light ? 'transparent' : 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={2} justifyContent="center" alignItems="center">
          <Grid item xs={12} textAlign="center">
            <IconButton 
              aria-label="GitHub"
              component="a"
              href="https://github.com/RefugeRestrooms/refugerestrooms"
              target="_blank"
              rel="noopener noreferrer"
              color={iconColor}
            >
              <GitHubIcon />
            </IconButton>
            
            <IconButton 
              aria-label="Twitter"
              component="a"
              href="https://twitter.com/refugerestrooms"
              target="_blank"
              rel="noopener noreferrer"
              color={iconColor}
            >
              <TwitterIcon />
            </IconButton>
            
            <IconButton 
              aria-label="Facebook"
              component="a"
              href="https://www.facebook.com/refugerestrooms"
              target="_blank"
              rel="noopener noreferrer"
              color={iconColor}
            >
              <FacebookIcon />
            </IconButton>
            
            <IconButton 
              aria-label="Email"
              component={RouterLink}
              to="/contact"
              color={iconColor}
            >
              <EmailIcon />
            </IconButton>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body2" color={textColor} align="center">
              {t('footer.refuge-restrooms-is-open-source')}{' '}
              <Link
                href="https://github.com/RefugeRestrooms/refugerestrooms"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="hover"
              >
                {t('footer.code-on-github')}
              </Link>
            </Typography>
            
            <Typography variant="body2" color={textColor} align="center">
              {t('footer.contribute-to-the-project')}{' '}
              <Link
                href="https://patreon.com/refugerestrooms"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                underline="hover"
              >
                {t('footer.on-patreon')}
              </Link>
            </Typography>
            
            <Typography variant="body2" color={textColor} align="center" sx={{ mt: 1 }}>
              &copy; {t('footer.copyleft')} {currentYear} {t('footer.refuge-restrooms')}
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;
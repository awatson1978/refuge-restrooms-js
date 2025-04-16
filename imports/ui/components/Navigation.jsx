// imports/ui/components/Navigation.jsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  IconButton, 
  Typography, 
  Button, 
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Link
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import WcIcon from '@mui/icons-material/Wc';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import InfoIcon from '@mui/icons-material/Info';
import EmailIcon from '@mui/icons-material/Email';
import AppsIcon from '@mui/icons-material/Apps';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';

const Navigation = ({ transparent = false }) => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resourcesMenuAnchor, setResourcesMenuAnchor] = useState(null);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleResourcesMenuOpen = (event) => {
    setResourcesMenuAnchor(event.currentTarget);
  };
  
  const handleResourcesMenuClose = () => {
    setResourcesMenuAnchor(null);
  };
  
  const resourcesMenuOpen = Boolean(resourcesMenuAnchor);
  
  return (
    <>
      <AppBar 
        position="static" 
        color={transparent ? "transparent" : "primary"}
        elevation={transparent ? 0 : 4}
      >
        <Container>
          <Toolbar>
            <RouterLink to="/" style={{ 
              textDecoration: 'none', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <WcIcon sx={{ mr: 1, color: 'white' }} />
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ 
                  display: { xs: 'none', sm: 'block' },
                  color: 'white'
                }}
              >
                REFUGE Restrooms
              </Typography>
            </RouterLink>
            
            <Box sx={{ flexGrow: 1 }} />
            
            {/* Desktop navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/restrooms/new"
                startIcon={<AddCircleIcon />}
                sx={{ color: 'white' }}
              >
                {t('navigation.submit-a-new-restroom')}
              </Button>
              
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/about"
                sx={{ color: 'white' }}
              >
                {t('navigation.about')}
              </Button>
              
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/contact"
                sx={{ color: 'white' }}
              >
                {t('navigation.contact')}
              </Button>
              
              <Button
                color="inherit"
                aria-controls={resourcesMenuOpen ? 'resources-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={resourcesMenuOpen ? 'true' : undefined}
                onClick={handleResourcesMenuOpen}
                endIcon={<MoreVertIcon />}
                sx={{ color: 'white' }}
              >
                {t('navigation.resources')}
              </Button>
              
              <Menu
                id="resources-menu"
                anchorEl={resourcesMenuAnchor}
                open={resourcesMenuOpen}
                onClose={handleResourcesMenuClose}
                MenuListProps={{
                  'aria-labelledby': 'resources-button',
                }}
              >
                <MenuItem 
                  onClick={handleResourcesMenuClose}
                  component={RouterLink}
                  to="/signs"
                >
                  {t('navigation.signs')}
                </MenuItem>
                <MenuItem 
                  onClick={handleResourcesMenuClose}
                  component={RouterLink}
                  to="/api/docs"
                >
                  {t('navigation.api')}
                </MenuItem>
                <MenuItem 
                  onClick={handleResourcesMenuClose}
                  component={RouterLink}
                  to="/map-test"
                >
                  Map Test
                </MenuItem>
              </Menu>
            </Box>
            
            {/* Mobile navigation button */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
                sx={{ color: 'white' }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile navigation drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={handleDrawerToggle}
        >
          <List>
            <ListItem button component={RouterLink} to="/restrooms/new">
              <ListItemIcon>
                <AddCircleIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.submit-a-new-restroom')} />
            </ListItem>
            
            <ListItem button component={RouterLink} to="/about">
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.about')} />
            </ListItem>
            
            <ListItem button component={RouterLink} to="/contact">
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.contact')} />
            </ListItem>
            
            <ListItem button component={RouterLink} to="/signs">
              <ListItemIcon>
                <WcIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.signs')} />
            </ListItem>
            
            <ListItem button component={RouterLink} to="/api/docs">
              <ListItemIcon>
                <AppsIcon />
              </ListItemIcon>
              <ListItemText primary={t('navigation.api')} />
            </ListItem>
            
            <ListItem button component={RouterLink} to="/map-test">
              <ListItemIcon>
                <AppsIcon />
              </ListItemIcon>
              <ListItemText primary={"Map Test"} />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;
// imports/ui/pages/AdminPanel.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import PeopleIcon from '@mui/icons-material/People';
import FeedbackIcon from '@mui/icons-material/Feedback';
import EmailIcon from '@mui/icons-material/Email';

import MainLayout from '../layouts/MainLayout';
import HydrationAdmin from '../components/admin/HydrationAdmin';
// Import other admin components as needed

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Helper function for tab accessibility
function a11yProps(index) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

/**
 * Admin Panel Page with different admin sections
 */
const AdminPanel = () => {
  // State for current tab
  const [currentTab, setCurrentTab] = useState(0);

  // Handler for tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Admin Panel
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage your REFUGE Restrooms deployment settings and data
          </Typography>
        </Paper>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="admin tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Hydration" 
              icon={<StorageIcon />} 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              label="Settings" 
              icon={<SettingsIcon />} 
              iconPosition="start"
              {...a11yProps(1)} 
            />
            <Tab 
              label="Users" 
              icon={<PeopleIcon />} 
              iconPosition="start"
              {...a11yProps(2)} 
            />
            <Tab 
              label="Contacts" 
              icon={<EmailIcon />} 
              iconPosition="start"
              {...a11yProps(3)} 
            />
            <Tab 
              label="Reports" 
              icon={<FeedbackIcon />} 
              iconPosition="start"
              {...a11yProps(4)} 
            />
          </Tabs>

          <Divider />

          <TabPanel value={currentTab} index={0}>
            <HydrationAdmin />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Typography variant="h6">Settings</Typography>
            <Typography variant="body2" color="text.secondary">
              Global application settings will be displayed here
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Typography variant="h6">Users Management</Typography>
            <Typography variant="body2" color="text.secondary">
              User management will be displayed here
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6">Contact Messages</Typography>
            <Typography variant="body2" color="text.secondary">
              Contact form submissions will be displayed here
            </Typography>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <Typography variant="h6">Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Issue reports and analytics will be displayed here
            </Typography>
          </TabPanel>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default AdminPanel;
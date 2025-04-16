// imports/ui/pages/ApiDocs.jsx
import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import HttpIcon from '@mui/icons-material/Http';

import MainLayout from '../layouts/MainLayout';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`api-tabpanel-${index}`}
      aria-labelledby={`api-tab-${index}`}
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

// Helper function for a11y
function a11yProps(index) {
  return {
    id: `api-tab-${index}`,
    'aria-controls': `api-tabpanel-${index}`,
  };
}

// Code snippet component
const CodeSnippet = ({ code }) => {
  return (
    <Box
      component="pre"
      sx={{
        backgroundColor: '#f5f5f5',
        borderRadius: 1,
        p: 2,
        overflow: 'auto',
        fontSize: '0.9rem',
        fontFamily: 'monospace'
      }}
    >
      <code>{code}</code>
    </Box>
  );
};

const ApiDocs = () => {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            REFUGE Restrooms API Documentation
          </Typography>
          
          <Typography variant="body1" paragraph>
            The REFUGE Restrooms API provides programmatic access to our database of restroom locations.
            This API can be used to create applications, visualizations, or tools that help people find
            safe, accessible, and gender-neutral restrooms.
          </Typography>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              aria-label="API documentation tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<HttpIcon />} label="Endpoints" {...a11yProps(0)} />
              <Tab icon={<DataObjectIcon />} label="Data Models" {...a11yProps(1)} />
              <Tab icon={<CodeIcon />} label="Examples" {...a11yProps(2)} />
            </Tabs>
          </Box>
          
          <TabPanel value={currentTab} index={0}>
            <Typography variant="h5" gutterBottom>
              API Endpoints
            </Typography>
            
            <Typography variant="body1" paragraph>
              The base URL for all API requests is: <code>https://www.refugerestrooms.org/api/v1</code>
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Parameters</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><code>/restrooms</code></TableCell>
                    <TableCell>GET</TableCell>
                    <TableCell>Get a list of all restrooms</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <code>page</code>: Page number (default: 1)<br />
                        <code>per_page</code>: Results per page (default: 10, max: 100)<br />
                        <code>ada</code>: Filter by accessibility (true/false)<br />
                        <code>unisex</code>: Filter by unisex (true/false)
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>/restrooms/:id</code></TableCell>
                    <TableCell>GET</TableCell>
                    <TableCell>Get a specific restroom by ID</TableCell>
                    <TableCell>None</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>/restrooms/search</code></TableCell>
                    <TableCell>GET</TableCell>
                    <TableCell>Search for restrooms</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <code>query</code>: Search term (required)<br />
                        <code>page</code>: Page number (default: 1)<br />
                        <code>per_page</code>: Results per page (default: 10, max: 100)
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>/restrooms/by_location</code></TableCell>
                    <TableCell>GET</TableCell>
                    <TableCell>Find restrooms near a location</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <code>lat</code>: Latitude (required)<br />
                        <code>lng</code>: Longitude (required)<br />
                        <code>page</code>: Page number (default: 1)<br />
                        <code>per_page</code>: Results per page (default: 10, max: 100)
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          <TabPanel value={currentTab} index={1}>
            <Typography variant="h5" gutterBottom>
              Data Models
            </Typography>
            
            <Typography variant="h6" sx={{ mt: 3 }}>
              Restroom
            </Typography>
            
            <CodeSnippet code={`{
  "id": 1234,
  "name": "Starbucks",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "United States",
  "accessible": true,
  "unisex": true,
  "changing_table": false,
  "directions": "In the back past the counter",
  "comment": "Clean and well-maintained",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "upvote": 23,
  "downvote": 4,
  "created_at": "2022-01-01T12:00:00Z",
  "updated_at": "2022-01-10T15:30:00Z"
}`} />

          </TabPanel>
          
          <TabPanel value={currentTab} index={2}>
            <Typography variant="h5" gutterBottom>
              Example Requests
            </Typography>
            
            <Typography variant="h6" sx={{ mt: 3 }}>
              JavaScript Example
            </Typography>
            
            <CodeSnippet code={`// Fetch restrooms near a location
fetch('https://www.refugerestrooms.org/api/v1/restrooms/by_location?lat=40.7128&lng=-74.0060&per_page=10')
  .then(response => response.json())
  .then(data => {
    console.log('Restrooms:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`} />
            
            <Typography variant="h6" sx={{ mt: 3 }}>
              Python Example
            </Typography>
            
            <CodeSnippet code={`import requests

# Search for restrooms
response = requests.get(
    'https://www.refugerestrooms.org/api/v1/restrooms/search',
    params={'query': 'Seattle', 'per_page': 20}
)

if response.status_code == 200:
    restrooms = response.json()
    print(f"Found {len(restrooms)} restrooms in Seattle")`} />
          </TabPanel>
          
          <Divider sx={{ my: 4 }} />
          
          <Box>
            <Typography variant="h6" gutterBottom>
              Rate Limits
            </Typography>
            
            <Typography variant="body1" paragraph>
              The API is rate-limited to 100 requests per hour per IP address.
              If you need higher limits for your application, please contact us.
            </Typography>
            
            <Typography variant="h6" gutterBottom>
              Terms of Use
            </Typography>
            
            <Typography variant="body1" paragraph>
              By using the REFUGE Restrooms API, you agree to:
            </Typography>
            
            <ul>
              <li>Attribute REFUGE Restrooms as the source of the data</li>
              <li>Not use the data for discriminatory purposes</li>
              <li>Not redistribute the full dataset without permission</li>
            </ul>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default ApiDocs;
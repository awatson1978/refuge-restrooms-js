// imports/ui/components/admin/HydrationAdmin.jsx
import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { 
  Box, 
  Paper, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Button,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  MenuItem
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Admin component for controlling database hydration settings
 */
const HydrationAdmin = () => {
  // State for hydration status
  const [hydrationEnabled, setHydrationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // State for manual hydration
  const [hydrationMethod, setHydrationMethod] = useState('byLocation');
  const [hydrationParams, setHydrationParams] = useState({
    lat: 38.9072,
    lng: -77.0369,
    query: 'Seattle',
    day: 1,
    month: 1,
    year: new Date().getFullYear(),
    ada: false,
    unisex: false,
    perPage: 20
  });
  const [hydrationInProgress, setHydrationInProgress] = useState(false);
  const [hydrationResult, setHydrationResult] = useState(null);
  
  // Load hydration status
  useEffect(() => {
    const loadHydrationStatus = async () => {
      try {
        setIsLoading(true);
        const result = await Meteor.callAsync('hydration.status');
        setHydrationEnabled(result.enabled);
      } catch (err) {
        console.error('Error loading hydration status:', err);
        setError('Failed to load hydration status: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHydrationStatus();
  }, []);
  
  // Handler for toggling hydration
  const handleToggleHydration = async () => {
    try {
      setIsLoading(true);
      const result = await Meteor.callAsync('hydration.toggle', !hydrationEnabled);
      
      if (result.success) {
        setHydrationEnabled(result.enabled);
        setFeedbackMessage(`Hydration ${result.enabled ? 'enabled' : 'disabled'} successfully`);
        setShowFeedback(true);
      }
    } catch (err) {
      console.error('Error toggling hydration:', err);
      setError('Failed to toggle hydration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for hydration method change
  const handleMethodChange = (event) => {
    setHydrationMethod(event.target.value);
  };
  
  // Handler for hydration params change
  const handleParamChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    setHydrationParams({
      ...hydrationParams,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handler for running manual hydration
  const handleRunHydration = async () => {
    try {
      setHydrationInProgress(true);
      setError(null);
      setHydrationResult(null);
      
      let result;
      
      switch (hydrationMethod) {
        case 'byLocation':
          result = await Meteor.callAsync(
            'hydration.byLocation',
            parseFloat(hydrationParams.lat),
            parseFloat(hydrationParams.lng),
            parseInt(hydrationParams.perPage)
          );
          break;
          
        case 'bySearch':
          result = await Meteor.callAsync(
            'hydration.bySearch',
            hydrationParams.query,
            parseInt(hydrationParams.perPage)
          );
          break;
          
        case 'withFilters':
          result = await Meteor.callAsync(
            'hydration.withFilters',
            {
              ada: hydrationParams.ada,
              unisex: hydrationParams.unisex
            },
            parseInt(hydrationParams.perPage)
          );
          break;
          
        case 'byDate':
          result = await Meteor.callAsync(
            'hydration.byDate',
            parseInt(hydrationParams.day),
            parseInt(hydrationParams.month),
            parseInt(hydrationParams.year),
            parseInt(hydrationParams.perPage)
          );
          break;
          
        default:
          throw new Error('Invalid hydration method');
      }
      
      setHydrationResult(result);
      
      if (result.skipped) {
        setFeedbackMessage(`Hydration skipped: ${result.reason}`);
      } else {
        setFeedbackMessage(`Hydration completed: ${result.saved} saved, ${result.skipped} skipped, ${result.failed} failed`);
      }
      
      setShowFeedback(true);
    } catch (err) {
      console.error('Error running hydration:', err);
      setError('Failed to run hydration: ' + err.message);
    } finally {
      setHydrationInProgress(false);
    }
  };
  
  // Handler for feedback close
  const handleFeedbackClose = () => {
    setShowFeedback(false);
  };
  
  // Handler for error close
  const handleErrorClose = () => {
    setError(null);
  };
  
  // Render loading state
  if (isLoading && !hydrationResult) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ my: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} />
          Database Hydration Settings
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }} onClose={handleErrorClose}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ my: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={hydrationEnabled}
                onChange={handleToggleHydration}
                color="primary"
                disabled={isLoading}
              />
            }
            label={
              hydrationEnabled 
                ? "Database hydration is enabled" 
                : "Database hydration is disabled"
            }
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {hydrationEnabled 
              ? "The system will automatically save restrooms from the production API to your local database when users search."
              : "No data from the production API will be saved to your local database."}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Manual Hydration
        </Typography>
        
        <Box sx={{ my: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Hydration Method"
                value={hydrationMethod}
                onChange={handleMethodChange}
                fullWidth
                margin="normal"
              >
                <MenuItem value="byLocation">By Location</MenuItem>
                <MenuItem value="bySearch">By Search</MenuItem>
                <MenuItem value="withFilters">With Filters</MenuItem>
                <MenuItem value="byDate">By Date</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Results Per Page"
                name="perPage"
                type="number"
                value={hydrationParams.perPage}
                onChange={handleParamChange}
                fullWidth
                margin="normal"
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            
            {/* Dynamic fields based on selected method */}
            {hydrationMethod === 'byLocation' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Latitude"
                    name="lat"
                    type="number"
                    value={hydrationParams.lat}
                    onChange={handleParamChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Longitude"
                    name="lng"
                    type="number"
                    value={hydrationParams.lng}
                    onChange={handleParamChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ step: 'any' }}
                  />
                </Grid>
              </>
            )}
            
            {hydrationMethod === 'bySearch' && (
              <Grid item xs={12}>
                <TextField
                  label="Search Query"
                  name="query"
                  value={hydrationParams.query}
                  onChange={handleParamChange}
                  fullWidth
                  margin="normal"
                />
              </Grid>
            )}
            
            {hydrationMethod === 'withFilters' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hydrationParams.ada}
                        onChange={handleParamChange}
                        name="ada"
                        color="secondary"
                      />
                    }
                    label="ADA Accessible"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={hydrationParams.unisex}
                        onChange={handleParamChange}
                        name="unisex"
                        color="primary"
                      />
                    }
                    label="Unisex"
                  />
                </Grid>
              </>
            )}
            
            {hydrationMethod === 'byDate' && (
              <>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Day"
                    name="day"
                    type="number"
                    value={hydrationParams.day}
                    onChange={handleParamChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Month"
                    name="month"
                    type="number"
                    value={hydrationParams.month}
                    onChange={handleParamChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Year"
                    name="year"
                    type="number"
                    value={hydrationParams.year}
                    onChange={handleParamChange}
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 2010, max: new Date().getFullYear() }}
                  />
                </Grid>
              </>
            )}
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={hydrationInProgress ? <CircularProgress size={24} color="inherit" /> : <CloudDownloadIcon />}
              onClick={handleRunHydration}
              disabled={hydrationInProgress || !hydrationEnabled}
              sx={{ px: 4, py: 1 }}
            >
              {hydrationInProgress ? "Hydrating..." : "Run Hydration"}
            </Button>
          </Box>
        </Box>
        
        {/* Hydration result */}
        {hydrationResult && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Hydration Result
              </Typography>
              
              {hydrationResult.skipped ? (
                <Alert severity="info">
                  Hydration was skipped: {hydrationResult.reason}
                </Alert>
              ) : (
                <>
                  <Typography variant="body1" gutterBottom>
                    Total Restrooms: {hydrationResult.total}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                    <Typography color="success.main">
                      Saved: {hydrationResult.saved}
                    </Typography>
                    
                    <Typography color="text.secondary">
                      Skipped: {hydrationResult.skipped}
                    </Typography>
                    
                    <Typography color="error.main">
                      Failed: {hydrationResult.failed}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={() => setHydrationResult(null)}
              >
                Clear Result
              </Button>
            </CardActions>
          </Card>
        )}
      </Paper>
      
      {/* Feedback message */}
      <Snackbar
        open={showFeedback}
        autoHideDuration={5000}
        onClose={handleFeedbackClose}
        message={feedbackMessage}
      />
    </Box>
  );
};

export default HydrationAdmin;
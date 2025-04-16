// imports/ui/pages/AddRestroom.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  FormControlLabel, 
  Switch,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
  InputAdornment
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from 'react-google-recaptcha';

import MainLayout from '../layouts/MainLayout';
import Map from '../components/Map';
import { COUNTRIES } from '../../constants/countries';
import { geocodeAddress, reverseGeocode } from '../../utils/geocoding';

// Helper to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const AddRestroom = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery();
  
  // Check if this is an edit (via ID parameter)
  const editId = query.get('edit_id');
  const restroomId = query.get('id');
  const restroomName = query.get('restroom_name');
  const isEdit = !!editId;
  
  // Form state
  const [formData, setFormData] = useState({
    name: restroomName || '',
    street: '',
    city: '',
    state: '',
    country: 'United States',
    accessible: false,
    unisex: true,
    changing_table: false,
    directions: '',
    comment: '',
    latitude: '',
    longitude: '',
    edit_id: editId || ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaValue, setRecaptchaValue] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  
  // If editing, load existing data
  useEffect(() => {
    if (isEdit && restroomId) {
      const loadRestroomData = async () => {
        try {
          setLoading(true);
          const restroom = await Meteor.callAsync('restrooms.getById', restroomId);
          
          if (restroom) {
            setFormData({
              name: restroom.name,
              street: restroom.street,
              city: restroom.city,
              state: restroom.state,
              country: restroom.country || 'United States',
              accessible: restroom.accessible,
              unisex: restroom.unisex,
              changing_table: restroom.changing_table,
              directions: restroom.directions || '',
              comment: restroom.comment || '',
              latitude: restroom.position?.latitude || '',
              longitude: restroom.position?.longitude || '',
              edit_id: editId
            });
          } else {
            setError(t('restroom.not-found'));
          }
        } catch (err) {
          console.error('Error loading restroom:', err);
          setError(t('restroom.load-error'));
        } finally {
          setLoading(false);
        }
      };
      
      loadRestroomData();
    }
  }, [isEdit, restroomId, editId, t]);
  
  // Handle form field changes
  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle location detection
  const handleDetectLocation = () => {
    setGeolocating(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError(t('restroom.geolocation-not-supported'));
      setGeolocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Update form with coordinates
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }));
          
          // Try to get address information from coordinates
          const addressInfo = await reverseGeocode(latitude, longitude);
          
          if (addressInfo) {
            setFormData(prev => ({
              ...prev,
              street: addressInfo.street || prev.street,
              city: addressInfo.city || prev.city,
              state: addressInfo.state || prev.state,
              country: addressInfo.country || prev.country
            }));
            
            setFeedbackMessage(t('restroom.location-detected'));
            setShowFeedback(true);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          // We already have the coordinates, so just show a warning
          setFeedbackMessage(t('restroom.geocoding-partial'));
          setShowFeedback(true);
        } finally {
          setGeolocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(t('restroom.geolocation-error'));
        setGeolocating(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
  
  // Handle address geocoding
  const handleGeocodeAddress = async () => {
    // Only try to geocode if we have the minimum address information
    if (!formData.street || !formData.city || !formData.state) {
      setError(t('restroom.geocode-missing-fields'));
      return;
    }
    
    setGeolocating(true);
    setError('');
    
    try {
      const address = `${formData.street}, ${formData.city}, ${formData.state}, ${formData.country}`;
      const coordinates = await geocodeAddress(address);
      
      if (coordinates) {
        setFormData(prev => ({
          ...prev,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        }));
        
        setFeedbackMessage(t('restroom.geocoding-success'));
        setShowFeedback(true);
      } else {
        setError(t('restroom.geocoding-failed'));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(t('restroom.geocoding-error'));
    } finally {
      setGeolocating(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.street || !formData.city || !formData.state || !formData.country) {
      setError(t('restroom.missing-required-fields'));
      return;
    }
    
    // Validate reCAPTCHA
    if (!recaptchaValue) {
      setError(t('restroom.recaptcha-required'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // If location is not provided, try to geocode it
      if (!formData.latitude || !formData.longitude) {
        await handleGeocodeAddress();
      }
      
      // Submit the data
      const result = await Meteor.callAsync('restrooms.insert', formData, recaptchaValue);
      
      setSubmitted(true);
      
      // Redirect after successful submission
      if (result.approved) {
        navigate(`/restrooms/${result.restroomId}`);
      } else {
        navigate('/restrooms');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.reason || t('restroom.submission-error'));
      setLoading(false);
    }
  };
  
  // Handle feedback close
  const handleFeedbackClose = () => {
    setShowFeedback(false);
  };
  
  // Show loading state
  if (loading && !submitted) {
    return (
      <MainLayout>
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">
              {isEdit ? t('restroom.loading-edit') : t('restroom.submitting')}
            </Typography>
          </Box>
        </Container>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Button
              component={RouterLink}
              to="/restrooms"
              startIcon={<ArrowBackIcon />}
              sx={{ mr: 2 }}
            >
              {t('common.back')}
            </Button>
            
            <Typography variant="h4" component="h1">
              {isEdit ? t('restroom.edit.title') : t('restroom.add_new')}
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {t('restroom.required')}
            </Typography>
            
            {/* Name Field */}
            <TextField
              label={t('restroom.form.name')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
            />
            
            {/* Address Fields */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label={t('restroom.form.street')}
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={handleDetectLocation}
                          disabled={geolocating}
                          title={t('restroom.detect-location')}
                        >
                          {geolocating ? <CircularProgress size={24} /> : <MyLocationIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('restroom.form.city')}
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('restroom.form.state')}
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  select
                  label={t('restroom.form.country')}
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            
            {/* Hidden Coordinates Fields */}
            <input type="hidden" name="latitude" value={formData.latitude} />
            <input type="hidden" name="longitude" value={formData.longitude} />
            <input type="hidden" name="edit_id" value={formData.edit_id} />
            
            {/* Show coordinates if available */}
            {(formData.latitude && formData.longitude) && (
              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('restroom.form.coordinates')}:
                </Typography>
                <Typography variant="body2">
                  {t('restroom.form.latitude')}: {formData.latitude}, {t('restroom.form.longitude')}: {formData.longitude}
                </Typography>
                
                {/* Preview Map */}
                <Box sx={{ mt: 2, height: 200 }}>
                  <Map
                    restrooms={[{
                      _id: 'preview',
                      position: {
                        latitude: parseFloat(formData.latitude),
                        longitude: parseFloat(formData.longitude)
                      }
                    }]}
                    center={{
                      lat: parseFloat(formData.latitude),
                      lng: parseFloat(formData.longitude)
                    }}
                    zoom={15}
                    height={200}
                  />
                </Box>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            {/* Accessibility Options */}
            <Typography variant="h6" gutterBottom>
              {t('restroom.form.features')}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.accessible}
                      onChange={handleChange}
                      name="accessible"
                      color="secondary"
                    />
                  }
                  label={t('restroom.accessible')}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.unisex}
                      onChange={handleChange}
                      name="unisex"
                      color="primary"
                    />
                  }
                  label={t('restroom.type.unisex')}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.changing_table}
                      onChange={handleChange}
                      name="changing_table"
                      color="success"
                    />
                  }
                  label={t('restroom.changing_table')}
                />
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Additional Information */}
            <Typography variant="h6" gutterBottom>
              {t('restroom.form.additional-info')}
            </Typography>
            
            <TextField
              label={t('restroom.form.directions')}
              name="directions"
              value={formData.directions}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder={t('restroom.directions_hint')}
              margin="normal"
            />
            
            <TextField
              label={t('restroom.form.comments')}
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder={t('restroom.comments_hint')}
              margin="normal"
            />
            
            <Box sx={{ mt: 3, mb: 2 }}>
              <ReCAPTCHA
                sitekey={Meteor.settings.public.recaptchaSiteKey}
                onChange={setRecaptchaValue}
              />
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || !recaptchaValue}
                startIcon={<SendIcon />}
              >
                {isEdit ? t('restroom.edit.submit') : t('restroom.restsubmit')}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
      
      {/* Feedback Snackbar */}
      <Snackbar
        open={showFeedback}
        autoHideDuration={5000}
        onClose={handleFeedbackClose}
        message={feedbackMessage}
      />
    </MainLayout>
  );
};

export default AddRestroom;
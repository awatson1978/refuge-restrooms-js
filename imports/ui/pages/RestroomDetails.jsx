// imports/ui/pages/RestroomDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Button, 
  Divider, 
  Chip,
  CircularProgress,
  Alert,
  Stack,
  LinearProgress
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import ReportIcon from '@mui/icons-material/Report';
import AccessibleIcon from '@mui/icons-material/Accessible';
import WcIcon from '@mui/icons-material/Wc';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import DirectionsIcon from '@mui/icons-material/Directions';
import CommentIcon from '@mui/icons-material/Comment';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';

import MainLayout from '../layouts/MainLayout';
import LocationMap from '../components/LocationMap';

// Rating colors based on percentage
const getRatingColor = (percentage) => {
  if (percentage > 70) return '#4caf50'; // Green
  if (percentage > 50) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

// Helper to safely extract data from both FHIR and legacy formats
const getRestroomData = (restroom) => {
  // Check if this is FHIR format
  if (get(restroom, 'resourceType') === 'Location') {
    // Extract from FHIR Location resource
    const accessibility = restroom.getAccessibilityFeatures ? restroom.getAccessibilityFeatures() : {};
    const rating = restroom.getRating ? restroom.getRating() : { upvotes: 0, downvotes: 0, percentage: 0, isRated: false };
    const address = restroom.getAddress ? restroom.getAddress() : {};
    const position = restroom.getPosition ? restroom.getPosition() : {};
    const facilityDetails = restroom.getFacilityDetails ? restroom.getFacilityDetails() : {};
    const timestamps = restroom.getTimestamps ? restroom.getTimestamps() : {};
    
    return {
      _id: get(restroom, 'id'),
      name: get(restroom, 'name', 'Unnamed Restroom'),
      street: get(address, 'street', ''),
      city: get(address, 'city', ''),
      state: get(address, 'state', ''),
      country: get(address, 'country', 'United States'),
      accessible: get(accessibility, 'accessible', false),
      unisex: get(accessibility, 'unisex', false),
      changing_table: get(accessibility, 'changingTable', false),
      directions: get(facilityDetails, 'directions', ''),
      comment: get(facilityDetails, 'comments', ''),
      upvote: get(rating, 'upvotes', 0),
      downvote: get(rating, 'downvotes', 0),
      ratingPercentage: get(rating, 'percentage', 0),
      isRated: get(rating, 'isRated', false),
      latitude: get(position, 'latitude'),
      longitude: get(position, 'longitude'),
      createdAt: get(timestamps, 'createdAt') || get(restroom, 'meta.lastUpdated'),
      updatedAt: get(timestamps, 'updatedAt') || get(restroom, 'meta.lastUpdated')
    };
  } else {
    // Legacy format - extract directly
    const upvotes = get(restroom, 'upvote', 0);
    const downvotes = get(restroom, 'downvote', 0);
    const total = upvotes + downvotes;
    const ratingPercentage = total > 0 ? (upvotes / total) * 100 : 0;
    
    // Handle coordinates from different formats
    let latitude, longitude;
    
    // Try GeoJSON format first
    const geoCoords = get(restroom, 'position.coordinates');
    if (geoCoords && Array.isArray(geoCoords) && geoCoords.length === 2) {
      longitude = geoCoords[0];
      latitude = geoCoords[1];
    } else {
      // Fallback to direct properties
      latitude = get(restroom, 'latitude');
      longitude = get(restroom, 'longitude');
    }
    
    return {
      _id: get(restroom, '_id'),
      name: get(restroom, 'name', 'Unnamed Restroom'),
      street: get(restroom, 'street', ''),
      city: get(restroom, 'city', ''),
      state: get(restroom, 'state', ''),
      country: get(restroom, 'country', 'United States'),
      accessible: get(restroom, 'accessible', false),
      unisex: get(restroom, 'unisex', false),
      changing_table: get(restroom, 'changing_table', false),
      directions: get(restroom, 'directions', ''),
      comment: get(restroom, 'comment', ''),
      upvote: upvotes,
      downvote: downvotes,
      ratingPercentage,
      isRated: total > 0,
      latitude,
      longitude,
      createdAt: get(restroom, 'createdAt'),
      updatedAt: get(restroom, 'updatedAt')
    };
  }
};

const RestroomDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [restroom, setRestroom] = useState(null);
  const [error, setError] = useState(null);
  const [voteSuccess, setVoteSuccess] = useState(null);
  
  // Fetch restroom data using FHIR methods
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Try FHIR method first, with legacy format return for compatibility
        const result = await Meteor.callAsync('fhir.locations.getById', id, {
          returnLegacyFormat: false // Get FHIR format to use helper methods
        });
        setRestroom(result);
        setLoading(false);
        console.log('Fetched FHIR restroom:', result);
      } catch (err) {
        // Fallback to legacy method if FHIR fails
        console.warn('FHIR method failed, trying legacy:', err);
        try {
          const legacyResult = await Meteor.callAsync('restrooms.getById', id);
          setRestroom(legacyResult);
          setLoading(false);
          console.log('Fetched legacy restroom:', legacyResult);
        } catch (legacyErr) {
          console.error('Both FHIR and legacy methods failed:', legacyErr);
          setError(legacyErr.message || 'Failed to load restroom data');
          setLoading(false);
        }
      }
    };
    
    fetchData();
  }, [id]);
  
  // Handle voting using FHIR methods
  const handleVote = async (isUpvote) => {
    try {
      if (isUpvote) {
        await Meteor.callAsync('fhir.locations.upvote', id);
        setVoteSuccess(t('restroom.feedback.upvote-success'));
      } else {
        await Meteor.callAsync('fhir.locations.downvote', id);
        setVoteSuccess(t('restroom.feedback.downvote-success'));
      }
      
      // Refresh the data to show updated vote counts
      const updatedRestroom = await Meteor.callAsync('fhir.locations.getById', id, {
        returnLegacyFormat: false
      });
      setRestroom(updatedRestroom);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setVoteSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error voting:', err);
      setError(t('restroom.feedback.vote-error'));
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ my: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }
  
  // Show error state
  if (error || !restroom) {
    return (
      <MainLayout>
        <Container maxWidth="lg" sx={{ my: 4 }}>
          <Alert 
            severity="error"
            action={
              <Button color="inherit" component={RouterLink} to="/restrooms">
                {t('common.back-to-list')}
              </Button>
            }
          >
            {error || t('restroom.not-found')}
          </Alert>
        </Container>
      </MainLayout>
    );
  }
  
  // Extract data using our helper
  const data = getRestroomData(restroom);
  
  const ratingColor = data.isRated ? getRatingColor(data.ratingPercentage) : '#9e9e9e';
  
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Button 
            component={RouterLink} 
            to="/restrooms" 
            variant="outlined" 
            sx={{ mb: 2 }}
          >
            {t('common.back-to-list')}
          </Button>
        </Box>
        
        {/* Success message */}
        {voteSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {voteSuccess}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Main Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {data.name}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {`${data.street}, ${data.city}, ${data.state}`}
                {data.country !== 'United States' && `, ${data.country}`}
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 3 }}>
                {data.unisex && (
                  <Chip 
                    icon={<WcIcon />} 
                    label={t('restroom.type.unisex')}
                    color="primary"
                  />
                )}
                
                {data.accessible && (
                  <Chip 
                    icon={<AccessibleIcon />} 
                    label={t('restroom.accessible')}
                    color="secondary"
                  />
                )}
                
                {data.changing_table && (
                  <Chip 
                    icon={<ChildCareIcon />} 
                    label={t('restroom.changing_table')}
                    color="success"
                  />
                )}
              </Stack>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ThumbUpIcon />}
                    onClick={() => handleVote(true)}
                  >
                    {t('restroom.upvote')} ({data.upvote})
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<ThumbDownIcon />}
                    onClick={() => handleVote(false)}
                  >
                    {t('restroom.downvote')} ({data.downvote})
                  </Button>
                </Stack>
                
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/restrooms/${data._id}/edit`}
                  >
                    {t('restroom.edit.submit')}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    component={RouterLink}
                    to={`/contact?restroom_id=${data._id}&restroom_name=${encodeURIComponent(data.name)}`}
                  >
                    {t('restroom.report-issue')}
                  </Button>
                </Stack>
              </Box>
              
              {/* Directions and Comments */}
              {(data.directions || data.comment) && (
                <Box sx={{ mb: 3 }}>
                  {data.directions && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DirectionsIcon sx={{ mr: 1 }} />
                        {t('restroom.directions')}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {data.directions}
                      </Typography>
                    </Box>
                  )}
                  
                  {data.comment && (
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CommentIcon sx={{ mr: 1 }} />
                        {t('restroom.comments')}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {data.comment}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Added Date */}
              {data.createdAt && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('restroom.added-on', { date: new Date(data.createdAt).toLocaleDateString() })}
                  </Typography>
                </Box>
              )}
            </Paper>
            
            {/* Rating Card */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('restroom.rating.title')}
              </Typography>
              
              {data.isRated ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      {Math.round(data.ratingPercentage)}% {t('restroom.rating.positive', { percentage: Math.round(data.ratingPercentage) })}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'white', 
                        bgcolor: ratingColor, 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1 
                      }}
                    >
                      {data.ratingPercentage > 70 ? t('restroom.rating.level.green') : 
                       data.ratingPercentage > 50 ? t('restroom.rating.level.yellow') :
                                             t('restroom.rating.level.red')}
                    </Typography>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={data.ratingPercentage}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      mb: 1,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: ratingColor,
                        borderRadius: 5,
                      }
                    }}
                  />
                  
                  <Typography variant="body2" color="text.secondary">
                    {t('restroom.rating.based-on', { count: data.upvote + data.downvote })}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body1">
                  {t('restroom.rating.unrated')}
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Map and Location */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('restroom.location')}
              </Typography>
              
              <Box sx={{ height: 300, mb: 2 }}>
                {data.latitude && data.longitude ? (
                  <LocationMap
                    latitude={data.latitude}
                    longitude={data.longitude}
                    name={data.name}
                    height={300}
                  />
                ) : (
                  <Alert severity="info" sx={{ height: '100%' }}>
                    {t('restroom.no-coordinates')}
                  </Alert>
                )}
              </Box>
              
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DirectionsIcon />}
                component="a"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${data.street}, ${data.city}, ${data.state}, ${data.country}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('restroom.get-directions')}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default RestroomDetails;
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
// import TestMap from '../components/TestMap';
import LocationMap from '../components/LocationMap';

// Rating colors based on percentage
const getRatingColor = (percentage) => {
  if (percentage > 70) return '#4caf50'; // Green
  if (percentage > 50) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

// Safely get coordinates in the expected format
const getCoordinates = (restroom) => {
    // Check for GeoJSON format first
    if (restroom.position && 
        restroom.position.type === 'Point' && 
        Array.isArray(restroom.position.coordinates) && 
        restroom.position.coordinates.length === 2) {
      // GeoJSON stores as [longitude, latitude]
      return {
        latitude: restroom.position.coordinates[1],
        longitude: restroom.position.coordinates[0]
      };
    }
    
    // Fallback to regular lat/lng fields if they exist
    if (typeof restroom.latitude === 'number' && typeof restroom.longitude === 'number') {
      return {
        latitude: restroom.latitude,
        longitude: restroom.longitude
      };
    }
    
    return null;
  };

const RestroomDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [restroom, setRestroom] = useState(null);
  const [error, setError] = useState(null);
  const [voteSuccess, setVoteSuccess] = useState(null);
  
  // Fetch restroom data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use direct method call instead of subscription
        const result = await Meteor.callAsync('restrooms.getById', id);
        setRestroom(result);
        setLoading(false);
        console.log('Fetched restroom:', result);
      } catch (err) {
        console.error('Error fetching restroom:', err);
        setError(err.message || 'Failed to load restroom data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Handle voting
  const handleVote = async (isUpvote) => {
    try {
      if (isUpvote) {
        await Meteor.callAsync('restrooms.upvote', id);
        // Optimistically update the UI
        setRestroom({
          ...restroom,
          upvote: get(restroom, 'upvote', 0) + 1
        });
        setVoteSuccess(t('restroom.feedback.upvote-success'));
      } else {
        await Meteor.callAsync('restrooms.downvote', id);
        // Optimistically update the UI
        setRestroom({
          ...restroom,
          downvote: get(restroom, 'downvote', 0) + 1
        });
        setVoteSuccess(t('restroom.feedback.downvote-success'));
      }
      
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
  
  // Calculate rating data safely using lodash get
  const upvotes = get(restroom, 'upvote', 0);
  const downvotes = get(restroom, 'downvote', 0);
  const isRated = upvotes > 0 || downvotes > 0;
  const ratingPercentage = isRated 
    ? (upvotes / (upvotes + downvotes)) * 100 
    : 0;
  const ratingColor = isRated ? getRatingColor(ratingPercentage) : '#9e9e9e';
  
  // Safely get restroom properties with default values
  const name = get(restroom, 'name', '');
  const street = get(restroom, 'street', '');
  const city = get(restroom, 'city', '');
  const state = get(restroom, 'state', '');
  const country = get(restroom, 'country', 'United States');
  const directions = get(restroom, 'directions', '');
  const comment = get(restroom, 'comment', '');
  const latitude = get(restroom, 'latitude');
  const longitude = get(restroom, 'longitude');
  const unisex = get(restroom, 'unisex', false);
  const accessible = get(restroom, 'accessible', false);
  const changingTable = get(restroom, 'changing_table', false);
  const createdAt = get(restroom, 'createdAt', new Date());
  
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
                {name}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {`${street}, ${city}, ${state}, ${country}`}
              </Typography>
              
              <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 3 }}>
                {unisex && (
                  <Chip 
                    icon={<WcIcon />} 
                    label={t('restroom.type.unisex')}
                    color="primary"
                  />
                )}
                
                {accessible && (
                  <Chip 
                    icon={<AccessibleIcon />} 
                    label={t('restroom.accessible')}
                    color="secondary"
                  />
                )}
                
                {changingTable && (
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
                    {t('restroom.upvote')} ({upvotes})
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<ThumbDownIcon />}
                    onClick={() => handleVote(false)}
                  >
                    {t('restroom.downvote')} ({downvotes})
                  </Button>
                </Stack>
                
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/restrooms/${id}/edit`}
                  >
                    {t('restroom.edit.submit')}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<ReportIcon />}
                    component={RouterLink}
                    to={`/contact?restroom_id=${id}&restroom_name=${encodeURIComponent(name)}`}
                  >
                    {t('restroom.report-issue')}
                  </Button>
                </Stack>
              </Box>
              
              {/* Directions and Comments */}
              {(directions || comment) && (
                <Box sx={{ mb: 3 }}>
                  {directions && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DirectionsIcon sx={{ mr: 1 }} />
                        {t('restroom.directions')}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {directions}
                      </Typography>
                    </Box>
                  )}
                  
                  {comment && (
                    <Box>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CommentIcon sx={{ mr: 1 }} />
                        {t('restroom.comments')}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {comment}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Added Date */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('restroom.added-on', { date: new Date(createdAt).toLocaleDateString() })}
                </Typography>
              </Box>
            </Paper>
            
            {/* Rating Card */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t('restroom.rating.title')}
              </Typography>
              
              {isRated ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      {Math.round(ratingPercentage)}% {t('restroom.rating.positive', { percentage: Math.round(ratingPercentage) })}
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
                      {ratingPercentage > 70 ? t('restroom.rating.level.green') : 
                       ratingPercentage > 50 ? t('restroom.rating.level.yellow') :
                                             t('restroom.rating.level.red')}
                    </Typography>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={ratingPercentage}
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
                    {t('restroom.rating.based-on', { count: upvotes + downvotes })}
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
                {(() => {
                    // Get coordinates with GeoJSON support
                    const coords = getCoordinates(restroom);
                    
                    if (coords) {
                    return (
                        <LocationMap
                        latitude={coords.latitude}
                        longitude={coords.longitude}
                        name={name}
                        height={300}
                        />
                    );
                    } else {
                    return (
                        <Alert severity="info" sx={{ height: '100%' }}>
                        {t('restroom.no-coordinates')}
                        </Alert>
                    );
                    }
                })()}
                </Box>
                
                <Button
                variant="outlined"
                fullWidth
                startIcon={<DirectionsIcon />}
                component="a"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${street}, ${city}, ${state}, ${country}`
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
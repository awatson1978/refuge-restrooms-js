// imports/ui/components/RestroomItem.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Chip,
  LinearProgress,
  Link,
  Stack,
  Divider
} from '@mui/material';
import AccessibleIcon from '@mui/icons-material/Accessible';
import WcIcon from '@mui/icons-material/Wc';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';

// Rating colors based on percentage
const getRatingColor = (percentage) => {
  if (percentage > 70) return '#4caf50'; // Green
  if (percentage > 50) return '#ff9800'; // Orange
  return '#f44336'; // Red
};

// Rating label based on percentage
const getRatingLabel = (percentage, t) => {
  if (percentage > 70) return t('restroom.rating.positive', { percentage: Math.round(percentage) });
  if (percentage > 50) return t('restroom.rating.neutral', { percentage: Math.round(percentage) });
  return t('restroom.rating.negative', { percentage: Math.round(percentage) });
};

// Helper to convert miles to kilometers
const milesToKilometers = (miles) => {
  return miles * 1.609344;
};

// Helper to safely extract data from both FHIR and legacy formats
const getRestroomData = (restroom) => {
  // Check if this is FHIR format
  if (get(restroom, 'resourceType') === 'Location') {
    // Extract from FHIR Location resource using helper methods
    const accessibility = restroom.getAccessibilityFeatures ? restroom.getAccessibilityFeatures() : {};
    const rating = restroom.getRating ? restroom.getRating() : { upvotes: 0, downvotes: 0, percentage: 0, isRated: false };
    const address = restroom.getAddress ? restroom.getAddress() : {};
    
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
      upvote: get(rating, 'upvotes', 0),
      downvote: get(rating, 'downvotes', 0),
      ratingPercentage: get(rating, 'percentage', 0),
      isRated: get(rating, 'isRated', false),
      distance: get(restroom, 'distance') // Distance may be added by search methods
    };
  } else {
    // Legacy format - extract directly
    const upvotes = get(restroom, 'upvote', 0);
    const downvotes = get(restroom, 'downvote', 0);
    const total = upvotes + downvotes;
    const ratingPercentage = total > 0 ? (upvotes / total) * 100 : 0;
    
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
      upvote: upvotes,
      downvote: downvotes,
      ratingPercentage,
      isRated: total > 0,
      distance: get(restroom, 'distance')
    };
  }
};

const RestroomItem = ({ restroom, showDistance = false }) => {
  const { t } = useTranslation();
  
  if (!restroom) {
    return null;
  }
  
  // Extract data using our helper
  const data = getRestroomData(restroom);
  
  const ratingColor = data.isRated ? getRatingColor(data.ratingPercentage) : '#9e9e9e';
  const ratingLabel = data.isRated 
    ? getRatingLabel(data.ratingPercentage, t) 
    : t('restroom.rating.unrated');
  
  return (
    <Card 
      sx={{ 
        mb: 2,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Typography 
          component={RouterLink} 
          to={`/restrooms/${data._id}`} 
          variant="h6" 
          color="primary"
          sx={{ textDecoration: 'none', display: 'block', mb: 1 }}
        >
          {data.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {`${data.street}, ${data.city}, ${data.state}`}
          {data.country !== 'United States' && `, ${data.country}`}
        </Typography>
        
        <Stack
          direction="row"
          spacing={1}
          sx={{ my: 2 }}
        >
          {data.unisex && (
            <Chip 
              icon={<WcIcon />} 
              label={t('restroom.type.unisex')} 
              size="small"
              color="primary"
              variant="filled"
            />
          )}
          
          {data.accessible && (
            <Chip 
              icon={<AccessibleIcon />} 
              label={t('restroom.accessible')} 
              size="small"
              color="secondary"
              variant="filled"
            />
          )}
          
          {data.changing_table && (
            <Chip 
              icon={<ChildCareIcon />} 
              label={t('restroom.changing_table')} 
              size="small"
              color="success"
              variant="filled"
            />
          )}
        </Stack>
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Box sx={{ width: showDistance && data.distance ? '60%' : '70%', mr: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {ratingLabel}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={data.isRated ? data.ratingPercentage : 0}
              sx={{
                height: 8,
                borderRadius: 5,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: ratingColor,
                  borderRadius: 5,
                }
              }}
            />
            {data.isRated && (
              <Typography variant="caption" color="text.secondary">
                {t('restroom.rating.based-on', { count: data.upvote + data.downvote })}
              </Typography>
            )}
          </Box>
          
          {showDistance && data.distance !== null && data.distance !== undefined && (
            <Box sx={{ ml: 'auto', textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                {data.distance.toFixed(2)} mi
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {milesToKilometers(data.distance).toFixed(2)} km
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RestroomItem;
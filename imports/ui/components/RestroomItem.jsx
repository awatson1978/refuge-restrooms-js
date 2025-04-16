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

const RestroomItem = ({ restroom, showDistance = false }) => {
  const { t } = useTranslation();
  
  if (!restroom) {
    return null;
  }
  
  // Check if restroom has been rated
  const isRated = (restroom.upvote > 0 || restroom.downvote > 0);
  const ratingPercentage = isRated 
    ? (restroom.upvote / (restroom.upvote + restroom.downvote)) * 100 
    : 0;
  
  const ratingColor = isRated ? getRatingColor(ratingPercentage) : '#9e9e9e';
  const ratingLabel = isRated 
    ? getRatingLabel(ratingPercentage, t) 
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
          to={`/restrooms/${restroom._id}`} 
          variant="h6" 
          color="primary"
          sx={{ textDecoration: 'none', display: 'block', mb: 1 }}
        >
          {restroom.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {`${restroom.street}, ${restroom.city}, ${restroom.state}`}
        </Typography>
        
        <Stack
          direction="row"
          spacing={1}
          sx={{ my: 2 }}
        >
          {restroom.unisex && (
            <Chip 
              icon={<WcIcon />} 
              label={t('restroom.type.unisex')} 
              size="small"
              color="primary"
              variant="filled"
            />
          )}
          
          {restroom.accessible && (
            <Chip 
              icon={<AccessibleIcon />} 
              label={t('restroom.accessible')} 
              size="small"
              color="secondary"
              variant="filled"
            />
          )}
          
          {restroom.changing_table && (
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
          <Box sx={{ width: '70%', mr: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {ratingLabel}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={isRated ? ratingPercentage : 0}
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
          </Box>
          
          {showDistance && restroom.distance && (
            <Box sx={{ ml: 'auto', textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                {restroom.distance.toFixed(2)} {t('restroom.distance.miles')} /
                {' '}{milesToKilometers(restroom.distance).toFixed(2)} {t('restroom.distance.kilometers')}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RestroomItem;
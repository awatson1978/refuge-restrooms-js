// imports/ui/components/Search.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Paper, 
  InputBase, 
  Box, 
  IconButton, 
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useTranslation } from 'react-i18next';
import { Meteor } from 'meteor/meteor';

const Search = ({ isSplash = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  
  const handleSearchChange = (event) => {
    setSearchValue(event.target.value);
  };
  
  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    setError('');
    
    try {
      // Check if the search looks like a location (city, state format)
      const locationPattern = /^[a-zA-Z\s]+,\s*[a-zA-Z\s]+$/;
      const isLocationSearch = locationPattern.test(searchValue.trim());
      
      if (isLocationSearch) {
        console.log('Attempting to geocode location search:', searchValue);
        
        try {
          // Try to geocode the search term
          const coordinates = await Meteor.callAsync('geocode.address', searchValue.trim());
          
          if (coordinates && coordinates.latitude && coordinates.longitude) {
            console.log('Geocoded successfully:', coordinates);
            // Navigate with coordinates for location-based search
            navigate(`/restrooms?lat=${coordinates.latitude}&lng=${coordinates.longitude}`);
            return;
          } else {
            console.log('Geocoding failed, falling back to text search');
          }
        } catch (geocodeError) {
          console.error('Geocoding error, falling back to text search:', geocodeError);
        }
      }
      
      // Fall back to text search
      console.log('Using text search for:', searchValue);
      navigate(`/restrooms?search=${encodeURIComponent(searchValue)}`);
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError(t('search.geolocation-not-supported'));
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Navigate to search results using the coordinates
        navigate(`/restrooms?lat=${latitude}&lng=${longitude}`);
        
        // No need to reset isLocating since we're navigating away
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(t('search.geolocation-error'));
        setIsLocating(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };
  
  const handleCloseError = () => {
    setError('');
  };
  
  return (
    <>
      <Paper
        component="form"
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          width: isSplash ? '100%' : 'auto',
          maxWidth: isSplash ? 600 : 'none',
          mx: isSplash ? 'auto' : 0,
          boxShadow: isSplash ? 4 : 1,
          mb: isSplash ? 4 : 0
        }}
        elevation={isSplash ? 4 : 1}
        onSubmit={(e) => e.preventDefault()}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={t('search.placeholder')}
          inputProps={{ 'aria-label': t('search.aria-label') }}
          value={searchValue}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
        />
        
        <IconButton 
          sx={{ p: '10px' }} 
          aria-label={t('search.submit')}
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? <CircularProgress size={24} /> : <SearchIcon />}
        </IconButton>
        
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        
        <IconButton 
          color="primary" 
          sx={{ p: '10px' }} 
          aria-label={t('search.use-location')}
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? <CircularProgress size={24} /> : <MyLocationIcon />}
        </IconButton>
      </Paper>
      
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Search;
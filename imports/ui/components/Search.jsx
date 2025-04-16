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
  
  const handleSearch = () => {
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    
    // Navigate to search results using the search term
    navigate(`/restrooms?search=${encodeURIComponent(searchValue)}`);
    
    // No need to reset isSearching since we're navigating away
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
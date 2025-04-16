// imports/ui/components/LocationMap.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { Meteor } from 'meteor/meteor';
import GoogleMapReact from 'google-map-react';
import { get } from 'lodash';

const Marker = ({ text }) => (
  <div style={{
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: '30px',
    height: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '50%',
    backgroundColor: '#8a6db1',
    color: 'white',
    fontWeight: 'bold',
    border: '3px solid white',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    zIndex: 1
  }}>
    <div style={{
      position: 'absolute',
      width: '150px',
      top: '35px',
      left: '-60px',
      backgroundColor: 'white',
      color: '#333',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      textAlign: 'center',
      pointerEvents: 'none'
    }}>
      {text}
    </div>
  </div>
);

const LocationMap = ({ latitude, longitude, name, height = 300 }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get API key
  useEffect(() => {
    const getKey = async () => {
      try {
        const key = await Meteor.callAsync('getGoogleMapsApiKey');
        console.log('Got Maps API key:', key ? 'Yes (non-empty)' : 'No (empty)');
        setApiKey(key);
        setLoading(false);
      } catch (err) {
        console.error('Error getting Maps API key:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    getKey();
  }, []);

  // Check for valid coordinates - handle both GeoJSON and direct coordinates
  let lat, lng;
  
  // Case 1: direct latitude/longitude props passed to component
  if (latitude !== undefined && longitude !== undefined && 
      !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
    lat = parseFloat(latitude);
    lng = parseFloat(longitude);
  }
  
  const hasValidCoordinates = lat !== undefined && lng !== undefined;

  if (!hasValidCoordinates) {
    return (
      <Alert severity="info" sx={{ height }}>
        This restroom doesn't have valid coordinates.
      </Alert>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: '#f5f5f5' 
        }}
      >
        <CircularProgress size={30} />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert severity="error" sx={{ height }}>
        Error loading map: {error}
      </Alert>
    );
  }

  // Show placeholder if no API key
  if (!apiKey) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          bgcolor: '#f5f5f5',
          textAlign: 'center',
          p: 2
        }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Map requires Google Maps API key
        </Typography>
        <Box sx={{ mt: 1, width: '100%', height: '60%', border: '1px dashed #ccc', borderRadius: 1, p: 1 }}>
          <Typography variant="caption" display="block" gutterBottom>
            Location: {lat.toFixed(6)}, {lng.toFixed(6)}
          </Typography>
          <Box 
            sx={{ 
              width: '100%', 
              height: '80%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              bgcolor: '#eee'
            }}
          >
            <Typography variant="caption">Map Placeholder</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height, width: '100%' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ key: apiKey }}
        defaultCenter={{ lat, lng }}
        defaultZoom={15}
        options={{
          fullscreenControl: false
        }}
      >
        <Marker
          lat={lat}
          lng={lng}
          text={name || "Restroom Location"}
        />
      </GoogleMapReact>
    </Box>
  );
};

export default LocationMap;
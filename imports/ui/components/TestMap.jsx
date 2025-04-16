// imports/ui/components/TestMap.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { Meteor } from 'meteor/meteor';
import GoogleMapReact from 'google-map-react';

const SimpleMarker = () => (
  <div style={{
    color: 'white', 
    background: 'red',
    padding: '10px',
    borderRadius: '50%',
    display: 'inline-flex',
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)'
  }}>
    X
  </div>
);

const TestMap = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getKey = async () => {
      try {
        const key = await Meteor.callAsync('getGoogleMapsApiKey');
        console.log('Got API key:', key ? 'Yes (non-empty)' : 'No (empty)');
        setApiKey(key);
        setLoading(false);
      } catch (err) {
        console.error('Error getting API key:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    getKey();
  }, []);

  const handleApiLoaded = ({ map, maps }) => {
    console.log('Map API loaded successfully!');
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  if (!apiKey) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">No Google Maps API Key</Typography>
        <Typography>Please provide a Google Maps API key in settings.json</Typography>
      </Paper>
    );
  }

  const defaultProps = {
    center: {
      lat: 40.7128,
      lng: -74.0060
    },
    zoom: 11
  };

  return (
    <Box 
      sx={{ 
        height: '400px', 
        width: '100%', 
        position: 'relative',
        '& > div': {
          height: '100% !important',
          width: '100% !important'
        }
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        Test Map (NYC)
      </Typography>
      
      <div style={{ height: '90%', width: '100%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: apiKey }}
          defaultCenter={defaultProps.center}
          defaultZoom={defaultProps.zoom}
          onGoogleApiLoaded={handleApiLoaded}
          yesIWantToUseGoogleMapApiInternals
        >
          <SimpleMarker
            lat={defaultProps.center.lat}
            lng={defaultProps.center.lng}
          />
        </GoogleMapReact>
      </div>
    </Box>
  );
};

export default TestMap;
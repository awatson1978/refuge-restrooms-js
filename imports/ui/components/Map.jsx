// imports/ui/components/Map.jsx (modified for debugging)
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { Meteor } from 'meteor/meteor';
import GoogleMapReact from 'google-map-react';

// Simple Marker component
const Marker = ({ text }) => (
  <div style={{
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#8a6db1',
    border: '2px solid white',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    zIndex: 1
  }}>
    <div style={{
      position: 'absolute',
      width: '200px',
      left: '25px',
      top: '-10px',
      color: 'black',
      fontWeight: 'bold'
    }}>
      {text}
    </div>
  </div>
);

const MapComponent = ({ 
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  height = 400,
  restrooms = [],
  onMarkerClick = () => {} 
}) => {
  const [mapApiKey, setMapApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState({});

  // Get Google Maps API key from server
  useEffect(() => {
    const getApiKey = async () => {
      try {
        console.log('Fetching Google Maps API key...');
        setDebugInfo(prev => ({ ...prev, status: 'fetching-key' }));
        
        // Try to get the API key from server
        const apiKey = await Meteor.callAsync('getGoogleMapsApiKey');
        
        console.log('API key received:', apiKey ? 'Yes (non-empty)' : 'No (empty)');
        setDebugInfo(prev => ({ 
          ...prev, 
          status: 'key-received',
          hasKey: !!apiKey 
        }));
        
        setMapApiKey(apiKey || '');
        setLoading(false);
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        setError(`Error fetching API key: ${err.message}`);
        setDebugInfo(prev => ({ 
          ...prev, 
          status: 'key-error',
          error: err.message
        }));
        setLoading(false);
      }
    };

    getApiKey();
  }, []);

  // Handle when API is loaded
  const handleApiLoaded = ({ map, maps }) => {
    console.log('Google Maps API loaded');
    setDebugInfo(prev => ({ ...prev, status: 'api-loaded' }));
    
    // Add markers for restrooms if we have data
    if (restrooms && restrooms.length > 0) {
      console.log(`Adding ${restrooms.length} restroom markers`);
      setDebugInfo(prev => ({ 
        ...prev, 
        markerCount: restrooms.length 
      }));
      
      // You could add markers here using the maps API directly if needed
    }
  };

  // Handle API load error
  const handleApiLoadError = (err) => {
    console.error('Google Maps API load error:', err);
    setError(`Error loading Google Maps: ${err.message}`);
    setDebugInfo(prev => ({ 
      ...prev, 
      status: 'api-error',
      apiError: err.message
    }));
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 1
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading map...
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ 
        height, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 1,
        p: 2
      }}>
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Debug info: {JSON.stringify(debugInfo)}
        </Typography>
      </Box>
    );
  }

  // Development mode message if no API key
  if (!mapApiKey) {
    return (
      <Paper 
        elevation={1} 
        sx={{ 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          p: 2
        }}
      >
        <Typography variant="h6" gutterBottom>
          Google Maps API Key Missing
        </Typography>
        <Typography variant="body1" paragraph>
          The map will appear here once a Google Maps API key is configured.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For development, you can add a key in <code>settings.json</code> under <code>public.googleMaps.publicApiKey</code>
        </Typography>
        
        {/* Test component to verify React rendering works */}
        <Box sx={{ mt: 4, border: '1px dashed grey', p: 2, width: '80%' }}>
          <Typography variant="body2" color="primary">
            This is a placeholder map component.
          </Typography>
          <Box sx={{ 
            height: '100px', 
            backgroundColor: '#e0e0e0', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 1
          }}>
            {restrooms.length > 0 ? (
              <Typography>
                {restrooms.length} restrooms would be shown here
              </Typography>
            ) : (
              <Typography>No restrooms in this area</Typography>
            )}
          </Box>
        </Box>
      </Paper>
    );
  }

  // Render the actual map
  return (
    <Box sx={{ height, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ 
          key: mapApiKey,
          libraries: ['places']
        }}
        defaultCenter={center}
        center={center}
        defaultZoom={zoom}
        yesIWantToUseGoogleMapApiInternals
        onGoogleApiLoaded={handleApiLoaded}
        onError={handleApiLoadError}
        options={{
          fullscreenControl: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false
        }}
      >
        {/* Add a test marker at the center */}
        <Marker
          lat={center.lat}
          lng={center.lng}
          text="Map Center"
        />
        
        {/* Map through restrooms and add markers */}
        {restrooms.map((restroom) => (
          <Marker
            key={restroom._id || 'test'}
            lat={restroom.latitude || restroom.position?.latitude}
            lng={restroom.longitude || restroom.position?.longitude}
            text={restroom.name}
            onClick={() => onMarkerClick(restroom)}
          />
        ))}
      </GoogleMapReact>
    </Box>
  );
};

export default MapComponent;
// imports/ui/pages/RestroomsList.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Pagination,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Divider
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccessibleIcon from '@mui/icons-material/Accessible';
import WcIcon from '@mui/icons-material/Wc';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';

import MainLayout from '../layouts/MainLayout';
import RestroomItem from '../components/RestroomItem';
import Map from '../components/Map';
import TestMap from '../components/TestMap';
import Search from '../components/Search';

const ITEMS_PER_PAGE = 10;

// Helper to parse search params
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const RestroomsList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery();
  const location = useLocation();
  
  // Get query parameters
  const searchParam = query.get('search');
  const latParam = query.get('lat');
  const lngParam = query.get('lng');
  const viewParam = query.get('view') || 'list';
  const pageParam = parseInt(query.get('page') || '1', 10);

  // Convert lat/lng to numbers
  const latitude = latParam ? parseFloat(latParam) : null;
  const longitude = lngParam ? parseFloat(lngParam) : null;
  const hasValidCoordinates = 
    latitude !== null && 
    longitude !== null && 
    !isNaN(latitude) && 
    !isNaN(longitude);

  // Set map center if coordinates are valid
  const [mapCenter, setMapCenter] = useState(
    hasValidCoordinates
      ? { lat: latitude, lng: longitude }
      : null
  );
  
  // Local state
  const [view, setView] = useState(viewParam);
  const [page, setPage] = useState(pageParam);
  const [selectedRestroomId, setSelectedRestroomId] = useState(null);
  const [filters, setFilters] = useState({
    accessible: query.get('accessible') === 'true',
    unisex: query.get('unisex') === 'true',
    changing_table: query.get('changing_table') === 'true'
  });

  // Data state using FHIR methods
  const [data, setData] = useState({
    loading: true,
    restrooms: [],
    count: 0,
    error: null
  });
  
  // Load data using FHIR methods
  useEffect(() => {
    const loadData = async () => {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        console.log('Loading restrooms data with parameters:', { 
          searchParam, 
          hasCoords: hasValidCoordinates,
          lat: latitude, 
          lng: longitude,
          filters
        });
        
        let results;
        
        // Route to appropriate FHIR method based on search type
        if (hasValidCoordinates) {
          console.log(`Calling FHIR location search with lat=${latitude}, lng=${longitude}`);
          results = await Meteor.callAsync('fhir.locations.searchByLocation', latitude, longitude, {
            limit: ITEMS_PER_PAGE,
            skip: (page - 1) * ITEMS_PER_PAGE,
            returnLegacyFormat: true // For UI compatibility
          });
          
          console.log('FHIR location search results:', {
            count: results.length,
            firstResult: results[0] ? get(results[0], 'name') : 'none'
          });
          
          setData({
            loading: false,
            restrooms: results,
            count: results.length,
            error: null
          });
          
        } else if (searchParam) {
          console.log(`Calling FHIR text search with query="${searchParam}"`);
          results = await Meteor.callAsync('fhir.locations.searchByText', searchParam, {
            limit: ITEMS_PER_PAGE,
            skip: (page - 1) * ITEMS_PER_PAGE,
            returnLegacyFormat: true
          });
          
          console.log('FHIR text search results:', {
            count: results.length,
            firstResult: results[0] ? get(results[0], 'name') : 'none'
          });
          
          setData({
            loading: false,
            restrooms: results,
            count: results.length,
            error: null
          });
          
        } else {
          // Default fetch with filters
          console.log('Calling FHIR getAll with filters:', filters);
          const result = await Meteor.callAsync('fhir.locations.getAll', {
            limit: ITEMS_PER_PAGE,
            skip: (page - 1) * ITEMS_PER_PAGE,
            accessible: filters.accessible,
            unisex: filters.unisex,
            changing_table: filters.changing_table,
            returnLegacyFormat: true
          });
          
          console.log('FHIR getAll results:', {
            locations: get(result, 'locations.length', 0),
            totalCount: get(result, 'count', 0)
          });
          
          setData({
            loading: false,
            restrooms: get(result, 'locations', []),
            count: get(result, 'count', 0),
            error: null
          });
        }
        
      } catch (err) {
        console.error('Error fetching FHIR restrooms data:', err);
        
        // Fallback to legacy methods if FHIR fails
        console.warn('FHIR methods failed, attempting legacy fallback...');
        try {
          let fallbackResults;
          
          if (hasValidCoordinates) {
            fallbackResults = await Meteor.callAsync('restrooms.searchByLocation', latitude, longitude, {
              limit: ITEMS_PER_PAGE,
              skip: (page - 1) * ITEMS_PER_PAGE
            });
            
            setData({
              loading: false,
              restrooms: fallbackResults,
              count: fallbackResults.length,
              error: null
            });
          } else if (searchParam) {
            fallbackResults = await Meteor.callAsync('restrooms.search', searchParam, {
              limit: ITEMS_PER_PAGE,
              skip: (page - 1) * ITEMS_PER_PAGE
            });
            
            setData({
              loading: false,
              restrooms: fallbackResults,
              count: fallbackResults.length,
              error: null
            });
          } else {
            const fallbackResult = await Meteor.callAsync('restroomsDirectFetch', {
              limit: ITEMS_PER_PAGE,
              skip: (page - 1) * ITEMS_PER_PAGE,
              accessible: filters.accessible,
              unisex: filters.unisex,
              changing_table: filters.changing_table
            });
            
            setData({
              loading: false,
              restrooms: get(fallbackResult, 'restrooms', []),
              count: get(fallbackResult, 'count', 0),
              error: null
            });
          }
          
          console.log('Legacy fallback successful');
          
        } catch (legacyErr) {
          console.error('Both FHIR and legacy methods failed:', legacyErr);
          setData({
            loading: false,
            restrooms: [],
            count: 0,
            error: legacyErr.message || 'Failed to load restrooms data'
          });
        }
      }
    };
    
    loadData();
  }, [searchParam, latitude, longitude, page, filters.accessible, filters.unisex, filters.changing_table]);
  
  // Handler for view change
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
      
      // Update the URL to reflect the view change
      const params = new URLSearchParams(location.search);
      params.set('view', newView);
      navigate({
        pathname: location.pathname,
        search: params.toString()
      }, { replace: true });
    }
  };
  
  // Handler for filter changes
  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.checked
    });
    // Reset to page 1 when filters change
    setPage(1);
  };
  
  // Handler for page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    
    // Update URL with new page
    const params = new URLSearchParams(location.search);
    params.set('page', newPage.toString());
    navigate({
      pathname: location.pathname,
      search: params.toString()
    }, { replace: true });
    
    window.scrollTo(0, 0);
  };
  
  // Handler for map marker click
  const handleMarkerClick = (restroom) => {
    const restroomId = get(restroom, '_id') || get(restroom, 'id');
    setSelectedRestroomId(restroomId);
  };
  
  const { loading, restrooms, count, error } = data;
  
  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Filters and View Toggles */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormGroup row>
                  <Typography variant="subtitle1" sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                    {t('restrooms.filters')}:
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={filters.accessible} 
                        onChange={handleFilterChange} 
                        name="accessible"
                        icon={<AccessibleIcon color="disabled" />}
                        checkedIcon={<AccessibleIcon color="secondary" />}
                      />
                    }
                    label={t('restroom.accessible')}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={filters.unisex} 
                        onChange={handleFilterChange} 
                        name="unisex"
                        icon={<WcIcon color="disabled" />}
                        checkedIcon={<WcIcon color="primary" />}
                      />
                    }
                    label={t('restroom.type.unisex')}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={filters.changing_table} 
                        onChange={handleFilterChange} 
                        name="changing_table"
                        icon={<ChildCareIcon color="disabled" />}
                        checkedIcon={<ChildCareIcon color="success" />}
                      />
                    }
                    label={t('restroom.changing_table')}
                  />
                </FormGroup>
                
                <ToggleButtonGroup
                  value={view}
                  exclusive
                  onChange={handleViewChange}
                  aria-label="view mode"
                  size="small"
                >
                  <ToggleButton value="list" aria-label={t('restrooms.list-view')}>
                    <ViewListIcon />
                  </ToggleButton>
                  <ToggleButton value="map" aria-label={t('restrooms.map-view')}>
                    <MapIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Search />
            </Paper>
          </Grid>
          
          {/* Development Debug Panel */}
          {process.env.NODE_ENV !== 'production' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="subtitle2" gutterBottom>Debug Info (Development)</Typography>
                <Typography variant="body2" component="div">
                  <Box component="pre" sx={{ fontSize: '0.8rem' }}>
                    {JSON.stringify({ 
                      loading, 
                      restroomsCount: restrooms?.length || 0,
                      totalCount: count,
                      view,
                      page,
                      filters,
                      hasCoords: hasValidCoordinates
                    }, null, 2)}
                  </Box>
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                      Meteor.call('test.insertFhirLocations', 20, (err, res) => { 
                        if (err) {
                          console.error('Error inserting FHIR test data:', err);
                          alert('Error inserting FHIR test data: ' + err.message);
                        } else {
                          console.log('FHIR test data inserted:', res);
                          alert('Added 20 test FHIR locations!');
                          window.location.reload();
                        }
                      });
                    }}
                  >
                    Add FHIR Test Data
                  </Button>
                  {' '}
                  <Button 
                    variant="outlined" 
                    size="small" 
                    color="error"
                    onClick={() => {
                      Meteor.call('test.clearFhirTestData', (err, res) => { 
                        if (err) {
                          console.error('Error clearing FHIR test data:', err);
                          alert('Error clearing FHIR test data: ' + err.message);
                        } else {
                          console.log('FHIR test data cleared:', res);
                          alert(`Removed ${res.count} test FHIR locations!`);
                          window.location.reload();
                        }
                      });
                    }}
                  >
                    Clear FHIR Test Data
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
          
          {/* Map View */}
          {view === 'map' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, height: '100%' }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Alert severity="error">{error}</Alert>
                ) : (
                  <Box>
                    <TestMap /> {/* Use the test map for now */}
                    
                    {/* Uncomment this and remove TestMap when ready */}
                    {/* <Map 
                      restrooms={restrooms} 
                      center={mapCenter}
                      height={500}
                      onMarkerClick={handleMarkerClick}
                      selectedRestroomId={selectedRestroomId}
                    /> */}
                    
                    {selectedRestroomId && (
                      <Box sx={{ mt: 2 }}>
                        {restrooms.filter(r => {
                          const id = get(r, '_id') || get(r, 'id');
                          return id === selectedRestroomId;
                        }).map(restroom => (
                          <RestroomItem 
                            key={get(restroom, '_id') || get(restroom, 'id')} 
                            restroom={restroom}
                            showDistance={!!latParam && !!lngParam}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>
          )}
          
          {/* List View */}
          {view === 'list' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading restrooms using FHIR methods...
                    </Typography>
                  </Box>
                ) : error ? (
                  <Alert severity="error">
                    {error}
                    <Box sx={{ mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </Button>
                    </Box>
                  </Alert>
                ) : restrooms.length === 0 ? (
                  <Alert severity="info">{t('restrooms.no-results')}</Alert>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {searchParam 
                        ? t('restrooms.search-results', { count: restrooms.length, term: searchParam })
                        : latParam && lngParam
                          ? t('restrooms.nearby-results', { count: restrooms.length })
                          : t('restrooms.all-results', { count: restrooms.length })}
                    </Typography>
                    
                    <Box sx={{ my: 2 }}>
                      {restrooms.map(restroom => (
                        <RestroomItem 
                          key={get(restroom, '_id') || get(restroom, 'id')} 
                          restroom={restroom}
                          showDistance={!!latParam && !!lngParam}
                        />
                      ))}
                    </Box>
                    
                    {count > ITEMS_PER_PAGE && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination 
                          count={Math.ceil(count / ITEMS_PER_PAGE)} 
                          page={page} 
                          onChange={handlePageChange}
                          color="primary"
                          shape="rounded"
                        />
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default RestroomsList;
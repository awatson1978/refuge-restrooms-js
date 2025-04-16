// server/methods/restrooms.js
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Restrooms } from '../../imports/api/restrooms/collection';
import { RefugeApiService } from '../../imports/api/production/apiService';
import { HydrationService } from '../../imports/api/hydration/hydrationService';

// Helper function to combine local and production results
const combineResults = (localResults, productionResults) => {
  // If no production results, just return local
  if (!productionResults || !Array.isArray(productionResults) || productionResults.length === 0) {
    return localResults;
  }
  
  // Create a map of local results by ID to check for duplicates
  const localMap = new Map();
  localResults.forEach(restroom => {
    // Use production ID if available, otherwise use local ID
    const id = restroom.productionId || restroom._id;
    localMap.set(id.toString(), restroom);
  });
  
  // Transform production results to match our schema
  const transformedProductionResults = productionResults.map(restroom => {
    // Skip if already in local results
    if (localMap.has(restroom.id.toString())) {
      return null;
    }
    
    return {
      // Use production ID as _id to ensure uniqueness across datasets
      _id: `p_${restroom.id}`,
      name: restroom.name,
      street: restroom.street,
      city: restroom.city,
      state: restroom.state,
      country: restroom.country || 'United States',
      position: {
        latitude: restroom.latitude,
        longitude: restroom.longitude
      },
      accessible: !!restroom.accessible,
      unisex: !!restroom.unisex,
      changing_table: !!restroom.changing_table,
      directions: restroom.directions || '',
      comment: restroom.comment || '',
      upvote: restroom.upvote || 0,
      downvote: restroom.downvote || 0,
      approved: true,
      status: 'active',
      productionId: restroom.id.toString(),
      createdAt: new Date(restroom.created_at) || new Date(),
      updatedAt: new Date(restroom.updated_at) || new Date(),
      isFromProduction: true // Flag to indicate this is from production API
    };
  }).filter(Boolean); // Remove null entries (duplicates)
  
  // Combine local and transformed production results
  return [...localResults, ...transformedProductionResults];
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance * 0.621371; // Convert to miles
  }

// Method to fetch restrooms directly without subscriptions
Meteor.methods({
  'restroomsDirectFetch': async function(options = {}) {
    console.log('restroomsDirectFetch called with options:', options);
    
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    const sort = options.sort || { createdAt: -1 };
    
    // Create basic query
    const query = {};
    
    // Add filters if specified
    if (options.accessible === true) query.accessible = true;
    if (options.unisex === true) query.unisex = true;
    if (options.changing_table === true) query.changing_table = true;
    
    // Handle location-based search
    if (options.lat && options.lng) {
        const lat = parseFloat(options.lat);
        const lng = parseFloat(options.lng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
        console.log(`Location-based search at (${lat}, ${lng})`);
        // Call the dedicated location search method and return its results
        const results = await Meteor.callAsync('restrooms.searchByLocation', lat, lng, {
            limit,
            skip,
            ...options
        });
        
        // Make sure the results are properly formatted for the UI
        return {
            restrooms: results || [],
            count: results?.length || 0
        };
        }
    }
    
    // If not a location-based search, continue with normal fetching
    try {
        // Get the restrooms from local database
        const restrooms = await Restrooms.find(query, {
        limit,
        skip,
        sort
        }).fetchAsync();
        
        // Get the total count
        const count = await Restrooms.find(query).countAsync();
        
        console.log(`Fetched ${restrooms.length} restrooms of ${count} total from local database`);
        
        // If we need to get production data based on options
        let combinedRestrooms = restrooms;
        
        // Check if we should use production data
        const useProduction = Meteor.settings?.public?.useProductionAPI === true;
        
        if (useProduction) {
        try {
            // Get production API results based on options
            let productionRestrooms = [];
            
            if (options.search) {
            // Search by query
            productionRestrooms = await RefugeApiService.searchRestrooms(
                options.search,
                limit
            );
            } else {
            // Get with filters
            const filters = {};
            if (options.accessible === true) filters.ada = true;
            if (options.unisex === true) filters.unisex = true;
            
            productionRestrooms = await RefugeApiService.getRestroomsWithFilters(
                filters,
                limit
            );
            }
            
            console.log(`Fetched ${productionRestrooms.length} restrooms from production API`);
            
            // Combine results
            combinedRestrooms = combineResults(restrooms, productionRestrooms);
            
            // If hydration is enabled, save production results to local DB
            if (HydrationService.isHydrationEnabled() && productionRestrooms.length > 0) {
            // We'll do this asynchronously to not block the response
            Promise.resolve().then(async () => {
                const hydrationResult = await HydrationService.hydrateFromResults(productionRestrooms);
                console.log('Hydration complete:', hydrationResult);
            }).catch(error => {
                console.error('Hydration error:', error);
            });
            }
        } catch (error) {
            console.error('Error fetching from production API:', error);
            // Continue with local results only
        }
        }
        
        return {
        restrooms: combinedRestrooms,
        count: count + (combinedRestrooms.length - restrooms.length) // Adjust count for added production results
        };
    } catch (error) {
        console.error('Error in restroomsDirectFetch:', error);
        throw new Meteor.Error('fetch-error', error.message);
    }
  },
  
  'restrooms.getById': async function(id) {
    console.log('Getting restroom with ID:', id);
    
    // Basic validation
    check(id, String);
    
    try {
      // Find the restroom
      const restroom = await Restrooms.findOneAsync({ _id: id });
      
      if (!restroom) {
        throw new Meteor.Error('not-found', 'Restroom not found');
      }
      
      console.log('Found restroom:', restroom.name);
      return restroom;
    } catch (error) {
      console.error('Error in restrooms.getById:', error);
      throw new Meteor.Error('fetch-error', error.message);
    }
  },
  
  'restrooms.searchByLocation': async function(lat, lng, options = {}) {
  // Input validation
  check(lat, Number);
  check(lng, Number);
  check(options, Match.Optional(Object));
  
  const limit = options?.limit || 20;
  const radius = options?.radius || 20; // miles
  
  console.log(`Searching restrooms by location (${lat}, ${lng}) with radius ${radius} miles`);
  
  try {
    // Convert radius from miles to meters for geospatial query
    // 1 mile ≈ 1609.34 meters
    const radiusInMeters = radius * 1609.34;
    
    // Use proper GeoJSON query with $near
    console.log('Executing MongoDB $near query with GeoJSON format');
    const localRestrooms = await Restrooms.find({
      position: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat] // Note: GeoJSON uses [longitude, latitude] order
          },
          $maxDistance: radiusInMeters
        }
      }
    }, {
      limit,
      skip: options?.skip || 0
    }).fetchAsync();
    
    console.log(`Found ${localRestrooms?.length || 0} restrooms in local database`);
    
    if (localRestrooms?.length === 0) {
      console.log('No results from $near query. Checking database for any records:');
      const sampleRestroom = await Restrooms.findOneAsync();
      console.log('Sample restroom from database:', 
        sampleRestroom ? {
          _id: sampleRestroom._id,
          name: sampleRestroom.name,
          position: sampleRestroom.position
        } : 'No restrooms in database');
    }
    
    // Check if we should use production data
    const useProduction = Meteor.settings?.public?.useProductionAPI === true;
    
    if (useProduction) {
      try {
        // Get production API results
        const productionRestrooms = await RefugeApiService.getRestroomsByLocation(lat, lng, limit);
        
        console.log(`Found ${productionRestrooms.length} restrooms from production API`);
        
        // Combine results
        let combinedRestrooms = combineResults(localRestrooms, productionRestrooms);
        
        // Calculate and add distance to each restroom
        combinedRestrooms = combinedRestrooms.map(restroom => {
          let distance = null;
          
          // Extract coordinates from appropriate place based on data structure
          if (restroom.position && restroom.position.type === 'Point' && 
              Array.isArray(restroom.position.coordinates) && 
              restroom.position.coordinates.length === 2) {
            // Calculate distance using Haversine formula
            const rLng = restroom.position.coordinates[0]; // GeoJSON: [lng, lat]
            const rLat = restroom.position.coordinates[1];
            
            // Haversine formula
            const R = 3959; // Earth radius in miles
            const dLat = (rLat - lat) * Math.PI / 180;
            const dLng = (rLng - lng) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(rLat * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distance = R * c;
            
            // Format to 2 decimal places
            distance = Math.round(distance * 100) / 100;
          }
          
          return { ...restroom, distance };
        }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        
        // If hydration is enabled, save production results to local DB
        if (HydrationService.isHydrationEnabled() && productionRestrooms.length > 0) {
          // We'll do this asynchronously to not block the response
          Promise.resolve().then(async () => {
            const hydrationResult = await HydrationService.hydrateFromResults(productionRestrooms);
            console.log('Hydration complete:', hydrationResult);
          }).catch(error => {
            console.error('Hydration error:', error);
          });
        }
        
        return combinedRestrooms;
      } catch (error) {
        console.error('Error fetching from production API:', error);
        // Continue with local results only
        return localRestrooms;
      }
    } else {
      return localRestrooms;
    }
  } catch (error) {
    console.error('Error in restrooms.searchByLocation:', error);
    throw new Meteor.Error('search-error', error.message);
  }
  },
  
  'restrooms.search': async function(query, options = {}) {
    check(query, String);
    check(options, Object);
    
    const limit = options.limit || 20;
    
    console.log(`Searching restrooms with query: "${query}"`);
    
    try {
      // Search in local database using text search
      const localRestrooms = await Restrooms.find(
        { $text: { $search: query } },
        {
          fields: {
            score: { $meta: 'textScore' }
          },
          sort: {
            score: { $meta: 'textScore' }
          },
          limit
        }
      ).fetchAsync();
      
      console.log(`Found ${localRestrooms.length} restrooms in local database`);
      
      // Check if we should use production data
      const useProduction = Meteor.settings?.public?.useProductionAPI === true;
      
      if (useProduction) {
        try {
          // Get production API results
          const productionRestrooms = await RefugeApiService.searchRestrooms(query, limit);
          
          console.log(`Found ${productionRestrooms.length} restrooms from production API`);
          
          // Combine results
          const combinedRestrooms = combineResults(localRestrooms, productionRestrooms);
          
          // If hydration is enabled, save production results to local DB
          if (HydrationService.isHydrationEnabled() && productionRestrooms.length > 0) {
            // We'll do this asynchronously to not block the response
            Promise.resolve().then(async () => {
              const hydrationResult = await HydrationService.hydrateFromResults(productionRestrooms);
              console.log('Hydration complete:', hydrationResult);
            }).catch(error => {
              console.error('Hydration error:', error);
            });
          }
          
          return combinedRestrooms;
        } catch (error) {
          console.error('Error fetching from production API:', error);
          // Continue with local results only
          return localRestrooms;
        }
      } else {
        return localRestrooms;
      }
    } catch (error) {
      console.error('Error in restrooms.search:', error);
      throw new Meteor.Error('search-error', error.message);
    }
  }
});
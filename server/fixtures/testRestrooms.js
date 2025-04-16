// server/fixtures/testRestrooms.js
import { Meteor } from 'meteor/meteor';
import { Restrooms } from '../../imports/api/restrooms/collection';

// Insert test restroom data with proper GeoJSON format
Meteor.methods({
  'test.insertRestrooms': function(count = 10) {
    // Only allow in development
    if (Meteor.isProduction) {
      throw new Meteor.Error('not-allowed', 'Test data can only be created in development mode');
    }
    
    console.log(`Inserting ${count} test restrooms with GeoJSON format`);
    
    const cities = [
      { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
      { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
      { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
      { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
      { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
      { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
      { name: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
      { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
      { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
      { name: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 }
    ];
    
    const restroomNames = [
      'Coffee Shop Restroom', 'Library Bathroom', 'Mall Facilities',
      'Restaurant Restroom', 'Gas Station Toilet', 'Park Bathroom',
      'Museum Facilities', 'Theater Restroom', 'Hotel Bathroom',
      'Gym Restroom', 'University Facilities', 'Hospital Bathroom',
      'Airport Restroom', 'Train Station Toilet', 'Office Building Bathroom'
    ];
    
    // Clear existing test data
    Restrooms.remove({ isTestData: true });
    
    // Insert new test data
    const insertedIds = [];
    
    for (let i = 0; i < count; i++) {
      const cityIndex = i % cities.length;
      const nameIndex = i % restroomNames.length;
      const city = cities[cityIndex];
      
      // Add some random variation to coordinates
      const latVariation = (Math.random() * 0.02) - 0.01; // +/- 0.01 degrees (roughly 1 km)
      const lngVariation = (Math.random() * 0.02) - 0.01;
      
      const restroomId = Restrooms.insert({
        name: `${restroomNames[nameIndex]} ${i + 1}`,
        street: `${100 + i} Main St`,
        city: city.name,
        state: city.state,
        country: 'United States',
        // Proper GeoJSON format for position
        position: {
          type: 'Point',
          coordinates: [
            city.lng + lngVariation, // Longitude first in GeoJSON
            city.lat + latVariation  // Latitude second in GeoJSON
          ]
        },
        accessible: Math.random() > 0.5,
        unisex: Math.random() > 0.3,
        changing_table: Math.random() > 0.7,
        directions: 'Enter through the main door and turn right.',
        comment: 'Clean and well-maintained.',
        upvote: Math.floor(Math.random() * 50),
        downvote: Math.floor(Math.random() * 10),
        approved: true,
        status: 'active',
        edit_id: `test-${i}`,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
        updatedAt: new Date(),
        isTestData: true // Mark as test data for easy cleanup
      });
      
      insertedIds.push(restroomId);
    }
    
    return { 
      success: true, 
      count, 
      message: `Inserted ${count} test restrooms with GeoJSON format`,
      ids: insertedIds
    };
  },
  
  'test.clearTestData': function() {
    // Only allow in development
    if (Meteor.isProduction) {
      throw new Meteor.Error('not-allowed', 'Test data can only be removed in development mode');
    }
    
    const removed = Restrooms.remove({ isTestData: true });
    console.log(`Removed ${removed} test restrooms`);
    
    return { success: true, count: removed };
  }
});
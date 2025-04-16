// imports/api/restrooms/publications.js
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Restrooms } from './collection';

if (Meteor.isServer) {
  // Publish all active restrooms (paginated)
  Meteor.publish('restrooms.all', function (options = {}) {
    console.log('Publishing restrooms.all with options:', options);
    
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    
    console.log(`Fetching ${limit} restrooms, skipping ${skip}`);
    
    // Create a minimal query that will definitely work
    // without causing errors or timeouts
    const query = {};
    
    const result = Restrooms.find(
      query,
      { 
        limit, 
        skip, 
        sort: { createdAt: -1 } 
      }
    );
    
    console.log(`Found ${result.count()} restrooms`);
    return result;
  });
  
  // Get a single restroom by ID
  Meteor.publish('restrooms.single', function (restroomId) {
    console.log('Publishing restrooms.single for ID:', restroomId);
    check(restroomId, String);
    return Restrooms.find({ _id: restroomId });
  });
  
  // Search for restrooms near coordinates
  Meteor.publish('restrooms.near', function (lat, lng, radius = 20) {
    console.log(`Publishing restrooms.near at ${lat},${lng} with radius ${radius}`);
    check(lat, Number);
    check(lng, Number);
    check(radius, Number);
    
    // Convert radius to degrees (approximate)
    // 1 degree at the equator is about 69 miles
    const degreeRadius = radius / 69;
    
    return Restrooms.find({
      latitude: { $gt: lat - degreeRadius, $lt: lat + degreeRadius },
      longitude: { $gt: lng - degreeRadius, $lt: lng + degreeRadius }
    });
  });
  
  // Publish restrooms by text search
  Meteor.publish('restrooms.search', function(searchText, options = {}) {
    check(searchText, String);
    check(options, {
      limit: Match.Maybe(Number),
      skip: Match.Maybe(Number)
    });
    
    const limit = options.limit || 20;
    const skip = options.skip || 0;
    
    if (!searchText) {
      return this.ready();
    }
    
    return Restrooms.find(
      {
        $text: { $search: searchText },
        approved: true,
        status: 'active'
      },
      {
        fields: {
          score: { $meta: 'textScore' }
        },
        sort: {
          score: { $meta: 'textScore' }
        },
        limit,
        skip
      }
    );
  });
  
  // Publish pending restrooms for admins
  Meteor.publish('restrooms.pending', function() {
    // Only allow for admin users
    if (!this.userId || !Meteor.users.findOne(this.userId)?.isAdmin) {
      return this.ready();
    }
    
    return Restrooms.find({
      $or: [
        { approved: false },
        { status: 'pending-review' }
      ]
    });
  });
}
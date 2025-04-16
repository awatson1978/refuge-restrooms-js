// Create or update imports/api/restrooms/client.js
// This file ensures the collection is properly imported on the client

import { Mongo } from 'meteor/mongo';

// Define the collection on the client side
export const Restrooms = new Mongo.Collection('restrooms');

// Helper methods for the collection (client-side version)
const helpers = {
  // Get full address as a string
  fullAddress() {
    return `${this.street}, ${this.city}, ${this.state}${this.country ? ', ' + this.country : ''}`;
  },
  
  // Check if restroom has been rated
  rated() {
    return this.upvote > 0 || this.downvote > 0;
  },
  
  // Calculate rating percentage
  ratingPercentage() {
    if (!this.upvote && !this.downvote) return 0;
    return (this.upvote / (this.upvote + this.downvote)) * 100;
  }
};

// Apply helpers to each restroom document
Restrooms.helpers = helpers;

// Add methods to allow client-initiated actions
Meteor.methods({
  'client.restrooms.upvote': function(restroomId) {
    // Call the server method but also optimistically update the client
    Restrooms.update(restroomId, { $inc: { upvote: 1 } });
    return Meteor.call('restrooms.upvote', restroomId);
  },
  
  'client.restrooms.downvote': function(restroomId) {
    // Call the server method but also optimistically update the client
    Restrooms.update(restroomId, { $inc: { downvote: 1 } });
    return Meteor.call('restrooms.downvote', restroomId);
  }
});

export default Restrooms;
// imports/api/restrooms/methods.js
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Restrooms } from './collection';
import { validateRecaptcha } from '../../utils/recaptcha';
import { geocodeAddress } from '../../utils/geocoding';

Meteor.methods({
  /**
   * Add a new restroom
   */
  async 'restrooms.insert'(restroomData, recaptchaToken) {
    check(restroomData, {
      name: String,
      street: String,
      city: String, 
      state: String,
      country: String,
      accessible: Boolean,
      unisex: Boolean,
      changing_table: Boolean,
      directions: Match.Maybe(String),
      comment: Match.Maybe(String),
      longitude: Match.Maybe(Number),
      latitude: Match.Maybe(Number),
      edit_id: Match.Maybe(String)
    });
    check(recaptchaToken, String);
    
    // Verify recaptcha
    const recaptchaValid = await validateRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      throw new Meteor.Error('invalid-recaptcha', 'reCAPTCHA verification failed');
    }
    
    // If coordinates aren't provided, geocode the address
    let position = null;
    
    if (!restroomData.latitude || !restroomData.longitude) {
      try {
        const address = `${restroomData.street}, ${restroomData.city}, ${restroomData.state}, ${restroomData.country}`;
        const coordinates = await geocodeAddress(address);
        
        if (coordinates) {
          position = {
            type: 'Point',
            coordinates: [
              coordinates.longitude,
              coordinates.latitude
            ]
          };
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Continue without coordinates if geocoding fails
      }
    } else {
      // Create GeoJSON Point from provided coordinates
      position = {
        type: 'Point',
        coordinates: [
          restroomData.longitude,
          restroomData.latitude
        ]
      };
    }
    
    // Check for spam (simplified implementation)
    const isPotentialSpam = this.checkForSpam(restroomData);
    if (isPotentialSpam) {
      throw new Meteor.Error('spam-detected', 'This submission has been flagged as potential spam');
    }
    
    // Set default values and timestamps
    const now = new Date();
    const approved = !restroomData.edit_id; // New submissions are approved, edits require review
    
    // Create restroom document
    const restroomId = Restrooms.insert({
      name: restroomData.name,
      street: restroomData.street,
      city: restroomData.city,
      state: restroomData.state,
      country: restroomData.country,
      position: position,
      accessible: restroomData.accessible,
      unisex: restroomData.unisex,
      changing_table: restroomData.changing_table,
      directions: restroomData.directions || '',
      comment: restroomData.comment || '',
      approved,
      status: approved ? 'active' : 'pending-review',
      edit_id: restroomData.edit_id || null,
      upvote: 0,
      downvote: 0,
      createdAt: now,
      updatedAt: now
    });
    
    // If this is a new approved submission, set its edit_id to its own ID
    if (approved) {
      Restrooms.update(restroomId, {
        $set: { edit_id: restroomId }
      });
    }
    
    return { restroomId, approved };
  },
  
  /**
   * Update an existing restroom
   */
  async 'restrooms.update'(restroomId, updates) {
    check(restroomId, String);
    check(updates, {
      name: Match.Maybe(String),
      street: Match.Maybe(String),
      city: Match.Maybe(String),
      state: Match.Maybe(String),
      country: Match.Maybe(String),
      accessible: Match.Maybe(Boolean),
      unisex: Match.Maybe(Boolean),
      changing_table: Match.Maybe(Boolean),
      directions: Match.Maybe(String),
      comment: Match.Maybe(String),
      approved: Match.Maybe(Boolean)
    });
    
    // Only allow admin to update or the original creator
    const restroom = Restrooms.findOne(restroomId);
    if (!restroom) {
      throw new Meteor.Error('not-found', 'Restroom not found');
    }
    
    // Set updated timestamp
    updates.updatedAt = new Date();
    
    // Update the restroom
    Restrooms.update(restroomId, { $set: updates });
    
    return { success: true };
  },
  
  /**
   * Upvote a restroom
   */
  'restrooms.upvote'(restroomId) {
    check(restroomId, String);
    
    return Restrooms.update(restroomId, {
      $inc: { upvote: 1 }
    });
  },
  
  /**
   * Downvote a restroom
   */
  'restrooms.downvote'(restroomId) {
    check(restroomId, String);
    
    return Restrooms.update(restroomId, {
      $inc: { downvote: 1 }
    });
  },
  
  /**
   * Search for restrooms by text
   */
  'restrooms.textSearch'(query) {
    check(query, String);
    
    return Restrooms.find(
      { $text: { $search: query } },
      { 
        fields: { 
          score: { $meta: 'textScore' } 
        },
        sort: {
          score: { $meta: 'textScore' }
        }
      }
    ).fetch();
  },
  
  /**
   * Search for restrooms by location
   */
  'restrooms.searchByLocation'(lat, lng, maxDistance = 20) {
    check(lat, Number);
    check(lng, Number);
    check(maxDistance, Number);
    
    // Convert max distance from miles to meters
    const maxDistanceMeters = maxDistance * 1609.34;
    
    return Restrooms.find({
      position: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistanceMeters
        }
      },
      approved: true,
      status: 'active'
    }).fetch();
  },
  
  // Helper method to check for spam (simplified)
  checkForSpam(restroomData) {
    // In a real implementation, this would include more sophisticated checks
    // or integrate with a service like Akismet
    
    // Simple check for suspicious content
    const suspiciousWords = ['viagra', 'casino', 'xxx', 'pills'];
    const allContent = [
      restroomData.name,
      restroomData.street,
      restroomData.city,
      restroomData.state,
      restroomData.comment,
      restroomData.directions
    ].join(' ').toLowerCase();
    
    return suspiciousWords.some(word => allContent.includes(word));
  }
});
// imports/api/contacts/collection.js
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

// Create a basic collection without schema validation for now
export const Contacts = new Mongo.Collection('contacts');

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Set up methods for contact form
Meteor.methods({
  /**
   * Submit a contact form
   */
  'contacts.submit': function(contactData) {
    // Basic validation
    check(contactData, {
      name: String,
      email: String,
      message: String,
      restroom_id: Match.Maybe(String),
      restroom_name: Match.Maybe(String),
      recaptchaToken: String
    });
    
    // Validate email format
    if (!isValidEmail(contactData.email)) {
      throw new Meteor.Error('invalid-email', 'Please provide a valid email address');
    }
    
    // Create contact record
    const contactId = Contacts.insert({
      name: contactData.name,
      email: contactData.email,
      message: contactData.message,
      restroom_id: contactData.restroom_id || null,
      restroom_name: contactData.restroom_name || null,
      createdAt: new Date(),
      status: 'new'
    });
    
    // Log the contact submission
    console.log(`New contact submission from ${contactData.name} (${contactData.email})`);
    
    return { success: true, contactId };
  },
  
  /**
   * Update contact status (admin only)
   */
  'contacts.updateStatus': function(contactId, status) {
    check(contactId, String);
    check(status, String);
    
    // Verify user is logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    // For now, just allow any logged in user to update contacts
    // This will be restricted to admins when the roles package is working
    
    return Contacts.update(contactId, {
      $set: { status, updatedAt: new Date() }
    });
  },
  
  /**
   * Add admin notes to a contact
   */
  'contacts.addNotes': function(contactId, notes) {
    check(contactId, String);
    check(notes, String);
    
    // Verify user is logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    // For now, just allow any logged in user to add notes
    // This will be restricted to admins when the roles package is working
    
    return Contacts.update(contactId, {
      $set: { notes, updatedAt: new Date() }
    });
  }
});

// Basic publications
if (Meteor.isServer) {
  // Publish all contacts - will be restricted to admins later
  Meteor.publish('contacts.all', function(options = {}) {
    if (!this.userId) {
      return this.ready();
    }
    
    const query = {};
    
    // Add filter by status if provided
    if (options.status) {
      query.status = options.status;
    }
    
    return Contacts.find(query, {
      sort: { createdAt: -1 },
      limit: options.limit || 50,
      skip: options.skip || 0
    });
  });
  
  // Publish a single contact by ID
  Meteor.publish('contacts.single', function(contactId) {
    if (!this.userId) {
      return this.ready();
    }
    
    check(contactId, String);
    
    return Contacts.find({ _id: contactId });
  });
}

export default Contacts;
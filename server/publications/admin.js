// server/publications/admin.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Roles } from 'meteor/alanning:roles';

// Import collections
import { Restrooms } from '../../imports/api/restrooms/collection';
import { Contacts } from '../../imports/api/contacts/collection';

// Admin-only publications

/**
 * Publish all users for admin
 */
Meteor.publish('admin.users', function() {
  if (!this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
    return this.ready();
  }
  
  return Meteor.users.find({}, {
    fields: {
      emails: 1,
      profile: 1,
      roles: 1,
      createdAt: 1,
      status: 1
    }
  });
});

/**
 * Publish all contacts for admin
 */
Meteor.publish('admin.contacts', function(options = {}) {
  if (!this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
    return this.ready();
  }
  
  check(options, {
    limit: Match.Maybe(Number),
    skip: Match.Maybe(Number),
    status: Match.Maybe(String)
  });
  
  const query = {};
  
  if (options.status) {
    query.status = options.status;
  }
  
  return Contacts.find(query, {
    sort: { createdAt: -1 },
    limit: options.limit || 50,
    skip: options.skip || 0
  });
});

/**
 * Publish all restrooms for admin (including unapproved)
 */
Meteor.publish('admin.restrooms', function(options = {}) {
  if (!this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
    return this.ready();
  }
  
  check(options, {
    limit: Match.Maybe(Number),
    skip: Match.Maybe(Number),
    approved: Match.Maybe(Boolean),
    status: Match.Maybe(String)
  });
  
  const query = {};
  
  if (options.approved !== undefined) {
    query.approved = options.approved;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return Restrooms.find(query, {
    sort: { createdAt: -1 },
    limit: options.limit || 50,
    skip: options.skip || 0
  });
});

/**
 * Publish statistics for admin dashboard
 */
Meteor.publish('admin.stats', function() {
  if (!this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
    return this.ready();
  }
  
  // Use MongoDB aggregation to get stats
  const self = this;
  
  // Total approved restrooms
  Meteor.defer(async () => {
    const approvedCount = await Restrooms.rawCollection().countDocuments({ approved: true });
    self.added('admin_stats', 'restrooms_approved', { count: approvedCount });
    
    // Total pending restrooms
    const pendingCount = await Restrooms.rawCollection().countDocuments({ approved: false });
    self.added('admin_stats', 'restrooms_pending', { count: pendingCount });
    
    // Total contacts
    const contactsCount = await Contacts.rawCollection().countDocuments({});
    self.added('admin_stats', 'contacts_total', { count: contactsCount });
    
    // New contacts
    const newContactsCount = await Contacts.rawCollection().countDocuments({ status: 'new' });
    self.added('admin_stats', 'contacts_new', { count: newContactsCount });
    
    // Most recent restrooms
    const recentRestrooms = await Restrooms.rawCollection().find({}, {
      sort: { createdAt: -1 },
      limit: 5
    }).toArray();
    
    self.added('admin_stats', 'recent_restrooms', { restrooms: recentRestrooms });
    
    self.ready();
  });
  
  // Create a virtual collection for admin stats
  return self.ready();
});
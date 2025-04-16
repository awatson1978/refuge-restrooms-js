// server/methods/recaptcha.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';
import { RateLimiter } from 'meteor/ddp-rate-limiter';

// Set up rate limiter for reCAPTCHA verification
const recaptchaLimiter = new RateLimiter({
  ruleSets: [{
    userId: () => true,
    type: 'method',
    name: 'recaptcha.verify',
    connectionId: () => true,
  }],
  limit: 10, // 10 requests
  timeRange: 60000, // per minute
});

Meteor.methods({
  /**
   * Verify a reCAPTCHA token with Google's API
   * @param {string} token - The reCAPTCHA token to verify
   * @returns {boolean} Whether the token is valid
   */
  'recaptcha.verify': function(token) {
    check(token, String);
    
    // Apply rate limiting
    const invocation = recaptchaLimiter.check(this.userId || this.connection.clientAddress);
    if (invocation.allowed !== true) {
      throw new Meteor.Error('rate-limit-exceeded', 'Too many reCAPTCHA verification requests');
    }
    
    // Get secret key from environment variable or settings
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || 
                      (Meteor.settings.private && Meteor.settings.private.recaptchaSecretKey);
    
    if (!secretKey) {
      console.error('reCAPTCHA secret key is not configured');
      return false;
    }
    
    try {
      // Call Google's reCAPTCHA verification API
      const response = HTTP.post('https://www.google.com/recaptcha/api/siteverify', {
        params: {
          secret: secretKey,
          response: token,
          remoteip: this.connection.clientAddress
        }
      });
      
      // Check response
      if (response.data && response.data.success === true) {
        return true;
      } else {
        console.warn('reCAPTCHA verification failed', response.data);
        return false;
      }
    } catch (error) {
      console.error('reCAPTCHA API error:', error);
      return false;
    }
  }
});

// Export reCAPTCHA site key for client-side use
Meteor.startup(() => {
  // Publish the reCAPTCHA site key to the client
  if (Meteor.settings.public && !Meteor.settings.public.recaptchaSiteKey) {
    // Only log this warning if we don't have a public key configured
    console.warn('No reCAPTCHA site key found in settings');
  }
});
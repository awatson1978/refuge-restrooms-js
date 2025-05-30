// server/methods/recaptcha.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { HTTP } from 'meteor/http';

// Simple rate limiting using a Map to track requests
const rateLimitMap = new Map();

function checkRateLimit(clientId, method, maxRequests = 10, timeWindow = 60000) {
  const now = Date.now();
  const key = `${clientId}:${method}`;
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
    return { allowed: true };
  }
  
  const record = rateLimitMap.get(key);
  
  if (now > record.resetTime) {
    // Reset the counter
    rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false };
  }
  
  record.count++;
  return { allowed: true };
}

Meteor.methods({
  /**
   * Verify a reCAPTCHA token with Google's API
   * @param {string} token - The reCAPTCHA token to verify
   * @returns {boolean} Whether the token is valid
   */
  'recaptcha.verify': function(token) {
    check(token, String);
    
    // Apply rate limiting
    const clientId = this.userId || this.connection.clientAddress || 'anonymous';
    const rateLimitCheck = checkRateLimit(clientId, 'recaptcha.verify');
    if (!rateLimitCheck.allowed) {
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
Meteor.startup(function() {
  // Publish the reCAPTCHA site key to the client
  if (Meteor.settings.public && !Meteor.settings.public.recaptchaSiteKey) {
    // Only log this warning if we don't have a public key configured
    console.warn('No reCAPTCHA site key found in settings');
  }
});
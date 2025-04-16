// imports/utils/recaptcha.js
import { Meteor } from 'meteor/meteor';

/**
 * Verify a reCAPTCHA token
 * @param {string} token - The reCAPTCHA token to verify
 * @returns {Promise<boolean>} Whether the token is valid
 */
export const validateRecaptcha = async (token) => {
  if (!token) return false;
  
  try {
    return await Meteor.callAsync('recaptcha.verify', token);
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

// Server-side implementation
if (Meteor.isServer) {
  import { HTTP } from 'meteor/http';
  import { check } from 'meteor/check';
  
  Meteor.methods({
    /**
     * Verify a reCAPTCHA token with Google's API
     */
    'recaptcha.verify': async function(token) {
      check(token, String);
      
      // Get secret key from environment variable
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      
      if (!secretKey) {
        console.error('reCAPTCHA secret key is not configured');
        return false;
      }
      
      try {
        // Call Google's reCAPTCHA verification API
        const response = await HTTP.postAsync('https://www.google.com/recaptcha/api/siteverify', {
          params: {
            secret: secretKey,
            response: token
          }
        });
        
        return response.data.success === true;
      } catch (error) {
        console.error('reCAPTCHA API error:', error);
        return false;
      }
    }
  });
}
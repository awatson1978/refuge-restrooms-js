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

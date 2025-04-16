// imports/utils/ratings.js

/**
 * Get the color for a rating percentage
 * @param {number} percentage - Rating percentage (0-100)
 * @returns {string} HEX color code
 */
export const getRatingColor = (percentage) => {
    if (percentage > 70) return '#4caf50'; // Green
    if (percentage > 50) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };
  
  /**
   * Get the rating level label for a rating percentage
   * @param {number} percentage - Rating percentage (0-100)
   * @returns {string} Rating level ('green', 'yellow', or 'red')
   */
  export const getRatingLevel = (percentage) => {
    if (percentage > 70) return 'green';
    if (percentage > 50) return 'yellow';
    return 'red';
  };
  
  /**
   * Calculate rating percentage from upvotes and downvotes
   * @param {number} upvotes - Number of upvotes
   * @param {number} downvotes - Number of downvotes
   * @returns {number} Rating percentage (0-100)
   */
  export const calculateRatingPercentage = (upvotes, downvotes) => {
    if (upvotes === 0 && downvotes === 0) return 0;
    return (upvotes / (upvotes + downvotes)) * 100;
  };
  
  /**
   * Get the total number of votes
   * @param {number} upvotes - Number of upvotes
   * @param {number} downvotes - Number of downvotes
   * @returns {number} Total votes
   */
  export const getTotalVotes = (upvotes, downvotes) => {
    return upvotes + downvotes;
  };
  
  /**
   * Determine if a restroom has been rated
   * @param {number} upvotes - Number of upvotes
   * @param {number} downvotes - Number of downvotes
   * @returns {boolean} Whether restroom has been rated
   */
  export const isRated = (upvotes, downvotes) => {
    return upvotes > 0 || downvotes > 0;
  };
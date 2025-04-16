// imports/constants/ratingLevels.js

/**
 * Rating level constants for restroom ratings
 */

// Rating level thresholds (percentage ranges)
export const RATING_THRESHOLDS = {
    GREEN: 70, // 70% and above
    YELLOW: 50, // 50% to 70%
    // RED is below 50%
  };
  
  // Rating level identifiers
  export const RATING_LEVELS = {
    GREEN: 'green',
    YELLOW: 'yellow',
    RED: 'red',
    UNRATED: 'unrated'
  };
  
  // Rating level colors for UI
  export const RATING_COLORS = {
    [RATING_LEVELS.GREEN]: '#4caf50',  // Green
    [RATING_LEVELS.YELLOW]: '#ff9800', // Orange/Yellow
    [RATING_LEVELS.RED]: '#f44336',    // Red
    [RATING_LEVELS.UNRATED]: '#9e9e9e' // Gray
  };
  
  /**
   * Get the rating level for a given percentage
   * @param {number} percentage - Rating percentage (0-100)
   * @returns {string} Rating level identifier
   */
  export const getRatingLevelForPercentage = (percentage) => {
    if (percentage === 0) return RATING_LEVELS.UNRATED;
    if (percentage >= RATING_THRESHOLDS.GREEN) return RATING_LEVELS.GREEN;
    if (percentage >= RATING_THRESHOLDS.YELLOW) return RATING_LEVELS.YELLOW;
    return RATING_LEVELS.RED;
  };
  
  /**
   * Get the color for a rating level
   * @param {string} level - Rating level identifier
   * @returns {string} HEX color code
   */
  export const getColorForRatingLevel = (level) => {
    return RATING_COLORS[level] || RATING_COLORS[RATING_LEVELS.UNRATED];
  };
  
  /**
   * Get the color for a rating percentage directly
   * @param {number} percentage - Rating percentage (0-100)
   * @returns {string} HEX color code
   */
  export const getColorForRatingPercentage = (percentage) => {
    const level = getRatingLevelForPercentage(percentage);
    return getColorForRatingLevel(level);
  };
  
  export default {
    RATING_THRESHOLDS,
    RATING_LEVELS,
    RATING_COLORS,
    getRatingLevelForPercentage,
    getColorForRatingLevel,
    getColorForRatingPercentage
  };
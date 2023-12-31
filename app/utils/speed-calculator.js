export default class ExponentialSpeedCalculator {
  constructor(alpha = 0.3, speedDiffThreshold = 0.3, speedThreshold = 300) {
    // speedDiffThreshold in km/h
    this.alpha = alpha;
    this.speedDiffThreshold = speedDiffThreshold;
    this.speedThreshold = speedThreshold;
    this.averageSpeed = 0;
    this.previousSpeed = null; // Store only the most recent previous speed
  }

  updateLocation(newLocation) {
    if (this.previousLocation) {
      const newSpeed = calculateSpeed(newLocation, this.previousLocation);
      const isValidSpeed = this.isSpeedValid(newSpeed);

      if (isValidSpeed) {
        // Update the average speed only if the new speed is valid
        this.averageSpeed =
          this.alpha * newSpeed + (1 - this.alpha) * this.averageSpeed;
      }

      this.previousLocation = newLocation;
      this.previousSpeed = newSpeed; // Used only for speed validation
      return { speed: this.averageSpeed, isValidSpeed };
    }

    this.previousLocation = newLocation;
    return { speed: 0, isValidSpeed: true };
  }

  isSpeedValid(newSpeed) {
    if (newSpeed <= speedThreshold) return true;

    // Check if the new speed is within the acceptable range of the previous speed
    return (
      Math.abs(newSpeed - this.previousSpeed) / this.previousSpeed <=
      this.speedDiffThreshold
    );
  }
}

/**
 * Calculates the distance between two points on the Earth's surface.
 * @param {number} lat1 Latitude of the first point in degrees.
 * @param {number} lon1 Longitude of the first point in degrees.
 * @param {number} lat2 Latitude of the second point in degrees.
 * @param {number} lon2 Longitude of the second point in degrees.
 * @returns {number} Distance in kilometers.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const radLat1 = (lat1 * Math.PI) / 180; // Convert degrees to radians
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = radLat2 - radLat1;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Calculates the speed between two locations.
 * @param {Object} prevLocation The first location {lon, lat, timestamp}.
 * @param {Object} newLocation The second location {lon, lat, timestamp}.
 * @returns {number} Speed in kilometers per hour.
 */
function calculateSpeed(newLocation, prevLocation) {
  const distance = haversineDistance(
    prevLocation.lat,
    prevLocation.lon,
    newLocation.lat,
    newLocation.lon
  ); // Distance in kilometers
  const timeDiff = (newLocation.timestamp - prevLocation.timestamp) / 3600000; // Time difference in hours

  if (timeDiff <= 0) {
    return 0; // To avoid division by zero or negative time intervals
  }

  return distance / timeDiff; // Speed in km/h
}

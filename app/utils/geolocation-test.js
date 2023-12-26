const items = [
  {
    lon: 121.1,
    lat: 31.1,
  },
  {
    lon: 121.2,
    lat: 31.2,
  },
  {
    lon: 121.3,
    lat: 31.3,
  },
  {
    lon: 121.4,
    lat: 31.4,
  },
  {
    lon: 121.5,
    lat: 31.5,
  },
  {
    lon: 121.6,
    lat: 31.6,
  },
  {
    lon: 121.7,
    lat: 31.7,
  },
  {
    lon: 121.8,
    lat: 31.8,
  },
  {
    lon: 121.9,
    lat: 31.9,
  },
  {
    lon: 122.0,
    lat: 32.0,
  },
  {
    lon: 122.1,
    lat: 32.1,
  },
  {
    lon: 122.2,
    lat: 32.2,
  },
  {
    lon: 122.3,
    lat: 32.3,
  },
  {
    lon: 122.4,
    lat: 32.4,
  },
  {
    lon: 122.5,
    lat: 32.5,
  },
  {
    lon: 122.6,
    lat: 32.6,
  },
  {
    lon: 122.7,
    lat: 32.7,
  },
  {
    lon: 122.8,
    lat: 32.8,
  },
  {
    lon: 122.9,
    lat: 32.9,
  },
  {
    lon: 123.0,
    lat: 33.0,
  },
  {
    lon: 123.1,
    lat: 33.1,
  },
  {
    lon: 123.2,
    lat: 33.2,
  },
  {
    lon: 123.3,
    lat: 33.3,
  },
  {
    lon: 123.4,
    lat: 33.4,
  },
  {
    lon: 123.5,
    lat: 33.5,
  },
  {
    lon: 123.6,
    lat: 33.6,
  },
  {
    lon: 123.7,
    lat: 33.7,
  },
];

export const geoLocationTest = (zennMap) => {
  const loc = items[Math.floor(Math.random() * items.length)];
  zennMap.geoLocation = loc;
};

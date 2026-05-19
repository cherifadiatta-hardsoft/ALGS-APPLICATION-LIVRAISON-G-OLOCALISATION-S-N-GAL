/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const ZONES = {
  global: { 
    id: 'global', 
    name: 'Global (Anywhere)', 
    bounds: null, 
    center: { lat: 20, lng: 0 }, 
    zoom: 2 
  },
  europe: { 
    id: 'europe', 
    name: 'Europe Only', 
    bounds: { north: 71.5, south: 35.0, west: -25.0, east: 40.0 }, 
    center: { lat: 50, lng: 10 }, 
    zoom: 4 
  },
  north_america: { 
    id: 'north_america', 
    name: 'North America', 
    bounds: { north: 83.0, south: 15.0, west: -168.0, east: -52.0 }, 
    center: { lat: 45, lng: -100 }, 
    zoom: 3 
  },
  landmarks: {
    id: 'landmarks',
    name: 'Major Cities (Global)',
    bounds: null,
    center: { lat: 20, lng: 0 },
    zoom: 2
  }
};

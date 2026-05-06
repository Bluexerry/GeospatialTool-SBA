// API base URLs – set via .env (REACT_APP_* variables are embedded at build time)
const AUTH_API_URL         = process.env.REACT_APP_AUTH_API_URL          || 'http://localhost:5001';
const DATA_API_URL         = process.env.REACT_APP_DATA_API_URL           || 'http://localhost:5002';
const ANALYSIS_API_URL     = process.env.REACT_APP_ANALYSIS_API_URL       || 'http://localhost:5003';
const EARTH_ENGINE_API_URL = process.env.REACT_APP_EARTH_ENGINE_API_URL   || 'http://localhost:5004';
const FILE_API_URL         = process.env.REACT_APP_FILE_API_URL           || 'http://localhost:5005';

// Mapbox-GL access token (loaded from .env so the key is not committed to VCS)
const ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

export { ACCESS_TOKEN, AUTH_API_URL, DATA_API_URL, ANALYSIS_API_URL, EARTH_ENGINE_API_URL, FILE_API_URL };

/**
 * Centralized API Configuration
 * All API calls should use API_URL instead of hardcoded localhost URLs.
 */
const isLocalBrowser = typeof window !== 'undefined'
	&& ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_URL = import.meta.env.VITE_API_URL
	|| (isLocalBrowser || import.meta.env.DEV ? 'http://localhost:5000' : 'https://auto-stitch.onrender.com');
export default API_URL;

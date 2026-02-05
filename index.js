import createServer from './server/createServer.js';

// Get port from environment or use default
const PORT = process.env.PORT || 8000;

// Start the server
createServer(PORT);
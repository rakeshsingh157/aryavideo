// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); // Import the CORS middleware

// Initialize the Express application
const app = express();

// Use CORS middleware to allow cross-origin requests.
// For production, you should restrict this to specific origins.
// Example: cors({ origin: 'https://your-flutter-app-domain.com' })
app.use(cors());

// Configure body-parser to handle JSON payloads, with an increased limit for video data.
// '10mb' should be sufficient for many videos, but adjust as needed.
app.use(bodyParser.json({ limit: '10mb' }));

// Define the external API endpoint and API token.
// It's highly recommended to use environment variables for sensitive data like API tokens.
// For Vercel, you can set these in your project settings.
const API_ENDPOINT = process.env.ARYA_AI_API_ENDPOINT || 'https://ping.arya.ai/api/v1/deepfake-detection/video';
const API_TOKEN = process.env.ARYA_AI_API_TOKEN || '9d24fb98a06a3d97a625b6e41b80ab4e'; 

// Define the POST route for deepfake video checking
app.post('/deepfake-video-check', async (req, res) => {
    try {
        // Destructure required parameters from the request body
        const { doc_base64, req_id, doc_type, isIOS, orientation } = req.body;

        // Validate essential parameters
        if (!doc_base64 || !req_id || !doc_type) {
            console.error('Validation Error: Missing required parameters in request body.');
            return res.status(400).json({ error: 'Missing required parameters: doc_base64, req_id, doc_type' });
        }

        // Configure options for the Axios request to the external API
        const options = {
            method: 'POST',
            url: API_ENDPOINT,
            headers: {
                token: API_TOKEN, // Use the API token for authentication with ping.arya.ai
                'Content-Type': 'application/json', // Ensure content type is set correctly
            },
            data: { // Data to be sent to the external API
                doc_base64: doc_base64,
                req_id: req_id,
                doc_type: doc_type,
                isIOS: isIOS,
                orientation: orientation,
            },
            // Add a timeout for the external API call.
            // This helps prevent your Vercel function from waiting indefinitely
            // if ping.arya.ai is slow or unresponsive.
            // Set this slightly less than your Vercel function's maximum duration.
            timeout: 50000, // 50 seconds timeout for the external API call
        };

        console.log(`Forwarding request to ${API_ENDPOINT} with req_id: ${req_id}`);
        // Make the request to the external deepfake detection API
        const response = await axios(options);

        console.log(`Received response from ${API_ENDPOINT} for req_id: ${req_id}. Status: ${response.status}`);
        // Send the response data from the external API back to the client
        res.json(response.data);

    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error processing deepfake video check:', error.message);

        // Handle Axios errors (network issues, API errors, timeouts)
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('External API Response Error:', error.response.status, error.response.data);
                res.status(error.response.status).json({ 
                    error: 'External API Error', 
                    details: error.response.data, 
                    statusCode: error.response.status 
                });
            } else if (error.request) {
                // The request was made but no response was received
                console.error('External API No Response (Network/Timeout):', error.message);
                res.status(504).json({ 
                    error: 'Gateway Timeout', 
                    message: 'No response from external deepfake API within timeout. It might be slow or unreachable.',
                    details: error.message // Include error message for more context
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Axios Request Setup Error:', error.message);
                res.status(500).json({ error: 'Internal server error: Axios setup failed', details: error.message });
            }
        } else {
            // Handle any other unexpected errors
            console.error('Unexpected Server Error:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.send('OK');
});

// Define the port for the server to listen on
const PORT = process.env.PORT || 3000;

// Export the app for Vercel (or other serverless platforms)
module.exports = app;

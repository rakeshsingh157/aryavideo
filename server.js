// api/deepfake-video-check.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); // Required for cross-origin requests from your Flutter app

const app = express();

// Middleware to parse JSON bodies with a limit of 10MB.
// This must be placed before any route definitions that handle JSON.
app.use(bodyParser.json({ limit: '10mb' }));
// Enable CORS for all routes, essential for Flutter web or cross-origin development
app.use(cors());

// IMPORTANT: Replace with your actual private token from Arya.ai
const ARYA_AI_API_TOKEN = '9174f6c9a0636697f629b1e31485fa4a';
const ARYA_AI_API_ENDPOINT = 'https://ping.arya.ai/api/v1/deepfake-detection/video';

app.post('/deepfake-video-check', async (req, res) => {
    try {
        const { doc_base64, req_id, doc_type, isIOS, orientation } = req.body;

        // Input validation for required parameters
        if (!doc_base64 || !req_id || !doc_type) {
            console.error('Missing required parameters in request body:', req.body);
            return res.status(400).json({
                error: 'Missing required parameters',
                details: 'Please provide doc_base64, req_id, and doc_type.'
            });
        }

        // Optional: Type validation for other parameters, depends on strictness needed
        if (typeof isIOS !== 'boolean' && typeof isIOS !== 'undefined' && isIOS !== null) {
            console.error('Invalid type for isIOS:', isIOS);
            return res.status(400).json({ error: 'Invalid type for isIOS. Must be boolean.' });
        }
        if (typeof orientation !== 'number' && typeof orientation !== 'undefined' && orientation !== null) {
             console.error('Invalid type for orientation:', orientation);
            return res.status(400).json({ error: 'Invalid type for orientation. Must be number.' });
        }

        // Prepare the payload to be sent to the Arya.ai API
        const payloadToArya = {
            doc_base64: doc_base64,
            req_id: req_id,
            doc_type: doc_type,
            isIOS: isIOS,
            orientation: orientation,
        };

        console.log('--- Proxying Request to Arya.ai ---');
        console.log('Target Endpoint:', ARYA_AI_API_ENDPOINT);
        console.log('Payload Details (base64 length):', doc_base64.length, 'bytes');
        console.log('Other Payload Fields:', { req_id, doc_type, isIOS, orientation });

        const axiosOptions = {
            method: 'POST',
            url: ARYA_AI_API_ENDPOINT,
            headers: {
                'token': ARYA_AI_API_TOKEN, // Arya.ai expects 'token' header
                'Content-Type': 'application/json',
            },
            data: payloadToArya, // Axios will automatically stringify this object
            // Set a generous timeout for the Arya.ai API call (e.g., 2 minutes)
            // This should be less than your Vercel function's maxDuration
            timeout: 120000, // 120 seconds = 2 minutes
        };

        const response = await axios(axiosOptions);

        // If Arya.ai responds successfully (2xx status), forward their response to Flutter
        console.log('--- Received Success Response from Arya.ai ---');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('--- Error in deepfake-video-check proxy endpoint ---');
        if (error.response) {
            // Error response received from Arya.ai API (e.g., 400, 401, 500 from them)
            console.error('Error Response from Arya.ai API:', error.response.status, error.response.data);
            res.status(error.response.status).json({
                error: 'Error from external API',
                statusCode: error.response.status,
                details: error.response.data
            });
        } else if (error.request) {
            // Request was made to Arya.ai but no response was received (e.g., network error, DNS, timeout)
            console.error('No response received from Arya.ai API. Request details:', error.request);
            console.error('Axios error message:', error.message);
            console.error('Axios error code:', error.code); // Look for 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'
            res.status(504).json({ // Using 504 for gateway timeout or no response from upstream
                error: 'Service Unavailable: External API did not respond.',
                details: error.message,
                code: error.code // Provides specific network error code
            });
        } else {
            // Something else went wrong (e.g., error in request setup, JavaScript error in this file)
            console.error('An unexpected error occurred in proxy logic:', error.message);
            res.status(500).json({
                error: 'Internal Server Error: An unexpected error occurred in proxy.',
                details: error.message
            });
        }
        console.error('--- End Error Log ---');
    }
});

// Simple health check endpoint for monitoring Vercel deployment status
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Export the app for Vercel serverless function deployment
module.exports = app;

// For local development only:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
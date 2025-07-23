// For a Vercel serverless function, this typically goes into `api/deepfake-video-check.js`
// or `api/index.js` if it's the only endpoint.
// Make sure this file is inside a folder named `api` in your project root.

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors'); // Import cors for cross-origin requests

const app = express();

// Increase payload limit for incoming requests to your Vercel function
// This should match or exceed the maximum base64 string size you expect from Flutter
// 10MB should be sufficient for many videos, but consider Vercel's hard limit of 4.5MB
// for the entire request payload. If the base64 string from Flutter is consistently
// larger than ~3MB (which becomes ~4MB Base64), you might hit Vercel's 4.5MB limit.
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors()); // Enable CORS for all routes, essential for web/cross-origin Flutter

// This will be your Vercel serverless function endpoint, e.g., /api/deepfake-video-check
app.post('/deepfake-video-check', async (req, res) => {
    // IMPORTANT: Replace with your actual private token from Arya.ai
    const API_TOKEN = '9174f6c9a0636697f629b1e31485fa4a'; 
    const API_ENDPOINT = 'https://ping.arya.ai/api/v1/deepfake-detection/video';

    try {
        const { doc_base64, req_id, doc_type, isIOS, orientation } = req.body;

        // Basic input validation
        if (!doc_base64 || !req_id || !doc_type) {
            console.error('Missing required parameters in request body:', req.body);
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Validate types for Arya.ai API if necessary (optional, but good for robustness)
        // For example, ensuring isIOS is boolean and orientation is number
        if (typeof isIOS !== 'boolean' && typeof isIOS !== 'undefined') {
            console.error('Invalid type for isIOS:', isIOS);
            return res.status(400).json({ error: 'Invalid type for isIOS. Must be boolean.' });
        }
        if (typeof orientation !== 'number' && typeof orientation !== 'undefined') {
             console.error('Invalid type for orientation:', orientation);
            return res.status(400).json({ error: 'Invalid type for orientation. Must be number.' });
        }


        // Prepare the payload for Arya.ai API
        const payloadToArya = {
            doc_base64: doc_base64,
            req_id: req_id,
            doc_type: doc_type,
            isIOS: isIOS,
            orientation: orientation,
        };

        console.log('Proxying request to Arya.ai with payload (excluding base64 snippet for brevity):', {
            req_id: payloadToArya.req_id,
            doc_type: payloadToArya.doc_type,
            isIOS: payloadToArya.isIOS,
            orientation: payloadToArya.orientation,
            base64Length: doc_base64.length // Log length instead of full string
        });

        const options = {
            method: 'POST',
            url: API_ENDPOINT,
            headers: {
                'token': API_TOKEN, // Use 'token' header as per their doc
                'Content-Type': 'application/json', // Use 'Content-Type' as per their doc
            },
            data: payloadToArya, // Axios will automatically stringify this JSON object
            // Set a generous timeout for the Arya.ai API call (e.g., 2 minutes)
            // This needs to be less than your Vercel function's maxDuration
            timeout: 120000, // 120 seconds = 2 minutes
        };

        const response = await axios(options);

        // If Arya.ai responds successfully, send their data back to Flutter
        console.log('Received success response from Arya.ai:', response.data);
        res.status(200).json(response.data);

    } catch (error) {
        console.error('--- Error processing deepfake video check ---');
        if (error.response) {
            // This means Arya.ai responded with a non-2xx status code (e.g., 400, 401, 403, 500 from Arya.ai)
            console.error('Error response from Arya.ai:', error.response.status, error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error, timeout from axios)
            console.error('No response received from Arya.ai. Request details:', error.request);
            console.error('Axios error message:', error.message);
            console.error('Axios error code:', error.code); // Look for 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND'
            res.status(503).json({ error: 'Service Unavailable: Arya.ai API did not respond or timed out.', details: error.message, code: error.code });
        } else {
            // Something else happened in setting up the request or during processing
            console.error('Error setting up request or unexpected error:', error.message);
            res.status(500).json({ error: 'Internal Server Error: An unexpected error occurred.', details: error.message });
        }
        console.error('--- End Error Log ---');
    }
});

// Health check endpoint (optional, but useful for monitoring Vercel deployment)
app.get('/health', (req, res) => {
    res.send('OK');
});

// Export the app for Vercel
module.exports = app;

// For local testing:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
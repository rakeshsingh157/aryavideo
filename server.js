const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

const API_ENDPOINT = 'https://ping.arya.ai/api/v1/deepfake-detection/video';
const API_TOKEN = '9f26f79af5646895a07cb1e21dd6ae16'; // DO NOT DO THIS IN PRODUCTION

app.post('/deepfake-video-check', async (req, res) => {
    try {
        const { doc_base64, req_id, doc_type, isIOS, orientation } = req.body;

        if (!doc_base64 || !req_id || !doc_type) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const options = {
            method: 'POST',
            url: API_ENDPOINT,
            headers: {
                token: API_TOKEN,
                'content-type': 'application/json',
            },
            data: {
                doc_base64: doc_base64,
                req_id: req_id,
                doc_type: doc_type,
                isIOS: isIOS,
                orientation: orientation,
            },
        };

        const response = await axios(options);

        res.json(response.data);
    } catch (error) {
        console.error('Error processing deepfake video check:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.get('/health', (req, res) => {
    res.send('OK');
});

const PORT = process.env.PORT || 3000;

module.exports = app;
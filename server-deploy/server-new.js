const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';

const DOUYIN_CONFIG = {
  APP_ID: 'tt6a791cc4f57bed5d01',
  APP_SECRET: '9489b0068583a5b61b6d1ea29c7b054178d75cef',
  TOKEN_URL: 'https://open.douyin.com/oauth/client_token/',
  TEXT_CHECK_URL: 'https://developer.toutiao.com/api/v2/tags/text/antidirt',
  IMAGE_CHECK_URL: 'https://developer.toutiao.com/api/apps/censor/image'
};

let tokenCache = { accessToken: null, expiresAt: 0 };

async function getDouyinAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 300000) {
    console.log('[Security] Using cached token');
    return tokenCache.accessToken;
  }
  console.log('[Security] Getting new token...');
  try {
    const response = await axios.post(DOUYIN_CONFIG.TOKEN_URL, {
      client_key: DOUYIN_CONFIG.APP_ID,
      client_secret: DOUYIN_CONFIG.APP_SECRET,
      grant_type: 'client_credential'
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
    console.log('[Security] Token response:', JSON.stringify(response.data));
    if (response.data && response.data.data && response.data.data.access_token) {
      const data = response.data.data;
      tokenCache.accessToken = data.access_token;
      tokenCache.expiresAt = now + (data.expires_in * 1000);
      console.log('[Security] Token obtained, expires in:', data.expires_in);
      return tokenCache.accessToken;
    } else {
      throw new Error('Token response format error');
    }
  } catch (error) {
    console.error('[Security] Token error:', error.message);
    throw error;
  }
}

async function checkTextSafety(text) {
  if (!text || text.trim() === '') {
    return { safe: true, message: 'Empty text' };
  }
  console.log('[Security] Text check, length:', text.length);
  try {
    const accessToken = await getDouyinAccessToken();
    const response = await axios.post(DOUYIN_CONFIG.TEXT_CHECK_URL, {
      tasks: [{ content: text }]
    }, {
      headers: { 'Content-Type': 'application/json', 'X-Token': accessToken },
      timeout: 10000
    });
    console.log('[Security] Text response:', JSON.stringify(response.data));
    if (response.data && response.data.data && response.data.data.length > 0) {
      const result = response.data.data[0];
      if (result.code !== 0) {
        return { safe: false, message: 'Service error', details: result };
      }
      const predicts = result.predicts || [];
      const hitItems = predicts.filter(function(p) { return p.hit === true; });
      if (hitItems.length > 0) {
        console.log('[Security] Text blocked:', hitItems.map(function(h) { return h.model_name; }).join(', '));
        return { safe: false, message: 'Content contains sensitive info', details: { hitModels: hitItems.map(function(h) { return h.model_name; }) } };
      }
      console.log('[Security] Text passed');
      return { safe: true, message: 'Passed' };
    }
    return { safe: true, message: 'Checked' };
  } catch (error) {
    console.error('[Security] Text error:', error.message);
    return { safe: false, message: 'Service unavailable', details: { error: error.message } };
  }
}

async function checkImageSafety(imageData, imageUrl) {
  console.log('[Security] Image check, data len:', imageData ? imageData.length : 0, 'url:', imageUrl || 'none');
  try {
    const accessToken = await getDouyinAccessToken();
    const requestBody = { app_id: DOUYIN_CONFIG.APP_ID, access_token: accessToken };
    if (imageUrl) {
      requestBody.image = imageUrl;
    } else if (imageData) {
      requestBody.image_data = imageData;
    } else {
      return { safe: false, message: 'No image provided' };
    }
    const response = await axios.post(DOUYIN_CONFIG.IMAGE_CHECK_URL, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log('[Security] Image response:', JSON.stringify(response.data));
    if (response.data) {
      if (response.data.error !== 0) {
        return { safe: false, message: 'Image service error', details: response.data };
      }
      const predicts = response.data.predicts || [];
      const hitItems = predicts.filter(function(p) { return p.hit === true; });
      if (hitItems.length > 0) {
        console.log('[Security] Image blocked:', hitItems.map(function(h) { return h.model_name; }).join(', '));
        return { safe: false, message: 'Image blocked', details: { hitModels: hitItems.map(function(h) { return h.model_name; }) } };
      }
      console.log('[Security] Image passed');
      return { safe: true, message: 'Passed' };
    }
    return { safe: true, message: 'Checked' };
  } catch (error) {
    console.error('[Security] Image error:', error.message);
    return { safe: false, message: 'Service unavailable', details: { error: error.message } };
  }
}

app.get('/health', function(req, res) {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/chat/completions', async function(req, res) {
  try {
    console.log('Chat request:', new Date().toISOString());
    const response = await axios.post(OPENAI_BASE_URL + '/chat/completions', req.body, {
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://api.radiance.asia',
        'X-Title': 'Monsoon'
      },
      timeout: 60000
    });
    console.log('Chat response OK');
    res.json(response.data);
  } catch (error) {
    console.error('Chat error:', error.response ? error.response.data : error.message);
    res.status(error.response ? error.response.status : 500).json({ error: error.response ? error.response.data : { message: error.message } });
  }
});

app.post('/api/content-security/text', async function(req, res) {
  console.log('[API] Text security request');
  try {
    var text = req.body.text;
    if (!text) {
      return res.status(400).json({ success: false, safe: false, message: 'Missing text' });
    }
    var result = await checkTextSafety(text);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
  } catch (error) {
    console.error('[API] Text error:', error);
    res.status(500).json({ success: false, safe: false, message: 'Server error', error: error.message });
  }
});

app.post('/api/content-security/image', async function(req, res) {
  console.log('[API] Image security request');
  try {
    var image_data = req.body.image_data;
    var image_url = req.body.image_url;
    if (!image_data && !image_url) {
      return res.status(400).json({ success: false, safe: false, message: 'Missing image_data or image_url' });
    }
    var result = await checkImageSafety(image_data, image_url);
    res.json({ success: true, safe: result.safe, message: result.message, details: result.details });
  } catch (error) {
    console.error('[API] Image error:', error);
    res.status(500).json({ success: false, safe: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/content-security/token', async function(req, res) {
  console.log('[API] Token request');
  try {
    var token = await getDouyinAccessToken();
    res.json({ success: true, message: 'Token OK', token_preview: token.substring(0, 20) + '...' });
  } catch (error) {
    console.error('[API] Token error:', error);
    res.status(500).json({ success: false, message: 'Token failed', error: error.message });
  }
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Content security enabled');
});



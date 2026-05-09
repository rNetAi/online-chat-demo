import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { RNetAuth, RNetAi } from 'rnet-sso-node';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Initialize the rNet Auth library
const config = {
    clientId: '<application-client-id>',
    clientSecret: '<application-client-secret>',
    redirectUri: 'http://localhost:3001/callback',
};
const rnetAuth = new RNetAuth(config);
const rnetAi = new RNetAi(config);

// Global store for tokens to avoid sending them to frontend
global.tokenStore = {
    access_token: null,
    refresh_token: null
};

/**
 * Route: GET /login
 * Description: Redirects the user to the rNet authorization server to initiate login.
 */
app.get('/login', (req, res) => {
    const pkce = rnetAuth.generatePKCE();

    res.cookie('pkce_verifier', pkce.verifier, { httpOnly: true, maxAge: 5 * 60 * 1000 });

    const authUrl = rnetAuth.getAuthorizationUrl(pkce.challenge);
    res.redirect(authUrl);
});

/**
 * Route: GET /callback
 * Description: The OAuth2 redirect URI handler. The authorization server redirects the user here with a code.
 */
app.get('/callback', async (req, res) => {
    const { code, error, error_description } = req.query;

    if (error) {
        return res.status(400).send(`Authentication failed: ${error} - ${error_description}`);
    }

    if (!code) {
        return res.status(400).send('No authorization code provided');
    }

    try {
        // Retrieve the code_verifier we stored in the cookie
        const codeVerifier = req.cookies.pkce_verifier;

        // Exchange code for tokens
        const tokenResponse = await rnetAuth.exchangeCodeForToken(code, codeVerifier);

        // Clear the cookie after successful exchange
        res.clearCookie('pkce_verifier');

        global.tokenStore.access_token = tokenResponse.access_token;
        global.tokenStore.refresh_token = tokenResponse.refresh_token || null;

        res.redirect(`http://localhost:5173/?login_success=true`);
    } catch (err) {
        console.error('Callback error:', err);
        res.status(500).send(`Token exchange failed: ${err.message}`);
    }
});

/**
 * Route: POST /api/auth/exchange
 * Description: Takes the authorization code (and optional PKCE verifier) from the frontend
 * and exchanges it for an access_token and refresh_token.
 */
app.post('/api/auth/exchange', async (req, res) => {
    try {
        const { code, codeVerifier } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }

        const tokenResponse = await rnetAuth.exchangeCodeForToken(code, codeVerifier);
        res.json({
            success: true,
            data: tokenResponse
        });

    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Route: /api/auth/refresh
 * Description: Takes the refresh token and exchanges it for a new access token.
 */
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const refreshToken = global.tokenStore.refresh_token;

        if (!refreshToken) {
            return res.status(400).json({ error: 'No refresh token available in global store' });
        }

        const tokenResponse = await rnetAuth.refreshAccessToken(refreshToken);

        global.tokenStore.access_token = tokenResponse.access_token;
        if (tokenResponse.refresh_token) {
            global.tokenStore.refresh_token = tokenResponse.refresh_token;
        }

        res.json({
            success: true,
            data: { message: "Tokens successfully refreshed in backend" }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ai', async (req, res) => {
    try {
        const accessToken = global.tokenStore.access_token;
        if (!accessToken) {
            return res.status(401).json({ error: 'No access token found in global store. Please login first.' });
        }

        const { messages = [] } = req.body || {};
        const model = "gemini-2.5-flash-lite";

        // Only send the last 2 messages to the AI to save tokens
        const recentMessages = messages.slice(-2);
        const geminiBody = {
            contents: recentMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content || '' }]
            }))
        };

        const aiResponse = await rnetAi.chat(geminiBody, accessToken, model);

        res.json({
            success: true,
            data: aiResponse
        });

    } catch (error) {
        console.error('AI call error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ai/stream', async (req, res) => {
    try {
        const accessToken = global.tokenStore.access_token;
        if (!accessToken) {
            return res.status(401).json({ error: 'No access token found in global store. Please login first.' });
        }

        const { messages = [] } = req.body || {};
        const model = "gemini-2.5-flash-lite";

        // Only send the last 2 messages to the AI to save tokens
        const recentMessages = messages.slice(-2);
        const geminiBody = {
            contents: recentMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content || '' }]
            }))
        };

        const stream = await rnetAi.chatStream(geminiBody, accessToken, model);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
        res.end();

    } catch (error) {
        console.error('AI stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        } else {
            res.end();
        }
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Node.js Example Backend listening on http://localhost:${PORT}`);
    console.log(`Configured to use rNet Auth Backend: ${rnetAuth.issuer}`);
});

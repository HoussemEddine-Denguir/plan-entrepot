/**
 * Secure Backend Proxy Function for calling the Gemini API.
 * * This file should be deployed to a serverless platform (e.g., Netlify Functions, Vercel)
 * where the GEMINI_API_KEY can be securely stored as an environment variable, hidden from the client.
 */

// Load the API Key from a secure environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const PROXY_MODEL = "gemini-2.5-flash-preview-05-20";

if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set.");
}

// Handler function for serverless environments (e.g., Netlify/Vercel)
exports.handler = async (event, context) => {
    // 1. Basic security check for the API key presence
    if (!GEMINI_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: API Key missing." }),
        };
    }
    
    // 2. Ensure only POST requests with data are processed
    if (event.httpMethod !== 'POST' || !event.body) {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed or missing body." }),
        };
    }

    try {
        const { userPrompt, systemPrompt } = JSON.parse(event.body);

        // 3. Construct the official Gemini API payload
        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${PROXY_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        // 4. Call the external Gemini API securely from the server environment
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
             console.error(`Gemini API call failed: ${response.status} - ${errorText}`);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "External API error.", details: errorText }),
            };
        }

        const result = await response.json();
        
        // 5. Extract and return the generated text to the frontend
        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        return {
            statusCode: 200,
            headers: {
                // Allows your GitHub Pages site to communicate with the serverless function
                'Access-Control-Allow-Origin': '*', 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: generatedText }),
        };

    } catch (error) {
        console.error("Proxy function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error during processing." }),
        };
    }
};

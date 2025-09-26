import { GoogleGenAI } from '@google/genai';

/**
 * Fonction Netlify Serverless qui sert de proxy sécurisé pour l'API Gemini.
 * Cette fonction utilise la clé API stockée dans les variables d'environnement de Netlify.
 */
exports.handler = async (event, context) => {
    // 1. Définir les Headers CORS pour permettre l'appel depuis un autre domaine (GitHub Pages)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // Permet l'accès depuis n'importe quel domaine
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Gérer les requêtes OPTIONS (pré-vol CORS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: corsHeaders,
            body: '',
        };
    }

    // 2. Vérifier la méthode HTTP
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 3. Récupérer la clé API (Variable d'environnement sécurisée)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Configuration Error: API Key missing on server. Check Netlify Environment variables.' }),
        };
    }

    try {
        // 4. Parser le corps de la requête (userQuery et systemPrompt)
        const { userQuery, systemPrompt } = JSON.parse(event.body);

        if (!userQuery) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing userQuery in request body.' }),
            };
        }

        // 5. Initialiser le client Gemini
        const ai = new GoogleGenAI({ apiKey });
        
        // 6. Construire la requête API
        const request = {
            // Le tableau 'contents' contient la conversation. Pour une requête simple, c'est un seul rôle 'user'.
            contents: [{ 
                role: "user", 
                parts: [{ text: userQuery }] // Structure de texte correcte, corrige l'erreur 400.
            }],
            config: {
                systemInstruction: systemPrompt,
                model: 'gemini-2.5-flash', 
                temperature: 0.5,
                maxOutputTokens: 2048,
            }
        };

        // 7. Appeler l'API Google Gemini
        const response = await ai.generateContent(request);

        // 8. Extraire le texte de la réponse
        const generatedText = response.text;

        // 9. Retourner la réponse au frontend
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ text: generatedText }),
        };

    } catch (error) {
        console.error('Execution Error in Netlify Function:', error);
        
        let statusCode = 500;
        let errorMessage = 'An unknown error occurred on the server.';
        
        // Tentative de gestion des erreurs de l'API (4xx ou 5xx)
        if (error.response && error.response.status) {
            statusCode = error.response.status;
            // Tente de récupérer le message d'erreur JSON de Google
            try {
                const errorData = JSON.parse(error.response.data);
                errorMessage = errorData.error ? errorData.error.message : error.message;
            } catch {
                errorMessage = error.response.data || error.message;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: `Gemini API call failed: ${statusCode} - ${errorMessage}` 
            }),
        };
    }
};

const { GoogleGenAI } = require('@google/genai');

// Lisez la clé API depuis les variables d'environnement de Netlify.
// Assurez-vous d'avoir défini une variable nommée GEMINI_API_KEY dans vos réglages Netlify.
const apiKey = process.env.GEMINI_API_KEY;

// Initialiser le client GoogleGenAI
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set!");
}
const ai = new GoogleGenAI({ apiKey });

/**
 * Handler de fonction Netlify pour l'API Gemini.
 * Cette fonction sécurise votre clé API en la gardant côté serveur.
 */
exports.handler = async (event, context) => {
    // 1. Validation de la méthode HTTP
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
        };
    }

    // 2. Vérification de la clé API
    if (!apiKey) {
        return {
             statusCode: 500,
             body: JSON.stringify({ error: "API Key is missing. Please set GEMINI_API_KEY environment variable." }),
         };
    }

    try {
        // 3. Extraction des données du corps de la requête (envoyées par votre frontend HTML)
        const { userQuery, systemPrompt } = JSON.parse(event.body);

        if (!userQuery) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing 'userQuery' in request body." }),
            };
        }

        console.log(`Received query: ${userQuery}`);

        // 4. Appel à l'API Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: {
                // Définir la System Instruction pour guider le modèle
                systemInstruction: systemPrompt || "You are a helpful and professional business assistant.",
            }
        });

        const generatedText = response.text;

        // 5. Retourner la réponse au frontend
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: generatedText }),
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to communicate with the AI model.", details: error.message }),
        };
    }
};

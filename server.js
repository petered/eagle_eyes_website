const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');
const app = express();

// Load environment variables
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for local development

// FAQ Search Endpoint
app.post('/ask-faq', async (req, res) => {
    try {
        const { question } = req.body;
        console.log('Received question:', question); // Debug log

        // Create a thread
        const thread = await openai.beta.threads.create();

        // Add the message to the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: question
        });

        // Start a run with the specific assistant ID
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: "asst_qfx0mNGSXFvQkeAAgsUxD0GN"
        });

        // Poll for completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Get the assistant's response
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(m => m.role === 'assistant');
        const faqId = assistantMessage.content[0].text.value;

        console.log('Response:', faqId); // Debug log
        res.json({ faqId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
}); 
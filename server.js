// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/chat  ->  { messages: [{role:'user'|'assistant', text:'...'}] }
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;

    const chatMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    }));

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a concise, helpful study assistant.' },
        ...chatMessages,
      ],
      temperature: 0.4,
    });

    const text = completion.choices?.[0]?.message?.content ?? '';
    res.json({ text });
  } catch (err) {
    console.error('Chat error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Chat failed.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

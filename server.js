// 간단한 프록시 서버 - Anthropic API 호출을 위한 CORS 우회
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// CORS 허용
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Anthropic API 프록시 엔드포인트
app.post('/api/claude', async (req, res) => {
    try {
        const { apiKey, ...requestBody } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API 키가 필요합니다.' });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey.trim(),
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('프록시 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    console.log(`브라우저에서 http://localhost:${PORT}/discussion.html 로 접속하세요.`);
});

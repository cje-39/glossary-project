// Firebase Functions for Claude API Proxy
const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Claude API 프록시 함수
exports.claude = functions.https.onRequest(async (req, res) => {
  // CORS 처리
  return cors(req, res, async () => {
    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { apiKey, ...requestBody } = req.body;

      // API 키 검증
      if (!apiKey) {
        res.status(400).json({ error: 'API 키가 필요합니다.' });
        return;
      }

      // Anthropic API 호출
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      // 응답 데이터 읽기
      const data = await response.json();

      // 에러 처리
      if (!response.ok) {
        res.status(response.status).json(data);
        return;
      }

      // 성공 응답
      res.status(200).json(data);
    } catch (error) {
      console.error('Claude API 프록시 오류:', error);
      res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        message: error.message
      });
    }
  });
});

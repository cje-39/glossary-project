// Firebase Functions for Claude API Proxy and Confluence API Proxy
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

// Confluence API 프록시 함수
exports.confluence = functions.https.onRequest(async (req, res) => {
  // CORS 처리
  return cors(req, res, async () => {
    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return;
    }

    // GET 요청만 허용
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { pageId, apiToken } = req.query;

      // 파라미터 검증
      if (!pageId) {
        res.status(400).json({ error: 'pageId가 필요합니다.' });
        return;
      }

      if (!apiToken) {
        res.status(400).json({ error: 'apiToken이 필요합니다.' });
        return;
      }

      // Confluence API 호출
      const baseURL = 'https://krafton.atlassian.net';
      const url = `${baseURL}/wiki/rest/api/content/${pageId}?expand=body.storage`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      // 응답 데이터 읽기
      const data = await response.json();

      // 에러 처리
      if (!response.ok) {
        if (response.status === 401) {
          res.status(401).json({ error: '인증 실패: API Token을 확인해주세요.' });
          return;
        } else if (response.status === 404) {
          res.status(404).json({ error: '페이지를 찾을 수 없습니다.' });
          return;
        }
        res.status(response.status).json({ 
          error: `API 요청 실패: ${response.status} ${response.statusText}`,
          details: data 
        });
        return;
      }

      // 성공 응답
      res.status(200).json(data);
    } catch (error) {
      console.error('Confluence API 프록시 오류:', error);
      res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        message: error.message
      });
    }
  });
});

// Netlify Serverless Function for Confluence API Proxy
// This function handles CORS and proxies requests to Confluence API

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 쿼리 파라미터에서 pageId와 apiToken 가져오기
    const { pageId, apiToken } = event.queryStringParameters || {};

    // 파라미터 검증
    if (!pageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'pageId가 필요합니다.' })
      };
    }

    // API Token은 쿼리 파라미터 또는 환경변수에서 가져오기
    const token = apiToken || process.env.CONFLUENCE_API_TOKEN;

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'apiToken이 필요합니다. 쿼리 파라미터로 전달하거나 환경변수 CONFLUENCE_API_TOKEN을 설정해주세요.' })
      };
    }

    // Confluence API 호출
    const baseURL = 'https://krafton.atlassian.net';
    const url = `${baseURL}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 응답 데이터 읽기
    const data = await response.json();

    // 에러 처리
    if (!response.ok) {
      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: '인증 실패: API Token을 확인해주세요.' })
        };
      } else if (response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '페이지를 찾을 수 없습니다.' })
        };
      }
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API 요청 실패: ${response.status} ${response.statusText}`,
          details: data 
        })
      };
    }

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Confluence API 프록시 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '서버 오류가 발생했습니다.',
        message: error.message 
      })
    };
  }
};

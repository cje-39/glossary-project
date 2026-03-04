/**
 * 외부 API 호출 서비스
 * Claude API와 Confluence API 호출 처리
 */

/**
 * Claude API 호출
 * @param {Object} requestData - API 요청 데이터
 * @return {Object} API 응답
 */
function callClaude(requestData) {
  try {
    const apiKey = requestData.apiKey;
    if (!apiKey) {
      return { error: 'API 키가 필요합니다.' };
    }
    
    const url = 'https://api.anthropic.com/v1/messages';
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: requestData.model || 'claude-sonnet-4-5-20250929',
        max_tokens: requestData.max_tokens || 200,
        temperature: requestData.temperature || 0.3,
        system: requestData.system,
        messages: requestData.messages || []
      }),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      try {
        const errorData = JSON.parse(responseText);
        return { error: errorData.error?.message || errorData.error || 'API 오류', status: responseCode };
      } catch (e) {
        return { error: responseText || 'API 오류', status: responseCode };
      }
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Confluence API 호출
 * @param {Object} params - API 파라미터 (pageId, apiToken, email, action, limit)
 * @return {Object} API 응답
 */
function callConfluence(params) {
  try {
    const pageId = params.pageId;
    const apiToken = params.apiToken;
    const email = params.email;
    const action = params.action;
    const limit = params.limit || '20';
    
    if (!pageId) {
      return { error: 'pageId가 필요합니다.' };
    }
    
    if (!apiToken) {
      return { error: 'apiToken이 필요합니다.' };
    }
    
    const baseURL = 'https://krafton.atlassian.net';
    let url;
    
    if (action === 'children') {
      // 하위 페이지 목록 가져오기
      url = `${baseURL}/wiki/rest/api/content/${pageId}/child/page?limit=${limit}&expand=version`;
    } else {
      // 페이지 내용 가져오기
      url = `${baseURL}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    }
    
    // Basic 인증 헤더 생성
    let authHeader;
    if (email && apiToken) {
      const credentials = Utilities.base64Encode(`${email}:${apiToken}`);
      authHeader = `Basic ${credentials}`;
    } else {
      authHeader = `Bearer ${apiToken}`;
    }
    
    const options = {
      method: 'get',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      try {
        const errorData = JSON.parse(responseText);
        
        if (responseCode === 401) {
          return { error: '인증 실패: API Token 또는 이메일을 확인해주세요.', details: errorData, status: 401 };
        } else if (responseCode === 403) {
          return { 
            error: '접근 거부 (403 Forbidden)', 
            details: errorData,
            possibleCauses: [
              'Confluence API 권한 부족',
              '인증 방식 문제',
              'Confluence API 설정 문제'
            ],
            status: 403
          };
        } else if (responseCode === 404) {
          return { error: '페이지를 찾을 수 없습니다.', details: errorData, status: 404 };
        }
        
        return { error: `API 요청 실패: ${responseCode}`, details: errorData, status: responseCode };
      } catch (e) {
        return { error: responseText || 'API 오류', status: responseCode };
      }
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    return { error: error.toString() };
  }
}

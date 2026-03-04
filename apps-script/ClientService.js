/**
 * 클라이언트 사이드 서비스 래퍼
 * HTML 파일의 <script> 태그에 포함할 JavaScript 코드
 * 
 * 사용법:
 * <script>
 * <?!= HtmlService.createHtmlOutputFromFile('ClientService').getContent(); ?>
 * </script>
 */

// 전역 ClientService 객체
var ClientService = {
  
  /**
   * 용어집 데이터 저장
   */
  saveGlossary: function(data) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveGlossary' },
          postData: { contents: JSON.stringify(data) }
        });
    });
  },
  
  /**
   * 용어집 데이터 로드
   */
  loadGlossary: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadGlossary' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 카테고리 저장
   */
  saveCategories: function(categories) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveCategories' },
          postData: { contents: JSON.stringify(categories) }
        });
    });
  },
  
  /**
   * 카테고리 로드
   */
  loadCategories: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadCategories' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 코퍼스 데이터 저장
   */
  saveCorpus: function(data) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveCorpus' },
          postData: { contents: JSON.stringify(data) }
        });
    });
  },
  
  /**
   * 코퍼스 데이터 로드
   */
  loadCorpus: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadCorpus' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 파일 그룹 저장
   */
  saveFileGroups: function(fileGroups) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveFileGroups' },
          postData: { contents: JSON.stringify(fileGroups) }
        });
    });
  },
  
  /**
   * 파일 그룹 로드
   */
  loadFileGroups: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadFileGroups' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 폴더 저장
   */
  saveFolders: function(folders) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveFolders' },
          postData: { contents: JSON.stringify(folders) }
        });
    });
  },
  
  /**
   * 폴더 로드
   */
  loadFolders: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadFolders' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 토론 데이터 저장
   */
  saveDiscussion: function(data) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveDiscussion' },
          postData: { contents: JSON.stringify(data) }
        });
    });
  },
  
  /**
   * 토론 데이터 로드
   */
  loadDiscussion: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadDiscussion' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 작성자 저장
   */
  saveAuthors: function(authors) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveAuthors' },
          postData: { contents: JSON.stringify(authors) }
        });
    });
  },
  
  /**
   * 작성자 로드
   */
  loadAuthors: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadAuthors' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 토론 카테고리 저장
   */
  saveDiscussionCategories: function(categories) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveDiscussionCategories' },
          postData: { contents: JSON.stringify(categories) }
        });
    });
  },
  
  /**
   * 토론 카테고리 로드
   */
  loadDiscussionCategories: function() {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadDiscussionCategories' },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * 설정 저장
   */
  saveSetting: function(key, value) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'saveSetting' },
          postData: { contents: JSON.stringify({ key: key, value: value }) }
        });
    });
  },
  
  /**
   * 설정 로드
   */
  loadSetting: function(key) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'loadSetting', key: key },
          postData: { contents: '{}' }
        });
    });
  },
  
  /**
   * Claude API 호출
   */
  callClaude: function(requestData) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { action: 'callClaude' },
          postData: { contents: JSON.stringify(requestData) }
        });
    });
  },
  
  /**
   * Confluence API 호출
   */
  callConfluence: function(params) {
    return new Promise(function(resolve, reject) {
      google.script.run
        .withSuccessHandler(function(result) {
          resolve(result);
        })
        .withFailureHandler(function(error) {
          reject(error);
        })
        .doPost({
          parameter: { 
            action: 'callConfluence',
            pageId: params.pageId,
            apiToken: params.apiToken,
            email: params.email,
            action: params.action,
            limit: params.limit
          },
          postData: { contents: '{}' }
        });
    });
  }
};

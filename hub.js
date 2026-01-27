// 흐르는 텍스트 생성
async function initFlowingText() {
    try {
        // 먼저 로컬 스토리지에서 데이터 확인
        let glossaryData = [];
        const savedData = localStorage.getItem('glossaryData');
        
        if (savedData) {
            glossaryData = JSON.parse(savedData);
        } else {
            // 로컬 스토리지가 없으면 JSON 파일 로드
            const response = await fetch('data/glossary.json');
            if (response.ok) {
                glossaryData = await response.json();
            } else {
                console.error('데이터를 불러올 수 없습니다.');
                return;
            }
        }
        
        if (!glossaryData || glossaryData.length === 0) {
            console.error('데이터가 없습니다.');
            return;
        }
        
        // 한국어와 일본어 단어 추출
        const words = [];
        glossaryData.forEach(item => {
            if (item.korean) words.push(item.korean);
            if (item.japanese) words.push(item.japanese);
        });
        
        if (words.length === 0) {
            console.error('단어가 없습니다.');
            return;
        }
        
        // 중복 제거 및 랜덤 선택
        const uniqueWords = [...new Set(words)];
        const selectedWords = getRandomWords(uniqueWords, Math.min(100, uniqueWords.length));
        
        // 텍스트 컨테이너
        const textContainer = document.getElementById('wordCloud');
        if (!textContainer) {
            console.error('텍스트 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 내용 제거
        textContainer.innerHTML = '';
        
        // 단어들을 연결하여 텍스트 생성 (구분자로 공백 추가)
        const textContent = selectedWords.join('  •  ');
        
        // 15줄로 배치 (각 줄마다 다른 단어 조합)
        const lines = 15;
        const wordsPerLine = Math.ceil(selectedWords.length / lines);
        
        for (let i = 0; i < lines; i++) {
            const lineWords = selectedWords.slice(i * wordsPerLine, (i + 1) * wordsPerLine);
            if (lineWords.length > 0) {
                const line = document.createElement('div');
                line.className = 'flowing-line';
                line.textContent = lineWords.join('  •  ');
                textContainer.appendChild(line);
            }
        }
    } catch (error) {
        console.error('텍스트 생성 중 오류:', error);
    }
}

// 랜덤 단어 선택
function getRandomWords(words, count) {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initFlowingText();
});

// Firebase 초기화 및 Firestore 설정
// CDN 방식으로 사용

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAHbtzwAZITc0iFzFZWQzsng-LzqdWZu2s",
  authDomain: "ettglossary.firebaseapp.com",
  databaseURL: "https://ettglossary-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ettglossary",
  storageBucket: "ettglossary.firebasestorage.app",
  messagingSenderId: "434137012208",
  appId: "1:434137012208:web:4eac35ac9c4bf04cba6f35"
};

// Firebase 초기화
let db = null;
let firebaseInitialized = false;

// Firebase SDK 로드 대기
function waitForFirebaseSDK() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 10초 대기
    
    const checkSDK = setInterval(() => {
      attempts++;
      if (typeof firebase !== 'undefined') {
        clearInterval(checkSDK);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkSDK);
        reject(new Error('Firebase SDK 로드 시간 초과'));
      }
    }, 100);
  });
}

// 전역으로 export
window.waitForFirebaseSDK = waitForFirebaseSDK;

// Firebase 초기화 함수
async function initFirebase() {
  if (firebaseInitialized) {
    return Promise.resolve(db);
  }

  try {
    // Firebase SDK 로드 대기
    await waitForFirebaseSDK();
    
    // Firebase 앱 초기화
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Firestore 초기화
    db = firebase.firestore();
    firebaseInitialized = true;
    
    console.log('Firebase Firestore 초기화 완료');
    return db;
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    throw error;
  }
}

// Firestore 헬퍼 함수들
const FirestoreHelper = {
  // 데이터 저장
  async save(collection, docId, data) {
    try {
      await initFirebase();
      const docRef = db.collection(collection).doc(docId);
      const FieldValue = firebase.firestore.FieldValue;
      await docRef.set({
        ...data,
        updatedAt: FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Firestore 저장 실패 (${collection}/${docId}):`, error);
      throw error;
    }
  },

  // 데이터 로드
  async load(collection, docId) {
    try {
      await initFirebase();
      const docRef = db.collection(collection).doc(docId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error(`Firestore 로드 실패 (${collection}/${docId}):`, error);
      throw error;
    }
  },

  // 전체 컬렉션 로드
  async loadCollection(collection) {
    try {
      await initFirebase();
      const snapshot = await db.collection(collection).get();
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      return data;
    } catch (error) {
      console.error(`Firestore 컬렉션 로드 실패 (${collection}):`, error);
      throw error;
    }
  },

  // 실시간 리스너 설정
  onSnapshot(collection, docId, callback) {
    initFirebase().then(() => {
      const docRef = db.collection(collection).doc(docId);
      return docRef.onSnapshot((doc) => {
        if (doc.exists) {
          callback(doc.data());
        } else {
          callback(null);
        }
      });
    }).catch(error => {
      console.error(`Firestore 리스너 설정 실패 (${collection}/${docId}):`, error);
      callback(null);
    });
  },

  // 컬렉션 전체 실시간 리스너
  onCollectionSnapshot(collection, callback) {
    initFirebase().then(() => {
      return db.collection(collection).onSnapshot((snapshot) => {
        const data = {};
        snapshot.forEach(doc => {
          data[doc.id] = doc.data();
        });
        callback(data);
      });
    }).catch(error => {
      console.error(`Firestore 컬렉션 리스너 설정 실패 (${collection}):`, error);
      callback({});
    });
  },

  // 데이터 삭제
  async delete(collection, docId) {
    try {
      await initFirebase();
      await db.collection(collection).doc(docId).delete();
      return true;
    } catch (error) {
      console.error(`Firestore 삭제 실패 (${collection}/${docId}):`, error);
      throw error;
    }
  },

  // 배열에 항목 추가
  async addToArray(collection, docId, arrayField, item) {
    try {
      await initFirebase();
      const docRef = db.collection(collection).doc(docId);
      const FieldValue = firebase.firestore.FieldValue;
      await docRef.update({
        [arrayField]: FieldValue.arrayUnion(item),
        updatedAt: FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Firestore 배열 추가 실패 (${collection}/${docId}):`, error);
      throw error;
    }
  },

  // 배열에서 항목 제거
  async removeFromArray(collection, docId, arrayField, item) {
    try {
      await initFirebase();
      const docRef = db.collection(collection).doc(docId);
      const FieldValue = firebase.firestore.FieldValue;
      await docRef.update({
        [arrayField]: FieldValue.arrayRemove(item),
        updatedAt: FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Firestore 배열 제거 실패 (${collection}/${docId}):`, error);
      throw error;
    }
  }
};

// 전역으로 내보내기
window.FirestoreHelper = FirestoreHelper;
window.initFirebase = initFirebase;

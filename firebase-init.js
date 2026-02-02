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
    
    console.log('Firebase Firestore 및 Authentication 초기화 완료');
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

// Authentication 헬퍼
const AuthHelper = {
  // 현재 사용자 확인
  getCurrentUser() {
    return firebase.auth().currentUser;
  },
  
  // 로그인 상태 리스너
  onAuthStateChanged(callback) {
    return firebase.auth().onAuthStateChanged(callback);
  },
  
  // 이메일/비밀번호 로그인
  async signInWithEmailAndPassword(email, password, rememberMe = false) {
    try {
      const persistence = rememberMe 
        ? firebase.auth.Auth.Persistence.LOCAL 
        : firebase.auth.Auth.Persistence.SESSION;
      
      await firebase.auth().setPersistence(persistence);
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      return userCredential;
    } catch (error) {
      console.error('로그인 실패:', error);
      throw error;
    }
  },
  
  // 로그아웃
  async signOut() {
    try {
      await firebase.auth().signOut();
      return true;
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  },
  
  // 로그인 상태 확인
  isAuthenticated() {
    return firebase.auth().currentUser !== null;
  },
  
  // 비밀번호 변경
  async updatePassword(currentPassword, newPassword) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('로그인되어 있지 않습니다.');
      }
      
      // 현재 비밀번호 확인을 위해 재인증
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await user.reauthenticateWithCredential(credential);
      
      // 비밀번호 변경
      await user.updatePassword(newPassword);
      return true;
    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      throw error;
    }
  },
  
  // 사용자 이름 변경
  async updateDisplayName(displayName) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('로그인되어 있지 않습니다.');
      }
      
      await user.updateProfile({
        displayName: displayName
      });
      
      return true;
    } catch (error) {
      console.error('사용자 이름 변경 실패:', error);
      throw error;
    }
  },
  
  // 비밀번호 재설정 이메일 발송
  async sendPasswordResetEmail(email) {
    try {
      console.log('[DEBUG] 비밀번호 재설정 이메일 발송 시도:', email);
      await firebase.auth().sendPasswordResetEmail(email, {
        url: window.location.origin + '/hub.html',
        handleCodeInApp: false
      });
      console.log('[DEBUG] 비밀번호 재설정 이메일 발송 성공');
      return true;
    } catch (error) {
      console.error('[DEBUG] 비밀번호 재설정 이메일 발송 실패:', error);
      console.error('[DEBUG] 에러 코드:', error.code);
      console.error('[DEBUG] 에러 메시지:', error.message);
      throw error;
    }
  }
};

// Realtime Database 헬퍼
let realtimeDB = null;

const RealtimeDBHelper = {
  // Realtime Database 초기화
  async init() {
    try {
      await initFirebase();
      if (!realtimeDB) {
        realtimeDB = firebase.database();
      }
      return realtimeDB;
    } catch (error) {
      console.error('Realtime Database 초기화 실패:', error);
      throw error;
    }
  },

  // 데이터 저장
  async set(path, data) {
    try {
      await this.init();
      const ref = realtimeDB.ref(path);
      await ref.set(data);
      return true;
    } catch (error) {
      console.error(`Realtime DB 저장 실패 (${path}):`, error);
      throw error;
    }
  },

  // 데이터 가져오기
  async get(path) {
    try {
      await this.init();
      const ref = realtimeDB.ref(path);
      const snapshot = await ref.once('value');
      return snapshot.val();
    } catch (error) {
      console.error(`Realtime DB 로드 실패 (${path}):`, error);
      throw error;
    }
  },

  // 데이터 업데이트
  async update(path, data) {
    try {
      await this.init();
      const ref = realtimeDB.ref(path);
      await ref.update(data);
      return true;
    } catch (error) {
      console.error(`Realtime DB 업데이트 실패 (${path}):`, error);
      throw error;
    }
  },

  // 데이터 삭제
  async remove(path) {
    try {
      await this.init();
      const ref = realtimeDB.ref(path);
      await ref.remove();
      return true;
    } catch (error) {
      console.error(`Realtime DB 삭제 실패 (${path}):`, error);
      throw error;
    }
  },

  // 실시간 리스너 설정
  onValue(path, callback) {
    this.init().then(() => {
      const ref = realtimeDB.ref(path);
      ref.on('value', (snapshot) => {
        callback(snapshot.val());
      });
    }).catch(error => {
      console.error(`Realtime DB 리스너 설정 실패 (${path}):`, error);
      callback(null);
    });
  },

  // 리스너 제거
  off(path) {
    if (realtimeDB) {
      const ref = realtimeDB.ref(path);
      ref.off();
    }
  }
};

// 전역으로 내보내기
window.FirestoreHelper = FirestoreHelper;
window.AuthHelper = AuthHelper;
window.RealtimeDBHelper = RealtimeDBHelper;
window.initFirebase = initFirebase;

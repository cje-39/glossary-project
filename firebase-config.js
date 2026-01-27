// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHbtzwAZITc0iFzFZWQzsng-LzqdWZu2s",
  authDomain: "ettglossary.firebaseapp.com",
  databaseURL: "https://ettglossary-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ettglossary",
  storageBucket: "ettglossary.firebasestorage.app",
  messagingSenderId: "434137012208",
  appId: "1:434137012208:web:4eac35ac9c4bf04cba6f35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export for use in other files
export { app };
export default app;

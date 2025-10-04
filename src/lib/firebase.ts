import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

type FirebaseEnvKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_APP_ID'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'

function readEnv(key: FirebaseEnvKey): string | undefined {
  const value = import.meta.env[key]
  return value && value.length > 0 ? value : undefined
}

function requiredEnv(key: FirebaseEnvKey): string {
  const value = readEnv(key)
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const firebaseConfig: FirebaseOptions = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requiredEnv('VITE_FIREBASE_APP_ID'),
  messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
}

function createFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp()
  }
  return initializeApp(firebaseConfig)
}

export const firebaseApp = createFirebaseApp()

export const firebaseAuth: Auth = getAuth(firebaseApp)

export const firestore: Firestore = getFirestore(firebaseApp)

export const firebaseStorage: FirebaseStorage | null = firebaseConfig.storageBucket
  ? getStorage(firebaseApp)
  : null

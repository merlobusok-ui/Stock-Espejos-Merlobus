// Importamos las funciones que necesitamos de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ACÁ PEGÁ TU CONFIGURACIÓN (la que copiaste de la consola de Firebase)
// Debería verse algo así (reemplazá los textos entre comillas con TUS datos reales):
const firebaseConfig = {
  apiKey: "AIzaSyATD5THxdnuhn_JA-kcpucKVrMcQeTit-Y",
  authDomain: "stock-espejos-merlobus.firebaseapp.com",
  projectId: "stock-espejos-merlobus",
  storageBucket: "stock-espejos-merlobus.firebasestorage.app",
  messagingSenderId: "303369060209",
  appId: "1:303369060209:web:193ba6e20989327beb80d0"
};

// Iniciamos la conexión
const app = initializeApp(firebaseConfig);
// Exportamos la base de datos para usarla en el resto de la app
export const db = getFirestore(app);

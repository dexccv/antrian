import { db, auth, isDemoMode } from "./firebase";
import { 
  collection, doc, setDoc, onSnapshot, updateDoc, 
  getDoc, getDocs, deleteDoc, query, orderBy 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, signOut, 
  onAuthStateChanged, createUserWithEmailAndPassword 
} from "firebase/auth";

// --- MOCK DATABASE IMPLEMENTATION (Local Storage Fallback) ---
const mockDb = {
  get: (key, defaultValue) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    // Trigger storage event for same-window updates listener
    window.dispatchEvent(new Event('storage-update'));
  }
};

// Initial states for mock
if (!localStorage.getItem("mock_ktm_queue")) {
  mockDb.set("mock_ktm_queue", {
    data: Array(100).fill(null),
    frontIdx: 0,
    rearIdx: -1,
    count: 0
  });
}
if (!localStorage.getItem("mock_hospital_queue")) {
  mockDb.set("mock_hospital_queue", {
    pasienList: [],
    sedangDiperiksa: null,
    nomerAntreSistem: 1,
    noRegCounter: 1
  });
}

// Custom roles in mock
const mockUsers = {
  "admin@queuehub.com": { role: "admin", name: "Super Administrator" },
  "baak@queuehub.com": { role: "baak_officer", name: "BAAK Officer" },
  "kasir@queuehub.com": { role: "cashier", name: "Klinik Cashier" },
  "dokter@queuehub.com": { role: "doctor", name: "Dokter Klinik" }
};

// --- DATABASE SERVICE API ---

export const dbService = {
  // KTM Queue Service
  subscribeKtmQueue: (callback) => {
    if (isDemoMode) {
      const handler = () => {
        const data = mockDb.get("mock_ktm_queue");
        callback(data);
      };
      window.addEventListener('storage-update', handler);
      handler(); // Initial call
      return () => window.removeEventListener('storage-update', handler);
    } else {
      return onSnapshot(doc(db, "state", "ktm_queue"), (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        } else {
          // Init Firestore document if not exists
          const initial = { data: Array(100).fill(null), frontIdx: 0, rearIdx: -1, count: 0 };
          setDoc(doc(db, "state", "ktm_queue"), initial);
          callback(initial);
        }
      });
    }
  },

  updateKtmQueue: async (state) => {
    if (isDemoMode) {
      mockDb.set("mock_ktm_queue", state);
    } else {
      await setDoc(doc(db, "state", "ktm_queue"), state);
    }
  },

  // Hospital Queue Service
  subscribeHospitalQueue: (callback) => {
    if (isDemoMode) {
      const handler = () => {
        const data = mockDb.get("mock_hospital_queue");
        callback(data);
      };
      window.addEventListener('storage-update', handler);
      handler(); // Initial call
      return () => window.removeEventListener('storage-update', handler);
    } else {
      return onSnapshot(doc(db, "state", "hospital_queue"), (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        } else {
          const initial = { pasienList: [], sedangDiperiksa: null, nomerAntreSistem: 1, noRegCounter: 1 };
          setDoc(doc(db, "state", "hospital_queue"), initial);
          callback(initial);
        }
      });
    }
  },

  updateHospitalQueue: async (state) => {
    if (isDemoMode) {
      mockDb.set("mock_hospital_queue", state);
    } else {
      await setDoc(doc(db, "state", "hospital_queue"), state);
    }
  },

  // Auth / Role Service
  login: async (email, password) => {
    if (isDemoMode) {
      // Simulate login delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = mockUsers[email.toLowerCase()];
      if (user && password === "admin123") {
        const session = { email, role: user.role, name: user.name };
        localStorage.setItem("mock_session", JSON.stringify(session));
        window.dispatchEvent(new Event('auth-update'));
        return session;
      } else {
        throw new Error("Kredensial salah (Gunakan password: admin123)");
      }
    } else {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Fetch role from Firestore users collection
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        return {
          email: userCredential.user.email,
          role: userDoc.data().role,
          name: userDoc.data().name || "Staff Member"
        };
      } else {
        // Default fallback if role document is missing
        return { email: userCredential.user.email, role: "admin", name: "Administrator" };
      }
    }
  },

  logout: async () => {
    if (isDemoMode) {
      localStorage.removeItem("mock_session");
      window.dispatchEvent(new Event('auth-update'));
    } else {
      await signOut(auth);
    }
  },

  subscribeAuth: (callback) => {
    if (isDemoMode) {
      const handler = () => {
        const session = localStorage.getItem("mock_session");
        callback(session ? JSON.parse(session) : null);
      };
      window.addEventListener('auth-update', handler);
      handler();
      return () => window.removeEventListener('auth-update', handler);
    } else {
      return onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            callback({
              email: user.email,
              role: userDoc.data().role,
              name: userDoc.data().name || "Staff Member"
            });
          } else {
            callback({ email: user.email, role: "admin", name: "Administrator" });
          }
        } else {
          callback(null);
        }
      });
    }
  }
};

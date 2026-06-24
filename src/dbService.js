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

// Custom roles in mock stored in local storage
const defaultMockUsers = {
  "admin@queuehub.com": { role: "admin", name: "Super Administrator", password: "admin123" },
  "baak@queuehub.com": { role: "baak_officer", name: "BAAK Officer", password: "admin123" },
  "kasir@queuehub.com": { role: "cashier", name: "Klinik Cashier", password: "admin123" },
  "dokter@queuehub.com": { role: "doctor", name: "Dokter Klinik", password: "admin123" }
};
if (!localStorage.getItem("mock_users")) {
  localStorage.setItem("mock_users", JSON.stringify(defaultMockUsers));
}

const getMockUsers = () => JSON.parse(localStorage.getItem("mock_users"));

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
      handler();
      return () => window.removeEventListener('storage-update', handler);
    } else {
      return onSnapshot(doc(db, "state", "ktm_queue"), (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        } else {
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
      handler();
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
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getMockUsers();
      const user = users[email.toLowerCase()];
      if (user && user.password === password) {
        const session = { email, role: user.role, name: user.name };
        localStorage.setItem("mock_session", JSON.stringify(session));
        window.dispatchEvent(new Event('auth-update'));
        return session;
      } else {
        throw new Error("Email atau password salah.");
      }
    } else {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        return {
          email: userCredential.user.email,
          role: userDoc.data().role,
          name: userDoc.data().name || "Staff Member",
          uid: userCredential.user.uid
        };
      } else {
        return { email: userCredential.user.email, role: "pending_approval", name: "User Baru", uid: userCredential.user.uid };
      }
    }
  },

  register: async (email, password, name) => {
    const defaultRole = "pending_approval";
    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const users = getMockUsers();
      const lowerEmail = email.toLowerCase();
      if (users[lowerEmail]) {
        throw new Error("Email sudah terdaftar.");
      }
      users[lowerEmail] = { role: defaultRole, name, password };
      localStorage.setItem("mock_users", JSON.stringify(users));
      
      const session = { email, role: defaultRole, name };
      localStorage.setItem("mock_session", JSON.stringify(session));
      window.dispatchEvent(new Event('auth-update'));
      return session;
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user role doc in Firestore as pending_approval
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        name,
        role: defaultRole
      });
      return {
        email,
        name,
        role: defaultRole,
        uid: userCredential.user.uid
      };
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
              name: userDoc.data().name || "Staff Member",
              uid: user.uid
            });
          } else {
            callback({ email: user.email, role: "pending_approval", name: "User Baru", uid: user.uid });
          }
        } else {
          callback(null);
        }
      });
    }
  },

  // Get all users in the system (Admin only)
  getAllUsers: async () => {
    if (isDemoMode) {
      const users = getMockUsers();
      return Object.keys(users).map(email => ({
        id: email, // Use email as unique ID for mock
        email,
        name: users[email].name,
        role: users[email].role
      }));
    } else {
      const q = collection(db, "users");
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return list;
    }
  },

  // Update user role (Admin only)
  updateUserRole: async (userId, newRole) => {
    if (isDemoMode) {
      const users = getMockUsers();
      if (users[userId]) {
        users[userId].role = newRole;
        localStorage.setItem("mock_users", JSON.stringify(users));
        
        // If the updated user is current user, update current session role too
        const session = localStorage.getItem("mock_session");
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed.email === userId) {
            parsed.role = newRole;
            localStorage.setItem("mock_session", JSON.stringify(parsed));
            window.dispatchEvent(new Event('auth-update'));
          }
        }
        window.dispatchEvent(new Event('storage-update'));
      }
    } else {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole
      });
    }
  }
};

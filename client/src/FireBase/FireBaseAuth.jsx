
import { createContext, useContext } from "react";
import { app } from "./firebaseConfig";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { getSetUser } from "../APIS/user";

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const FireBaseContext = createContext(null);



const signinByGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const res1=await getSetUser(res.user.uid, res.user.displayName || "", res.user.email)
    return {
      userId: res.user.uid,
      email: res.user.email,
      profilePic: res.user.photoURL,
      name: res.user.displayName
    };
    
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    return false;
  }
};




const signup = async (email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
      const res1=await getSetUser(res.user.uid, res.user.displayName || "", res.user.email)
    
    return {
      userId: res.user.uid,
      email: res.user.email,
      profilePic: "",
      name: ""
    };
  } catch (error) {
    console.error("Signup Error:", error);
    return false;
  }
};


const signin = async (email, password) => {
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return {
      userId: res.user.uid,
      email: res.user.email
    };
  } catch (error) {
    console.error("Signin Error:", error);
    return false;
  }
};


export const FireBaseAuthProvider = ({ children }) => {
  return (
    <FireBaseContext.Provider value={{ signOut,signin, signup, signinByGoogle }}>
      {children}
    </FireBaseContext.Provider>
  );
};


export const useFirebase = () => useContext(FireBaseContext);

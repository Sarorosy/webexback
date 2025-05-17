require("dotenv").config();
const admin = require("firebase-admin");
const axios = require("axios");

(async () => {
  try {
    const response = await axios.get("https://rapidcollaborate.com/firebase-json-key.json");
    const serviceAccount = response.data;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error.message);
  }
})();

module.exports = admin;

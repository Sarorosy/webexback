require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-json-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;

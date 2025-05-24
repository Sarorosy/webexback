const admin = require("./firebaseAdmin");
const db = require('./db');
const striptags = require("striptags");

/**
 * Sends a push notification based on user type and data.
 * 
 * @param {Object} options
 * @param {string} options.sender_id
 * @param {string} options.sender_name
 * @param {string} options.profile_pic
 * @param {string} options.receiver_id
 * @param {string} options.user_type
 * @param {string} options.message
 * @returns {Promise<Object>} - Result of sending notification
 */
const sendNotification = (options) => {
    const {
        sender_id,
        sender_name,
        profile_pic,
        receiver_id, // this will be group_id if user_type == 'group'
        user_type,
        message,
        mentionedUsers
    } = options;

    return new Promise((resolve, reject) => {
        const cleanMessage = striptags(String(message || ""))
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .slice(0, 7)
            .join(" ");


        let iconUrl = "";
        if (profile_pic) {
            iconUrl = `https://rapidcollaborate.in/ccp${profile_pic}`;
        } else {
            const firstLetter = sender_name ? sender_name.charAt(0).toUpperCase() : "U";
            iconUrl = `https://ui-avatars.com/api/?name=${firstLetter}&background=random&color=fff&size=128`;
        }

        // 👉 Handle one-on-one user notification
        if (user_type === "user") {
            db.query("SELECT token FROM tbl_fcmtokens WHERE user_id = ? LIMIT 1", [receiver_id], (err, results) => {
                if (err) return reject({ success: false, error: err.message });
                if (results.length === 0) return resolve({ success: false, error: "FCM token not found" });

                const token = results[0].token;

                const payload = {
                    token,
                    data: {
                        sender_id,
                        sender_name,
                        profile_pic: iconUrl,
                        message: cleanMessage
                    }
                };

                admin.messaging().send(payload)
                    .then(response => resolve({ success: true, response }))
                    .catch(error => reject({ success: false, error: error.message }));
            });
        }

        // 👉 Handle group notification
        else if (user_type === "group") {
            const group_id = receiver_id;

            // Step 0: Get group name from tbl_groups
            db.query("SELECT name FROM tbl_groups WHERE id = ? LIMIT 1", [group_id], (err, groupResults) => {
                if (err) return reject({ success: false, error: err.message });

                if (!groupResults.length) return resolve({ success: false, message: "Group not found" });

                const groupName = groupResults[0].name;
                const senderDisplayName = groupName; // This will be shown as notification title

                // Step 1: Get all members (except sender)
                db.query("SELECT user_id FROM tbl_group_members WHERE group_id = ? AND user_id != ?", [group_id, sender_id], (err, members) => {
                    if (err) return reject({ success: false, error: err.message });

                    if (!members.length) return resolve({ success: false, message: "No group members found" });

                    const userIds = members.map(m => m.user_id);

                    // Step 2: Get FCM tokens for these users
                    db.query("SELECT user_id, token FROM tbl_fcmtokens WHERE user_id IN (?)", [userIds], (err, tokenResults) => {
                        if (err) return reject({ success: false, error: err.message });

                        const promises = [];

                        for (const row of tokenResults) {
                            const { user_id, token } = row;

                            // Check if this user is mentioned
                            let personalMessage = cleanMessage;
                            if (Array.isArray(mentionedUsers) && mentionedUsers.includes(user_id)) {
                                personalMessage = `${sender_name} @mentioned you: ${cleanMessage}`;
                            } else {
                                personalMessage = `${sender_name}: ${cleanMessage}`;
                            }

                            const payload = {
                                token,
                                data: {
                                    sender_id,
                                    receiver_id,
                                    sender_name: senderDisplayName, // use group name here
                                    profile_pic: iconUrl,
                                    user_type: user_type,
                                    message: personalMessage
                                }
                            };

                            promises.push(
                                admin.messaging().send(payload)
                                    .then(res => ({ user_id, success: true, res }))
                                    .catch(err => ({ user_id, success: false, err: err.message }))
                            );
                        }

                        Promise.all(promises)
                            .then(results => {
                                const success = results.filter(r => r.success);
                                const failed = results.filter(r => !r.success);
                                resolve({ success: true, sent: success.length, failed });
                            })
                            .catch(error => reject({ success: false, error }));
                    });
                });
            });
        }


        // 👉 Unknown user type
        else {
            return resolve({ success: false, message: "User type not eligible for notification." });
        }
    });
};



module.exports = sendNotification;

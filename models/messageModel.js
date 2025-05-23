const db = require('../db');

const togglePin = (user_id, message_id) => {
  return new Promise((resolve, reject) => {
    const getQuery = `SELECT pinned_users FROM tbl_messages WHERE id = ?`;
    db.query(getQuery, [message_id], (err, rows) => {
      if (err) return reject(err);
      if (!rows.length) return reject("Message not found");

      let pinnedUsers = [];
      try {
        pinnedUsers = JSON.parse(rows[0].pinned_users || "[]");
      } catch {
        pinnedUsers = [];
      }

      const index = pinnedUsers.indexOf(user_id);
      if (index > -1) {
        pinnedUsers.splice(index, 1); // Unpin
      } else {
        pinnedUsers.push(user_id); // Pin
      }

      const updateQuery = `UPDATE tbl_messages SET pinned_users = ? WHERE id = ?`;
      db.query(updateQuery, [JSON.stringify(pinnedUsers), message_id], (err2) => {
        if (err2) return reject(err2);
        resolve(pinnedUsers);
      });
    });
  });
};

const getPinnedMessages = (user_id, search_user_id, type) => {
  return new Promise((resolve, reject) => {
    let sql = '';
    let params = [];
    
    if (type === 'user') {
      sql = `
        SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.group_id,
          u.name AS sender_name,
          u.profile_pic,
          m.message,
          m.created_at,
          m.pinned_users
        FROM tbl_messages m
        JOIN tbl_users u ON m.sender_id = u.id
        WHERE 
          (
            (m.sender_id = ? AND m.receiver_id = ?) 
            OR 
            (m.receiver_id = ? AND m.sender_id = ?)
          )
          AND m.is_history != 1
          AND JSON_CONTAINS(m.pinned_users, CAST(? AS JSON))
        ORDER BY m.created_at DESC
      `;
      params = [user_id, search_user_id, user_id, search_user_id, user_id];
    } else if (type === 'group') {
      sql = `
        SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.group_id,
          u.name AS sender_name,
          u.profile_pic,
          m.message,
          m.created_at,
          m.pinned_users
        FROM tbl_messages m
        JOIN tbl_users u ON m.sender_id = u.id
        WHERE 
          m.group_id = ?
          AND m.is_history != 1
          AND JSON_CONTAINS(m.pinned_users, CAST(? AS JSON))
        ORDER BY m.created_at DESC
      `;
      params = [search_user_id, user_id]; // search_user_id is the group_id in this case
    } else {
      return reject(new Error("Invalid type provided"));
    }
    
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};


const findMessages = (logged_in_userid, find_in_userid, query, type) => {
  return new Promise((resolve, reject) => {
    let sql = '';
    let params = [];

    if (type === 'user') {
      sql = `
        SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.group_id,
          u.name AS sender_name,
          u.profile_pic,
          m.message,
          m.created_at
        FROM tbl_messages m
        JOIN tbl_users u ON m.sender_id = u.id
        WHERE 
          (
            (m.sender_id = ? AND m.receiver_id = ?) 
            OR 
            (m.receiver_id = ? AND m.sender_id = ?)
          )
          AND m.is_history != 1
          AND m.message LIKE CONCAT('%', ?, '%')
        ORDER BY m.created_at DESC
      `;
      params = [logged_in_userid, find_in_userid, logged_in_userid, find_in_userid, query];
    } else if (type === 'group') {
      sql = `
        SELECT 
          m.id,
          m.sender_id,
          m.receiver_id,
          m.group_id,
          u.name AS sender_name,
          u.profile_pic,
          m.message,
          m.created_at
        FROM tbl_messages m
        JOIN tbl_users u ON m.sender_id = u.id
        WHERE 
          m.group_id = ?
          AND m.message LIKE CONCAT('%', ?, '%')
          AND m.is_history != 1
        ORDER BY m.created_at DESC
      `;
      params = [find_in_userid, query]; // here, find_in_userid is the group_id
    } else {
      return reject(new Error("Invalid type provided"));
    }

    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};


const totalFindMessages = (sender_id, query) => {
  return new Promise((resolve, reject) => {
    // 1. Find matching users
    const userSql = `
      SELECT id, name, profile_pic, office_name, city_name FROM tbl_users 
      WHERE name LIKE CONCAT('%', ?, '%')
    `;

    // 2. Find groups with sender as a member
    const groupSql = `
      SELECT g.id, g.name FROM tbl_groups g
      JOIN tbl_group_members gm ON gm.group_id = g.id
      WHERE g.name LIKE CONCAT('%', ?, '%') AND gm.user_id = ?
    `;

    // 3. Find messages with sender_id or receiver_id or group_id
    const messageSql = `
  SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.group_id,
    u.name AS sender_name,
    u.profile_pic,
    m.message,
    m.created_at
  FROM tbl_messages m
  JOIN tbl_users u ON m.sender_id = u.id
  WHERE 
    m.is_history != 1
    AND m.message NOT LIKE '%data:image%'
    AND m.message NOT LIKE 'iVBOR%'
    AND m.message LIKE CONCAT('%', ?, '%')
    AND (
      (m.group_id IS NULL AND (m.sender_id = ? OR m.receiver_id = ?))
      OR (m.group_id IN (
        SELECT group_id FROM tbl_group_members WHERE user_id = ?
      ))
    )
  ORDER BY m.created_at DESC
`;


    // Execute all queries in parallel
    Promise.all([
      new Promise((res, rej) =>
        db.query(userSql, [ query], (err, rows) => (err ? rej(err) : res(rows)))
      ),
      new Promise((res, rej) =>
        db.query(groupSql, [query, sender_id], (err, rows) => (err ? rej(err) : res(rows)))
      ),
      new Promise((res, rej) =>
        db.query(messageSql, [query, sender_id, sender_id, sender_id], (err, rows) => (err ? rej(err) : res(rows)))
      ),
    ])
      .then(([users, groups, messages]) => {
        // First, let's gather all user IDs and group IDs we need to fetch
        const userIds = new Set();
        const groupIds = new Set();
        
        messages.forEach(msg => {
          if (msg.group_id) {
            groupIds.add(msg.group_id);
          } else {
            // For direct messages, add the other user's ID
            if (msg.sender_id == sender_id) {
              userIds.add(msg.receiver_id);
            } else {
              userIds.add(msg.sender_id);
            }
          }
        });
        
        // Convert Sets to Arrays for the query
        const userIdsArray = Array.from(userIds);
        const groupIdsArray = Array.from(groupIds);
        
        // Create promises for fetching additional data
        const promises = [];
        
        // Only query if there are IDs to fetch
        if (userIdsArray.length > 0) {
          const userDetailsSql = `
            SELECT id, name, profile_pic FROM tbl_users 
            WHERE id IN (?)
          `;
          promises.push(
            new Promise((res, rej) =>
              db.query(userDetailsSql, [userIdsArray], (err, rows) => (err ? rej(err) : res({ type: 'users', data: rows })))
            )
          );
        } else {
          promises.push(Promise.resolve({ type: 'users', data: [] }));
        }
        
        if (groupIdsArray.length > 0) {
          const groupDetailsSql = `
            SELECT id, name FROM tbl_groups 
            WHERE id IN (?)
          `;
          promises.push(
            new Promise((res, rej) =>
              db.query(groupDetailsSql, [groupIdsArray], (err, rows) => (err ? rej(err) : res({ type: 'groups', data: rows })))
            )
          );
        } else {
          promises.push(Promise.resolve({ type: 'groups', data: [] }));
        }
        
        // Execute the additional queries
        return Promise.all([...promises, { type: 'initial', data: { users, groups, messages } }]);
      })
      .then(results => {
        let userData = {};
        let groupData = {};
        let initialData;
        
        // Process results
        results.forEach(result => {
          if (result.type === 'users') {
            result.data.forEach(user => {
              userData[user.id] = user;
            });
          } else if (result.type === 'groups') {
            result.data.forEach(group => {
              groupData[group.id] = group;
            });
          } else if (result.type === 'initial') {
            initialData = result.data;
          }
        });
        
        // Add user information to each message
        const messagesWithUser = initialData.messages.map(msg => {
          const msgWithType = {
            ...msg,
            type: msg.group_id ? "group" : "user"
          };
          
          // Add user information based on message type
          if (msg.group_id) {
            // For group messages
            const group = groupData[msg.group_id] || { id: msg.group_id, name: "Unknown Group", profile_pic: null };
            msgWithType.user = {
              id: group.id,
              name: group.name,
              profile_pic: null,
              type: "group"
            };
          } else {
            // For direct messages
            let otherUserId;
            if (msg.sender_id == sender_id) {
              otherUserId = msg.receiver_id;
            } else {
              otherUserId = msg.sender_id;
            }
            
            const user = userData[otherUserId] || { id: otherUserId, name: "Unknown User", profile_pic: null };
            msgWithType.user = {
              id: user.id,
              name: user.name,
              profile_pic: user.profile_pic,
              type: "user"
            };
          }
          
          return msgWithType;
        });
        
        resolve({
          users: initialData.users,
          groups: initialData.groups,
          messages: messagesWithUser
        });
      })
      .catch(reject);
  });
};


module.exports = {
  togglePin,
  getPinnedMessages,
  findMessages,
  totalFindMessages
};

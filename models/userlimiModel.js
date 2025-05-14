const db = require('../db');

const sendRequests = (sender_id, group_id, user_ids, requested_at) => {
  return new Promise((resolve, reject) => {
    const values = user_ids.map(user_id => [sender_id, group_id, user_id, requested_at]);

    const sql = `
      INSERT INTO tbl_user_limit_requests (sender_id, group_id, user_id, requested_at)
      VALUES ?
    `;

    db.query(sql, [values], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const getAllRequests = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        ulr.id,
        ulr.sender_id,
        sender.name AS sender_name,
        ulr.group_id,
        g.name AS group_name,
        ulr.user_id,
        target.name AS user_name,
        ulr.requested_at
      FROM tbl_user_limit_requests ulr
      JOIN tbl_users sender ON ulr.sender_id = sender.id
      JOIN tbl_users target ON ulr.user_id = target.id
      JOIN tbl_groups g ON ulr.group_id = g.id
      ORDER BY ulr.requested_at DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};
const approveRequest = (id) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM tbl_user_limit_requests WHERE id = ?', [id], (err, requestRows) => {
      if (err) return reject(err);
      if (requestRows.length === 0) return reject({ code: 404, message: "Request not found" });

      const request = requestRows[0];

      db.query('SELECT id FROM tbl_groups WHERE id = ?', [request.group_id], (err, groupRows) => {
        if (err) return reject(err);

        if (groupRows.length === 0) {
          // Group doesn't exist, delete the request
          db.query('DELETE FROM tbl_user_limit_requests WHERE id = ?', [id], () => {
            return reject({ code: 404, message: "Group was not found" });
          });
        } else {
          // Check if user already in group
          db.query(
            'SELECT * FROM tbl_group_members WHERE group_id = ? AND user_id = ?',
            [request.group_id, request.user_id],
            (err, memberRows) => {
              if (err) return reject(err);

              if (memberRows.length > 0) {
                // User already in group
                db.query('DELETE FROM tbl_user_limit_requests WHERE id = ?', [id], () => {
                  return reject({ code: 400, message: "User already present in the group" });
                });
              } else {
                // Approve the request
                const now = '2025-05-08 14:35:13'; // You can make this dynamic
                db.query('UPDATE tbl_groups SET member_limit = member_limit + 1 WHERE id = ?', [request.group_id], (err) => {
                  if (err) return reject(err);

                  db.query(
                    'INSERT INTO tbl_group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)',
                    [request.group_id, request.user_id, now],
                    (err) => {
                      if (err) return reject(err);

                      db.query('DELETE FROM tbl_user_limit_requests WHERE id = ?', [id], (err) => {
                        if (err) return reject(err);
                        resolve({ message: "User approved and added to the group" });
                      });
                    }
                  );
                });
              }
            }
          );
        }
      });
    });
  });
};

module.exports = {
  sendRequests,
  getAllRequests,
  approveRequest
};

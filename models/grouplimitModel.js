const db = require('../db');

const sendRequest = (sender_id, group_id) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO tbl_group_limit_requests (sender_id, group_id, requested_at) VALUES (?, ?, NOW())`;
    db.query(sql, [sender_id, group_id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const getAllRequests = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        glr.id,
        glr.sender_id,
        u.name AS sender_name,
        glr.group_id,
        g.name AS group_name,
        g.member_limit,
        glr.requested_at
      FROM tbl_group_limit_requests glr
      JOIN tbl_users u ON glr.sender_id = u.id
      JOIN tbl_groups g ON glr.group_id = g.id
      ORDER BY glr.requested_at DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const approveRequest = (id, newLimit) => {
  return new Promise((resolve, reject) => {
    db.query(`SELECT * FROM tbl_group_limit_requests WHERE id = ?`, [id], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return reject({ code: 404, message: "Request not found" });

      const request = rows[0];

      // Check if group exists
      db.query(`SELECT * FROM tbl_groups WHERE id = ?`, [request.group_id], (err, groupRows) => {
        if (err) return reject(err);

        if (groupRows.length === 0) {
          // Group not found - delete the request
          db.query(`DELETE FROM tbl_group_limit_requests WHERE id = ?`, [id], () => {
            return reject({ code: 404, message: "Group not found or maybe deleted" });
          });
        } else {
          const currentLimit = groupRows[0].member_limit;
          const updatedLimit = currentLimit + newLimit;

          // Update group limit
          db.query(
            `UPDATE tbl_groups SET member_limit = ? WHERE id = ?`,
            [updatedLimit, request.group_id],
            (err) => {
              if (err) return reject(err);

              // Delete the request
              db.query(`DELETE FROM tbl_group_limit_requests WHERE id = ?`, [id], (err) => {
                if (err) return reject(err);
                resolve({ message: `Group limit increased by ${newLimit} (from ${currentLimit} to ${updatedLimit}) and request deleted.` });
              });
            }
          );
        }
      });
    });
  });
};


module.exports = {
  sendRequest,
  getAllRequests,
  approveRequest,
};

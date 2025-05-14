const md5 = require("md5");
const userModel = require("../models/userModel");
const groupModel = require('../models/groupModel');
const crypto = require("crypto");
const { getIO } = require("../socket");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/users");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true }); // Create 'uploads/users' folder if not exists
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `user_${Date.now()}${ext}`); // Unique filename
    },
});

const upload = multer({ storage: storage });


// Login user
const loginUser = (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = md5(password); // Hash password using MD5

    // Find user by email
    userModel.findUserByEmail(email, (err, user) => {
        if (err) return res.status(500).json({ status:false , message: "Database error" });
        if (!user) return res.status(401).json({ status:false , message: "User not found" });

        // Compare hashed passwords
        if (user.password !== password) {
            return res.status(401).json({ status:false , message: "Invalid credentials" });
        }

        const token = crypto.randomBytes(16).toString("hex");

        // Update the user's token in the database
        userModel.updateUserToken(user.id, token, (err) => {
            if (err) return res.status(500).json({ status: false, message: "Failed to update token" });

            res.json({ status: true, message: "Login successful", token, data: user });
        });

    });
};

const getAllUsers = (req, res) => {
    userModel.getAllUsers((err, users) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        res.json({ status: true, data: users });
    });
};

const getUsersForGroup = (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ status: false, message: "User ID is required" });
    }

    userModel.getUsersForGroup(user_id, (err, users) => {
        if (err) {
            return res.status(500).json({ status: false, message: "Database error" });
        }
        res.json({ status: true, data: users });
    });
};

const getUsersExcludingIds = (req, res) => {
    const { exclude_ids = [] } = req.body;

    // Ensure exclude_ids is an array
    if (!Array.isArray(exclude_ids)) {
        return res.status(400).json({ status: false, message: "exclude_ids must be an array" });
    }

    userModel.getUsersExcludingIds(exclude_ids, (err, users) => {
        if (err) {
            return res.status(500).json({ status: false, message: "Database error" });
        }
        res.json({ status: true, data: users });
    });
};



const updateUser = (req, res) => {
    upload.single("profile_pic")(req, res, () => {
        const { id, name, pronouns, bio, email, user_panel, max_group_count } = req.body;
        
        // Fetch the existing user to retain the old profile picture if no new file is uploaded
        userModel.findUserById(id, (err, existingUser) => {
            if (err || !existingUser) {
                return res.status(500).json({ status: false, message: "User not found" });
            }

            let profile_pic = req.file ? `/uploads/users/${req.file.filename}` : existingUser.profile_pic; // Retain old pic if no new file

            userModel.updateUser(id, { name, pronouns, bio, profile_pic, user_panel, max_group_count }, (err, result) => {
                if (err) {
                    console.error("Update error:", err);
                    return res.status(500).json({ status: false, message: "Database error" });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ status: false, message: "User not found" });
                }

                userModel.findUserById(id, (err, updatedUser) => {
                    if (err || !updatedUser) {
                        return res.status(500).json({ status: false, message: "Error fetching updated user" });
                    }

                    const io = getIO();
                    io.emit("user_updated", updatedUser);

                    res.json({ status: true, message: "Profile updated successfully", updatedUser });
                });
            });
        });
    });
};

const changeUserType = (req, res) => {
  const { user_id, user_type } = req.body;

  if (!user_id || typeof user_type !== "string") {
    return res.status(400).json({ status: false, message: "Invalid user_id or user_type" });
  }

  userModel.updateUserType(user_id, user_type, (err, result) => {
    if (err) {
      console.error("Error updating user type:", err);
      return res.status(500).json({ status: false, message: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    userModel.findUserById(user_id, (err, updatedUser) => {
      if (err || !updatedUser) {
        return res.status(500).json({ status: false, message: "Error fetching updated user" });
      }

      const io = getIO();
      io.emit("user_updated", updatedUser);

      console.log(updatedUser);

      res.json({ status: true, message: "User type updated", updatedUser });
    });
  });
};


const addUser = (req, res) => {
    const { name, email, password, user_panel, max_group_count, office_name, city_name } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ status: false, message: "All fields are required" });
    }

    const finalMaxGroupCount = Number.isInteger(max_group_count) && max_group_count > 0 ? max_group_count : 5;

    userModel.findUserByEmail(email, (err, user) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });

        if (user && user.trashed === 0) {
            return res.status(400).json({ status: false, message: "Email already exists" });
        }

        const newUser = {
            name,
            email,
            password,
            user_panel,
            max_group_count: finalMaxGroupCount,
            office_name,
            city_name
        };

        userModel.addUser(newUser, (err, result) => {
            if (err) return res.status(500).json({ status: false, message: "Failed to add user" });

            res.json({ status: true, message: "User added successfully" });
        });
    });
};

// Edit user details
const editUser = (req, res) => {
    upload.single("profile_pic")(req, res, () => {
        const { id, name, pronouns, bio, email } = req.body;
        let profile_pic = req.file ? `/uploads/users/${req.file.filename}` : null;

        userModel.updateUser(id, { name, pronouns, bio, profile_pic, email }, (err, result) => {
            if (err) return res.status(500).json({ status: false, message: "Database error" });
            if (result.affectedRows === 0) return res.status(404).json({ status: false, message: "User not found" });

            userModel.findUserById(id, (err, updatedUser) => {
                if (err) return res.status(500).json({ status: false, message: "Error fetching updated user" });
                if (!updatedUser) return res.status(404).json({ status: false, message: "User not found" });

                const io = getIO();
                io.emit("user_updated", updatedUser);

                res.json({ status: true, message: "User updated successfully", updatedUser });
            });
        });
    });
};

// Soft delete user (update trashed column)
const deleteUser = (req, res) => {
    const { id } = req.params;
    userModel.softDeleteUser(id, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (result.affectedRows === 0) return res.status(404).json({ status: false, message: "User not found" });

        res.json({ status: true, message: "User deleted successfully" });
    });
};

const getUserById = (req, res) => {
    const userId = req.params.id;

    userModel.findUserById(userId, (err, user) => {
        if (err) {
            console.error("Error fetching user:", err);
            return res.status(500).json({ status: false, message: "Internal server error" });
        }

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        res.status(200).json({ status: true, user });
    });
};


module.exports = { loginUser , getAllUsers, getUsersForGroup,getUsersExcludingIds, updateUser,changeUserType, addUser, editUser, deleteUser,getUserById };

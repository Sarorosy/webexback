const md5 = require("md5");
const userModel = require("../models/userModel");
const groupModel = require('../models/groupModel');
const crypto = require("crypto");
const { getIO } = require("../socket");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");


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

const checkUserType = (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: false, message: "Email is required" });
    }

    userModel.findUserByEmail(email, (err, user) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        return res.json({ status: true, user_type: user.user_type , user_panel: user.user_panel });
    });
};

const updatePassword = (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ status: false, message: "Email and password are required" });
  }

  userModel.findUserByEmail(email, (err, user) => {
    if (err) return res.status(500).json({ status: false, message: "Database error" });
    if (!user) return res.status(404).json({ status: false, message: "User not found" });

    userModel.updateUserPassword(user.id, newPassword, (err, result) => {
      if (err) return res.status(500).json({ status: false, message: "Failed to update password" });
      return res.json({ status: true, message: "Password updated successfully" });
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



const updateUserold = (req, res) => {
    upload.single("profile_pic")(req, res, () => {
        const {
            id,
            name,
            pronouns,
            bio,
            password,
            email,
            user_panel,
            max_group_count,
            office_name,
            city_name,
            delete_profile_pic
        } = req.body;

        userModel.findUserById(id, (err, existingUser) => {
            if (err || !existingUser) {
                return res.status(500).json({ status: false, message: "User not found" });
            }

            let profile_pic = existingUser.profile_pic; 

            if(delete_profile_pic && delete_profile_pic == "yes") {
                profile_pic = null;
            }else{
                profile_pic = req.file
                ? `/uploads/users/${req.file.filename}`
                : existingUser.profile_pic;
            }
            

            // Use new values if provided, otherwise fallback to existing values
            const updatedData = {
                name: name || existingUser.name,
                pronouns: pronouns || existingUser.pronouns,
                bio: bio || existingUser.bio,
                password: password || existingUser.password,
                profile_pic,
                user_panel: user_panel ?? existingUser.user_panel,
                max_group_count: max_group_count ?? existingUser.max_group_count,
                office_name: office_name || existingUser.office_name,
                city_name: city_name || existingUser.city_name
            };

            userModel.updateUser(id, updatedData, (err, result) => {
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

                    res.json({
                        status: true,
                        message: "Profile updated successfully",
                        updatedUser
                    });
                });
            });
        });
    });
};

const updateUser = (req, res) => {
    upload.single("profile_pic")(req, res, async () => {
        const {
            id,
            name,
            pronouns,
            bio,
            password,
            email,
            user_panel,
            max_group_count,
            office_name,
            city_name,
            delete_profile_pic
        } = req.body;

        userModel.findUserById(id, async (err, existingUser) => {
            if (err || !existingUser) {
                return res.status(500).json({ status: false, message: "User not found" });
            }

            let profile_pic = existingUser.profile_pic;

            // Upload file externally if file is present and not marked for deletion
            if (delete_profile_pic && delete_profile_pic === "yes") {
                profile_pic = null;
            } else if (req.file) {
                try {
                    const formData = new FormData();
                    formData.append("file", fs.createReadStream(req.file.path));
                    formData.append("type", "user");

                    const response = await axios.post("https://rapidcollaborate.in/ccp/upload_file.php", formData, {
                        headers: formData.getHeaders()
                    });

                    if (response.data && response.data.path) {
                        profile_pic = response.data.path; // Use returned path
                        fs.unlinkSync(req.file.path); // Remove local file after upload
                    } else {
                        console.error("Upload failed:", response.data);
                        return res.status(500).json({ status: false, message: "File upload failed" });
                    }
                } catch (uploadError) {
                    console.error("Error uploading file:", uploadError);
                    return res.status(500).json({ status: false, message: "Error uploading file" });
                }
            }

            const updatedData = {
                name: name || existingUser.name,
                pronouns: pronouns || existingUser.pronouns,
                bio: bio || existingUser.bio,
                password: password || existingUser.password,
                profile_pic,
                user_panel: user_panel ?? existingUser.user_panel,
                max_group_count: max_group_count ?? existingUser.max_group_count,
                office_name: office_name || existingUser.office_name,
                city_name: city_name || existingUser.city_name
            };

            userModel.updateUser(id, updatedData, (err, result) => {
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

                    res.json({
                        status: true,
                        message: "Profile updated successfully",
                        updatedUser
                    });
                });
            });
        });
    });
};

const changeUserType = (req, res) => {
  const { user_id, user_type, permissions } = req.body;

  if (!user_id || typeof user_type !== "string" || typeof permissions !== "object") {
    return res.status(400).json({ status: false, message: "Invalid input" });
  }

  // Convert boolean permissions to 0 or 1
  const permissionFields = {
    view_users: permissions.view_users ? 1 : 0,
    add_users: permissions.add_users ? 1 : 0,
    edit_users: permissions.edit_users ? 1 : 0,
    delete_users: permissions.delete_users ? 1 : 0,
    access_requests: permissions.access_requests ? 1 : 0,
  };

  userModel.updateUserTypeAndPermissions(user_id, user_type, permissionFields, (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
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

      res.json({ status: true, message: "User type and permissions updated", updatedUser });
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
            if (err) return res.status(500).json({ status: false, message: "Failed to add user" + err });

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


module.exports = { loginUser ,checkUserType, updatePassword, getAllUsers, getUsersForGroup,getUsersExcludingIds, updateUser,changeUserType, addUser, editUser, deleteUser,getUserById };

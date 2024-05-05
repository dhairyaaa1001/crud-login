const express = require('express');
const userModel = require('../model/user');
const nodemailer = require('nodemailer');
const router = express.Router();

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (!req.session.email) {
        console.log("Session is not active");
        return res.redirect('/login');
    }
    next();
}

// Home page route; redirects to login if not authenticated
router.get('/', ensureAuthenticated, (req, res, next) => {
    res.render('home', { myEmail: req.session.email });
});

// Route to render the registration page
router.get('/register', (req, res, next) => {
    res.render('register');
});

// Route to handle user registration
router.post('/registerform', async (req, res, next) => {
    try {
        const { name, email, gender, password } = req.body;

        const userData = {
            userName: name,
            userEmail: email,
            userGender: gender,
            userPassword: password,
        };

        await userModel.create(userData);
        console.log("User registered successfully");
        res.redirect('/login');
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).send("Error during registration");
    }
});

// Route to render the login page
router.get('/login', (req, res, next) => {
    res.render('login');
});

// Route to handle user login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const db_user = await userModel.findOne({ userEmail: email });

        if (!db_user) {
            return res.status(404).send("Email not found");
        }

        // Check if the provided password matches the stored password
        const isPasswordCorrect = db_user.userPassword === password;

        if (isPasswordCorrect) {
            console.log('Login successful');
            req.session.email = db_user.userEmail;
            res.redirect('/');
        } else {
            res.status(401).send("Incorrect password");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Route to render the "forgot-password" page
router.get('/forgot-password', (req, res, next) => {
    res.render('forgot-password');
});

// Route to handle "forgot-password"
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        const db_user = await userModel.findOne({ userEmail: email });

        if (!db_user) {
            console.log("Email not found");
            return res.status(404).send("Email does not exist");
        }

        // Example of sending email with nodemailer
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER, // Use environment variables for sensitive data
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Forgot Password",
            text: `Your Password is ${db_user.userPassword}`,
            html: `Your Password is ${db_user.userPassword}`,
        };

        await transporter.sendMail(mailOptions);

        console.log("Password sent to email");
        res.send("Password sent on email");
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Error sending email");
    }
});

// Route to render the "change-password" page; checks authentication
router.get('/change-password', ensureAuthenticated, (req, res, next) => {
    res.render('change-password');
});

// Route to handle "change-password"
router.post('/change-password', ensureAuthenticated, async (req, res, next) => {
    try {
        const { oldPassword, newPassword, cNewPassword } = req.body;
        const myEmail = req.session.email;

        const db_user = await userModel.findOne({ userEmail: myEmail });

        if (!db_user) {
            return res.status(404).send("User not found");
        }

        if (db_user.userPassword !== oldPassword) {
            return res.status(401).send("Your current password is incorrect");
        }

        if (newPassword === oldPassword) {
            return res.send("New password cannot be the same as the old password");
        }

        if (newPassword !== cNewPassword) {
            return res.send("New passwords do not match");
        }

        // Update the user's password
        await userModel.findOneAndUpdate(
            { userEmail: myEmail },
            { userPassword: newPassword }
        );

        console.log("Password changed successfully");
        res.send("Password changed successfully");
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).send("Error changing password");
    }
});

// Route to display a list of all users; ensures authentication
router.get('/display', ensureAuthenticated, async (req, res, next) => {
    try {
        const db_user_array = await userModel.find();
        res.render('display', { user_array: db_user_array });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Error fetching users");
    }
});

// Route to display a single user's record by ID
router.get('/show/:id', async (req, res, next) => {
    try {
        const db_user = await userModel.findById(req.params.id);

        if (!db_user) {
            return res.status(404).send("User not found");
        }

        res.render('user-record', { user_array: db_user });
    } catch (error) {
        console.error("Error fetching user record:", error);
        res.status(500).send("Error fetching user record");
    }
});

// Route to render the "edit" page for a specific user
router.get('/edit/:id', async (req, res, next) => {
    try {
        const db_user = await userModel.findById(req.params.id);

        if (!db_user) {
            return res.status(404).send("User not found");
        }

        res.render('user-edit', { user_array: db_user });
    } catch (error) {
        console.error("Error fetching user to edit:", error);
        res.status(500).send("Error fetching user to edit");
    }
});

// Route to handle updating a user record
router.post('/edit/:id', async (req, res, next) => {
    try {
        const mybodydata = {
            userName: req.body.userName,
            userEmail: req.body.userEmail,
        };

        await userModel.findByIdAndUpdate(req.params.id, mybodydata);

        res.redirect('/display');
    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).send("Error updating record");
    }
});

router.post('/delete/:id', ensureAuthenticated, async (req, res, next) => {
  try {
      const userId = req.params.id; // Retrieve the user ID from the URL parameter
      const user = await userModel.findById(userId); // Find the user by ID

      if (!user) {
          // If the user doesn't exist, return a 404 status
          return res.status(404).send("User not found");
      }

      // Delete the user from the database
      await userModel.findByIdAndDelete(userId);

      console.log(`User with ID ${userId} deleted successfully`);
      
      // Redirect to the display page after successful deletion
      res.redirect('/display');
  } catch (error) {
      console.error("Error during user deletion:", error);
      res.status(500).send("Error deleting user");
  }
});
router.get('/logout', (req, res, next) => {
  try {
      if (req.session) {
          // Destroy the user session
          req.session.destroy(err => {
              if (err) {
                  console.error("Error during logout:", err);
                  return res.status(500).send("Error during logout");
              }

              // Redirect to the login page after successful logout
              res.redirect('/login');
          });
      } else {
          // If there's no session, redirect to login
          res.redirect('/login');
      }
  } catch (error) {
      console.error("Unexpected error during logout:", error);
      res.status(500).send("Internal Server Error");
  }
});


module.exports = router;

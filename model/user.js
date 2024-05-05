const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    userEmail: {
        type: String,
        required: true,
        unique: true,
    },
    userGender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true,
    },
    userPassword: {
        type: String,
        required: true,
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;

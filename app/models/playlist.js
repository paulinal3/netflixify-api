const mongoose = require('mongoose')
const Schema = mongoose.Schema

const playlistSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 100
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        video: [{
            type: Schema.Types.ObjectId,
            ref: 'Video'
        }],
        timestamps: true
    }
)

module.exports = mongoose.model('Playlist', playlistSchema)
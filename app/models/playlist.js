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
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        videos: [{
            type: Schema.Types.ObjectId,
            ref: 'Video'
        }]
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('Playlist', playlistSchema)
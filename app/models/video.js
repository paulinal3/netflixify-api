const mongoose = require('mongoose')
const Schema = mongoose.Schema

const videoSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
		},
		synopsis: {
			type: String,
			required: true,
		},
		netflixid: {
			type: String,
			required: true,
		},
		image: {
			type: String,
			required: true
		},
		largeimage: {
			type: String,
		},
		genre: {
			type: Array
		},
		type: {
			type: String,
			required: true
		},
		runtime: {
			type: String
		},
		released: {
			type: String,
			required: true
		},
		rating: {
			type: String
		},
		imdbid: {
			type: String
		},
		watched: {
			type: Boolean,
			default: false
		},
		notes: String,
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
		playlists: [{
			type: Schema.Types.ObjectId,
			ref: 'Playlist'
		}]
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Video', videoSchema)

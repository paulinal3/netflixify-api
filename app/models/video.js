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
			type: Number,
			required: true,
		},
		image: {
			type: String,
			required: true
		},
		genre: {
			type: Array,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		runtime: {
			type: String,
			required: true
		},
		released: {
			type: Number,
			required: true
		},
		rating: {
			type: D
		},
		imbdid: {
			type: String,
			required: true
		},
		watched: Boolean,
		notes: <String></String>
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Video', videoSchema)

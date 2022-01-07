const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
			minlength: 3,
			maxlength: 50
		},
		lastName: {
			type: String,
			required: true
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		hashedPassword: {
			type: String,
			required: true,
		},
		token: String,
		videos: [{
			type: Schema.Types.ObjectId,
			ref: 'Video'
		}],
		playlists: [{
			type: Schema.Types.ObjectId,
			ref: 'Playlist'
		}]
	},
	{
		timestamps: true,
		toObject: {
			// remove `hashedPassword` field when we call `.toObject`
			transform: (_doc, user) => {
				delete user.hashedPassword
				return user
			},
		},
	}
)

module.exports = mongoose.model('User', userSchema)

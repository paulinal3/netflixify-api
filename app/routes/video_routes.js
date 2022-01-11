// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for videos
const Video = require('../models/video')
const Playlist = require('../models/playlist')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// get route to display the index of user's videos
router.get('/videos', requireToken, (req, res, next) => {
	Video.find()
		.then(handle404)
		.then(foundVideos => {
			// `videos` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return foundVideos.map(video => video.toObject())
		})
		// respond with status 200 and JSON of the videos
		.then(foundVideos => res.status(200).json({ videos: foundVideos }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// get route to display the index of videos for a specifc playlist
router.get('/:playlistId/videos', requireToken, (req, res, next) => {
	Video.find({ playlist: req.params.playlistId })
		.then(handle404)
		.then(foundVideos => {
			// `videos` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return foundVideos.map(video => video.toObject())
		})
		// respond with status 200 and JSON of the videos
		.then(foundVideos => res.status(200).json({ videos: foundVideos }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// get route to show one video 
router.get('/videos/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Video.findById(req.params.id)
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "example" JSON
		.then(foundVideo => res.status(200).json({ video: foundVideo.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// post route to create a video
router.post('/:playlistId/videos', requireToken, (req, res, next) => {
	// set owner of new video to be current user
	req.body.video.owner = req.user.id

	let currentUser = req.user

	Video.create(req.body.video)
		.then(createdVideo => {
			// push created video id into the current user's video arr of obj ref
			currentUser.videos.push(createdVideo._id)
			// save the current user
			currentUser.save()
			Playlist.findById(req.params.playlistId)
				.then(foundPlaylist => {
					foundPlaylist.videos.push(createdVideo._id)
					foundPlaylist.save()
					// respond to succesful `create` with status 201 and JSON of new "video"
					res.status(201).json({ video: createdVideo.toObject() })
				})
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// patch route to edit if a video has been watched
router.patch('/videos/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.example.owner

	Video.findById(req.params.id)
		.then(handle404)
		.then(foundVideo => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, foundVideo)

			// pass the result of Mongoose's `.update` to the next `.then`
			return video.updateOne(req.body.video)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// delete route to destroy a video
router.delete('/videos/:id', requireToken, (req, res, next) => {
	Video.findById(req.params.id)
		.then(handle404)
		.then(foundVideo => {
			// throw an error if current user doesn't own `example`
			requireOwnership(req, foundVideo)
			// delete the example ONLY IF the above didn't throw
			example.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router

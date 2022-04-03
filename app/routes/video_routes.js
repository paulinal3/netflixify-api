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
// { video: { title: '', text: 'foo' } } -> { video: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// get route to display the index of user's videos
router.get('/videos', requireToken, (req, res, next) => {
    Video.find({ owner: req.user.id })
        .then(handle404)
        .then(foundVideos => {
            // we want to convert each one to a POJO, so we use `.map` to
            // apply `.toObject` to each one
            return foundVideos.map(video => video.toObject())
        })
        // respond with status 200 and JSON of the videos
        .then(foundVideos => res.status(200).json({ videos: foundVideos }))
        // if an error occurs, pass it to the handler
        .catch(next)
})

// get route to display the index of videos for a specific playlist
router.get('/:playlistId/videos', requireToken, (req, res, next) => {
    Video.find({ playlist: req.params.playlistId })
        .then(handle404)
        .then(foundVideos => {
            console.log(`all videos in playlist id: ${req.params.playlistId} \n`, foundVideos)
            return foundVideos.map(video => video.toObject())
        })
        .then(foundVideos => res.status(200).json({ videos: foundVideos }))
        .catch(next)
})

// get route to display index of all watched videos
router.get('/videos/watched', requireToken, (req, res, next) => {
    Video.find({ watched: true, owner: req.user.id })
        .then(handle404)
        .then(foundWatchedVids => {
            return foundWatchedVids.map(video => video.toObject())
        })
        .then(foundWatchedVids => res.status(200).json({ video: foundWatchedVids }))
        .catch(next)
})

// get route to show one video 
router.get('/videos/:id', requireToken, (req, res, next) => {
    Video.findById(req.params.id)
        .then(handle404)
        .then(foundVideo => res.status(200).json({ video: foundVideo.toObject() }))
        .catch(next)
})


// post route to create a video
router.post('/:playlistId/videos', requireToken, (req, res, next) => {
    req.body.video.owner = req.user.id
    let currentUser = req.user

    console.log("req.body.video\n", req.body.video)

    Video.findOneAndUpdate({ netflixid: req.body.video.netflixid, owner: req.user.id }, req.body.video, { new: true, upsert: true })
        .then(foundOrCreatedVideo => {
            foundOrCreatedVideo.playlists.includes(req.params.playlistId) ? null : foundOrCreatedVideo.playlists.push(req.params.playlistId)
            foundOrCreatedVideo.save()
            currentUser.videos.includes(foundOrCreatedVideo._id) ? null : currentUser.videos.push(foundOrCreatedVideo._id)
            currentUser.save()
            Playlist.findById(req.params.playlistId)
                .then(foundPlaylist => {
                    foundPlaylist.videos.includes(foundOrCreatedVideo._id) ? null : foundPlaylist.videos.push(foundOrCreatedVideo._id)
                    foundPlaylist.save()
                    // respond to succesful `create` with status 201 and JSON of new "video"
                    res.status(201).json({ video: foundOrCreatedVideo.toObject() })
                })
        })
        .catch(next)
})

// for (let i = 0; i < 50; i++) {
//     axios.get(`https://unogs-unogs-v1.p.rapidapi.com/aaapi.cgi?q=&cl=78&p=${i}&t=ns&st=adv`)
//         .then(apiRes => {
//             for (let i = 0; i < apiRes.length; i++) {
//                 router.post("/videos", requireToken, (req, res) => {
//                     req.body.video.owner = req.user.id
//                     Video.create(req.body.video[i])
//                         .then(createdVideo => {

//                         })
//                 })
//             }
//         })
// }

// patch route to edit if a video has been watched
router.patch('/videos/:id', requireToken, removeBlanks, (req, res, next) => {
    // if the client attempts to change the `owner` property by including a new
    // owner, prevent that by deleting that key/value pair
    delete req.body.video.owner

    Video.findById(req.params.id)
        .then(handle404)
        .then(foundVideo => {
            requireOwnership(req, foundVideo)
            foundVideo.watched = req.body.video.watched
            foundVideo.save()
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

router.delete('/:playlistId/videos/:id', requireToken, (req, res, next) => {
    Video.findById(req.params.id)
        .then(handle404)
        .then(foundVideo => {
            requireOwnership(req, foundVideo)
            const playlistIdIdx = foundVideo.playlists.indexOf(req.params.playlistId)
            foundVideo.playlists.splice(playlistIdIdx, 1)
            if (foundVideo.playlists.length === 0 && !foundVideo.watched) {
                const videoIdIdx = req.user.videos.indexOf(req.params.id)
                req.user.videos.splice(videoIdIdx, 1)
                req.user.save()
                foundVideo.deleteOne()
            } else {
                foundVideo.save()
            }
            Playlist.findById(req.params.playlistId)
                .then(foundPlaylist => {
                    const videoIdIdx = foundPlaylist.videos.indexOf(req.params.id)
                    foundPlaylist.videos.splice(videoIdIdx, 1)
                    foundPlaylist.save()
                })
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

module.exports = router

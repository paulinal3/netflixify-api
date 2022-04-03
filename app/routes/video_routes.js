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
const playlist = require('../models/playlist')
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

// get route to display the index of videos for a specific playlist
router.get('/:playlistId/videos', requireToken, (req, res, next) => {
    Video.find({ playlist: req.params.playlistId })
        .then(handle404)
        .then(foundVideos => {
            console.log(`all videos in playlist id: ${req.params.playlistId} \n`, foundVideos)
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
    // req.params.id will be set based on the `:id` in the route
    Video.findById(req.params.id)
        .then(handle404)
        // if `findById` is succesful, respond with 200 and "video" JSON
        .then(foundVideo => res.status(200).json({ video: foundVideo.toObject() }))
        // if an error occurs, pass it to the handler
        .catch(next)
})


// post route to create a video
router.post('/:playlistId/videos', requireToken, (req, res, next) => {
    // set owner of new video to be current user
    req.body.video.owner = req.user.id
    // set playlist of new video to selected playlist
    // let currentPlaylist = req.body.video.playlists
    // currentPlaylist.push(req.params.playlisId)
    let currentUser = req.user

    console.log("req.body.video\n", req.body.video)

    Video.findOneAndUpdate({ netflixid: req.body.video.netflixid, owner: req.user.id }, req.body.video, { new: true, upsert: true })
        .then(foundOrCreatedVideo => {
            console.log("created video\n", foundOrCreatedVideo)
            foundOrCreatedVideo.playlists.includes(req.params.playlistId) ? null : foundOrCreatedVideo.playlists.push(req.params.playlistId)
            foundOrCreatedVideo.save()
            console.log("this push into playlist?\n", foundOrCreatedVideo)
            currentUser.videos.includes(foundOrCreatedVideo._id) ? null : currentUser.videos.push(foundOrCreatedVideo._id)
            currentUser.save()
            console.log("user\n", currentUser)
            Playlist.findById(req.params.playlistId)
                .then(foundPlaylist => {
                    foundPlaylist.videos.includes(foundOrCreatedVideo._id) ? null : foundPlaylist.videos.push(foundOrCreatedVideo._id)
                    foundPlaylist.save()
                    console.log("playlist\n", foundPlaylist)
                    // respond to succesful `create` with status 201 and JSON of new "video"
                    res.status(201).json({ video: foundOrCreatedVideo.toObject() })
                })
        })
        // if an error occurs, pass it off to our error handler
        // the error handler needs the error message and the `res` object so that it
        // can send an error message back to the client
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
            // pass the `req` object and the Mongoose record to `requireOwnership`
            // it will throw an error if the current user isn't the owner
            requireOwnership(req, foundVideo)

            // pass the result of Mongoose's `.update` to the next `.then`
            console.log("before\n", foundVideo)
            console.log("req\n", req.body.video)
            foundVideo.watched = req.body.video.watched
            foundVideo.save()
            // foundVideo.updateOne({ watched: true })
            console.log("after update\n", foundVideo)
        })
        // if that succeeded, return 204 and no JSON
        .then(() => res.sendStatus(204))
        // if an error occurs, pass it to the handler
        .catch(next)
})

router.delete('/:playlistId/videos/:id', requireToken, (req, res, next) => {
    Video.findById(req.params.id)
        .then(handle404)
        .then(foundVideo => {
            // throw an error if current user doesn't own `video`
            requireOwnership(req, foundVideo)
            // delete the video ONLY IF the above didn't throw
            // foundVideo.deleteOne()
            console.log("found vid\n", foundVideo)
            // remove playlistId from video.playlist arr
            const playlistIdIdx = foundVideo.playlists.indexOf(req.params.playlistId)
            foundVideo.playlists.splice(playlistIdIdx, 1)
            foundVideo.save()
            console.log("new video\n", foundVideo)
            // if watched status if false AND the video.playlist arr is empty then remove video from user
            if (foundVideo.playlists.length === 0 && !foundVideo.watched) {
                console.log("user\m", req.user)
                const videoIdIdx = req.user.videos.indexOf(req.params.id)
                req.user.videos.splice(videoIdIdx, 1)
                req.user.save()
                console.log("new user\n", req.user)
            }
            // remove video from playlist arr
            Playlist.findById(req.params.playlistId)
                .then(foundPlaylist => {
                    console.log("play", foundPlaylist)
                    const videoIdIdx = foundPlaylist.videos.indexOf(req.params.id)
                    foundPlaylist.videos.splice(videoIdIdx, 1)
                    foundPlaylist.save()
                    console.log("save play", foundPlaylist)
                })
        })
        // send back 204 and no content if the deletion succeeded
        .then(() => res.sendStatus(204))
        // if an error occurs, pass it to the handler
        .catch(next)
})

module.exports = router

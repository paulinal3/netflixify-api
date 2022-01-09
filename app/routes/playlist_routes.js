const express = require('express')
const router = express.Router()
const passport = require('passport')
const customErrors = require('../../lib/custom_errors')
const handle404 = customErrors.handle404
const requireOwnership = customErrors.requireOwnership
const removeBlanks = require('../../lib/remove_blank_fields')
const Playlist = require('../models/playlist')
const requireToken = passport.authenticate('bearer', { session: false })

// get route to display index of user's playlists
router.get('/playlists', requireToken, (req, res, next) => {
    Playlist.find({ owner: req.user.id })
        .then(handle404)
        .then(foundPlaylists => {
            return foundPlaylists.map(playlist => playist.toObject())
        })
        .then(foundPlaylists => res.status(200).json({ foundPlaylists }))
        .catch(next)
})

// post route to create a playlist
router.post('/playlists', requireToken, (req, res, next) => {
    // set the owner of playlist to the current user
    req.body.playlist.owner = req.user.id

    let currentUser = req.user

    Playlist.create(req.body.playlist)
        .then(createdPlaylist => {
            // push created playlist id into the current user's playlist arr of obj ref
            currentUser.playlists.push(createdPlaylist._id)
            // save the current user
            currentUser.save()
            res.status(201).json({ playlist: createdPlaylist.toObject() })
        })
        .catch(next)
})

module.exports = router
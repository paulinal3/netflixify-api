const express = require('express')
const router = express.Router()
const passport = require('passport')
const customErrors = require('../../lib/custom_errors')
const handle404 = customErrors.handle404
const requireOwnership = customErrors.requireOwnership
const removeBlanks = require('../../lib/remove_blank_fields')
const requireToken = passport.authenticate('bearer', { session: false })

const Playlist = require('../models/playlist')

// get route to display index of user's playlists
router.get('/playlists', requireToken, (req, res, next) => {
    Playlist.find({ owner: req.user.id })
        .then(handle404)
        .then(foundPlaylists => {
            return foundPlaylists.map(playlist => playlist.toObject())
        })
        .then(foundPlaylists => res.status(200).json({ foundPlaylists }))
        .catch(next)
})

// get route to show one playlist by current user
router.get('/playlists/:id', requireToken, (req, res, next) => {
    Playlist.findById(req.params.id)
        .then(handle404)
        .then(foundPlaylist => res.status(200).json({ playlist: foundPlaylist.toObject() }))
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

// patch route to edit a playlist
router.patch('/playlists/:id', requireToken, removeBlanks, (req, res, next) => {
    delete req.body.playlist.owner

    Playlist.findById(req.params.id)
        .then(handle404)
        .then(foundPlaylist => {
            console.log('this is the found playlist\n', foundPlaylist)
            requireOwnership(req, foundPlaylist)
            return foundPlaylist.updateOne(req.body.playlist)
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

// delete route to destroy a playlist
router.delete('/playlists/:id', requireToken, (req, res, next) => {
    Playlist.findById(req.params.id)
        .then(handle404)
        .then(foundPlaylist => {
            requireOwnership(req, foundPlaylist)
            foundPlaylist.deleteOne()
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

module.exports = router
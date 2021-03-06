const express = require('express')
const passport = require('passport')
const customErrors = require('../../lib/custom_errors')
const removeBlanks = require('../../lib/remove_blank_fields')
const Playlist = require('../models/playlist')
const Video = require("../models/video")

const router = express.Router()
const handle404 = customErrors.handle404
const requireOwnership = customErrors.requireOwnership
const requireToken = passport.authenticate('bearer', { session: false })

// get route to display index of user's playlists
router.get('/playlists', requireToken, (req, res, next) => {
    Playlist.find({ owner: req.user.id })
    .populate('videos', 'image')
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
        .populate('videos')
        .then(handle404)
        .then(foundPlaylist => res.status(200).json({ playlist: foundPlaylist.toObject() }))
})

// post route to create a playlist
router.post('/playlists', requireToken, (req, res, next) => {
    req.body.playlist.owner = req.user.id
    let currentUser = req.user

    Playlist.create(req.body.playlist)
        .then(createdPlaylist => {
            currentUser.playlists.push(createdPlaylist._id)
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
            const playlistIdIdx = req.user.playlists.indexOf(req.params.id)
            req.user.playlists.splice(playlistIdIdx, 1)
            foundPlaylist.videos.forEach(vid => {
                Video.findById(vid)
                    .then(foundVid => {
                        const playlistIdx = foundVid.playlists.indexOf(req.params.id)
                        foundVid.playlists.splice(playlistIdx, 1)
                        if (foundVid.playlists.length === 0 && !foundVid.watched) {
                            const videoIdIdx = req.user.videos.indexOf(foundVid._id)
                            req.user.videos.splice(videoIdIdx, 1)
                            foundVid.deleteOne()
                        } else {
                            foundVid.save()
                        }
                    })
            })
            req.user.save()
            foundPlaylist.deleteOne()
        })
        .then(() => res.sendStatus(204))
        .catch(next)
})

module.exports = router
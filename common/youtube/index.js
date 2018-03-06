'use strict';

const
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs')),
    {google} = require('googleapis'),
    path = require('path'),
    readline = require('readline'),
    winston = require('winston');

const
    youtube = google.youtube('v3');

const SCOPES = [
    'https://www.googleapis.com/auth/youtube'
];

const TOKEN_DIR = path.join(
    process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE,
    '.credentials',

);

const TOKEN_PATH = path.join(TOKEN_DIR, 'youtube.json');


class Youtube {
    constructor(config) {
        this._config = config;
    }


    search(query) {
        winston.debug('[Google] search: query=', query);

        const self = this;

        return self
            ._getAuth()
            .then((auth) => searchImpl(auth, query))
        ;


        ////////////

        function searchImpl(auth, q) {
            return new Promise((resolve, reject) => {
                const payload = {
                    auth,
                    part: 'snippet',
                    maxResults: '1',
                    q,
                    type: 'video',
                };

                youtube.search.list(payload, (err, res) => {
                    if (err) {
                        return reject(err);
                    }

                    const items = res.data.items;
                    if (items.length <= 0) {
                        return resolve();
                    }

                    return resolve(items[0].id.videoId);
                });
            });
        }
    }


    createPlaylistPrivate(title, description, videoIds) {
        winston.debug('[Google] createPlaylistPrivate: title=', title, ' / description=', description, ' / videoIds=', JSON.stringify(videoIds));

        const self = this;

        return self
            ._getAuth()
            .then((auth) =>
                createPlaylistPrivateImpl(auth, title, description)
                    .then((playlist) => Promise.mapSeries(videoIds,
                        (videoId) => addToPlaylistImpl(auth, playlist.id, videoId)
                    ))
            )
        ;


        ////////////

        function createPlaylistPrivateImpl(auth, title, description) {
            return new Promise((resolve, reject) => {
                const payload = {
                    auth,
                    part: 'snippet,status',
                    resource: {
                        snippet: {
                            title,
                            description,
                        },
                        status: {
                            privacyStatus: 'private',
                        },
                    },
                };

                youtube.playlists.insert(payload, (err, res) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(res.data);
                });
            });
        }


        function addToPlaylistImpl(auth, playlistId, videoId) {
            return new Promise((resolve, reject) => {
                const payload = {
                    auth,
                    part: 'snippet',
                    resource: {
                        snippet: {
                            playlistId,
                            resourceId: {
                                videoId,
                                kind: 'youtube#video',
                            },
                        },
                    },
                };

                youtube.playlistItems.insert(payload, (err, res) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(res.data);
                });
            });
        }
    }


    _getAuth() {
        if (this._authClientPromise) {
            return this._authClientPromise;
        }

        this._authClientPromise = this
            ._loadToken()
            .then((token) => {
                const authClient = new google.auth.OAuth2(
                    this._config.auth.clientId,
                    this._config.auth.clientSecret,
                    'http://localhost'
                );

                authClient.credentials = token;

                return authClient;
            })
        ;

        return this._authClientPromise;
    }


    authorize() {
        return new Promise((resolve, reject) => {
            const authClient = new google.auth.OAuth2(
                this._config.auth.clientId,
                this._config.auth.clientSecret,
                'http://localhost'
            );

            const authUrl = authClient.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });

            winston.info('Authorize this app by visiting this url: ', authUrl);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                authClient.getToken(code, (err, token) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(token);
                });
            });
        })
            .then((token) => this._saveToken(token))
        ;
    }


    _loadToken() {
        if (this._loadTokenPromise) {
            return this._loadTokenPromise;
        }

        this._loadTokenPromise = fs
            .readFileAsync(TOKEN_PATH)
            .then((token) => JSON.parse(token))
        ;

        return this._loadTokenPromise;
    }


    _saveToken(token) {
        return fs
            .mkdirAsync(TOKEN_DIR)
            .catch((err) => {
                if (err.code != 'EEXIST') {
                    throw err;
                }
            })
            .then(() => fs.writeFileAsync(TOKEN_PATH, JSON.stringify(token)))
        ;
    }
}


////////////

module.exports = Youtube;
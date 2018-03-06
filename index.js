'use strict';

const
    Promise = require('bluebird'),
    winston = require('winston');

winston.level = 'debug';

const
    {signalplus} = require('./common/signalplus'),
    Youtube = require('./common/youtube');

const
    config = require('./config');


const
    youtube = new Youtube(config.youtube);


winston.info('Find top songs...');
signalplus
    .getTop()
    .spread((title, songs) => {
        winston.info('Found %d songs for', songs.length, title);

        const ids = Promise.mapSeries(songs, (song) => youtube.search(song.name));

        return Promise.join(title, ids);
    })
    .spread((title, ids) => {
        winston.info('Create playlist', title);

        return youtube.createPlaylistPrivate(title, 'Signal plus', ids);
    })
    .catch((err) => {
        winston.error('Error:', err);
    })
;

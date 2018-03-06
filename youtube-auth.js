'use strict';

const
    winston = require('winston');

winston.level = 'debug';

const
    Youtube = require('./common/youtube');

const
    config = require('./config');


const
    youtube = new Youtube(config.youtube);


youtube.authorize()
    .then(() => {
        winston.info('Saved.');
    })
    .catch((err) => {
        winston.error('Error:', err);
    })
;


'use strict';

const ENV = process.env;

module.exports = {
    youtube: {
        auth: {
            clientId: ENV.YOUTUBE_AUTH_CLIENT_ID,
            clientSecret: ENV.YOUTUBE_AUTH_CLIENT_SECRET,
        },
    },
};

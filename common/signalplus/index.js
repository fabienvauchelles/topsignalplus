'use strict';


const
    Promise = require('bluebird'),
    cheerio = require('cheerio'),
    request = require('request'),
    winston = require('winston');


class Song {
    constructor(artist, title) {
        this._artist = artist;
        this._title = title;
    }

    get artist() { return this._artist; }
    get title() { return this._title; }

    get name() { return `${this._artist} - ${this._title}`; }
}


class Signalplus {
    getTop() {
        winston.debug('[Signalplus] getTop()');

        return load('http://signal.bg/chart')
            .then(($) => {
                const url = $('#articles .entry-title a').attr('href');
                return load(url);
            })
            .then(($) => {
                // Get title
                const title = $('title').text();

                // Get songs
                const res = [];

                $('#content ol li').each(function() {
                    res.push(new Song(
                        $('h4', this).text(),
                        $('h4 + span', this).text()
                    ));
                });

                return [title, res];
            })
        ;


        ////////////

        function load(url) {
            return new Promise((resolve, reject) => {
                const opts = {
                    method: 'GET',
                    url,
                };

                request(opts, (err, res, body) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(cheerio.load(body));
                });
            })
        }
    }
}


////////////

module.exports = {
    Song,
    signalplus: new Signalplus(),
};

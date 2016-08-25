'use strict';

const argv = require('yargs').argv;

const rootUrl = argv._.pop();
const request = require('request');
const async = require('async');
const _ = require('lodash');
const $ch = require('cheerio');


let reqCount = 0;
const crawlCache = [];

const crawlPage = function(url, cb) {
  const fullUrl = `${rootUrl}${url}`;

  crawlCache.push(url);

  if (argv.host === false) {
    console.log(`${url}`);
  } else {
    console.log(`${fullUrl}`);
  }

  reqCount++;
  if (reqCount > 5000) {
    // Failsafe to prevent runnaway scripts
    return cb(`REQUEST COUNT ${reqCount} EXCEDED!`);
  }

  request({
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    url: fullUrl
  }, (err, resp, body) => {
    if (err) {
      cb(err);
      return;
    }

    if (resp.statusCode !== 200) {
      // console.log(`\tStatus Code${resp.statusCode}`);
      return cb();
    }

    if (resp.headers['content-type'].indexOf('text/html') === -1) {
      // console.log('Non HTML Document');
      return cb();
    }

    const $ = $ch.load(body);

    const anchors = $('a');

    async.eachLimit(anchors, 5, (elem, next) => {
      const ref = elem.attribs.href;

      if (!ref) {
        return next();
      }

      if ((ref[0] === '/' || ref.indexOf(rootUrl) !== -1) && ref !== '/') {
        let rootRef = ref.replace(`${rootUrl}/`, '');
        rootRef = rootRef.replace(/#[A-Za-z\-]+/g, '');

        if (rootRef !== '') {
          if (rootRef[0] === '/') {
            rootRef = rootRef.substr(1);
          }

          const nextPage = `/${rootRef}`; // An actual page on this domain
          if (_.indexOf(crawlCache, nextPage) !== -1) {
            return next();
          }

          return crawlPage(nextPage, next);
        }
      }

      return next();
    }, cb);
  });
};


crawlPage('', (err) => {
  if (err) {
    console.log(err);
  }

  console.log('DONE!');
});

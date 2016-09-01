'use strict';

const argv = require('yargs').argv;

let rootUrl = argv._.pop();
rootUrl = rootUrl.replace(/\/$/g, '');
const request = require('request');
const async = require('async');
const _ = require('lodash');
const $ch = require('cheerio');
const Table = require('cli-table');

const output = (argv.output) ? argv.output : 'table';

const table = new Table({
  head: ['Resp', 'URL', 'Parent'],
  colWidths: [8, 50, 50]
});

let reqCount = 0;
const crawlCache = [];
const externalCrawlCache = [];


const crawlExternal = function(url, parentPage, done) {
  if (_.indexOf(externalCrawlCache, url) !== -1) {
    return done();
  }

  externalCrawlCache.push(url);

  request({
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    method: 'HEAD',
    url
  }, (err, resp) => {
    if (err) {
      // Guessing non existant site. Log but don't err.
      table.push(['D', url, parentPage]);
      return done();
    }

    if (resp.statusCode !== 200) {
      table.push([resp.statusCode, url, parentPage]);
    }

    done();
  });
};


const crawlPage = function(url, parentPage, cb) {
  const fullUrl = `${rootUrl}${url}`;
  crawlCache.push(url);

  const logUrl = (argv.host === false) ? url : fullUrl;

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
      table.push([resp.statusCode, logUrl, parentPage]);
      return cb();
    }

    table.push(['', logUrl, '']);

    if (resp.headers['content-type'].indexOf('text/html') === -1) {
      // console.log('Non HTML Document');
      return cb();
    }

    const $ = $ch.load(body);

    const anchors = $('a');

    async.eachLimit(anchors, 5, (elem, next) => {
      let ref = elem.attribs.href;

      ref = ref.replace(/\/*#+[A-Za-z\-]*$/g, '');

      if (!ref) {
        return next();
      }

      // Filter out mail and tel links.
      if (ref.match(/^(mailto|tel)/gi)) {
        return next();
      }

      if ((ref[0] === '/' || ref.indexOf(rootUrl) !== -1) && ref !== '/') {
        let rootRef = ref.replace(`${rootUrl}`, '');

        if (rootRef !== '') {
          if (rootRef[0] === '/') {
            rootRef = rootRef.substr(1);
          }

          const nextPage = `/${rootRef}`; // An actual page on this domain
          if (_.indexOf(crawlCache, nextPage) !== -1) {
            return next();
          }

          return crawlPage(nextPage, fullUrl, next);
        }

        return next();
      }

      return crawlExternal(ref, fullUrl, next);
    }, cb);
  });
};

crawlPage('/', null, (err) => {
  if (err) {
    console.log(err);
  }

  if (output === 'table') {
    return console.log(table.toString());
  }

  if (output === 'csv') {
    // Lightweight CSV Output
    console.log('Resp, Url, Parent');
    _.each(table, (row) => {
      console.log(row.join(', '));
    });

    return;
  }

  console.log('BAD OUTPUT ARG');
});

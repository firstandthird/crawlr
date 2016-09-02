'use strict';

const request = require('request');
const _ = require('lodash');
const $ch = require('cheerio');
const toCsv = require('./lib/outtocsv');
const Table = require('cli-table');
const table = new Table({
  head: ['Resp', 'URL', 'Parent'],
  colWidths: [8, 50, 50]
});

const argv = require('yargs').argv;

let rootUrl = argv._.pop();
rootUrl = rootUrl.replace(/\/$/g, '');

const output = (argv.output) ? argv.output : 'table';
const throttle = (argv.throttle) ? argv.throttle : 100;

let reqCount = 0;
let emptyCount = 0;
const crawlQueue = [];
const crawlCache = [];
const externalCrawlCache = [];

const crawlExternal = function(url, parentPage) {
  if (_.indexOf(externalCrawlCache, url) !== -1) {
    return;
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
      return;
    }

    if (resp.statusCode !== 200) {
      table.push([resp.statusCode, url, parentPage]);
    }
  });
};


const crawlPage = function(url, parentPage) {
  const fullUrl = `${rootUrl}${url}`;
  // console.log(`Crawling ${url}`);

  const logUrl = (argv.host === false) ? url : fullUrl;

  reqCount++;
  if (reqCount > 5000) {
    // Failsafe to prevent runnaway scripts
    return console.log(`REQUEST COUNT ${reqCount} EXCEDED!`);
  }

  request({
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    url: fullUrl
  }, (err, resp, body) => {
    if (err) {
      // Error that should not happen.
      return;
    }

    if (resp.statusCode !== 200) {
      // console.log(`\tStatus Code${resp.statusCode}`);
      table.push([resp.statusCode, logUrl, parentPage]);
      return;
    }

    table.push(['', logUrl, '']);

    if (resp.headers['content-type'].indexOf('text/html') === -1) {
      // console.log('Non HTML Document');
      return;
    }

    const $ = $ch.load(body);

    const anchors = $('a');

    _.each(anchors, (elem) => {
      let ref = elem.attribs.href;

      // console.log(`\tFound link with href of: ${ref}`);

      if (!ref) {
        table.push(['E', '', fullUrl]);
        return;
      }

      ref = ref.replace(/\/*#+[A-Za-z\-]*$/g, '');

      if (!ref) {
        return;
      }

      // Filter out mail and tel links.
      if (ref.match(/^(mailto|tel)/gi)) {
        return;
      }

      if ((ref[0] === '/' || ref.indexOf(rootUrl) !== -1) && ref !== '/') {
        let rootRef = ref.replace(`${rootUrl}`, '');

        if (rootRef !== '') {
          if (rootRef[0] === '/') {
            rootRef = rootRef.substr(1);
          }

          const nextPage = `/${rootRef}`; // An actual page on this domain

          if (_.indexOf(crawlCache, nextPage) !== -1) {
            // console.log(`\t\t${nextPage} is already in crawlCache`);
            return;
          }
          // console.log(`\t\tAdding ${nextPage} to queue`);

          crawlCache.push(nextPage);
          crawlQueue.push(nextPage);
        }

        return;
      }

      return crawlExternal(ref, fullUrl);
    });
  });
};


// Initialize
crawlQueue.push('/');
crawlCache.push('/');

const crawlInt = setInterval(() => {
  const url = crawlQueue.shift();
  if (url) {
    crawlPage(url);
  }

  if (crawlQueue.length === 0 && emptyCount === 25) {
    // Must be done then?
    if (output === 'csv') {
      console.log(toCsv(table));
    }

    if (output === 'table') {
      console.log(table.toString());
    }

    clearInterval(crawlInt);
    return;
  }

  if (crawlQueue.length === 0) {
    emptyCount++;
  }
}, throttle);

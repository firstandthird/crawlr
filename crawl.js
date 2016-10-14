'use strict';

const request = require('request');
const _ = require('lodash');
const toCsv = require('./lib/outtocsv');
const table = [];

const argv = require('yargs').argv;

const matchRegexp = /<a[A-Za-z=\s"]+href="([\w\.\-_\/\?:]+)"[A-Za-z=\s"]*>/ig;


let rootUrl = argv._.pop();
rootUrl = rootUrl.replace(/\/$/g, '');

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
      table.push([url, parentPage, '<error>']);
      return;
    }

    if (resp.statusCode !== 200) {
      table.push([url, parentPage, resp.statusCode]);
    }
  });
};


const crawlPage = function(url, parentPage) {
  const fullUrl = `${rootUrl}${url}`;
  // const logUrl = (argv.host === false) ? url : fullUrl;
  const logUrl = url;

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
      table.push([logUrl, parentPage, resp.statusCode]);
      return;
    }

    table.push([logUrl, '', '200']);

    if (resp.headers['content-type'].indexOf('text/html') === -1) {
      // console.log('Non HTML Document');
      return;
    }

    const bodyString = body.toString();

    let matches;
    while ((matches = matchRegexp.exec(bodyString)) !== null) {
      let ref = matches[1];

      if (!ref) {
        table.push(['<empty>', fullUrl, '']);
        continue;
      }

      ref = ref.replace(/\/*#+[A-Za-z\-]*$/g, '');

      if (!ref) {
        continue;
      }

      // Filter out mail and tel links.
      if (ref.match(/^(mailto|tel)/gi)) {
        continue;
      }

      if ((ref[0] === '/' || ref.indexOf(rootUrl) !== -1) && ref !== '/') {
        let rootRef = ref.replace(`${rootUrl}`, '');
        if (rootRef !== '') {
          if (rootRef[0] === '/') {
            rootRef = rootRef.substr(1);
          }

          const nextPage = `/${rootRef}`; // An actual page on this domain

          if (_.indexOf(crawlCache, nextPage) !== -1) {
            continue;
          }
          crawlCache.push(nextPage);
          crawlQueue.push(nextPage);
        }
        continue;
      }

      crawlExternal(ref, fullUrl);
    }
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
    console.log(toCsv(table));

    clearInterval(crawlInt);
    return;
  }

  if (crawlQueue.length === 0) {
    emptyCount++;
  }
}, throttle);

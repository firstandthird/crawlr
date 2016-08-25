'use strict';

const rootUrl = process.argv.pop();
const request = require('request');
const async = require('async');
const _ = require('lodash');
const $ch = require('cheerio');


const crawlCache = [];

const crawlPage = function(url, cb) {
  crawlCache.push(url);
  console.log(`${url}`);
  request({
    headers:  {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.75 Safari/537.36'
    },
    url
  }, (err, resp, body) => {
    if ( err ) {
      cb(err);
      return;
    }
    const $ = $ch.load(body);

    async.eachLimit($('a'), 5, (elem, next) => {
      const ref = elem.attribs.href;
      if(ref[0] === '/' || ref.indexOf(rootUrl) !== -1) {
        let rootRef = ref.replace(`${rootUrl}/`, '');
        if (rootRef !== '' && rootRef[0] !== '#') {
          if (rootRef[0] === '/') {
            rootRef = rootRef.substr(1);
          }
          const nextPage = `${rootUrl}/${rootRef}` // An actual page on this domain
          if (_.indexOf(crawlCache, nextPage) !== -1) {
            return next();
          }
          
          crawlPage(nextPage, next);
        }
      }
    }, cb);

  }); 
};


crawlPage(rootUrl, (err) => {
  if(err) {
    console.log(err);
  }

  console.log('DONE!');
});

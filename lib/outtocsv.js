'use strict';

const _ = require('lodash');
let output = '';

module.exports = function(rows) {
  output = `${output}Resp, URL, Parent\n`;
  _.each(rows, row => {
    output = `${output}${row.join(',')}\n`;
  });

  return output;
};

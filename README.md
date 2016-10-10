## crawllr

Use: `node crawl.js http://domain.com`

Will only capture URL's for the domain above... no similarity subdomains (like www vs non www for hardcoded links).

## Options

`--no-host` Removes the "Host" from the list of links (Except for parent, and external links)

###Docker Usage

To use with docker:

`docker build -t crawlr .`

`docker run -it crawlr [domain]`

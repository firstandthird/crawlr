## crawllr

Use: `node crawl.js http://domain.com`

Don't use trailing slash. No Good.
Will only capture URL's for the domain above... no similarity subdomains (like www vs non www for hardcoded links).

###Docker Usage

To use with docker:

`docker build -t crawlr .`

`docker run -it crawlr [domain]`

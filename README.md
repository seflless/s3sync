
# s3sync

 Sync S3 buckets from git commit diffs (rsync style).

## Features

  - Build on top of Learnboost's knox module.
  - Designed to be used where assets for a website are version controlled and run locally for dev but then use S3 when running on QA/Production servers.
  - Does diffs between commits (Defaults to HEAD versus last sync.)
  - A .json file of the history is created/updated.
  - Rollback would be possible. (Todo: If demand is there.)

## TODO

  - Support file deletes and renames (Need to do asap. Doesn't really work without it).
  - Rollback would be possible (If demand is there).
  - Look into doing file level diffs (If supported).
  - I suspect that empty folders will be left behind, need to figure that one out.
  - Can we detect file moves and then do file move REST calls to S3? 
      - Major traffic reduction on large file location refactoring commits. 
      - Probably doesn't matter in practice, updates being much more common than moves.
      - Currently will do a delete and then add(full file upload) to S3.
  - Maybe add the ability to return json of changes. Option to not actually do the sync.
      - Could be used as a utility for making a web service that returns file changes between commits.
          - Could do things like have local storage do incremental updates of change files. 

## Authors

  - Francois Laberge ([@francoislaberge](http://twitter.com/francoislaberge))

## Installation

  npm install s3sync


## License 

(The MIT License)

Copyright (c) 2012 Francois Laberge &lt;francoislaberge@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
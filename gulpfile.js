'use strict';

var gulp = require('gulp'),
    gitbook = require('gitbook');

gulp.task('gitbook', function () {
    var book = new gitbook.Book('./book', {
        config: {
            output: 'docs/'
        }
    });

    return book.parse()
        .then(function () {
            return book.generate('website');
        });
});

gulp.task('build', ['gitbook'])

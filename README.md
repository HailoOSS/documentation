# H2 documentation

This repository aims to be the single source of truth for documentation about the Hailo platform.

The documentation is written using Markdown and Gitbook.

## Building

First ensure you have the `gitbook` and `gulp` npm modules installed:

```
npm install gitbook
npm install gulp
```

Once you have installed the module you can then generate the book, there are a number of options for doing this:

```
# Production version
gulp build

# Development version
gitbook serve ./book

# Build PDF (requires calibre tool)
gitbook pdf ./book doc.pdf
```

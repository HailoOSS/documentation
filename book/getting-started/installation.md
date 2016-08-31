# Installation

This guide assumes that you are using Mac OSX as this is the OS provided to all engineers.

The first step is to install Homebrew if you have not done so already, this is a package manager for Macs.

```sh
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

Then you should install a number of tools for working with Go including Go itself, currently this should install Go 1.5. 

```sh
brew update
brew install go
brew install git
brew install mercurial
```

The next step is to setup your GOPATH, this is where all your Go code will be saved, the easiest place for this is $HOME. To setup the path you need to add the following lines to either your `.bashrc` or `.zshrc` depending on what shell you are using.

```sh
export GOPATH=$HOME
export PATH=$PATH:$GOPATH/bin
```

TODO: Figure out what else needs to be installed

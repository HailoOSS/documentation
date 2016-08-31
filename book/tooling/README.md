# Tooling

## HShell

HShell is a CLI tool for talking directly to the platform via RabbitMQ, it supports making RPC requests to services (with auto-completion!), provisioning + de-provisioning services, viewing provisioned services and restarting services.

To install run this command (you must have Go installed):

```
go get github.com/HailoOSS/platform-cli/hshell
```

Once installed run the command `hshell` which will start an interactive prompt, here you can enter the `help` command to get you started.

## HList

HList is used to lookup servers based on keywords and is useful when SSHing into servers. 

To install run this command (you must have Go installed):

```
go get github.com/HailoOSS/hlist
```

Once installed you can call the command `hlist` with a query to lookup any servers that match your query, for example:

```
$ hlist cassandra premium stg eu-west-1
cassandra-premium-stg(eu-west-1): 10.12.13.94
cassandra-premium-stg(eu-west-1): 10.12.5.182
cassandra-premium-stg(eu-west-1): 10.12.20.219
```

## H2Protoc

The `h2protoc` tool is a helper script for generating the Go versions of the `.proto.` files. 

To install the tool just copy [this](../_assets/shared/h2protoc) file to somewhere in your path.

To run the tool make sure that you are in the top level of your service which your proto files in the `./proto` directory and then run `h2protoc`.

## Failover Tool

If you are part of the on-call rota you will also need to install the failover tool, this script allows you to fail over regions, for more information about how to install and run this script check the [repository](https://github.com/HailoOSS/failover-tool).

## Config Encryptor

The config encryptor tool is a helper application for encrypting secrets before inserting into configuration. For instructions on how to use the tool read the [readme](https://github.com/HailoOSS/h2o-config-encryptor).

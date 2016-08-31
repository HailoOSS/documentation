# Services

In previous chapters we went over how to create an empty service from the template however we have not yet covered what the code that has been generated actually does and how you should go about writing your new service. This chapter will explain how to use the platform libraries and what each part of a service actually does.

## Shared libraries

To make building services easier and reduce the amount of code you need to write you can use a number of shared libraries:
 - `platform`: The platform layer is the core library that all services must use, it provides a package for creating a RPC server and a client package that allows services to talk to other services.
 - `service`: The service layer is a collection of self-configuring packages for connecting to shared infrastructure.
 - `go-hailo-lib`: This library contains shared Hailo specific business logic, while this is not really related to the platform it is useful to know that it exists and if you find yourself writing code again and again it might be worth moving it here.

## Service Components

 - [Initialisation](initialisation.md)
 - [Endpoints](endpoints.md)
 - [Client](client.md)
 - [Security](security.md)
 - [Healthchecks](healthchecks.md)
 - [Instrumentation](instrumentation.md)
 - [Configuration](configuration.md)
 - [Database Access](database-access.md)
 - [Pub/Sub](services/pub-sub.md)
 - [Distributed Synchronisation](distributed-synchronisation.md)

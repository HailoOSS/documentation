# Kernel Services

There are 4 services that H2 requires to be running to function, these services are called "kernel services" and are the first services that need to be started when bootstrapping the platform.

## Config Service

The config service is used to store configuration for all parts of the platform, this includes both platform related configuration such as shared infrastructure hosts and time-outs as well as business logic related configuration such as hob configuration. The configuration is stored as JSON objects in Cassandra, these objects can be compiled together allowing for configuration inheritance, for example when a service loads its configuration it is actually loading config from 6 different JSON documents which are merged together. Another feature of this service is to store an audit log of every update made to the configuration so that any change can be rolled back if needed.

Services have multiple ways of loading the configuration, there is an RPC endpoint named `compile` which works the same as every other RPC endpoint however since the other kernel services need configuration before they can start which means that the RPC will not be usable initially there needs to be another method to load config. To solve this issue the config-service also comes with a HTTP endpoint that can be loaded by any service inside our network, all services use this endpoint even after the platform has finished bootstrapping itself.

## Discovery Service

The discovery service is used as a central registry of all running services, the registry also contains information about the running instance such as the instanceID, version and what endpoints the service has. To ensure that the data contained in the registry is correct the discovery service sends heartbeats to each registered instance over RabbitMQ (using the `h2o.direct` exchange), each service responds to the heartbeat by sending a "pong" response back the discovery service. If a service does not respond to any healthchecks within a configured threshold then the instance as marked as de-provisioned.

To share state between multiple instances of the discovery service running in the same region the discovery service uses ZooKeeper establishing watches to react to changes invoked by other discovery service instances.

## Binding Service

As mentioned in the [RPC](rpc.md) chapter we use RabbitMQ bindings between the `h2o` exchange and the service queues to load balance requests. Without these bindings it would not be possible to make requests to services, however because services do not create their own bindings we needed some other way of creating the bindings. For this purpose we use the binding service. 

This service subscribes to topics on RabbitMQ for `com.hailocab.kernel.discovery.serviceup` and `com.hailocab.kernel.discovery.servicedown`, when the service receives a `serviceup` message it creates the binding between the `h2o` exchange and the instance queue, it also creates any requested bindings between the `h2o.topic` exchange if the service is listening to any RabbitMQ Pub/Sub topics, finally it creates federation bindings to allow services in the different AZs to talk to each other. When the service receives the `servicedown` message these bindings are deleted.

The service also periodically fetches the list of all instances from the discovery service and checks the expected bindings against the actual bindings and attempts to create any missing bindings and clean-up any old bindings.

## Login Service

The login service is used for storing user accounts, authenticating users, storing sessions and storing service-to-service auth rules [^2]. It is treated as a kernel service since without it many service-to-service calls will fail and it is not possible to make create any `ADMIN` sessions without the login service however it is technically possible to run the platform without this service.

The login service stores credentials for ALL user types including admin users, passengers and drivers. To allow for usernames to be shared across user types (for example a user might have have both a customer and driver account so the email and phone number need to be shared) the user records are prefixed by the user type (also know as the `application`). For more information about how sessions are created read the [security chapter](../../services/security.md).

[^1]: As of writing this documentation this threshold is set to 30 seconds.
[^2]: It could be argued that this service could be split into multiple services as the login service is currently quite bloated.

# Architecture

So far we have covered how to build a single service or talk to another service however the H2 platform is more than just one single service, it is instead built up of hundreds of services and many databases, message queues and other shared infrastructure. All of the services and shared infrastructure run as EC2 instances on AWS.

Since this is quite complicated and not all of this information will be relevant to everybody this chapter is split into the following chapters:

- [Service Architecture](service-architecture/README.md)
    + [RPC](service-architecture/rpc.md)
    + [APIs](service-architecture/apis.md)
    + [Kernel Services](service-architecture/kernel-services.md)
    + [Deployment](service-architecture/deployment.md)
- [Shared Infrastructure](shared-infrastructure/README.md)
    + [Cassandra](shared-infrastructure/cassandra.md)
    + [Logging](shared-infrastructure/logging.md)
    + [Memcached](shared-infrastructure/memcached.md)
    + [NSQ](shared-infrastructure/nsq.md)
    + [Puppet](shared-infrastructure/puppet.md)
    + [Zookeeper](shared-infrastructure/zookeeper.md)
- [Network Architecture](network-architecture/README.md)

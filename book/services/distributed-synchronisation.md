# Distributed Synchronisation

Race conditions are serious problems in any application however when creating micro-services that are running as part of a distributed system things become a lot more complicated, this is due to the fact that you cant simply protect your code with a mutex since your services might be running across multiple servers or even datacentres.

One solution to this problem is to introduce the idea of distributed synchronisation, this is similar to the idea of mutexes however they rely on using some kind of consistent storage mechanism such as Zookeeper, etcd or even a lower level protocol such as Raft or Paxos.

Luckily the service layer includes the `sync` package which contains a couple of recipes for simplifying this problem, in this chapter we will explain when to use these recipes and how to use them.

## Region Lock

The region lock recipe is probably the simplest recipe and is very similar to Go's `sync.Mutex` however instead of using atomic CPU operations the recipe uses Zookeeper nodes to ensure that only one instance of the mutex can access a resource at any given time.

Here is an example of how you might use the pattern. it is important to ensure that your lock path is unique and prefixing the path with your service name can help with this:

```go
import (
    "github.com/HailoOSS/service/sync"
)
...
lock, err := sync.RegionLock([]byte("/com/hailocab/service/SERVICE_NAME/foo/bar"))
if err != nil {
    // Could not get lock, handle error
}
defer lock.Unlock() // Once you are finished unlock the lock
```

## Region Leader

The region leader recipe is similar to the lock recipe however instead of having each each service attempt to get a lock for a short period of time this pattern goes through a process called "leader election" to ensure that only a single instance of a service is running at any given time. The recipe will also ensure that if the services leadership is rescinded for any reason then your code will be notified allowing a new leader to take over.

This recipe is useful if you have some code that can only be running in one place but you want to ensure that your service is still highly available meaning that if your one leader dies another instance should take over immediately.

Here is an example of how you might use a region leader:

```go
import (
    "github.com/HailoOSS/service/sync"
)
...
// Keep looping and attempting to become the leader
for {
leader := sync.RegionLeader("/com/hailocab/service/SERVICE_NAME/foo/bar")

// Do work here

LEADER_LOOP:
    for {
        select {
            case <-leader.Rescinded():
                // No longer the leader so stop working
                break LEADER_LOOP
        }
    }
}
```

## Global Lock

Although this recipe is included in the service layer you should never use it as you will almost certainly create more problems that you solve.

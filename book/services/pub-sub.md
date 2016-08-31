# Pub/Sub

As well as supporting RPC the H2 platform also supports pub/sub (or asynchronous message processing) using NSQ. Many parts of Hailo are built using PubSub including our data pipeline which pulls events from the `event` topic and stores them in Redshift and BigQuery. 

Pub/Sub allows messages to be published to a topic and have services consume messages from channels. The messages tend to be JSON messages however the only restriction is that they be encoded as `[]byte`. Each message will be sent to each channel in a topic and are delivered at least once, however because messages can be lost if a NSQd node dies messages can be lost. To try and prevent message loss we publish each message twice (to a different node each time), this means that messages might be received multiple times so handlers need to either be idempotent or de-duplicate the messages.

The service layer contains the `nsq` package which is used for pub/sub and abstracts away the creation of connections and host/configuration changes. The package is split into two different components, the publisher and the subscriber, we will now explain these two components.

# Publishers

Publishers are used to send messages from a service to an NSQ topic, as mentioned earlier the service layer publisher fetches the list of hosts from the config service and creates a publisher for each host. When a message is published using either the `Publish` or `MultiPublish` functions the message is then sent `N` times (where `N` is based on the configured write consistency, this can be `ONE`/`TWO`/`QUORUM`). Each time the message is sent a host is selected from the host pool and sent, if this fails then another host is tried.

Here is an example of how to publish an event to the `example` topic:

```go
bytes, err := json.Marshal(map[string]string{
    "eventType": "example",
    "timestamp": strconv.Itoa(int(time.Now().Unix())),
    "foo":       "bar",
})
if err != nil {
    // Handle error
}
if err := nsq.Publish("event", bytes); err != nil {
    // Handle error
}
```

# Subscribers

Subscribers (or consumers) are used to ingest messages published by other services, each subscriber requires a topic name which should be the same as the topic you used when publishing the message. A channel name is also required which allows multiple services to listen to the same topic and all receive a copy of the message.

To create a subscriber you need to first create a handler, this can either be a struct with a `HandleMessage` function or a function wrapped by the `HandlerFunc` type, for example here is a basic example of a subscriber that listens to messages on the `example` topic. We have chosen to put out subscriber in the ingester package, this is not required but is recommended to keep services consistent.

```go
package ingester

import (
    "encoding/json"

    log "github.com/cihub/seelog"
    "github.com/HailoOSS/service/nsq"
    nsqlib "github.com/HailoOSS/go-nsq"
)

const (
    TopicName   = "example"
    ChannelName = "example"
    maxInFlight = 100
    numHandlers = 5
)

// Run will connect to NSQ, consume and map events, and trigger comms to be sent
// We can trigger after initialisation via `server.RegisterPostConnectHandler(ingester.Run)`
func Run() {
    subscriber, err := nsq.NewDefaultSubscriber(TopicName, ChannelName)
    if err != nil {
        log.Warnf("[Ingester] Failed to attach to %v topic for ingesting points for storage: %v", TopicName, err)
        return
    }

    h := &Handler{}

    subscriber.SetMaxInFlight(maxInFlight)
    for i := 1; i < numHandlers; i++ {
        subscriber.AddHandler(p)
    }

    log.Infof("[Ingester] About to connect using %s %s", TopicName, ChannelName)
    subscriber.Connect()
}

type Handler struct {}

func (h Handler) HandleMessage(msg *nsqlib.Message) error {
    event := map[string]string{}
    if err := json.Unmarshal(msg.Body, &event); err != nil {
        return nil
    }

    // Handle message, return a non-nil error if the message failed to be processed 
    // and should be retried

    return nil
}
```

As the subscriber needs to run in the background we create an exported `Run` function which is called in `main.go` when the service starts up, for example:

```go
service.RegisterPostConnectHandler(ingester.Run)
```

## Ephemeral Channels

Ephemeral channels are temporary channels that exist only as long as a subscriber is connected to that channel, this can be useful if you want each instance of a service to have a copy of a message sent to a topic.

To create an ephemeral channel simply use a channel name ending in `#ephemeral`, also each instance should have a unique prefix such as the instance ID, for example `example-service-UUID#ephemeral`.

# Firehose Events

As mentioned Hailo uses NSQ for its main data pipeline, this means any service can publish events to this topic or subscribe. Because of this there are a couple of things to be aware of when using the firehose:
 - Events are published to the `event` topic but a service called `gstats` publishes these events to the `jstats.allingested` and `firehose` topics.
 - Any service that requires ALL events including the `point` event should use the `jstats.allingested` topic
 - The `firehose` topic includes all events excluding the `point` event, this should be used by most services subscribing to the firehose
 - All messages on the firehose are JSON objects with string keys and values, more specifically they are of the type `map[string]string`.
 - All events have an `eventType` which is unique to each event
 - All events should have a `timestamp` field which is a string representation of a timestamp

For example an event on the firehose might look like this:

```json
{
    "eventType": "example",
    "timestamp": "1462811119",
    "foo": "bar"
}
```

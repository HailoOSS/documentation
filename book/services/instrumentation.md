# Instrumentation

No service is complete without proper monitoring, we have already talked about health checks which allow for binary checks which allow us to quickly be notified about potential issues. However often more information is required or you want to view historic information about how your service is running, for this the service layer provides the `instrumentation` package which allows you to track counters, timing and gauges.

These metrics are then published to graphite via statsd, to view this data you can use the Grafana front-end which allows you to create dashboards graphing this data. The URL for Grafana is: `http://graphite-dashboard.eu-west-1.i.ENV.hailocab.net:3000`, you need to replace `ENV` with the correct environment name (for example `lve` or `stg`). There is also the graphite browser which can be accessed via the URL `http://graphite.REGION.i.ENV.hailocab.net:8888`. you also need to replace the REGION (most of the time using `eu-west-` here will be sufficient) and ENV here.

## Usage

To instrument your service you need to first import the instrumentation, most services use an alias to keep the code tidier. The instrumentation package comes with a default client already setup, which this is often not recommended as it makes testing more difficult we rarely mock the instrumentation so it is fine to use these functions here. For example:

```go
import (
    inst "github.com/HailoOSS/service/instrumentation"
)
```

Once the package has been imported you can start creating metrics. Each metric function has the same basic argument format `(sampleRate, bucket, value)`. The sample rate is used to reduce the amount of data being sent to graphite which is useful when you are instrumenting a section of code which is being hit very often. The bucket is the name of the metric and is used to determine where the metric is stored in graphite.

When metrics are sent to graphite they are prefixed with a namespace which is used to show where the metric was published from. For example when publishing a metric with the bucket `bucket.test` from the example service it will be published to the bucket `REGION.MACHINE-CLASS.INSTANCE.METRICTYPE.SERVICENAME.BUCKET` (for example `eu-west-1.h2o-default.i-5203422c.counter.com.hailocab.service.example.bucket.test`).

### Counters

A counter is as the name suggests a simple counter, internally graphite sums all values sent to it and stores the count in that time bucket. When calling `Counter` the count is incremented by the value provided. You can also provide a negative value to decrement the counter.

For example this function call we increment a counter which is counting the number of errors returned, for this use case we will be more interested in the error rate so we dont need a very high level of accuracy so we can use a lower sample rate.

```go
inst.Counter(0.1, "handler.test.error", 1)
```

In this example we are tracking the number of messages processed in a batch, because we want an accurate count we are using a sample rate of 1 (100%).

```go
inst.Counter(1, "processor.processed", len(batch))
```

### Gauges

A gauge is the most simple type of metric, it just stores the value at that time, this can be used for measuring the depth of a queue. For example.

```go
inst.Gauge(1, "queue.depth", 1234)
```

### Timers

Timers can be slightly more complicated than the previous types, like a counter they collect numbers and aggregate them. However unlike a counter they also calculate the sum, the count, the upper and the lower values for free.

It is useful to know that although the API requires passing in a `time.Duration` graphite doesnt require you to pass in an actual time. This means you can cast any integer to `time.Duration` and get the benefit of a timer.

For example you can use a timer to time the execution of a section of code, here we use `time.Since()` to get the duration between the start time and the time of the measurement.

```go
start := time.Now()
// Do something expensive
inst.Timing(1.0, "expensive.operation", time.Since(start))

```

## Reading metrics in services

Sometimes it might be useful to read the value of a metric inside a service without talking directly to graphite, this can be achieved with the instrumentation package through the use of "saved" metrics. When you setup a saved metric, anytime you call one of the functions the data will also be sent to an in-memory store.

To setup a saved metric you should first call the save function (`SaveCounter`, `SaveGauge`, `SaveTimer`) with the metric name. Once you have saved the metric you can read the data back by using the correct get function (`GetCounter`, `GetGauge`, `GetTimer`). The get functions return one of the types from the [go-metrics](https://godoc.org/github.com/rcrowley/go-metrics) library, these types have helpers functions to read the result back.

```go
inst.SaveCounter("processor.processed") // Save metric
inst.Counter(1.0, "processor.processed", 1) // Update counter
inst.GetCounter("processor.processed").Count() // Get value, returns 1
```

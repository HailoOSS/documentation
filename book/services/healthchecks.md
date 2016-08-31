# Health checks

Health checks are used to monitor the status of services, they cover various metrics such as the status of shared infrastructure and the error rate of requests to that service.

The results of these health checks are periodically publishes the monitoring service which collect the health checks and statistics from all services. These values are also published to zabbix which is another monitoring tool that also monitors our shared infrastructure.

## Available health checks

Every service has the following health checks built-in:

 - `com.hailocab.kernel.configloaded`: Ensures that the service has loaded its config at least once
 - `com.hailocab.kernel.servicetoservice.auth.badrole`: Monitors the rate of authorisation errors
 - `com.hailocab.kernel.resource.capacity`: Monitors the worker pools for each endpoint to ensure that the service has not become overloaded
 - `com.hailocab.kernel.client.circuit`: Monitors the circuit breakers for each endpoint, returns an error if any breakers are open

 There are also a number of health checks for the shared infrastructure, for more information about these health checks see the shared infrastructure section of the documentation.

## Registering health checks

Registering a health check is very similar to registering an endpoint, in the `main.go` file in your service you should add a call to `Healthcheck` after `Init()` but before `Run()`.

```go
import service "github.com/HailoOSS/platform/server"

func main() {
    service.Init()

    service.Healthcheck(healthcheckId, healthcheckFunction)

    service.Run()
}
```

## Creating your own health checks

Creating a health check is as simple as choosing a unique health check ID and creating a new function which implements the `service/healthcheck.HealthCheck` interface. The health check function returns two values, an optional map containing any extra data about the health check and an error. When the error is non-nil the health check becomes unhealthy.

For example here is a simple health check that only becomes unhealthy when the `unhealthy` variable becomes `true`.

```go
package healthcheck

import (
    "github.com/HailoOSS/service/healthcheck"
)


const (
    HealthCheckId   = "com.hailocab.service.example.healthcheck"
)

var (
    unhealthy bool
)

// HealthCheck asserts we can PUB to NSQ
func HealthCheck() healthcheck.Checker {
    return func() (map[string]string, error) {
        if unhealthy {
            return map[string]string{
                "unhealthy": "true",
            }, fmt.Errorf("The service has become unhealthy")
        }

        return nil, nil
    }
}
```

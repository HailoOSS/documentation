# Initialisation

H2 services are initialised by code in the `main` package of your service, this is typically the root directory of the service. Most services only have two files in this directory:

 - `main.go`: This file contains most of the initialisation logic such as:
     + Setting details about the service such as the name, description.
     + Register handlers
     + Register healthchecks
     + Register post connect hooks which run once a service has finished bootstrapping and has been discovered by the discovery service
     + Start the service
 - `version.go`: This file contains the current version of the service, you should not need to update this file as it is automatically updated when building the service on Jenkins.

## Service Variables

There are a number of variables in the `server` package in the `platform` that must be set in every service. These variables are passed to the discovery service and used to identify the service and who is responsible for them.

The service name is also used when reading configuration and is also used as prefixes for Cassandra keyspaces, zookeeper locks and NSQ subscribers.

Here is a complete list of all variables that need to be set: 
 - `Name`
 - `Description`
 - `Version`
 - `Source`
 - `OwnerEmail`
 - `OwnerMobile`
 - `OwnerTeam`
 
## Example

`main.go`

```go
package main

import (
    log "github.com/cihub/seelog"

    service "github.com/HailoOSS/platform/server"
)

func main() {
    defer log.Flush()
    
    // Set service details
    service.Name = "com.hailocab.service.example"
    service.Description = "Short description of service"
    service.Version = ServiceVersion
    service.Source = "github.com/HailoOSS/example-service"
    service.OwnerEmail = "john.smith@hailocab.com"
    service.OwnerMobile = "+44..."
    service.OwnerTeam = "h2o"

    // Initialisation, should be done immediately after setting service details
    service.Init()

    // Register endpoints/healthchecks/hooks
    service.Register(...)

    // Start the service
    service.Run()
}

```

`version.go`

```go
package main

// ServiceVersion is the version of this service
// It gets automatically updated by the build process
const ServiceVersion = 20130624113616
```

# Configuration

Dynamic configuration is another core part of the H2 platform, we store all configuration as JSON documents in the config service. When a service loads its documentation it requests a series of IDs from the config service which the service then compiles down to a single document. This allows us to maintain a configuration hierarchy which looks something like this:
 
 - `H2:BASE`: The base configuration loaded by every service in every region and environment
 - `H2:BASE:servicename`: This configuration is loaded the specified service and is shared by every region and environment
 - `H2:REGION:regionname`: This configuration is loaded by every service in the specified region
 - `H2:REGION:regionname:servicename`: This configuration is loaded by the specified service in the specified region
 - `H2:ENV:envnaame`: This configuration is loaded by every service in the specified environment
 - `H2:ENV:envnaame:servicename`: This configuration is loaded by the specified service in the specified environment

Each item in this list represents an ID of a JSON document, when the config service compiles the final document the config is loaded in the same order as above with the last document overwriting anything already in the previous documents.

The loading of the configuration is abstracted away by the `config` service in the service which provides a set of utilities for reading the config. 

## Waiting for configuration

If your service needs to have its configuration completed loaded before it can start then it might be worth adding the following line of code to your `main.go`, this will block up until the time-out duration specified for the config to finish loading.

```go
...
config.WaitUntilLoaded(time.Minute * 2)

service.Run()
```

## Reading configuration

Once the configuration has been loaded you are ready to read the configuration, as the configuration is just a JSON document we need some way to access the data. This can be done by either reading the entire document as a `[]byte` or by accessing path and returning a single value.

### Reading the entire document

To return the entire document you can call the `Raw()` function which will atomically load the configuration and return the byte slice. It is as simple as that!

### Reading individual paths

The library also provides the ability to read a path, for example if we were reading the JSON document below and we wanted to fetch the time-out duration for NSQ then we could use the path `service/nsq/timeout`.

```json
{
    "service": {
        "nsq": {
            "timeout": "2s",
        }
    }
}
```

When using the service layer this would look something like this. The `AtPath` function returns a `ConfigElement`, this type has a number of helper functions which have the format `AsX` where `X` is another data type. For example `AsString`.

```go
import "github.com/HailoOSS/service/config"

value := config.AtPath("service", "nsq", "timeout")
timeout := value.AsString()
```

## Secrets

Sometimes you need to store sensitive values somewhere such as API keys or user credentials. While this is unfortunate there is often no way around this, however instead of storing these values in plain text where anybody can view them you can instead encrypt these values before inserting them into the config-service. To encrypt your secrets use the [config encryptor](../tooling/README.md#config-encryptor) tool.

Once you have encrypted the secret it should be saved in the config-service. Each secret should be encrypted and stored separately for each region. For example if you are creating a secret for the example-service then you should save the secret in both `H2:REGION:eu-west-1` and `H2:REGION:us-east-1`. The secret might look something like this (the base64 encoded string is the encrypted secret) and can contain any JSON value such as a string, integer or another JSON object:

```json
// Service Config
{
    "hailo": {
        "service": {
            "credentials": "Y3JlZGVudGlhbHM="
        }
    }
}

// Encrypted secret
{
    "username": "admin",
    "password": "password"
}
```

To read the config you should fetch the path of the encrypted secret and then call `Decrypt()`, this will return a config element containing the decrypted contents. For example:

```go
credentials, err := config.AtPath("hailo", "service", "credentials").Decrypt()
if err != nil {
    // Handle error
}

username := config.AtPath("username").AsString("")
Password := config.AtPath("password").AsString("")
```

If you encrypted the secret without specifying the service name or used some other values in the encryption content then you should `DecryptWithContext(map[string]string{...})`. This function will still add the region and environment fields to the context.

## Subscribing to changes

Configuration can change and generally you want you services to pick these updates up as quickly as possible. To achieve this every time the configuration is updated a message is published to the `config.reload` NSQ topic. Services can listen to this by using the `SubscribeChanges` function which returns a channel. However since NSQ is not federated between regions config updates in one region are not detected in another region so services should periodically reload themselves if needed.

Subscribing to changes is only required if your service manages so other state based on the results of the configuration. If your service just reads the configuration during each request then built-in caching and reload mechanisms should be good enough.

```go
import "github.com/HailoOSS/service/config"

ch := config.SubscribeChanges()
for {
    select {
        case <-ch:
            // Config has reloaded
        case <-time.After(5 * time.Minute)
            // Check if config has changed
    }
}
```

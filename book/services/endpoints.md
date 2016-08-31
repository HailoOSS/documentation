# Server Endpoints

In H2 different services talk to each other using RPC, this allows services to execute functions on another machine through a well defined interface as if it was running in the same process. To process these requests services must register these functions (or handlers) as endpoints when the service starts.

All requests currently use protobuf to serialize data being sent between services which is a typed data format that is well supported in most languages. Unlike some other systems these requests are not sent directly to a specific host using HTTP, instead services publish messages to RabbitMQ.

## Protobuf messages

As mentioned all endpoints communicate using Protobuf, each endpoint handler accepts a message named `Request` and returns a message named `Response`. For example here is a simple file containing the messages for a hello world endpoint.

```protobuf
package com.hailocab.service.example.hello;

message Request {
}

message Response {
    optional string message = 1;
}
```

As you can see the file contains the package namespace that is unique to the endpoint, for example the file above refers to the `hello` endpoint in the example service.

This file should be stored in `proto/hello/hello.proto`. Once the file has been created you should run the [h2protoc](../tooling/README.md#h2protoc) tool.

## Creating a handler

Once the message formats have been defined using Protobuf the handlers should be created, this is as simple as creating a function in the `handler` directory of your service. This function should have the format of `func(*server.Request) (proto.Message, errors.Error)`. The request contains the protobuf message and additional data such as the users session and the request headers.

The function also takes advantage of Go's multiple return values, here we either return a Protobuf message or an error. The Protobuf message here is not wrapped by any other data structure. The error value however is slightly different as we use our own error values to represent different error types, this also lets us map error values to HTTP error codes when returned by the thin API.

### Simple "Hello World" handler

Using the same proto we created earlier we can now create a simple hello world handler, this handler will just return the message "Hello World".

```go
package handler

import (
    "github.com/HailoOSS/protobuf/proto"

    "github.com/HailoOSS/platform/errors"
    "github.com/HailoOSS/platform/server"

    helloproto "github.com/HailoOSS/example-service/proto/hello"
)

func Hello(req *server.Request) (proto.Message, errors.Error) {
    return &helloproto.Response{
        Message: proto.String("Hello World"),
    }, nil
}
```

### Accessing request data

In the above request we did not read any fields in the request message, if we need to access the request we should do the following in our handler.

```go
func Hello(req *server.Request) (proto.Message, errors.Error) {
    request := req.Data().(*helloproto.Request)

    // Do something with request

    return &helloproto.Response{}, nil
}
```

### Returning Errors

As mentioned previously H2 has its own error values, these are located in `github.com/HailoOSS/platform/errors`. It is important that you choose the correct error type when returning an error in your handlers as this determines what HTTP error code is returned by the thin API and some error types have special behaviour. For example internal server errors can trigger circuit breakers causing all requests to that endpoint to be temporarily blocked. [^1]

Currently the following error types are supported:
 - InternalServerError
 - BadRequestError
 - Forbidden Error
 - BadResponseError
 - TimeoutError
 - NotFoundError
 - ConflictError
 - UnauthorizedError
 - CircuitBrokenError

To create a new error you should provide a "dotted" error code which identifies the error, try to keep this unique as it will help when debugging, you should also keep it in the format `com.hailocab.service.SERVICENAME.ENDPOINT.errorcode`. Also required is the error message, this can be either a `string` or an `error`. For example to return a `NotFoundError` in your handler you can do the following:

```go
return nil, errors.NotFoundError(server.Name+".hello.usernotfound", "User not found")
```

### Registering the handler

Once a handler has been created it needs to be registered to allow requests to be handled. This is achieved by updated the `main.go` file and including the following snippet of code. [^2] All of these fields should always be set, there are other fields that can be set that will be described in other sections.

```go
service.Register(&service.Endpoint{
    Name:             "hello",
    Handler:          handler.Hello,
    Mean:             500,
    Upper95:          1000,
    RequestProtocol:  new(helloproto.Request),
    ResponseProtocol: new(helloproto.Response),
})
```

The first two values `Name` and `Handler` are fairly self explanatory, the name configures what the handler should be exported as, this should almost always be the same as the name of the handler function.

The next two fields are slightly more complex as they are used to configure the "SLAs" of your endpoint, this just means that by setting these values you are telling other services how fast the endpoint will return. The `Mean` value is used to say how fast you think you service will respond most of the time. The `Upper95` field is used to configure how slow you think your service should respond in unusual cases. If a caller detect a request taking longer than these values then the request is cancelled and is marked as having timed out.

The final two fields are used to configure the request and response data structures, these are used for tooling and when marshalling the request.

Please note that unless specified all endpoints will require a session with the `ADMIN` role, for more information see the [authentication](security.md) section.

[^1]: Currently circuit breakers have been disabled globally as some services do not use the correct error types.
[^2]: The `handler` package and the handlers proto in your service should also be imported.

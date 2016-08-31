# Client

A micro-services platform without any way to call services is not very useful, in this chapter we are going to explain how to use the multiclient package in the platform layer to make requests to other services over RabbitMQ.

The multiclient package is a library that allows services to make multiple requests in parallel, the package also includes tools for testing these requests which will be explained in the testing section. The platform layer also includes a package called `client` however this is a older lower level library that is now used by the multiclient package. Even though some older services use this package for RPC calls future services should all use the multiclient package.

## Using a multiclient

The multiclient package cannot be used by multiple goroutines so everytime you need to send requests to other services you need to:# Client

A micro-services platform without any way to call services is not very useful, in this chapter we are going to explain how to use the multiclient package in the platform layer to make requests to other services over RabbitMQ.

The multiclient package is a library that allows services to make multiple requests in parallel, the package also includes tools for testing these requests which will be explained in the testing section. The platform layer also includes a package called `client` however this is a older lower level library that is now used by the multiclient package. Even though some older services use this package for RPC calls future services should all use the multiclient package.

## Using a multiclient

The multiclient package cannot be used by multiple goroutines so everytime you need to send requests to other services you need to:

 1. Create a new client with `multiclient.New()`
 2. Add requests with `.AddScopedReq()`
 3. Execute the query with `.Execute()`
 4. (Optionally) Check the result of the requests with `.AnyErrors()`. This function returns one of the error types that we described in the previous section.

For example:

```go
// Create a new client
cl := multiclient.New()
  
// Add requests
...

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Succeeded("Something failed")
}
```

## Single Request

The simplest way to use the multiclient is to just add a single request. If you want to read the result of the request you must create the response variable outside of the request and then pass a pointer to this variable in the request.

For example:

```go
// Create a new client
cl := multiclient.New()
  
response := &helloproto.Response{}
cl.AddScopedReq(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response,
})

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Succeeded("Something failed")
}

// Use "response" here
``` 

Each `ScopedReq` also has a `Uid` field which can be set, this field identifies the request and can be used when checking the response of a specific request. If you do not set this field when calling `AddScopedReq` a Uid in the format of `request-N` will be set where `N` represents the request index. For example the first request will have a `Uid` of `request-1` and the second will be `request-2`.

## Multiple parallel requests

A powerful feature of the multiclient package (and the reason for the name) is the ability to make multiple requests in parallel. The code required to do this is very similar to how you make a single request but you just make multiple calls to `AddScopedReq`. When adding requests that you want to read the responses of ensure that you create a unique variable for each request.

Here is a simple example showing how to make two separate requests.

```go
// Create a new client
cl := multiclient.New()

// Has Uid of request-1
response1 := &helloproto.Response{}
cl.AddScopedReq(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response1,
})
// Has a Uid of request-2
response2 := &helloproto.Response{}
cl.AddScopedReq(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response2,
})

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Errors()
}
```

When `Execute` is called the multiclient will execute all of the requests in parallel [^1], this function returns when all requests have been completed. If a single request fails due to an error or because it timed out then `AnyErrors` will return true. For more information about handling errors from multiple requests see the error handling section below.

## Handling errors

Once `Execute` is called and all requests are complete you will probably want to check the result of the requests, as mentioned previously this can be done by calling `AnyErrors` which checks if any of the requests returned an error. The multiclient also has the following functions which can be used to view the errors returned.

- `PlatformError`: Returns a `platform/errors.Error` that represents any errors returned by the requests, if multiple errors are returned then this function combines them. The function takes a suffix string as an argument, this is used to create the "dotted code" if there are multiple errors, it is added to either the service or endpoint name depending on the request scope. For example if you were making a request with the scope from the `hello` endpoint in the `example-service` and you passed the suffix `requesterror` then the returned error will have a dotted code of `com.hailocab.service.example.hello.requesterror`. Choosing a good suffix/dotted code is important as these codes are used for debugging and handling error cases.

```go
if cl.Execute().AnyErrors() {
    return nil, cl.PlatformError("requesterror")
}
``` 

- `AnyErrorsIgnoring`: If you are executing requests that can fail then you can use this function to ignore any error codes or types. Like `AnyErrors` this function returns a `bool`, if you want to return a new error with specific errors removed see below.

- `Errors`: Return the underlying `multiclient.Errors` data structure used by the other helper functions and implements the `error` interface, this can be useful when returning/logging errors outside of a handler.

- `Errors.IgnoreUid/IgnoreService/IgnoreEndpoint/IgnoreType/IgnoreCode`: These functions return a new `Errors` with any errors that match the input removed. For example if you are making 2 requests, one important request (with Uid `importantrequest`) and one that is not important (with Uid `ignoredrequest`) you can do the following, this example will only ever return errors from the request with the `importantrequest` Uid:

```go
cl.Execute()
errors := cl.Errors().IgnoreUid("ignoredrequest")
if errors.AnyErrors() {
    return errors.Combined()
}
```

## Scoped Requests

When calling another service some state such as trace and session information needs to be passed with the request, to achieve this we use request scopes. These scopes allow us to make requests on behalf of a user or service.

A request scope is any value that implements the `multiclient.Scoper` interface. The request passed into every handler (`server.Request`) implements this interface and represents the scope of the user or service that called that endpoint. This should be used when you are making a call from a handler and you want to pass along the session to make other requests on behalf of that user. If you do not wish to make a request on behalf of a user (for example if you are making a request from a driver to an ADMIN endpoint or if you are making a request outside of a handler) then you can use `server.Scoper()`, this function returns a scope that represents the service and is "pre-authorised". If you are using the server scoper in a handler then you should pass along the parent request to ensure that any tracing information is not lost (`server.Scoper(req)`).

The multiclient package has two ways to set the scope of a request. You can either set the scope of all requests being sent by the multiclient, this is achieved by using the `DefaultScopeFrom` function. Each request can also have its scope set by setting the `From` field in the `ScopedReq` struct. For example:

```go
// Set default scope for client
cl := multiclient.New().DefaultScopeFrom(req)

// Set scope for request, overrides client default
cl.AddScopedReq(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        From:     req,
        Req:      &helloproto.Request{},
        Rsp:      &helloproto.Response{},
})
```

## Reusing multi-clients

Once you have called `Execute` on a multiclient it cannot be reused until it is reset, this is because the client stores state about all of the requests. To reset the client just call the `Reset` function before adding any new requests.

[^1]: Internally the multiclient has a worker pool with a configurable concurrency to ensure that the services being called are not overloaded. By default this is set to 10 meaning that up to 10 requests are being executed at once. This value can be overridden by either updating the config path `hailo/platform/request/concurrency` or calling `SetConcurrency`.

 1. Create a new client with `multiclient.New()`
 2. Add requests with `.AddScopedRequest()`
 3. Execute the query with `.Execute()`
 4. (Optionally) Check the result of the requests with `.AnyErrors()`. This function returns one of the error types that we described in the previous section.

For example:

```go
// Create a new client
cl := multiclient.New()
  
// Add requests
...

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Succeeded("Something failed")
}
```

## Single Request

The simplest way to use the multiclient is to just add a single request. If you want to read the result of the request you must create the response variable outside of the request and then pass a pointer to this variable in the request.

For example:

```go
// Create a new client
cl := multiclient.New()
  
response := &helloproto.Response{}
cl.AddScopedRequest(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response,
})

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Succeeded("Something failed")
}

// Use "response" here
``` 

Each `ScopedReq` also has a `Uid` field which can be set, this field identifies the request and can be used when checking the response of a specific request. If you do not set this field when calling `AddScopedRequest` a Uid in the format of `request-N` will be set where `N` represents the request index. For example the first request will have a `Uid` of `request-1` and the second will be `request-2`.

## Multiple parallel requests

A powerful feature of the multiclient package (and the reason for the name) is the ability to make multiple requests in parallel. The code required to do this is very similar to how you make a single request but you just make multiple calls to `AddScopedRequest`. When adding requests that you want to read the responses of ensure that you create a unique variable for each request.

Here is a simple example showing how to make two separate requests.

```go
// Create a new client
cl := multiclient.New()

// Has Uid of request-1
response1 := &helloproto.Response{}
cl.AddScopedRequest(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response1,
})
// Has a Uid of request-2
response2 := &helloproto.Response{}
cl.AddScopedRequest(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        Req:      &helloproto.Request{},
        Rsp:      response2,
})

//Now let's send the requests and check if there were any issues
if cl.Execute().AnyErrors() {
    return cl.Errors()
}
```

When `Execute` is called the multiclient will execute all of the requests in parallel [^1], this function returns when all requests have been completed. If a single request fails due to an error or because it timed out then `AnyErrors` will return true. For more information about handling errors from multiple requests see the error handling section below.

## Handling errors

Once `Execute` is called and all requests are complete you will probably want to check the result of the requests, as mentioned previously this can be done by calling `AnyErrors` which checks if any of the requests returned an error. The multiclient also has the following functions which can be used to view the errors returned.

- `PlatformError`: Returns a `platform/errors.Error` that represents any errors returned by the requests, if multiple errors are returned then this function combines them. The function takes a suffix string as an argument, this is used to create the "dotted code" if there are multiple errors, it is added to either the service or endpoint name depending on the request scope. For example if you were making a request with the scope from the `hello` endpoint in the `example-service` and you passed the suffix `requesterror` then the returned error will have a dotted code of `com.hailocab.service.example.hello.requesterror`. Choosing a good suffix/dotted code is important as these codes are used for debugging and handling error cases.

```go
if cl.Execute().AnyErrors() {
    return nil, cl.PlatformError("requesterror")
}
``` 

- `AnyErrorsIgnoring`: If you are executing requests that can fail then you can use this function to ignore any error codes or types. Like `AnyErrors` this function returns a `bool`, if you want to return a new error with specific errors removed see below.

- `Errors`: Return the underlying `multiclient.Errors` data structure used by the other helper functions and implements the `error` interface, this can be useful when returning/logging errors outside of a handler.

- `Errors.IgnoreUid/IgnoreService/IgnoreEndpoint/IgnoreType/IgnoreCode`: These functions return a new `Errors` with any errors that match the input removed. For example if you are making 2 requests, one important request (with Uid `importantrequest`) and one that is not important (with Uid `ignoredrequest`) you can do the following, this example will only ever return errors from the request with the `importantrequest` Uid:

```go
cl.Execute()
errors := cl.Errors().IgnoreUid("ignoredrequest")
if errors.AnyErrors() {
    return errors.Combined()
}
```

## Scoped Requests

When calling another service some state such as trace and session information needs to be passed with the request, to achieve this we use request scopes. These scopes allow us to make requests on behalf of a user or service.

A request scope is any value that implements the `multiclient.Scoper` interface. The request passed into every handler (`server.Request`) implements this interface and represents the scope of the user or service that called that endpoint. This should be used when you are making a call from a handler and you want to pass along the session to make other requests on behalf of that user. If you do not wish to make a request on behalf of a user (for example if you are making a request from a driver to an ADMIN endpoint or if you are making a request outside of a handler) then you can use `server.Scoper()`, this function returns a scope that represents the service and is "pre-authorised". If you are using the server scoper in a handler then you should pass along the parent request to ensure that any tracing information is not lost (`server.Scoper(req)`).

The multiclient package has two ways to set the scope of a request. You can either set the scope of all requests being sent by the multiclient, this is achieved by using the `DefaultScopeFrom` function. Each request can also have its scope set by setting the `From` field in the `ScopedReq` struct. For example:

```go
// Set default scope for client
cl := multiclient.New().DefaultScopeFrom(req)

// Set scope for request, overrides client default
cl.AddScopedRequest(&multiclient.ScopedReq{
        Service:  "com.hailocab.service.example",
        Endpoint: "hello",
        From:     req,
        Req:      &helloproto.Request{},
        Rsp:      &helloproto.Response{},
})
```

## Reusing multi-clients

Once you have called `Execute` on a multiclient it cannot be reused until it is reset, this is because the client stores state about all of the requests. To reset the client just call the `Reset` function before adding any new requests.

[^1]: Internally the multiclient has a worker pool with a configurable concurrency to ensure that the services being called are not overloaded. By default this is set to 10 meaning that up to 10 requests are being executed at once. This value can be overridden by either updating the config path `hailo/platform/request/concurrency` or calling `SetConcurrency`.

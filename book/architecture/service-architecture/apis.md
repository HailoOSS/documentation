#APIs

The H2 platform is designed in such a way that no service can be accessed directly, this is to keep the platform as secure as possible, however a system that users cannot access is no use to anybody. To allow users to access the platform there are a number of APIs that allow access to different parts of the platform. In this chapter we will list each API and what they are used for.

Users can also access the web applications however we will discuss those in a later [chapter](web-applications.md).

## Thin API (Hailo 2 API)

The Thin API is the main entry point into the Hailo platform, it listens on HTTP and forwards the requests using RPC. It also includes extra functionality for routing, throttling, region pinning, tracing and authentication. 

The API has two methods for forwarding requests, an `/rpc` endpoint which forwards the raw JSON request to the endpoint specified in the request, this is not typically used by user facing applications but by internal tools.

There is also a catch-all endpoint which converts the HTTP requests to protobuf and forwards the requests to services based on the URL, this is different to the RPC endpoint as instead of using the request body the endpoint instead request is unmarshalled into this [proto](https://github.com/HailoOSS/api-hailo-2/blob/master/proto/api/api.proto), another difference is that the endpoint supports different request types (such as `GET` and `POST`). This means that a "REST-like" API can be created.

## Secure API (Encryption proxy)

The secure API is used to encrypt card details (using AWS KMS) before they enter the platform and then forwards the encrypted request back to the thin API. This is used as part of the PCI compliance. The encryption proxy is used in tandem with the decryption proxy which decrypts the request data before being sent onwards (to Braintree).

## HMS

HMS (or Hailo Messaging Service) is used for sending notifications to customers and drivers, the apps attempt to keep a connection open to the service which uses HTTP long polling to send the notifications. While HMS doesn't allow requests to be made to any other parts of the system it is an important part of the Hailo job flow.

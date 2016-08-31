# Security

Security is a core part of the H2 platform and is built-in to the platform and service layers, because of this every service endpoint has auth enabled.

## Authentication

Authentication is almost entirely handled by the login service, this service 
is responsible for validating user logins storing user credentials and sessions.

### User Management

The login service stores the user credentials for all users (including admins, customers and drivers), the users details for customers and drivers are stored separately and the password is hashed and salted using Bcrypt.

To `auth` endpoint is used to check if a username and password are valid, if they are then a session is returned, this session can be used to make requests on behalf of that user. The `authas` endpoint can be used to create a session for a user however this is only available to users logged in with an `ADMIN` role.

## Sessions

A session consists of a random ID of 160 bytes base64 encoded to a string. This is what clients should use to identify themselves. The session ID itself contains no user identifiable information on its own. Session are a lookup key for a token.

Tokens store information about an authenticated user and are signed by a private key that only the login service has access to (this should be managed by isolated deployment to secured nodes). Tokens always expire after 8 hours.

It is possible for certain tokens to be automatically renewed to give the impression that a user is signed in for longer than 8 hours. This preserves the same session ID and is transparent to people using sessions/tokens. It is not possible for a session/token to be extended if it carries any ADMIN roles. In this situation, users must re-authenticate themselves every 8 hours.

There is a constraint that users can only maintain one active session per-application per-device type. The device type is any arbitrary string that means an application can maintain two sessions for different use cases. For example you may have one session on a Hailo web client and another on a phone. However if you were to try to establish a new session on another phone, the first phone would have its session invalidated.

Sessions are cached locally by clients and thus the login service broadcasts session expiry globally (via federated NSQ) such that clients can clear down their cache and hence invalidate tokens faster than the maximum bounded 8 hours. This is an optimisation. There are no cryptographic guarantees of this -- a session once issued could theoretically be exploited by a discrete part of the system for a maximum of 8 hours.

### Retrieving the authenticated user

To read an authenticated users details you should use the `Auth` field in a handlers `Request`. This function returns a fully-initialised authentication scope, from which you can determine if anyone is authenticated and who they are.

```go
authScope := req.Auth()
```

To check if the caller is authenticated you can call `authScope.IsAuth()`, if the user is authenticated then the function will return `true` and `authScope.User()` will return a non-nil value. To get the ID of the logged in user you can access the `Id` field in the user and to get the application type (remember that each application type such as admin, customer and driver each have their own user database) you can call `Application()`.

```go
if authScope.IsAuth() {
    user := authScope.User()

    fmt.Printf("Logged in as %s on %s/%s", user.Application(), user.Id)
}
```

### LDAP

The login service also has some integration with our LDAP directory via the LDAP service, this allows admin users to login via their admin account using one account that is shared between environments. Currently the permissions given to the LDAP users are determined based on which LDAP groups the user is in.

## Authorisation

H2 uses role based access control for authorisation, to achieve this when a user logs in they are given a token which contains the roles that the user has. These roles are checked whenever making requests against an endpoint that is protected with an Authoriser.

### Protecting an endpoint

Service endpoints are protected by "Authorisers", an authoriser is some value that implements the `Authoriser` interface. This interface has a single function which validates a request and returns an error if the session does not have permission to use the endpoint.

A endpoints authoriser is configured at the same time as the endpoint is registered (when calling `Register`). To set the authoriser the `Authoriser` field should be set in the `Endpoint` struct. By default if no `Authoriser` is set when registering then a default role authoriser is used which only allows requests from sessions with the `ADMIN` role.

```go
service.Register(&service.Endpoint{
    Name:             "hello",
    Handler:          handler.Hello,
    Mean:             500,
    Upper95:          1000,
    RequestProtocol:  new(helloproto.Request),
    ResponseProtocol: new(helloproto.Response),
    Authoriser:       service.OpenToTheWorldAuthoriser(),
})
```

There are a number of different authorisers which handle authorisation slightly different:

- `OpenToTheWorldAuthoriser`: This authoriser allows anybody with or without a session to call the endpoint.

- `RoleAuthoriser`: This authoriser only allows requests from a session with the given roles.

```go
RoleAuthoriser([]string{"ADMIN"})
```

- `SignInAuthoriser`: This authoriser only allow requests from signed in users

- `SignInRoleAuthoriser`: This authoriser combines both the `RoleAuthoriser` and the `SignInRoleAuthoriser` and requires a real user to be signed in with the specified roles.

### Checking permissions

Sometimes using an authoriser is not enough and you might want to write some custom code to authorise the user. For example you might create an endpoint that uses the role authoriser with the roles `ADMIN` and `CUSTOMER`, then in the handler you might want to do some custom validation if the user is a customer but just allow any requests from admins.

To achieve this you can use the `IsAuth` and `HasRole` functions:

```go
if req.Auth().IsAuth()  {
    if req.Auth().User().HasRole("ADMIN") {
        // Allow request
    } else if req.Auth().User().HasRole("CUSTOMER") {
        // Check customer ID
    } else {
        // Return error
    }
}
```

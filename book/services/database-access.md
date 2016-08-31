# Database Access

At Hailo we use Cassandra as our primary data store and have a number of utilities to make your life easier when using Cassandra. In this section we will not be covering how to store your data in Cassandra but how to setup and manage your services connection to Cassandra.

Most of the work for dealing with Cassandra is handled by one of two components, the service layer creates the connection to the database and handles the reloading of the connection whenever the configuration changes. The other component is a helper library called [gocassa](https://github.com/HailoOSS/gocassa) that we maintain. This library provides a number of opinionated recipes for how you should store and query your data and then builds the queries. We find that this helps prevent mistakes when using a database like Cassandra which is new to many developers.

## Connecting to Cassandra

Connecting to Cassandra is handled by the service layer however there are still some steps required before you can query the database. The service layer also deals with configuration updates and host updates. To setup the connection it is recommended that you create a function in `dao/dao.go` for setting everything up, this function might look something like this:

```go
import (
    ...

    gc "github.com/HailoOSS/gocassa"
)

type cassandraStore struct {
    Keyspace      gocassa.KeySpace
    FooTable      gocassa.MultimapTable
}

func New(keyspace keyspace gc.KeySpace) *cassandraStore {
    store := &cassandraStore{
        Keyspace: keyspace,
    }
    store.FooTable = keyspace.MapTable("foos", "Id", Foo{})

    // Create tables
    if err := store.FooTable.CreateIfNotExists(); err != nil {
        log.Errorf("Failed to create table: %s", err)
    }
}
```

This can then be called in your `main.go` file like this:

```go
import (
    ...
    "github.com/HailoOSS/service/gocassa"
)

func main() {
    service.Init()
    ...
    store := dao.New(gocassa.Keyspace())

    // Pass the store to any package that needs it, for example lets pass the store to our handlers
    handlers := handler.Init(store)
    service.Register(&service.Endpoint{
        Name:             "hello",
        Handler:          handlers.Hello,
        ...
    })
    ...
    service.Run()
}
```

Lets now go over this code to make sure we understand what is going on, the first thing we do is import the gocassa library and define a new data structure. This structure holds the gocassa keyspace and any tables that the service uses. Some services also store these as global variables however by storing them in a separate structure and passing an instance to this around we make our code much easier to test.

The next section of code is the `New` function, this function accepts a gocassa `KeySpace` and returns an instance of the store. The `Keyspace` can either be used for connecting to a real database (by using a Keyspace from the service layer) or mocking (by using the `NewMockKeySpace` function in gocassa). Using this keyspace we next setup the tables and attempt to create the actual tables in the Cassandra. For more information about the different types of tables and how to create them check the [gocassa docs](https://github.com/HailoOSS/gocassa).

The final section of code is `main.go`, here we create an instance of the store passing in the gocassa keyspace from the service layer. We can then pass instance of the store to any parts of the service that require it, for example we pass the store to the handlers.

## Healthchecks

The service layer includes a healthcheck which checks that all tables are created and accessible and any service that uses gocassa should use it. To register the healthcheck just include this line in your `main.go` after you have initialised your connection and before `service.Run()`, for example:

```go
service.HealthCheck(gocassa.HealthCheckId, gocassa.HealthCheck(store.Keyspace, store.FooTable, store.BarTable, ...))
```

## Queries

This section will give you an overview of how to make queries using gocassa however for a more detailed overview you should see the [gocassa docs](https://github.com/HailoOSS/gocassa). Once you have passed the store down to the part of your code that is going to make the query and you have created a table using the correct recipe (such as MapTable, MultimapTable, TimeSeriesTable) you can now start to read and write data.

Each table recipe has various functions for querying the data however to give you an idea of how this works here are some examples:

Writing a row to a `MapTable`, you can also pass a struct value to this function and it will extract any exported fields
```go
if err := store.FooTable.Set(map[string[]interface{}{
    "Id":   1,
    "Name": "baz",
}).Run(); err != nil {
    // Error
}
```

To read data from a `MapTable`:

```go
var result map[string]interface{}
if err := store.FooTable.Read(1, &result).Run(); err != nil {
    panic(err)
}
fmt.Println(result)
```

## Structuring your code 

Generally H2 services store all their code for accessing the databaes in the `dao` package and as mentioned previously any data types are stored in the `domain` package.

Inside the `dao` package most services contain a file named `dao.go` which does any initialisation and contains any interfaces used for accessing the database.

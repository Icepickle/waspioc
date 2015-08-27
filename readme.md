#Waspioc: an IOC, DI container for Javascript#
##Waspioc is build with TypeScript##

Waspioc is a simple IOC and DI container created with flexibility in mind.

Currently the dependency injector has support for

- Lifecycle management: INIT, STARTING, RUNNING, DISPOSED
- Fluid syntax, an added ConfigurationItem returns an easy way to attach default properties, references or constructor injection
- Flexible setup
- Support for unit-testing, as you can make an easy setup with mocked services
- Can be browserless

Planned implementations:

- Event registration over IOC container
- Proxy and interceptors support
- Child context creations
- Documentation
- Promises where it makes sense (eg: IOC lifecycle events (init, start, dispose))

Current version is a demo project with one unit test showing the build up of a context (with module registration) and the disposal of the context.

The waspioc.js library doesn't have any dependencies on other libraries and can therefor be easily included in your projects

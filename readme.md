#Waspioc: KISS IOC & DI container#
##Waspioc is build with TypeScript##

Waspioc is a simple IOC and DI container created with flexibility in mind.

Currently the dependency injector has support for

- Lifecycle management: INIT, STARTING, RUNNING, DISPOSED
- Fluid syntax, an added ConfigurationItem returns an easy way to attach default properties, references or constructor injection
- Flexible setup
- Support for unit-testing, as you can make an easy setup with mocked services
- Can be browserless
- Documentation

###Planned implementations:###

- Event registration over IOC container
- Proxy and interceptors support
- Child context creations
- Promises where it makes sense (eg: IOC lifecycle events (init, start, dispose))

Current version is a demo project with one unit test showing the build up of a context (with module registration) and the disposal of the context.

The waspioc.js library doesn't have any dependencies on other libraries and can therefor be easily included in your projects

##Usage##

Add the [build\waspioc.js](https://github.com/Icepickle/waspioc/blob/master/build/waspioc.js) to your project.

Use the loading event of your library to register the modules required for your application and start the context.

###Example###

Below is a small unit test for the waspioc library

####add the library####
````html
<script type="text/javascript" src="./build/waspioc.js"></script>
````

####add a script block or external js#####
Attach to the onload event of the window or with jQuery way

````javascript
$(function() { ... })
````


````javascript
window.addEventListener('load', function() {
      var context = waspioc.core.ioc.ServiceContext.getCurrentContext();

      function TestModule() {
        this.getBeanTypes = function() {
          return [waspioc.core.ioc.BeanType.MODULE];
        };

        this.initializeContext = function(context) {
          function UT_ContextInitiated() {
            this.logger = '';
            this.serviceContext = '';

            this.afterStarted = function() {
              // get the viewmodel
              var bean = this.serviceContext.getItem('viewModel');
              var match = this.serviceContext.getItem('singleItem') === bean.item.complex;
              this.logger.log('instance bean matches bean property? ' + (match ? "yes" : "no") );
              bean.newValue = 'yeehaw';
              var bean2 = this.serviceContext.getItem('viewModel');
              this.logger.log('same bean names = same instance? ' + (bean === bean2 ? "yes": "no") );
            };
          }

          function ViewModel() {
            this.viewBag = 4;

            this.afterPropertiesSet = function() {
              this.viewBag = 8;
            };
          }

          /* register bean interfaces */
          UT_ContextInitiated.prototype.getBeanTypes = function() {
            return [waspioc.core.ioc.BeanType.STARTING];
          };

          ViewModel.prototype.getBeanTypes = function() {
            return [waspioc.core.ioc.BeanType.INITIALIZING];
          };

          /* unit test setup */
          var item = {
            test: 'A',
            prop: 5
          };

          // register unit test (should be the same if it's first or last)
          context.register('unit_test_context', UT_ContextInitiated);
          // register context
          context.registerInstance('singleItem', item);
          context.register('item', item.constructor).value('test', 'A').reference('complex', 'singleItem');
          context.register('viewModel', ViewModel).reference('item', 'item');

          context.registerProperty('logger', console);
          context.registerProperty('serviceContext', context);
        }
      }

      context.registerModule('screenModule', new TestModule());
      // start the context
      context.start();
    });
````

####Watch the console and see the following output####

````
instance bean matches bean property? yes
same bean names = same instance? yes
````

module waspioc.core.ioc {

  /* @enum BeanType
   * MODULE: Should be used to initialize the context, requires the IModuleBean implementation
   * INITIALIZING: Is called after all the modules were registered, and the contexts can be resolved, requires IInitBean implementation
   * STARTING: All initializing beans were called, the context is up and all initializing beans completed, requires IStartingBean implementation
   * DISPOSING: Is called when the IContext gets disposed, can be used to clean up event hanlers etc, requires IDisposingBean implementation
   */
  export enum BeanType {
    MODULE,
    INITIALIZING,
    STARTING,
    DISPOSING
  }

  /* @interface IBean
   * Allows the registration of BeanTypes for a class that gets registered with the IContext.
   * The class in question can implement MyClass.prototype.getBeanTypes = function() { return [waspioc.core.ioc.BeanType.STARTING,...]; }; to get recognised as a "System" class
   * It is however optional, only if you need to hook up to any IContext switching events, you should choose to implement it this way
   */
  export interface IBean {
      getBeanTypes(): Array<BeanType>;
  }

  /* @class Bean
   * TypeScript stub that can be used as a base class for System Beans. Call super([waspioc.core.ioc.BeanType.STARTING,...]); in the constructor to set the system init points
   */
  export class Bean implements IBean {
    constructor(protected beanTypes: Array<BeanType>) {
      // intended blank
    }

    getBeanTypes(): Array<BeanType> {
      return this.beanTypes;
    }
  }

  /* @interface IModuleBean
   * Interface description for module classes, the context is passed with the INIT state (allows registration of new beans, but no resolving of already registered beans))
   */
  export interface IModuleBean extends IBean {
    initializeContext(serviceContext: IContext): void;
  }

  /* @interface IInitBean
   * Interface description for init classes, gets called after the context is in RUNNING state, can be used to verify if all configurations were resolved in your class
   */
  export interface IInitBean extends IBean {
    afterPropertiesSet(): void;
  }

  /* @interface IStartingBean
   * Gets called after the initialization is through, can be used to start collecting data from a server, or to hook up to events in the framework
   */
  export interface IStartingBean extends IBean {
    afterStarted(): void;
  }

  /* @interface IDisposingBean
   * Gets called when the IContext is disposed, use this point to unhook from all events that you registered in the class or to clean shared resources
   */
  export interface IDisposingBean extends IBean {
    afterStopped(): void;
  }

  /* @enum ServiceContextState
   * INIT: initialization is done here, in this stage registration can be done
   * RUNNING: modules are all registered, init beans have run, and starting beans were or are being called
   * STOPPED: unused
   * DISPOSED: The IContext got disposed, no more beans are known inside the IContext
   * TERMINATED: An error occured during the Lifecycle of the IOC container, and the IContext was forcibly stopped, currently unused
   */
  export enum ServiceContextState {
    INIT,
    STARTING,
    RUNNING,
    DISPOSED,
    TERMINATED
  }

  /* @interface IContext
   * Presents the interface to the ServiceContext, use this interface to refer to a service context
   */
  export interface IContext {
      register<T>(name: string, item: T): IConfigurationItem;
      registerInstance<T>(name: string, item: T): IConfigurationItem;
      registerProperty<T>(name: string, item: T): IConfigurationItem;
      registerModule(name: string, module: IModuleBean): void;
      remove(name: string): boolean;
      dispose(): void;
      getItem<T>(name: string): T;
      getCurrentState(): ServiceContextState;
      start(): void;
  }

  /* @class ServiceContext
   * @implements IContext
   * @static getCurrentContext(): IContext
   * Represents the default ServiceContext for waspioc. The current context is a singleton instance, that can be access over ServiceContext.getCurrentContext()
   */
  export class ServiceContext implements IContext {
    public static _currentContext: IContext = null;

    /* @method getCurrentContext
     * @returns IContext: The main context of the application
     */
    static getCurrentContext(): IContext {
      if (!ServiceContext._currentContext) {
        ServiceContext._currentContext = new ServiceContext();
      }
      return ServiceContext._currentContext;
    }

    private configurationDictionary = {};
    private instanceDictionary = {};
    private propertyDictionary = {};
    private propertiesInitialized = {};
    private moduleDictionary = {};
    private state: ServiceContextState = ServiceContextState.INIT;

    private lifeCycleDictionary = {
      modules: new Array<string>(),
      onInit: new Array<string>(),
      onStarted: new Array<string>(),
      onDisposed: new Array<string>()
    };

    constructor() {
      // intended blank
    }

    /* @method registerBean
     * @param name: string The name of the bean
     * @param item: the item that needs to be checked for bean implementations (getBeanTypes method)
     * Registers a bean inside one or more entry points of the lifeCycleDictionary
     */
    protected registerBean(name: string, item: any): void {
      var bt: Array<BeanType>;
      if (item.getBeanTypes && (bt = item.getBeanTypes()) != null) {
        if (bt.indexOf(BeanType.MODULE) >= 0) {
          this.lifeCycleDictionary.modules.push(name);
        }
        if (bt.indexOf(BeanType.INITIALIZING) >= 0) {
          this.lifeCycleDictionary.onInit.push(name);
        }
        if (bt.indexOf(BeanType.STARTING) >= 0) {
          this.lifeCycleDictionary.onStarted.push(name);
        }
        if (bt.indexOf(BeanType.DISPOSING) >= 0) {
          this.lifeCycleDictionary.onDisposed.push(name);
        }
      }
    }

    /* @method ensureState
     * @param matchingState: ServiceContextState the state the current context must have
     * @throws Error when current context state is different from the supplied state
     */
    private ensureState(matchingState: ServiceContextState[]): void {
      if (matchingState.indexOf(this.getCurrentState()) < 0) {
        console.error('expected state to be [' + matchingState.join(', ') + '] and not ' + this.getCurrentState());
        throw { message: 'Wrong context state' };
      }
    }

    /* @method register<T>
     * @param name: string Name of the configuration, overwrites previous declared names
     * @param item: T The class you wish to register
     * @returns IConfigurationItem
     * Registers a new named type in the IContext and returns the new configuration for additional configuration
     * @requires ServiceContext.getCurrentState() must be ServiceContextState.INIT
     */
    register<T>(name: string, item: T): IConfigurationItem {
      this.ensureState([ServiceContextState.INIT]);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, false);
      this.configurationDictionary[name] = configurationItem;
      return configurationItem;
    }

    /* @method registerInstance<T>
     * @param name: string Name of the configuration, overwrites previous declared names
     * @param item: T The instantiated class you wish to register (a resolve will always return exactly this class)
     * @returns IConfigurationItem
     * Registers a new named type in the IContext and returns the new configuration for additional configuration
     * @requires ServiceContext.getCurrentState() must be ServiceContextState.INIT
     */
    registerInstance<T>(name: string, item: T): IConfigurationItem {
      this.ensureState([ServiceContextState.INIT]);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, true);
      this.instanceDictionary[name] = configurationItem;
      return configurationItem;
    }

    /* @method registerProperty<T>
     * @param name: string Name of the configuration, overwrites previous declared names
     * @param item: T The instantiated class you wish to register (a resolve will always return exactly this class)
     * @returns IConfigurationItem
     * Registers a new named type in the IContext and returns the new configuration for additional configuration. Any classes having a property named like @name will get this value
     * This can be seen as an Autoregistrated property easy to use for either a logger or the servicecontext itself
     * @requires ServiceContext.getCurrentState() must be ServiceContextState.INIT
     */
    registerProperty<T>(name: string, item: T): IConfigurationItem {
      this.ensureState([ServiceContextState.INIT]);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, true);
      this.propertyDictionary[name] = configurationItem;
      return configurationItem;
    }

    /* @method registerModule<T>
     * @param name: string Name of the configuration, overwrites previous declared names
     * @param item: T The instantiated class you wish to register (a resolve will always return exactly this class)
     * @returns null
     * Registers a module in the IContext
     * @requires ServiceContext.getCurrentState() must be ServiceContextState.INIT
     */
    registerModule(name: string, module: IModuleBean): void {
      this.ensureState([ServiceContextState.INIT]);
      this.registerBean(name, module);
      this.moduleDictionary[name] = new ConfigurationItem(name, module, this, true);
    }

    /* @method remove
     * @param name: string The named bean you wish to remove from the instanceDictionary / configurationDictionary or propertyDictionary
     * Removes an item from the serviceContext, and if necessary calls the onDisposed handler so that the class can clean itself up
     * @returns boolean if the named configuration was found
     */
    remove(name: string): boolean {
      var success: boolean = false;
      var oldItem: any = this.getItem(name);
      if (this.instanceDictionary[name] !== undefined) {
        delete this.instanceDictionary[name];
        success = true;
      }
      if (this.configurationDictionary[name] !== undefined) {
        delete this.configurationDictionary[name];
        success = true;
      }
      if (this.propertyDictionary[name] !== undefined) {
        delete this.propertyDictionary[name];
        success = true;
      }
      if (this.lifeCycleDictionary.onDisposed[name] !== undefined) {
        if (oldItem.afterStopped) {
          oldItem.afterStopped();
        }
      }
      oldItem = null;

      return success;
    }

    /* @method dispose
     * Disposes the current ServiceContext and calls the onDisposed method of all IDisposingBean's
     */
    dispose(): void {
      this.ensureState([ServiceContextState.INIT, ServiceContextState.STARTING, ServiceContextState.RUNNING]);
      for (var i = 0; i < this.lifeCycleDictionary.onDisposed.length; i++) {
        this.remove(this.lifeCycleDictionary.onDisposed[i]);
      }

      this.state = ServiceContextState.DISPOSED;
      this.instanceDictionary = {};
      this.configurationDictionary = {};
      this.propertyDictionary = {};
      this.propertiesInitialized = {};
      this.lifeCycleDictionary = {
        modules: new Array<string>(),
        onInit: new Array<string>(),
        onStarted: new Array<string>(),
        onDisposed: new Array<string>()
      };
      this.moduleDictionary = {};
      if (ServiceContext._currentContext === this) {
        ServiceContext._currentContext = null;
      }
    }

    /* @method getItem
     * @param name: string The name of the configuration (either instance or configuration)
     * Resolves a configuration item based on its name, when it was the first time this bean got called it gets instantiated when necessary and properties get attached
     * @returns T
     * @requires ServiceContextState = RUNNING
     */
    getItem<T>(name: string): T {
      this.ensureState([ServiceContextState.STARTING, ServiceContextState.RUNNING]);
      var item = this.instanceDictionary[name] || this.configurationDictionary[name] || null;
      if (!item) {
        throw new Error('No configuration found with name "' + name + '"');
      }
      // set the real value of the item
      item = item.Value();
      if (!this.propertiesInitialized[name]) {
        this.propertiesInitialized[name] = true;
        for (var propertyName in item) {
          if (item.hasOwnProperty(propertyName) && this.propertyDictionary[propertyName]) {
            item[propertyName] = this.propertyDictionary[propertyName].Value();
          }
        }
      }
      return item;
    }

    /* @method getCurrentState
     * Returns the internally set state of the context
     * @returns ServiceContextState
     */
    getCurrentState(): ServiceContextState {
      return this.state;
    }

    /* @method registerDictionary
     * @param dictionary: Object an object that gets iterated for all it named properties that are IConfigurationItem's checks with registerBean if this item has a place in the lifeCycleDictionary
     */
    private registerDictionary(dictionary: Object): void {
      var name: string, item: any;
      for (name in dictionary) {
        if (dictionary.hasOwnProperty(name)) {
          item = dictionary[name].Value();
          this.registerBean(name, item);
        }
      }
    }

    /* @method start
     * Starts the service context and switches the current context from INIT to RUNNING
     * Initializes modules, then init beans and then starting beans, must be called before getItem can be called
     */
    start(): void {
      try {
        this.ensureState([ServiceContextState.INIT]);
        var i: number, len: number, moduleName: string, module;
        // setup the modules
        for (i = 0, len = this.lifeCycleDictionary.modules.length; i < len; i++) {
          moduleName = this.lifeCycleDictionary.modules[i];
          module = this.moduleDictionary[moduleName].Value();
          if (module && module.initializeContext) {
            module.initializeContext(this);
          }
        }
        // from now on, we are in a "running state"
        this.state = ServiceContextState.STARTING;

        // init all properties and register beans if necessary
        this.registerDictionary(this.instanceDictionary);
        this.registerDictionary(this.propertyDictionary);
        this.registerDictionary(this.configurationDictionary);

        // init all IInitBean's
        for (i = 0, len = this.lifeCycleDictionary.onInit.length; i < len; i++) {
          moduleName = this.lifeCycleDictionary.onInit[i];
          module = this.getItem(moduleName);
          if (module && module.afterPropertiesSet) {
            module.afterPropertiesSet();
          }
        }

        this.state = ServiceContextState.RUNNING;

        // now the context is fully up and running, activate all onstarted items
        for (i = 0, len = this.lifeCycleDictionary.onStarted.length; i < len; i++) {
          moduleName = this.lifeCycleDictionary.onStarted[i];
          module = this.getItem(moduleName);
          if (module && module.afterStarted) {
            module.afterStarted();
          }
        }
        // context fully booted!
      } catch (e) {
        console.error(e);
        this.state = ServiceContextState.TERMINATED;
        // rethrow the error
        throw e;
      }
    }
  }
}

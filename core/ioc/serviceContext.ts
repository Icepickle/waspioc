module waspioc.core.ioc {

  export enum BeanType {
    MODULE,
    INITIALIZING,
    STARTING,
    DISPOSING
  }

  export interface IBean {
      getBeanTypes(): Array<BeanType>;
  }

  export class Bean implements IBean {
    constructor(protected beanTypes: Array<BeanType>) {
      // intended blank
    }

    getBeanTypes(): Array<BeanType> {
      return this.beanTypes;
    }
  }

  export interface IModuleBean extends IBean {
    initializeContext(serviceContext: IContext): void;
  }

  export interface IInitBean extends IBean {
    afterPropertiesSet(): void;
  }

  export interface IStartingBean extends IBean {
    afterStarted(): void;
  }

  export interface IDisposingBean extends IBean {
    afterStopped(): void;
  }

  export enum ServiceContextState {
    INIT,
    RUNNING,
    STOPPED,
    DISPOSED,
    TERMINATED
  }

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

  export class ServiceContext implements IContext {
    public static _currentContext: IContext = null;

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

    protected registerBean<T>(name: string, item: any): void {
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

    private ensureState(matchingState: ServiceContextState): void {
      if (this.getCurrentState() !== matchingState) {
        console.error('expected state to be ' + matchingState + ' and not ' + this.getCurrentState());
        throw { message: 'Wrong context state' };
      }
    }

    register<T>(name: string, item: T): IConfigurationItem {
      this.ensureState(ServiceContextState.INIT);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, false);
      this.configurationDictionary[name] = configurationItem;
      return configurationItem;
    }

    registerInstance<T>(name: string, item: T): IConfigurationItem {
      this.ensureState(ServiceContextState.INIT);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, true);
      this.instanceDictionary[name] = configurationItem;
      return configurationItem;
    }

    registerProperty<T>(name: string, item: T): IConfigurationItem {
      this.ensureState(ServiceContextState.INIT);
      var configurationItem: IConfigurationItem = new ConfigurationItem(name, item, this, true);
      this.propertyDictionary[name] = configurationItem;
      return configurationItem;
    }

    registerModule(name: string, module: IModuleBean): void {
      this.registerBean(name, module);
      this.moduleDictionary[name] = new ConfigurationItem(name, module, this, true);
    }

    remove(name: string): boolean {
      var success: boolean = false;
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
      return success;
    }

    dispose(): void {
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
      this.state = ServiceContextState.DISPOSED;
    }

    getItem<T>(name: string): T {
      this.ensureState(ServiceContextState.RUNNING);
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

    getCurrentState(): ServiceContextState {
      return this.state;
    }

    private registerDictionary(dictionary: Object): void {
      var name: string, item: any;
      for (name in dictionary) {
        if (dictionary.hasOwnProperty(name)) {
          item = dictionary[name].Value();
          this.registerBean(name, item);
        }
      }
    }

    start(): void {
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
      this.state = ServiceContextState.RUNNING;

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

      // now the context is fully up and running, activate all onstarted items
      for (i = 0, len = this.lifeCycleDictionary.onStarted.length; i < len; i++) {
        moduleName = this.lifeCycleDictionary.onStarted[i];
        module = this.getItem(moduleName);
        if (module && module.afterStarted) {
          module.afterStarted();
        }
      }
      // context fully booted!
    }
  }
}

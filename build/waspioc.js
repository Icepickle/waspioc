var waspioc;
(function (waspioc) {
    var core;
    (function (core) {
        var ioc;
        (function (ioc) {
            var ConfigurationItem = (function () {
                function ConfigurationItem(name, skeleton, serviceContext, isInstance) {
                    if (serviceContext === void 0) { serviceContext = ioc.ServiceContext.getCurrentContext(); }
                    if (isInstance === void 0) { isInstance = false; }
                    this.name = name;
                    this.skeleton = skeleton;
                    this.serviceContext = serviceContext;
                    this.isInstance = isInstance;
                    this.referenceDictionary = {};
                    this.valueDictionary = {};
                }
                ConfigurationItem.prototype.reference = function (property, configurationName) {
                    this.referenceDictionary[property] = configurationName;
                    return this;
                };
                ConfigurationItem.prototype.value = function (property, value) {
                    this.valueDictionary[property] = value;
                    return this;
                };
                ConfigurationItem.prototype.construct = function (arg) {
                    this._constructorArguments = arg;
                    return this;
                };
                ConfigurationItem.prototype.Value = function () {
                    var item = this._value || (this.isInstance ? this.skeleton : new this.skeleton(this._constructorArguments));
                    if (!this.isInstance || !this.isInitiated) {
                        this._value = item;
                        if (!this.isInitiated) {
                            this.isInitiated = true;
                            for (var value in this.referenceDictionary) {
                                if (this.referenceDictionary.hasOwnProperty(value)) {
                                    item[value] = this.serviceContext.getItem(this.referenceDictionary[value]);
                                }
                            }
                            for (var value in this.valueDictionary) {
                                if (this.valueDictionary.hasOwnProperty(value)) {
                                    item[value] = this.valueDictionary[value];
                                }
                            }
                        }
                    }
                    return item;
                };
                return ConfigurationItem;
            })();
            ioc.ConfigurationItem = ConfigurationItem;
        })(ioc = core.ioc || (core.ioc = {}));
    })(core = waspioc.core || (waspioc.core = {}));
})(waspioc || (waspioc = {}));
var waspioc;
(function (waspioc) {
    var core;
    (function (core) {
        var ioc;
        (function (ioc) {
            (function (BeanType) {
                BeanType[BeanType["MODULE"] = 0] = "MODULE";
                BeanType[BeanType["INITIALIZING"] = 1] = "INITIALIZING";
                BeanType[BeanType["STARTING"] = 2] = "STARTING";
                BeanType[BeanType["DISPOSING"] = 3] = "DISPOSING";
            })(ioc.BeanType || (ioc.BeanType = {}));
            var BeanType = ioc.BeanType;
            var Bean = (function () {
                function Bean(beanTypes) {
                    this.beanTypes = beanTypes;
                }
                Bean.prototype.getBeanTypes = function () {
                    return this.beanTypes;
                };
                return Bean;
            })();
            ioc.Bean = Bean;
            (function (ServiceContextState) {
                ServiceContextState[ServiceContextState["INIT"] = 0] = "INIT";
                ServiceContextState[ServiceContextState["RUNNING"] = 1] = "RUNNING";
                ServiceContextState[ServiceContextState["STOPPED"] = 2] = "STOPPED";
                ServiceContextState[ServiceContextState["DISPOSED"] = 3] = "DISPOSED";
                ServiceContextState[ServiceContextState["TERMINATED"] = 4] = "TERMINATED";
            })(ioc.ServiceContextState || (ioc.ServiceContextState = {}));
            var ServiceContextState = ioc.ServiceContextState;
            var ServiceContext = (function () {
                function ServiceContext() {
                    this.configurationDictionary = {};
                    this.instanceDictionary = {};
                    this.propertyDictionary = {};
                    this.propertiesInitialized = {};
                    this.moduleDictionary = {};
                    this.state = ServiceContextState.INIT;
                    this.lifeCycleDictionary = {
                        modules: new Array(),
                        onInit: new Array(),
                        onStarted: new Array(),
                        onDisposed: new Array()
                    };
                }
                ServiceContext.getCurrentContext = function () {
                    if (!ServiceContext._currentContext) {
                        ServiceContext._currentContext = new ServiceContext();
                    }
                    return ServiceContext._currentContext;
                };
                ServiceContext.prototype.registerBean = function (name, item) {
                    var bt;
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
                };
                ServiceContext.prototype.ensureState = function (matchingState) {
                    if (this.getCurrentState() !== matchingState) {
                        console.error('expected state to be ' + matchingState + ' and not ' + this.getCurrentState());
                        throw { message: 'Wrong context state' };
                    }
                };
                ServiceContext.prototype.register = function (name, item) {
                    this.ensureState(ServiceContextState.INIT);
                    var configurationItem = new ioc.ConfigurationItem(name, item, this, false);
                    this.configurationDictionary[name] = configurationItem;
                    return configurationItem;
                };
                ServiceContext.prototype.registerInstance = function (name, item) {
                    this.ensureState(ServiceContextState.INIT);
                    var configurationItem = new ioc.ConfigurationItem(name, item, this, true);
                    this.instanceDictionary[name] = configurationItem;
                    return configurationItem;
                };
                ServiceContext.prototype.registerProperty = function (name, item) {
                    this.ensureState(ServiceContextState.INIT);
                    var configurationItem = new ioc.ConfigurationItem(name, item, this, true);
                    this.propertyDictionary[name] = configurationItem;
                    return configurationItem;
                };
                ServiceContext.prototype.registerModule = function (name, module) {
                    this.registerBean(name, module);
                    this.moduleDictionary[name] = new ioc.ConfigurationItem(name, module, this, true);
                };
                ServiceContext.prototype.remove = function (name) {
                    var success = false;
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
                };
                ServiceContext.prototype.dispose = function () {
                    this.instanceDictionary = {};
                    this.configurationDictionary = {};
                    this.propertyDictionary = {};
                    this.propertiesInitialized = {};
                    this.lifeCycleDictionary = {
                        modules: new Array(),
                        onInit: new Array(),
                        onStarted: new Array(),
                        onDisposed: new Array()
                    };
                    this.moduleDictionary = {};
                    this.state = ServiceContextState.DISPOSED;
                };
                ServiceContext.prototype.getItem = function (name) {
                    this.ensureState(ServiceContextState.RUNNING);
                    var item = this.instanceDictionary[name] || this.configurationDictionary[name] || null;
                    if (!item) {
                        throw new Error('No configuration found with name "' + name + '"');
                    }
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
                };
                ServiceContext.prototype.getCurrentState = function () {
                    return this.state;
                };
                ServiceContext.prototype.registerDictionary = function (dictionary) {
                    var name, item;
                    for (name in dictionary) {
                        if (dictionary.hasOwnProperty(name)) {
                            item = dictionary[name].Value();
                            this.registerBean(name, item);
                        }
                    }
                };
                ServiceContext.prototype.start = function () {
                    var i, len, moduleName, module;
                    for (i = 0, len = this.lifeCycleDictionary.modules.length; i < len; i++) {
                        moduleName = this.lifeCycleDictionary.modules[i];
                        module = this.moduleDictionary[moduleName].Value();
                        if (module && module.initializeContext) {
                            module.initializeContext(this);
                        }
                    }
                    this.state = ServiceContextState.RUNNING;
                    this.registerDictionary(this.instanceDictionary);
                    this.registerDictionary(this.propertyDictionary);
                    this.registerDictionary(this.configurationDictionary);
                    for (i = 0, len = this.lifeCycleDictionary.onInit.length; i < len; i++) {
                        moduleName = this.lifeCycleDictionary.onInit[i];
                        module = this.getItem(moduleName);
                        if (module && module.afterPropertiesSet) {
                            module.afterPropertiesSet();
                        }
                    }
                    for (i = 0, len = this.lifeCycleDictionary.onStarted.length; i < len; i++) {
                        moduleName = this.lifeCycleDictionary.onStarted[i];
                        module = this.getItem(moduleName);
                        if (module && module.afterStarted) {
                            module.afterStarted();
                        }
                    }
                };
                ServiceContext._currentContext = null;
                return ServiceContext;
            })();
            ioc.ServiceContext = ServiceContext;
        })(ioc = core.ioc || (core.ioc = {}));
    })(core = waspioc.core || (waspioc.core = {}));
})(waspioc || (waspioc = {}));
var waspioc;
(function (waspioc) {
    var core;
    (function (core) {
        var models;
        (function (models) {
            var TreeNode = (function () {
                function TreeNode(parent, children) {
                    if (parent === void 0) { parent = null; }
                    if (children === void 0) { children = []; }
                    this.parent = parent;
                    this.children = children;
                }
                TreeNode.prototype.isRoot = function () {
                    return typeof this.parent === 'null';
                };
                TreeNode.prototype.getRoot = function () {
                    if (this.isRoot()) {
                        return this;
                    }
                    return this.parent.getRoot();
                };
                TreeNode.prototype.add = function (node) {
                    node.parent = this;
                    this.children.push(node);
                };
                TreeNode.prototype.remove = function (node) {
                    var length = this.children.length, index;
                    for (index = length; --index >= 0;) {
                        if (this.children[index] === node) {
                            break;
                        }
                    }
                    if (index >= 0) {
                        this.children[index].parent = null;
                        this.children.splice(index, 1);
                    }
                };
                TreeNode.prototype.find = function (evaluate) {
                    var matchingNode = this.findAll(evaluate, 1);
                    return matchingNode.length > 0 ? matchingNode[0] : null;
                };
                TreeNode.prototype.findAll = function (evaluate, maxNodes) {
                    if (maxNodes === void 0) { maxNodes = 0; }
                    var matchingNodes = [], index, length;
                    for (index = 0, length = this.children.length; index < length; index++) {
                        if (evaluate(this.children[index])) {
                            matchingNodes.push(this.children[index]);
                            if (maxNodes > 0 && matchingNodes.length >= maxNodes) {
                                break;
                            }
                        }
                    }
                    return matchingNodes;
                };
                return TreeNode;
            })();
            models.TreeNode = TreeNode;
        })(models = core.models || (core.models = {}));
    })(core = waspioc.core || (waspioc.core = {}));
})(waspioc || (waspioc = {}));
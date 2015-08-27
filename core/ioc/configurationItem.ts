module waspioc.core.ioc {
  export interface IConfigurationItem {
      reference(property: string, configurationName: string): IConfigurationItem;
      value<T>(property: string, value: T): IConfigurationItem;
      construct(args: any[]): IConfigurationItem;
  }

  export class ConfigurationItem implements IConfigurationItem {
    private isInitiated;
    private referenceDictionary = {};
    private valueDictionary = {};
    private _value: any;
    private _constructorArguments;

    constructor(public name: string, protected skeleton: any, protected serviceContext: IContext = ServiceContext.getCurrentContext(), protected isInstance: boolean = false) {
      // intended blank
    }

    public reference(property: string, configurationName: string): IConfigurationItem {
      this.referenceDictionary[property] = configurationName;
      return this;
    }

    public value<T>(property: string, value: T): IConfigurationItem {
      this.valueDictionary[property] = value;
      return this;
    }

    public construct(arg: any[]): IConfigurationItem {
      this._constructorArguments = arg;
      return this;
    }

    public Value(): any {
      var item: any = this._value || (this.isInstance ? this.skeleton : new this.skeleton(this._constructorArguments));

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
    }
  }
}

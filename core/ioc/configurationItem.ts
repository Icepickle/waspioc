module waspioc.core.ioc {
  /* @interface IConfigurationItem
   * Minimal interface that IConfigurationItem should support
   */
  export interface IConfigurationItem {
      reference(property: string, configurationName: string): IConfigurationItem;
      value<T>(property: string, value: T): IConfigurationItem;
      construct(args: any[]): IConfigurationItem;
  }

  /* @class ConfigurationItem
   * Place holder for a configuration, can either contain an instance or a constructor that needs to be called
   * Uses lazy initialization for the getting the Value
   */
  export class ConfigurationItem implements IConfigurationItem {
    private isInitiated;
    private referenceDictionary = {};
    private valueDictionary = {};
    private _value: any;
    private _constructorArguments: any;

    /* @constructor
     * @param name: String the name of the configuration in the context
     * @param skeleton: Object The instance or the class that needs to be constructed
     * @param serviceContext: IContext the context that manages this configuration item
     * @param isInstance: boolean Inidcates if the skeleton should be returned, or if the Value has to be initiated during the first initialization
     */
    constructor(public name: string, protected skeleton: any, protected serviceContext: IContext = ServiceContext.getCurrentContext(), protected isInstance: boolean = false) {
      // intended blank
    }

    /* @method reference
     * @param property: string the name of the property in your class that you wish to add a reference for
     * @param configurationName: string the reference to another item registered in the serviceContext
     * @returns this
     */
    public reference(property: string, configurationName: string): IConfigurationItem {
      this.referenceDictionary[property] = configurationName;
      return this;
    }

    /* @method value<T>
     * @param property: string the name of the property in your class that you wish to add a reference for
     * @param value: T The raw value that you wish to set to this property
     * @returns this
     */
    public value<T>(property: string, value: T): IConfigurationItem {
      this.valueDictionary[property] = value;
      return this;
    }

    /* @method construct
     * @param arg: Object a constructor parameter to use when calling this class
     * @returns this
     */
    public construct(arg: any): IConfigurationItem {
      this._constructorArguments = arg;
      return this;
    }

    /* @method Value
     * returns a fully usable
     * @returns Object
     */
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

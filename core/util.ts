module waspioc.core.util {
  export class ParamChecker {
    static assert(shouldBeTrue: boolean, message: string) {
      if (!shouldBeTrue) {
        throw new Error(message);
      }
    }

    static assertNotNull(value: any, name: string): void {
      this.assert(value !== null && value !== void 0 && value && true, name + ' cannot be empty or undefined')
    }

    static assertTrue(value: boolean, name: string): void {
      this.assert(value === true, name + ' should be exactly true');
    }

    static assertFalse(value: boolean, name: string): void {
      this.assert(value === false || !value, name + ' should be exactly false');
    }

    static assertError(func: () => void, message: string) {
      var result: boolean = true;
      try {
        func();
      } catch (e) {
        // ignore error
        result = false;
      }
      this.assert(result === false, message);
    }

    static assertNoError(func: () => void, message: string) {
      var result: boolean = true;
      try {
        func();
      } catch (e) {
        // ignore error
        throw new Error(e.message + '\r\n' + message);
      }
      this.assert(result === true, message);
    }
  }
}

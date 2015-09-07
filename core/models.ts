module waspioc.core.models {
  export interface NodeMatchEvaluator {
    (node: TreeNode): boolean
  }

  export class TreeNode {
    constructor(public parent: TreeNode = null, public children: TreeNode[] = []) {
      // intended blank
    }

    isRoot(): boolean {
      return typeof this.parent === 'null';
    }

    getRoot(): TreeNode {
      if (this.isRoot()) {
        return this;
      }
      return this.parent.getRoot();
    }

    add(node: TreeNode): void {
      node.parent = this;
      this.children.push(node);
    }

    remove(node: TreeNode): void {
      var length = this.children.length, index;
      for (index = length; --index >= 0;) {
        if (this.children[index] === node) {
          break;
        }
      }
      if (index >= 0) {
        // reset the parent
        this.children[index].parent = null;
        // remove the child element
        this.children.splice(index, 1);
      }
    }

    find(evaluate: NodeMatchEvaluator): TreeNode {
      // find maximum 1 match for the callback function and return that one in case a match was found
      var matchingNode = this.findAll(evaluate, 1);
      return matchingNode.length > 0 ? matchingNode[0] : null;
    }

    findAll(evaluate: NodeMatchEvaluator, maxNodes: number = 0): TreeNode[] {
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
    }
  }
}

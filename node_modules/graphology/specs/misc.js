"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = misc;

var _assert = _interopRequireDefault(require("assert"));

var _helpers = require("./helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Graphology Misc Specs
 * ======================
 *
 * Testing the miscellaneous things about the graph.
 */
function misc(Graph) {
  return {
    Structure: {
      'a simple mixed graph can have A->B, B->A & A<->B': function aSimpleMixedGraphCanHaveABBAAB() {
        var graph = new Graph();
        (0, _helpers.addNodesFrom)(graph, ['Audrey', 'Benjamin']);

        _assert["default"].doesNotThrow(function () {
          graph.addEdge('Audrey', 'Benjamin');
          graph.addEdge('Benjamin', 'Audrey');
          graph.addUndirectedEdge('Benjamin', 'Audrey');
        });
      },
      'deleting the last edge between A & B should correctly clear neighbor index.': function deletingTheLastEdgeBetweenABShouldCorrectlyClearNeighborIndex() {
        var graph = new Graph({
          multi: true
        });
        graph.addNode('A');
        graph.addNode('B');
        graph.addEdge('A', 'B');
        graph.addEdge('A', 'B');
        graph.forEachEdge('A', function (edge) {
          return graph.dropEdge(edge);
        });

        _assert["default"].deepStrictEqual(graph.neighbors('A'), []);

        _assert["default"].deepStrictEqual(graph.neighbors('B'), []);
      } // 'copy of the graph should work even with edge wrangling.': function () {
      //   const graph = new Graph();
      //   graph.addNode('n0');
      //   graph.addNode('n1');
      //   graph.addNode('n2');
      //   graph.addNode('n3');
      //   graph.addEdge('n0', 'n1');
      //   graph.addEdge('n1', 'n2');
      //   graph.addEdge('n2', 'n3');
      //   graph.addEdge('n3', 'n0');
      //   // Surgery
      //   const newNode = 'n12';
      //   graph.addNode(newNode);
      //   const e = graph.edge('n1', 'n2');
      //   graph.dropEdge(e);
      //   graph.addEdge('n1', newNode);
      //   graph.addEdgeWithKey(e, newNode, 'n2');
      //   console.log(graph);
      //   const copy = graph.copy();
      //   assert.strictEqual(graph.size, copy.size);
      // }

    },
    'Key coercion': {
      'keys should be correctly coerced to strings.': function keysShouldBeCorrectlyCoercedToStrings() {
        var graph = new Graph();
        graph.addNode(1);
        graph.addNode('2');

        _assert["default"].strictEqual(graph.hasNode(1), true);

        _assert["default"].strictEqual(graph.hasNode('1'), true);

        _assert["default"].strictEqual(graph.hasNode(2), true);

        _assert["default"].strictEqual(graph.hasNode('2'), true);

        graph.addEdgeWithKey(3, 1, 2);

        _assert["default"].strictEqual(graph.hasEdge(3), true);

        _assert["default"].strictEqual(graph.hasEdge('3'), true);
      }
    }
  };
}
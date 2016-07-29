import { ChronoTree, Node, Storage, NodeType, Hash } from '../src/chronoTree';
import { TestStorage, TestNode } from './testStorage';
import { expect } from 'chai';
import { RNG } from './rng';
import * as h from 'object-hash';

describe('ChronoTree Simulation', () => {
    it('should process 100 random operations, merging every iteration', () => {
        let r: RNG = new RNG(1);

        // create the first post
        let storage: Storage = new TestStorage();
        let rootNode: TestNode = new TestNode();
        rootNode.content = '-1';
        rootNode.hash = storage.save(rootNode);

        // create the three ChronoTrees initialized to the root node
        let trees: ChronoTree[] = [
            new ChronoTree(storage, rootNode.hash),
            new ChronoTree(storage, rootNode.hash),
            new ChronoTree(storage, rootNode.hash)
            ];

        for (let i: number = 0; i < 100; i++) { // one hundred times
            console.log('*** Iteration: ' + i.toString() + ' ***');
            for (let t: number = 0; t < trees.length; t++) {
                // pick a random known node to be the parent
                let p: Hash = r.pick(Object.keys(trees[t].knownNodes));
                // create a new node
                let n: TestNode = new TestNode();
                n.content = i.toString();
                n.parent = p;
                // add the new node
                trees[t].add(n);
            }

            // merge each pair of trees together
            for (let treePair of combineAll(trees)) {
                treePair[0].merge(treePair[1].bitterEnd);
            }

            // assert all the trees are the same
            for (let treePair of combine(trees)) {
                expect(treePair[0].bitterEnd).to.equal(treePair[1].bitterEnd);
            }
        }
    });
});

// select every distinct pair from the input array
function combine<T>(arrIn: T[]): [T, T][] {
    let arrOut: [T, T][] = [];
    for (let i: number = 0; i < arrIn.length; i++) {
        for (let j: number = i + 1; j < arrIn.length; j++) {
            if (arrIn[i] !== arrIn[j]) {
                arrOut.push([arrIn[i], arrIn[j]]);
            }
        }
    }
    return arrOut;
}

// select every pair from the input array
function combineAll<T>(arrIn: T[]): [T, T][] {
    let arrOut: [T, T][] = [];
    for (let i: number = 0; i < arrIn.length; i++) {
        for (let j: number = 0; j < arrIn.length; j++) {
            if (arrIn[i] !== arrIn[j]) {
                arrOut.push([arrIn[i], arrIn[j]]);
            }
        }
    }
    return arrOut;
}

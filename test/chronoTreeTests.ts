/// <reference path="../typings/globals/mocha/index.d.ts" />
import { ChronoTree, Node, Hash, Storage, NodeType } from '../src/chronoTree';
import { TestStorage } from './testStorage';
import { expect } from 'chai';

describe('ChronoTree', () => {
    let _storage: Storage;

    beforeEach(() => {
        _storage = new TestStorage();
    });

    describe('#constructor', () => {
        it('should initialize an empty tree with an empty aggregate node', () => {
            let tree: ChronoTree = new ChronoTree(_storage);
            let bitterEnd: Node = tree.getNode(tree.bitterEnd);
            expect(bitterEnd.type).to.equal(NodeType.Aggregate);
        });
    });
});


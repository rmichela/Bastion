import { ChronoTree, Node, Storage, NodeType } from '../src/chronoTree';
import { TestStorage, TestNode } from './testStorage';
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

    describe('#add', () => {
        it('should accept the first node', () => {
            let tree: ChronoTree = new ChronoTree(_storage);

            let firstNode: TestNode = new TestNode();
            firstNode.content = 'First post!';
            tree.add(firstNode);

            expect(firstNode.hash).to.not.equal(Node.HASH_NOT_SET);
            expect(firstNode.hash).to.not.equal('');
            expect(firstNode.predecessors.length).to.equal(0);
            expect(firstNode.parent).to.equal(Node.HASH_NOT_SET);
            expect(tree.getNode(tree.bitterEnd).type).to.equal(NodeType.Content);

            expect(tree.bitterEnd).to.equal(firstNode.hash);
            expect(tree.looseEnds.length).to.equal(1);
        });

        it('should accept another node', () => {
            let tree: ChronoTree = new ChronoTree(_storage);

            let firstNode: TestNode = new TestNode();
            firstNode.content = 'First post!';
            tree.add(firstNode);

            let secondNode: TestNode = new TestNode();
            secondNode.content = 'Second post!';
            secondNode.parent = firstNode.hash;
            tree.add(secondNode);

            expect(tree.bitterEnd).to.equal(secondNode.hash);
            expect(tree.looseEnds.length).to.equal(1);
            expect(tree.getNode(tree.bitterEnd).type).to.equal(NodeType.Content);
            expect(tree.getNode(tree.bitterEnd).parent).to.equal(firstNode.hash);
        });
    });
});


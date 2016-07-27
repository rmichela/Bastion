import { ChronoTree, Node, Storage, NodeType, Hash } from '../src/chronoTree';
import { TestStorage, TestNode } from './testStorage';
import { expect } from 'chai';
import * as h from 'object-hash';

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

        it('should initialize a tree with a provided first node', () => {
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'First post!';
            firstNode.hash = _storage.save(firstNode);

            let tree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            expect(tree.bitterEnd).to.equal(firstNode.hash);
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
            expect(Object.keys(tree.knownNodes).length).to.equal(1);
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
            expect(Object.keys(tree.knownNodes).length).to.equal(2);
        });
    });

    describe('#merge', () => {
        it('should merge a simple split', () => {
            // create the root node
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'First post!';
            firstNode.hash = _storage.save(firstNode);

            // create the two divergent trees
            let lhsTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let rhsTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            let lhsNode: TestNode = new TestNode();
            lhsNode.content = 'lhs';
            lhsNode.parent = firstNode.hash;
            lhsTree.add(lhsNode);

            let rhsNode: TestNode = new TestNode();
            rhsNode.content = 'rhs';
            rhsNode.parent = firstNode.hash;
            rhsTree.add(rhsNode);

            // merge the two trees back together
            lhsTree.merge(rhsTree.bitterEnd);
            let mergeNode: Node = lhsTree.getNode(lhsTree.bitterEnd);

            expect(mergeNode.type).to.equal(NodeType.Aggregate);
            expect(mergeNode.parent).to.equal(Node.HASH_NOT_SET);
            expect(mergeNode.predecessors.length).to.equal(2);
            expect(mergeNode.predecessors).to.contain(lhsNode.hash);
            expect(mergeNode.predecessors).to.contain(rhsNode.hash);
        });

        it('should merge a simple three way split', () => {
            // create the root node
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'xxx';
            firstNode.hash = _storage.save(firstNode);

            // create the three divergent trees
            let aTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let bTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let cTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            let aNode: TestNode = new TestNode();
            aNode.content = 'aaa';
            aNode.parent = firstNode.hash;
            aTree.add(aNode);

            let bNode: TestNode = new TestNode();
            bNode.content = 'bbb';
            bNode.parent = firstNode.hash;
            bTree.add(bNode);

            let cNode: TestNode = new TestNode();
            cNode.content = 'ccc';
            cNode.parent = firstNode.hash;
            cTree.add(cNode);

            // merge the trees together
            let aHash: Hash = aTree.bitterEnd;
            let bHash: Hash = bTree.bitterEnd;
            let cHash: Hash = cTree.bitterEnd;

            console.log('*** a + b + c');
            aTree.merge(bHash).merge(cHash);
            console.log('*** b + a + c');
            bTree.merge(aHash).merge(cHash);
            console.log('*** c + b + a');
            cTree.merge(bHash).merge(aHash);

            // verify ends are the same
            expect(aTree.bitterEnd).to.equal(bTree.bitterEnd);
            expect(bTree.bitterEnd).to.equal(cTree.bitterEnd);
            // verify internal state is the same
            expect(h.sha1(aTree.looseEnds)).to.equal(h.sha1(bTree.looseEnds));
            expect(h.sha1(aTree.knownNodes)).to.equal(h.sha1(bTree.knownNodes));
            expect(h.sha1(bTree.looseEnds)).to.equal(h.sha1(cTree.looseEnds));
            expect(h.sha1(bTree.knownNodes)).to.equal(h.sha1(cTree.knownNodes));
        });
    });
});


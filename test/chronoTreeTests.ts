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
            firstNode.content = 'xxx';
            firstNode.hash = _storage.save(firstNode);

            // create the two divergent trees
            let lhsTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let rhsTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            let lhsNode: TestNode = new TestNode();
            lhsNode.content = 'aaa';
            lhsNode.parent = firstNode.hash;
            lhsTree.add(lhsNode);

            let rhsNode: TestNode = new TestNode();
            rhsNode.content = 'bbb';
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

        it('should be commutative', () => {
            // create the root node
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'xxx';
            firstNode.hash = _storage.save(firstNode);

            // create the two divergent trees
            let aTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let bTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            let aNode: TestNode = new TestNode();
            aNode.content = 'aaa';
            aNode.parent = firstNode.hash;
            aTree.add(aNode);

            let bNode: TestNode = new TestNode();
            bNode.content = 'bbb';
            bNode.parent = firstNode.hash;
            bTree.add(bNode);

            // merge the trees together
            console.log('*** a -> b');
            aTree.merge(bNode.hash);
            console.log('*** b -> a');
            bTree.merge(aNode.hash);

            ctCompare(aTree, bTree);
        });

        it('should be associative', () => {
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

            console.log('*** (a -> b) -> c');
            aTree.merge(bHash).merge(cHash);
            console.log('*** a -> (b -> c)');
            bTree.merge(cHash).merge(aHash);
            console.log('*** (c -> a) -> b');
            cTree.merge(aHash).merge(bHash);

            ctCompare(aTree, bTree);
            ctCompare(bTree, cTree);
            ctCompare(cTree, aTree);
        });

        it('should be idempotent', () => {
            // create the root node
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'xxx';
            firstNode.hash = _storage.save(firstNode);

            // create the two divergent trees
            let aTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let bTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            let aNode: TestNode = new TestNode();
            aNode.content = 'aaa';
            aNode.parent = firstNode.hash;
            aTree.add(aNode);

            // merge a->b twice
            console.log('a->b');
            bTree.merge(aTree.bitterEnd);
            let h1: Hash = bTree.bitterEnd;
            console.log('a->b');
            bTree.merge(aTree.bitterEnd);
            let h2: Hash = bTree.bitterEnd;
            expect(h2).to.equal(h1);

            console.log('b->a');
            aTree.merge(bTree.bitterEnd);
            console.log('a->b');
            bTree.merge(aTree.bitterEnd);
            ctCompare(aTree, bTree);
        });

        it('should merge multiple generations', () => {
            // create the root node
            let firstNode: TestNode = new TestNode();
            firstNode.content = 'xxx';
            firstNode.hash = _storage.save(firstNode);

            // create the three divergent trees
            let aTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let bTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);
            let cTree: ChronoTree = new ChronoTree(_storage, firstNode.hash);

            // add divergent nodes
            console.log('*** creating a,b,c nodes');
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

            console.log('*** (a -> b) -> c');
            aTree.merge(bHash).merge(cHash);
            console.log('*** a -> (b -> c)');
            bTree.merge(cHash).merge(aHash);
            console.log('*** (c -> a) -> b');
            cTree.merge(aHash).merge(bHash);

            // add divergent nodes
            console.log('*** creating p,q,r nodes');
            let pNode: TestNode = new TestNode();
            pNode.content = 'ppp';
            pNode.parent = firstNode.hash;
            aTree.add(pNode);

            let qNode: TestNode = new TestNode();
            qNode.content = 'qqq';
            qNode.parent = firstNode.hash;
            bTree.add(qNode);

            let rNode: TestNode = new TestNode();
            rNode.content = 'rrr';
            rNode.parent = firstNode.hash;
            cTree.add(rNode);

            // merge the trees together
            aHash = aTree.bitterEnd;
            bHash = bTree.bitterEnd;
            cHash = cTree.bitterEnd;

            console.log('*** (a -> b) -> c');
            aTree.merge(bHash).merge(cHash);
            console.log('*** a -> (b -> c)');
            bTree.merge(cHash).merge(aHash);
            console.log('*** (c -> a) -> b');
            cTree.merge(aHash).merge(bHash);

            ctCompare(aTree, bTree);
            ctCompare(bTree, cTree);
            ctCompare(cTree, aTree);

            aTree.print();
            bTree.print();
            cTree.print();
        });
    });
});

function ctCompare(lhs: ChronoTree, rhs: ChronoTree) {
    // verify ends are the same
    expect(lhs.bitterEnd).to.equal(rhs.bitterEnd);
    // verify internal state is the same
    expect(h.sha1(lhs.looseEnds)).to.equal(h.sha1(rhs.looseEnds));
    expect(h.sha1(lhs.knownNodes)).to.equal(h.sha1(rhs.knownNodes));
}


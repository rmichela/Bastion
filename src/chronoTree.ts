import * as Collections from 'typescript-collections';

// describes the "flavor" of a node
export enum NodeType {
    // content nodes hold the immutable content of a ChronoTree and live forever
    Content,
    // aggregate nodes tie up the loose ends of a ChronoTree and are discarded
    // as soon as they are no longer relevent.
    Aggregate
}

// the type for a node hash
export type Hash = string;

// the base node type for a ChronoTree
export abstract class Node {
    // the unique identifier for this node
    public hash: Hash;
    // the "flavor" of this node
    public type: NodeType;
    // the unique identifier of this node's logical parent
    public parent: Hash;
    // the unique identifiers of the loose ends that came before this node
    // cronologically
    public predecessors: Hash[];
}

// abstracts the underlying complexities of storing nodes.
export interface Storage {
    // persist a Node, generating it's persistence-specific hash
    save(node: Node): Hash;
    // destroy a Node
    delete(node: Hash): void;
    // find a Node by its hash
    find(hash: Hash): Node;
}

// the ChronoTree itself
export class ChronoTree {
    private _storage: Storage;
    private _bitterEnd: Hash;
    private _knownNodes: Collections.Dictionary<Hash, Node> = new Collections.Dictionary<Hash, Node>();
    private _looseEnds: Collections.Set<Hash> = new Collections.Set<Hash>();

    constructor(storage: Storage, head: Hash = null) {
        this._storage = storage;
        this._bitterEnd = head;

        if (head === null) {
            // populate an empty tree with an empty aggregate node
            let emptyTreeNode: Node = new BitterEndNode();
            emptyTreeNode.hash = this._storage.save(emptyTreeNode);
            head = emptyTreeNode.hash;
        }
        this.mergeImpl(head, true);
    }

    /**
     * Get the bitter end hash of this ChronoTree.
     */
    public get bitterEnd(): Hash {
        return this._bitterEnd;
    }

    /**
     * Get a node by hash from this ChronoTree.
     */
    public getNode(hash: Hash): Node {
        return this._knownNodes.getValue(hash);
    }

    /**
     * Add a new node to this ChronoTree.
     */
    public add(newNode: Node): void {
        // copy all the hashes tracked by the bitter end into the new
        // node's predecessors list
        let bitterEndNode: Node = this._knownNodes.getValue(this._bitterEnd);

        if (bitterEndNode.type === NodeType.Content) {
            newNode.predecessors.push(bitterEndNode.hash);
        }

        if (bitterEndNode.type === NodeType.Aggregate) {
            newNode.predecessors = bitterEndNode.predecessors;
        }

        // replace the bitter end with a node pointing only to the new node
        this.replaceBitterEnd(newNode);
        this._knownNodes.setValue(newNode.hash, newNode);
    }

    /**
     * Merge one ChronoTree with the bitter end of another ChronoTree.
     */
    public merge(other: Hash): void {
        this.mergeImpl(other, false);
    }

    private mergeImpl(other: Hash, initializing: boolean): void {
        // todo: 1. any kind of validation of each of the nodes being merged
        //       2. make this method atomic

        let todo: Collections.Queue<Hash> = new Collections.Queue<Hash>();
        todo.add(other);

        while (!todo.isEmpty) {
            let hash: Hash = todo.dequeue();

            // process this node only if it hasn't been seen before
            if (!this._knownNodes.containsKey(hash)) {
                let node: Node = this._storage.find(hash);
                this._knownNodes.setValue(hash, node);

                // assume this node is a loose end, for now
                // loose ends are removed as new nodes point to them
                this._looseEnds.add(hash);

                // account for the parent node, if it exists
                if (node.parent) {
                    todo.enqueue(node.parent);
                    this._looseEnds.remove(node.parent);
                }

                // account for the predecessors, if they exist
                for (let predecessor of node.predecessors) {
                    todo.enqueue(predecessor);
                    this._looseEnds.remove(predecessor);
                }
            }
        }

        if (initializing) {
            // compute the loose ends from the initial bitter end
            let bitterEndNode: Node = this._knownNodes.getValue(this._bitterEnd);
            this._looseEnds.add(bitterEndNode.parent);
            for (let predecessor of bitterEndNode.predecessors) {
                this._looseEnds.add(predecessor);
            }
        } else {
            // replace the bitter end with a new aggregate node
            let newBitterEndNode: Node = new BitterEndNode();
            newBitterEndNode.predecessors = this._looseEnds.toArray();
            this.replaceBitterEnd(newBitterEndNode);
        }
    }

    private replaceBitterEnd(newBitterEndNode: Node): void {
        newBitterEndNode.hash = this._storage.save(newBitterEndNode);
        let oldBitterEnd: Hash = this._bitterEnd;
        this._bitterEnd = newBitterEndNode.hash;
        if (oldBitterEnd) {
            this._storage.delete(oldBitterEnd);
        }
    }
}

// content-free node type used for tracking the bitter end of a Chrono Tree
class BitterEndNode extends Node {
    constructor() {
        super();
        this.type = NodeType.Aggregate;
    }
}

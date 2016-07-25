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
    public static get HASH_NOT_SET(): Hash { return 'HASH_NOT_SET'; }

    // the unique identifier for this node
    public hash: Hash = Node.HASH_NOT_SET;
    // the "flavor" of this node
    public type: NodeType = NodeType.Content;
    // the unique identifier of this node's logical parent
    public parent: Hash = Node.HASH_NOT_SET;
    // the unique identifiers of the loose ends that came before this node
    // cronologically
    public predecessors: Hash[] = [];
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

    constructor(storage: Storage, head?: Hash) {
        this._storage = storage;

        if (!head) {
            // populate an empty tree with an empty aggregate node
            let emptyTreeNode: Node = new BitterEndNode();
            emptyTreeNode.hash = this._storage.save(emptyTreeNode);
            head = emptyTreeNode.hash;
        }
        this._bitterEnd = head;

        this.mergeImpl(head, true);
    }

    /**
     * Get the bitter end hash of this ChronoTree.
     */
    public get bitterEnd(): Hash {
        return this._bitterEnd;
    }

    /**
     * Gets the current loose ends of this ChronoTree.
     */
    public get looseEnds(): Hash[] {
        return this._looseEnds.toArray();
    }

    /**
     * Gets all the known nodes for this ChronoTree.
     */
    public get knownNodes(): Node[] {
        return this._knownNodes.values();
    }

    /**
     * Get a node by hash from this ChronoTree.
     */
    public getNode(hash: Hash): Node {
        if (this._knownNodes.containsKey(hash)) {
            return this._knownNodes.getValue(hash);
        } else {
            throw new Error(hash + ' is unknown');
        }
    }

    /**
     * Add a new node to this ChronoTree.
     */
    public add(newNode: Node): ChronoTree {
        // copy all the hashes tracked by the bitter end into the new
        // node's predecessors list
        let bitterEndNode: Node = this._knownNodes.getValue(this._bitterEnd);

        if (bitterEndNode.type === NodeType.Content) {
            if (bitterEndNode.hash !== newNode.parent) {
                // don't add the current bitter end to the new node's predecessors if
                // the new node is already pointing to the current bitter end as a parent
                newNode.predecessors.push(bitterEndNode.hash);
            }
        }

        if (bitterEndNode.type === NodeType.Aggregate) {
            newNode.predecessors = bitterEndNode.predecessors;
        }

        // replace the bitter end with a node pointing only to the new node
        this.replaceBitterEnd(newNode);
        this._knownNodes.setValue(newNode.hash, newNode);

        return this;
    }

    /**
     * Merge one ChronoTree with the bitter end of another ChronoTree.
     */
    public merge(other: Hash): ChronoTree {
        this.mergeImpl(other, false);
        return this;
    }

    private mergeImpl(other: Hash, initializing: boolean): void {
        // todo: 1. any kind of validation of each of the nodes being merged
        //       2. make this method atomic

        let todo: Collections.Queue<Hash> = new Collections.Queue<Hash>();
        todo.add(other);

        while (!todo.isEmpty()) {
            let hash: Hash = todo.dequeue();

            // process this node only if it hasn't been seen before
            if (!this._knownNodes.containsKey(hash)) {
                let node: Node = this._storage.find(hash);
                this._knownNodes.setValue(hash, node);

                // assume this node is a loose end, for now
                // loose ends are removed as new nodes point to them
                this._looseEnds.add(hash);

                // account for the parent node, if it exists
                if (node.parent !== Node.HASH_NOT_SET) {
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
            if (bitterEndNode.parent !== Node.HASH_NOT_SET) {
                this._looseEnds.add(bitterEndNode.parent);
            }
            for (let predecessor of bitterEndNode.predecessors.sort()) {
                this._looseEnds.add(predecessor);
            }
        } else {
            // replace the bitter end with a new aggregate node
            let newBitterEndNode: Node = new BitterEndNode();
            newBitterEndNode.predecessors = this._looseEnds.toArray().sort();
            this.replaceBitterEnd(newBitterEndNode);
            this._knownNodes.setValue(newBitterEndNode.hash, newBitterEndNode);
        }
    }

    private replaceBitterEnd(newBitterEndNode: Node): void {
        newBitterEndNode.hash = this._storage.save(newBitterEndNode);
        let oldBitterEnd: Hash = this._bitterEnd;
        this._bitterEnd = newBitterEndNode.hash;

        this._looseEnds.remove(oldBitterEnd);
        this._looseEnds.add(newBitterEndNode.hash);

        let oldBitterEndNode: Node = this.getNode(oldBitterEnd);
        if (oldBitterEndNode.type === NodeType.Aggregate) {
            this._storage.delete(oldBitterEnd);
            this._knownNodes.remove(oldBitterEnd);
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

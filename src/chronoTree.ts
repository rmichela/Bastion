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

// the type for a dictionary of Nodes
export interface NodeMap {
    [key: string]: Node;
}

// the type for a partial ordering of nodes
export type PartialOrder = Node[][];
// the type for a total ordering of nodes
export type TotalOrder = Node[];

// abstracts the underlying complexities of storing nodes.
export interface Storage {
    // persist a Node, generating it's persistence-specific hash
    save(node: Node, treeName?: string): Hash;
    // destroy a Node
    delete(node: Hash, treeName?: string): void;
    // find a Node by its hash
    find(hash: Hash, treeName?: string): Node;
}

// abstracts the details of implementing a total order w/r/t the node type
export interface TotalOrdering {
    totalOrder(partial: PartialOrder): TotalOrder;
}

// the ChronoTree itself
export class ChronoTree {
    private _name: string;
    private _storage: Storage;
    private _bitterEnd: Hash;
    private _knownNodes: Collections.Dictionary<Hash, Node> = new Collections.Dictionary<Hash, Node>();
    private _looseEnds: Collections.Set<Hash> = new Collections.Set<Hash>();

    constructor(storage: Storage, head?: Hash, name?: string) {
        this._storage = storage;
        this._name = name;

        if (!head) {
            // populate an empty tree with an empty aggregate node
            let emptyTreeNode: Node = new BitterEndNode([]);
            emptyTreeNode.hash = this._storage.save(emptyTreeNode, this._name);
            head = emptyTreeNode.hash;
        }
        this._bitterEnd = head;

        this.init(head);
    }

    /**
     * Get the name of this ChronoTree.
     */
    public get name(): string {
        return this._name;
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
        return this._looseEnds.toArray().sort();
    }

    /**
     * Gets all the known nodes for this ChronoTree.
     */
    public get knownNodes(): NodeMap {
        let nodes: Node[] =  this._knownNodes.values().sort((a: Node, b: Node) => Collections.util.defaultCompare(a.hash, b.hash));
        let nodeMap: NodeMap = {};
        for (let node of nodes) {
            nodeMap[node.hash] = node;
        }
        return nodeMap;
    }

    /**
     * Get the Storage used by this ChronoTree.
     */
    public get storage(): Storage {
        return this._storage;
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
        // store the new node
        let newHash: Hash = this._storage.save(newNode, this._name);
        newNode.hash = newHash;
        // add new node to known nodes
        this._knownNodes.setValue(newHash, newNode);
        // update the loose ends
        this._looseEnds.add(newHash);
        this._looseEnds.remove(newNode.parent);
        // create a new bitter end
        let be: BitterEndNode = new BitterEndNode(this._looseEnds.toArray());
        this.replaceBitterEnd(be);

        return this;
    }

    /**
     * Merge one ChronoTree with the bitter end of another ChronoTree.
     */
    public merge(other: Hash): ChronoTree {
        let otherNode: Node = this._storage.find(other, this._name);
        // update known nodes
        this.traverseUnknownNodes(otherNode).toArray().forEach(n => {
            this._knownNodes.setValue(n.hash, n);
        });
        // update loose ends
        this._looseEnds.add(other);
        this._looseEnds.remove(otherNode.parent);
        // update bitter end
        let be: BitterEndNode = new BitterEndNode(this._looseEnds.toArray());
        this.replaceBitterEnd(be);

        return this;
    }

    /**
     * Returns a partial ordering of this ChronoTree in toplogical sort order,
     * newest to oldest. Ambiguously ordered nodes are grouped in a sub-array.
     */
    public get partialOrdering(): PartialOrder {
        return null;
    }

    public print(): void {
        console.log('Bitter end: ' + this.bitterEnd);
        console.log('Loose ends: ' + this.looseEnds);
    }

    private init(other: Hash): void {
        let otherNode: Node = this._storage.find(other);
        // initialize know nodes
        this.traverseUnknownNodes(otherNode).toArray().forEach(n => {
            this._knownNodes.setValue(n.hash, n);
        });
        // initialize loose ends
        otherNode.predecessors.forEach(n => {
            this._looseEnds.add(n);
        });
        // initialize bitter end
        if (otherNode.type === NodeType.Aggregate) {
            this.replaceBitterEnd(otherNode);
        } else {
            let be: BitterEndNode = new BitterEndNode([other]);
            this.replaceBitterEnd(be);
        }
    }

    private traverseUnknownNodes(node: Node): Collections.Set<Node> {
        let nodes: Collections.Set<Node> = new Collections.Set<Node>(n => n.hash);

        // only travers unknown nodes
        if (!this._knownNodes.containsKey(node.hash)) {
            // include this node
            nodes.add(node);
            // include this node's parent and descendents
            if (node.parent !== Node.HASH_NOT_SET) {
                let parentNode: Node = this._storage.find(node.parent, this._name);
                nodes.union(this.traverseUnknownNodes(parentNode));
            }
            // include this node's predacessors and descendents
            for (let pHash of node.predecessors) {
                let p: Node = this._storage.find(pHash, this._name);
                nodes.union(this.traverseUnknownNodes(p));
            }
        }

        return nodes;
    }

    private replaceBitterEnd(newBitterEndNode: Node): void {
        // replace the current bitter end hash with the new bitter end hash
        newBitterEndNode.hash = this._storage.save(newBitterEndNode, this._name);
        this._knownNodes.setValue(newBitterEndNode.hash, newBitterEndNode);
        let oldBitterEnd: Hash = this._bitterEnd;
        this._bitterEnd = newBitterEndNode.hash;

        // purge the obsolete aggregate node, if it exists
        if (oldBitterEnd) {
            this._storage.delete(oldBitterEnd, this._name);
            this._knownNodes.remove(oldBitterEnd);
        }
    }
}

// content-free node type used for tracking the bitter end of a Chrono Tree
class BitterEndNode extends Node {
    constructor(looseEnds: Hash[]) {
        super();
        this.predecessors = looseEnds;
        this.type = NodeType.Aggregate;
    }
}

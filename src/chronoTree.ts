// Describes the "flavor" of a node
export enum NodeType {
    // Content nodes hold the immutable content of a ChronoTree and live forever
    Content,
    // Aggregate nodes tie up the loose ends of a ChronoTree and are discarded
    // as soon as they are no longer relevent.
    Aggregate
}

// The type for a node hash
export type Hash = string;

// The base node type for a ChronoTree
export interface Node {
    // The unique identifier for this node
    id: Hash;
    // The "flavor" of this node
    type: NodeType;
    // The unique identifier of this node's logical parent
    parent: Hash;
    // The unique identifiers of the loose ends that came before this node
    // cronologically
    predecessors: Hash[];
}

// Abstracts the underlying complexities of storing nodes.
export interface Storage {
    // Persist a Node, generating it's persistence-specific hash
    save(node: Node): Hash;
    // Destroy a Node
    delete(node: Node): void;
    // Find a Node by its hash
    find(hash: Hash): Node;
}

// The ChronoTree itself
export class ChronoTree {
    private storage: Storage;
    private headNode: Node;

    constructor(storage: Storage, head: Node) {
        this.storage = storage;
        this.headNode = head;
    }

    public get head(): Node {
        return this.headNode;
    }

    public merge(other: Node): void {
        // TODO: implement merge algorithm
    }
}

